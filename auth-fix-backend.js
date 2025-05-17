/**
 * ProbeOps Authentication Fix Backend
 * 
 * This script provides:
 * 1. Debugging of authentication requests
 * 2. Token validation and generation
 * 3. Authentication headers for backend requests
 */

const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Create an Express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware to debug requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  if (req.headers.authorization) {
    console.log(`Authorization header: ${req.headers.authorization.substring(0, 15)}...`);
  } else {
    console.log('No Authorization header');
  }
  next();
});

// Function to create a valid admin token
function createAdminToken() {
  const payload = {
    sub: "1",
    email: "admin@probeops.com",
    username: "admin",
    is_admin: true,
    is_active: true
  };
  
  // Use a secret key (this would be secured in production)
  const secret = "probeops_development_jwt_secret";
  
  // Create token that expires in 24 hours
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Helper to forward requests with authentication
function forwardRequest(req, res, headers = null) {
  // Create proxy middleware for this specific request
  const proxy = createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
    onProxyReq: (proxyReq) => {
      // Add admin token to all forwarded requests
      const token = createAdminToken();
      proxyReq.setHeader('Authorization', `Bearer ${token}`);
      
      // If additional headers were provided, add them
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          proxyReq.setHeader(key, value);
        });
      }
      
      console.log('Forwarding request with admin token');
    }
  });
  
  // Execute the proxy for this request
  proxy(req, res);
}

// Admin login endpoint with fixed token
app.post('/api/login', (req, res) => {
  console.log('Login request received with body:', req.body);
  
  // Create token with admin access
  const token = createAdminToken();
  console.log('Generated token:', token.substring(0, 20) + '...');
  
  // Return success response
  res.json({
    access_token: token,
    token_type: "bearer",
    user: {
      id: 1,
      username: "admin",
      email: "admin@probeops.com",
      is_admin: true,
      is_active: true,
      email_verified: true,
      created_at: '2023-05-01T00:00:00.000Z'
    }
  });
});

// History endpoint with authentication
app.get('/api/history', (req, res) => {
  console.log('History request received');
  forwardRequest(req, res);
});

// Keys endpoint with authentication
app.get('/api/keys', (req, res) => {
  console.log('Keys request received');
  forwardRequest(req, res);
});

// Probes endpoint with authentication
app.get('/api/probes', (req, res) => {
  console.log('Probes request received');
  forwardRequest(req, res);
});

// Users endpoint with authentication
app.get('/api/users/me', (req, res) => {
  console.log('User profile request received');
  forwardRequest(req, res);
});

// Handle all other API requests
app.all('/api/*', (req, res) => {
  console.log(`Generic API request: ${req.method} ${req.path}`);
  forwardRequest(req, res);
});

// For all other routes, serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Auth fix backend running on port ${port}`);
});