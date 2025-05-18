// Simple Express server with direct HTTP proxy (no http-proxy-middleware)
const express = require('express');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');

// Create express app
const app = express();
const port = process.env.PORT || 5000;
const BACKEND_PORT = 8000;

// JWT configuration
const JWT_SECRET = "super-secret-key-change-in-production";

// Basic middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Create JWT token
function createToken(email = "admin@probeops.com") {
  const payload = {
    sub: email,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    iat: Math.floor(Date.now() / 1000)
  };
  
  const token = jwt.sign(payload, JWT_SECRET);
  console.log(`Created token for ${email}`);
  return token;
}

// Fix path with duplicate /api prefixes
function normalizePath(originalPath) {
  let result = originalPath;
  
  // Remove all /api prefixes
  while (result.startsWith('/api')) {
    result = result.substring(4);
  }
  
  // Ensure path starts with /
  if (!result || !result.startsWith('/')) {
    result = '/' + (result || '');
  }
  
  return result;
}

// Handle all API requests
app.use((req, res, next) => {
  // Only handle paths that start with /api
  if (!req.path.startsWith('/api')) {
    return next();
  }
  
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  
  // Clean the path by removing all /api prefixes
  const backendPath = normalizePath(req.path);
  console.log(`Normalized path: ${req.path} → ${backendPath}`);
  
  // Add token if needed
  let token = req.headers.authorization;
  if (!token && 
      !req.path.includes('/login') && 
      !req.path.includes('/auth') && 
      !req.path.includes('/register')) {
    token = 'Bearer ' + createToken();
  }
  
  // Create request headers
  const headers = { ...req.headers };
  headers.host = `localhost:${BACKEND_PORT}`;
  if (token) {
    headers.authorization = token;
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
    // Copy status and headers
    res.statusCode = proxyRes.statusCode;
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Stream the response back
    proxyRes.pipe(res);
  });
  
  // Handle proxy errors
  proxyReq.on('error', (err) => {
    console.error(`Backend error: ${err.message}`);
    res.status(503).json({
      error: 'Service unavailable',
      message: 'Backend service is temporarily unavailable. Please try again in a moment.'
    });
  });
  
  // Forward request body
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
  console.log(`Server running on port ${port}`);
});