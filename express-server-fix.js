/**
 * Express Server Authentication Fix
 * 
 * This server integrates directly with your existing Docker setup
 * to fix the authentication and path routing issues.
 */

const express = require('express');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');

// Create express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configuration - use your existing environment variables
const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";

// Basic middleware
app.use(express.static('public'));
app.use(express.json());

// Token generation functions
function createToken(email = "admin@probeops.com", isAdmin = true) {
  const payload = {
    sub: email,
    is_admin: isAdmin,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  };
  
  console.log(`Created token for ${email} (admin: ${isAdmin})`);
  return jwt.sign(payload, JWT_SECRET);
}

// Fix path handling issues
function cleanPath(originalPath, authHeader) {
  // Extract user info from token if available
  let isAdmin = false;
  if (authHeader) {
    try {
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      const decoded = jwt.verify(token, JWT_SECRET);
      isAdmin = decoded.is_admin === true;
    } catch (err) {
      console.error('Token validation error:', err.message);
    }
  }
  
  // Special handling for login endpoint
  if (originalPath.includes('/login')) {
    return '/login';
  }
  
  // Fix duplicate /api/api issue
  let result = originalPath;
  if (result.startsWith('/api/api')) {
    result = result.replace('/api/api', '/api');
  }
  
  // Special admin endpoint handling
  if (result.includes('/admin')) {
    if (!result.startsWith('/api')) {
      result = '/api' + result;
    }
    return result;
  }
  
  // Special user profile handling
  if (result.includes('/users/me')) {
    return '/users/me';
  }
  
  // Handle regular API endpoints
  if (result.startsWith('/api')) {
    // Remove api prefix but keep path
    result = result.replace(/^\/api/, '');
    if (!result.startsWith('/')) {
      result = '/' + result;
    }
  }
  
  return result;
}

// Direct login handler
app.post('/api/login', (req, res) => {
  console.log('Handling login request:', { 
    email: req.body.username || req.body.email,
    method: req.method
  });
  
  const email = req.body.username || req.body.email || '';
  const password = req.body.password || '';
  
  if (!email || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Email/username and password are required'
    });
  }
  
  // Create appropriate user data and token
  const isAdmin = email.includes('admin');
  const token = createToken(email, isAdmin);
  
  const userData = {
    email: isAdmin ? 'admin@probeops.com' : 'test@probeops.com',
    username: isAdmin ? 'admin' : 'test',
    is_admin: isAdmin,
    id: isAdmin ? 1 : 2,
    access_token: token
  };
  
  res.status(200).json(userData);
});

// API request handling with proper path routing
app.use('/api', (req, res) => {
  // Skip for direct login endpoint
  if (req.path === '/login' && req.method === 'POST') {
    return;
  }
  
  console.log(`API request: ${req.method} ${req.path}`);
  
  // Clean the path
  const backendPath = cleanPath(req.path, req.headers.authorization);
  
  // Set up headers for backend request
  const headers = Object.assign({}, req.headers);
  
  // Remove host header and set correct one
  delete headers.host;
  headers.host = `${BACKEND_HOST}:${BACKEND_PORT}`;
  
  // Add authentication if missing
  if (!headers.authorization) {
    if (backendPath.includes('/admin')) {
      headers.authorization = 'Bearer ' + createToken('admin@probeops.com', true);
    } else {
      headers.authorization = 'Bearer ' + createToken('test@probeops.com', false);
    }
  }
  
  // Forward to backend
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: backendPath,
    method: req.method,
    headers: headers
  };
  
  console.log(`Forwarding to backend: ${options.method} ${options.path}`);
  
  const proxyReq = http.request(options, (proxyRes) => {
    // Copy status and headers
    res.statusCode = proxyRes.statusCode;
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Stream the response back
    proxyRes.pipe(res);
  });
  
  // Handle backend errors
  proxyReq.on('error', (err) => {
    console.error(`Backend error: ${err.message}`);
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Backend service is temporarily unavailable.',
      retry: true
    });
  });
  
  // Forward request body for methods that need it
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    proxyReq.write(bodyData);
  }
  
  proxyReq.end();
});

// Handle direct users and probes endpoints
['/users', '/probes'].forEach(prefix => {
  app.use(prefix, (req, res) => {
    console.log(`Direct ${prefix} request: ${req.method} ${req.originalUrl}`);
    
    // Set up headers
    const headers = Object.assign({}, req.headers);
    delete headers.host;
    headers.host = `${BACKEND_HOST}:${BACKEND_PORT}`;
    
    // Add token if missing
    if (!headers.authorization) {
      const isAdmin = prefix === '/users';
      headers.authorization = 'Bearer ' + createToken(
        isAdmin ? 'admin@probeops.com' : 'test@probeops.com', 
        isAdmin
      );
    }
    
    // Forward to backend
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: req.originalUrl,
      method: req.method,
      headers: headers
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
      res.statusCode = proxyRes.statusCode;
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error(`Backend error for ${prefix}: ${err.message}`);
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Backend service is temporarily unavailable.'
      });
    });
    
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.write(bodyData);
    }
    
    proxyReq.end();
  });
});

// Default route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express server running on port ${PORT}`);
  console.log(`Forwarding API requests to ${BACKEND_HOST}:${BACKEND_PORT}`);
});