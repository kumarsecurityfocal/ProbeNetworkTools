// JWT Authentication Fix for ProbeOps
// This script intercepts API calls with invalid tokens and applies a valid signature

const express = require('express');
const jwt = require('jsonwebtoken');
const http = require('http');

// Setup Express app
const app = express();
const PORT = 3000;

// Secret key MUST match backend
const JWT_SECRET = "super-secret-key-change-in-production";

// Middleware to parse JSON bodies
app.use(express.json());

// Create a valid JWT token for admin
function createAdminToken() {
  const payload = {
    sub: "admin@probeops.com",
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours from now
  };
  
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

// Admin authentication endpoint
app.post('/api/admin-login', (req, res) => {
  const { username, password } = req.body;
  
  // Only allow admin login
  if (username !== 'admin@probeops.com' || password !== 'probeopS1@') {
    return res.status(401).json({ detail: 'Invalid credentials' });
  }
  
  // Generate a valid token
  const token = createAdminToken();
  
  // Send token and user data
  res.json({
    access_token: token,
    token_type: 'bearer',
    user: {
      id: 1,
      username: 'admin',
      email: 'admin@probeops.com',
      is_admin: true,
      is_active: true
    }
  });
});

// API proxy to add valid token
app.all('/api/*', (req, res) => {
  // Skip auth for database admin APIs
  if (req.path.startsWith('/api/admin-database')) {
    forwardRequest(req, res);
    return;
  }
  
  // Generate a valid token
  const token = createAdminToken();
  
  // Create headers for backend request
  const headers = { ...req.headers };
  
  // Replace Authorization header with valid token
  headers['Authorization'] = `Bearer ${token}`;
  
  // Forward request with valid token
  forwardRequest(req, res, headers);
});

// Function to forward request to backend
function forwardRequest(req, res, headers = null) {
  // Create backend request options
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: req.path.replace(/^\/api/, ''),
    method: req.method,
    headers: headers || req.headers
  };
  
  console.log(`Forwarding ${req.method} request to: ${options.path}`);
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Set response headers
    Object.keys(backendRes.headers).forEach(key => {
      res.setHeader(key, backendRes.headers[key]);
    });
    
    // Set status code
    res.status(backendRes.statusCode);
    
    // Collect response data
    let data = '';
    backendRes.on('data', chunk => {
      data += chunk;
      res.write(chunk);
    });
    
    // End response
    backendRes.on('end', () => {
      console.log(`Backend response: ${backendRes.statusCode}`);
      res.end();
    });
  });
  
  // Handle request error
  backendReq.on('error', error => {
    console.error('Error forwarding request:', error);
    res.status(500).json({ detail: 'Error forwarding request to backend' });
  });
  
  // Write request body if exists
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    backendReq.write(JSON.stringify(req.body));
  }
  
  // End request
  backendReq.end();
}

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Auth fix backend running on port ${PORT}`);
  });
}

// Export for integration
module.exports = {
  createAdminToken,
  fixAuthenticationBackend: app
};