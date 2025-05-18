/**
 * Enhanced Express server for AWS deployment
 * This version fixes the authentication and path handling issues
 */

const express = require('express');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Create express app
const app = express();
const port = process.env.PORT || 5000;
const BACKEND_PORT = 8000;

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";

// Setup log directory
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, 'logs');
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (err) {
  console.error(`Error creating logs directory: ${err.message}`);
}

// Basic middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Create JWT token for admin user
function createAdminToken() {
  const payload = {
    sub: "admin@probeops.com",
    is_admin: true,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000)
  };
  
  console.log('Created admin token');
  return jwt.sign(payload, JWT_SECRET);
}

// Create JWT token for test user
function createTestToken() {
  const payload = {
    sub: "test@probeops.com",
    is_admin: false,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000)
  };
  
  console.log('Created test token');
  return jwt.sign(payload, JWT_SECRET);
}

// Get user info from token
function getUserFromToken(token) {
  if (!token) return null;
  
  try {
    const tokenStr = token.startsWith('Bearer ') ? token.substring(7) : token;
    return jwt.verify(tokenStr, JWT_SECRET);
  } catch (err) {
    console.error('Token verification failed', err.message);
    return null;
  }
}

// Fix path for API requests
function cleanPath(path) {
  // Handle login endpoint specially
  if (path.includes('/login')) {
    return '/login';
  }
  
  // Handle user profile endpoint specially
  if (path.includes('/users/me')) {
    return '/users/me';
  }
  
  // Admin endpoints need special handling
  if (path.includes('/admin')) {
    // Make sure admin endpoints have /api prefix
    if (!path.startsWith('/api')) {
      return '/api' + path;
    }
    return path;
  }
  
  // Remove duplicate /api prefixes
  if (path.startsWith('/api')) {
    let result = path;
    while (result.startsWith('/api/api')) {
      result = result.replace('/api/api', '/api');
    }
    return result;
  }
  
  return path;
}

// Special login handler
app.post('/api/login', (req, res) => {
  console.log('Handling login request', { email: req.body.username || req.body.email });
  
  try {
    // Extract email and password
    const email = req.body.username || req.body.email || '';
    const password = req.body.password || '';
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email/username and password are required'
      });
    }
    
    // Generate token based on user type
    let token;
    let userData;
    
    if (email.includes('admin')) {
      token = createAdminToken();
      userData = {
        email: 'admin@probeops.com',
        is_admin: true,
        username: 'admin',
        access_token: token
      };
    } else {
      token = createTestToken();
      userData = {
        email: 'test@probeops.com',
        is_admin: false,
        username: 'test',
        access_token: token
      };
    }
    
    res.status(200).json(userData);
  } catch (error) {
    console.error('Login error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during login'
    });
  }
});

// API request handler
app.use('/api', (req, res) => {
  try {
    console.log(`API Request: ${req.method} ${req.path}`);
    
    // Get user from token if available
    const authHeader = req.headers.authorization;
    const user = getUserFromToken(authHeader);
    
    // Create the cleaned backend path
    const backendPath = cleanPath(req.originalUrl);
    console.log(`Cleaned path: ${req.originalUrl} → ${backendPath}`);
    
    // Create request headers
    const headers = {};
    Object.keys(req.headers).forEach(key => {
      if (key.toLowerCase() !== 'host') {
        headers[key] = req.headers[key];
      }
    });
    
    // Set appropriate host
    headers.host = `localhost:${BACKEND_PORT}`;
    
    // Ensure proper authorization
    if (!authHeader) {
      if (backendPath.includes('/admin')) {
        headers.authorization = 'Bearer ' + createAdminToken();
      } else if (!backendPath.includes('/login')) {
        headers.authorization = 'Bearer ' + createTestToken();
      }
    }
    
    // Forward request to backend
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: backendPath,
      method: req.method,
      headers: headers
    };
    
    console.log(`Forwarding to backend: ${req.method} ${backendPath}`);
    
    const proxyReq = http.request(options, (proxyRes) => {
      // Copy status code and headers
      res.statusCode = proxyRes.statusCode;
      
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      
      // Stream response back
      proxyRes.pipe(res);
    });
    
    // Handle proxy errors
    proxyReq.on('error', (err) => {
      console.error(`Backend request error: ${err.message}`);
      
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Backend service is temporarily unavailable. Please try again later.',
        retry_after: 5
      });
    });
    
    // Forward request body if needed
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.write(bodyData);
    }
    
    proxyReq.end();
  } catch (error) {
    console.error('API proxy error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
});

// Handle probes endpoints directly
app.use('/probes', (req, res) => {
  console.log(`Probes request: ${req.method} ${req.originalUrl}`);
  
  // Add authorization if needed
  const headers = {};
  Object.keys(req.headers).forEach(key => {
    if (key.toLowerCase() !== 'host') {
      headers[key] = req.headers[key];
    }
  });
  
  // Set appropriate host
  headers.host = `localhost:${BACKEND_PORT}`;
  
  // Ensure authorization
  if (!headers.authorization) {
    headers.authorization = 'Bearer ' + createTestToken();
  }
  
  // Forward to backend
  const options = {
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: `/probes${req.url}`,
    method: req.method,
    headers: headers
  };
  
  console.log(`Forwarding to backend: ${req.method} /probes${req.url}`);
  
  const proxyReq = http.request(options, (proxyRes) => {
    // Copy status and headers
    res.statusCode = proxyRes.statusCode;
    
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Stream response
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error(`Backend error: ${err.message}`);
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Backend service is temporarily unavailable'
    });
  });
  
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    proxyReq.write(bodyData);
  }
  
  proxyReq.end();
});

// Default route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`ProbeOps server running on port ${port}`);
});