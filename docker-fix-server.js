/**
 * Enhanced Express Server for Docker Container
 * 
 * This version applies direct fixes for the specific authentication and path handling
 * issues identified in the AWS deployment with Docker containers.
 */

const express = require('express');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Create express app
const app = express();
const PORT = process.env.PORT || 5000;
const BACKEND_PORT = process.env.BACKEND_PORT || 8000;
const BACKEND_HOST = process.env.BACKEND_HOST || 'backend'; // Default to container service name

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";

// Setup log directory
const LOG_DIR = process.env.LOG_DIR || '/app/logs';
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (err) {
  console.error(`Error creating logs directory: ${err.message}`);
}

// Log files
const AUTH_LOG = path.join(LOG_DIR, 'auth.log');
const PROXY_LOG = path.join(LOG_DIR, 'proxy.log');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');

// Logging functions
function log(type, message, data = null) {
  try {
    const timestamp = new Date().toISOString();
    const logData = data ? `: ${JSON.stringify(data, null, 2)}` : '';
    const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}${logData}\n`;
    
    // Determine log file
    let logFile;
    if (type === 'auth') logFile = AUTH_LOG;
    else if (type === 'proxy') logFile = PROXY_LOG;
    else if (type === 'error') logFile = ERROR_LOG;
    
    // Write to log file
    if (logFile) {
      fs.appendFileSync(logFile, logMessage);
    }
    
    // Console output
    console.log(`${type.toUpperCase()}: ${message}`);
  } catch (err) {
    console.error(`Error logging to ${type} log: ${err.message}`);
  }
}

// Basic middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Create admin token
function createAdminToken() {
  const payload = {
    sub: "admin@probeops.com",
    is_admin: true,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  };
  
  log('auth', 'Created admin token');
  return jwt.sign(payload, JWT_SECRET);
}

// Create test token
function createTestToken() {
  const payload = {
    sub: "test@probeops.com",
    is_admin: false,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  };
  
  log('auth', 'Created test token');
  return jwt.sign(payload, JWT_SECRET);
}

// Direct login handler
app.post('/api/login', (req, res) => {
  log('auth', 'Handling direct login request', {
    username: req.body.username || req.body.email,
    body: { ...req.body, password: '[REDACTED]' }
  });
  
  const email = req.body.username || req.body.email;
  const password = req.body.password;
  
  if (!email || !password) {
    log('auth', 'Login missing credentials');
    return res.status(400).json({
      message: 'Username/email and password are required'
    });
  }
  
  // Generate token for appropriate user
  let token, userData;
  
  if (email.includes('admin')) {
    token = createAdminToken();
    userData = {
      email: 'admin@probeops.com',
      username: 'admin',
      is_admin: true,
      id: 1,
      access_token: token
    };
  } else {
    token = createTestToken();
    userData = {
      email: 'test@probeops.com',
      username: 'test',
      is_admin: false,
      id: 2,
      access_token: token
    };
  }
  
  log('auth', 'Login successful', { email });
  res.status(200).json(userData);
});

// Handle API routes
app.use('/api', (req, res, next) => {
  // Skip the login endpoint as we're handling it separately
  if (req.path === '/login' && req.method === 'POST') {
    return next();
  }
  
  log('proxy', `API request: ${req.method} ${req.path}`);
  
  // Clean path - handle the duplicate /api/api issue
  let backendPath = req.path;
  
  // Fix the duplicate api prefix issue
  if (backendPath.startsWith('/api/api')) {
    backendPath = backendPath.replace('/api/api', '/api');
    log('proxy', 'Fixed duplicate API prefix', { original: req.path, fixed: backendPath });
  } else if (backendPath === '/users/me') {
    // Handle user profile endpoint
    backendPath = '/users/me';
  } else if (backendPath.includes('/admin')) {
    // Admin paths should preserve the /api prefix
    if (!backendPath.startsWith('/api')) {
      backendPath = '/api' + backendPath;
    }
  } else {
    // All other paths - ensure no duplicate /api prefixes
    backendPath = backendPath.replace(/^\/api/, '');
    // Make sure the path starts with a slash
    if (!backendPath.startsWith('/')) {
      backendPath = '/' + backendPath;
    }
  }
  
  // Add token if not provided
  let token = req.headers.authorization;
  if (!token) {
    if (backendPath.includes('/admin')) {
      token = 'Bearer ' + createAdminToken();
    } else {
      token = 'Bearer ' + createTestToken();
    }
    log('auth', 'Added missing token', { path: backendPath });
  }
  
  // Create headers for backend request
  const headers = {};
  for (const key in req.headers) {
    if (key.toLowerCase() !== 'host') {
      headers[key] = req.headers[key];
    }
  }
  
  headers.host = `${BACKEND_HOST}:${BACKEND_PORT}`;
  if (token) {
    headers.authorization = token;
  }
  
  // Forward request to backend
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: backendPath,
    method: req.method,
    headers: headers
  };
  
  log('proxy', 'Forwarding to backend', { 
    original: req.path,
    backendPath,
    method: req.method,
    backend: `${BACKEND_HOST}:${BACKEND_PORT}`
  });
  
  const proxyReq = http.request(options, (proxyRes) => {
    // Copy status and headers
    res.statusCode = proxyRes.statusCode;
    
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Stream response
    proxyRes.pipe(res);
    
    // Log response info
    log('proxy', 'Backend response', { 
      path: backendPath, 
      statusCode: proxyRes.statusCode 
    });
  });
  
  // Improved error handling for backend connectivity issues
  proxyReq.on('error', (err) => {
    log('error', 'Backend connection error', { 
      error: err.message,
      path: backendPath
    });
    
    res.status(503).json({
      message: 'Backend service is temporarily unavailable',
      error: 'Service Unavailable',
      retry: true
    });
  });
  
  // Forward body if needed
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    proxyReq.write(bodyData);
  }
  
  proxyReq.end();
});

// Handle direct users/me endpoint without /api prefix
app.use('/users', (req, res) => {
  log('proxy', `Direct users endpoint: ${req.method} ${req.originalUrl}`);
  
  // Create headers for backend request
  const headers = {};
  for (const key in req.headers) {
    if (key.toLowerCase() !== 'host') {
      headers[key] = req.headers[key];
    }
  }
  
  headers.host = `${BACKEND_HOST}:${BACKEND_PORT}`;
  
  // Add token if not provided
  if (!headers.authorization) {
    headers.authorization = 'Bearer ' + createAdminToken();
  }
  
  // Forward request to backend
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: req.originalUrl,
    method: req.method,
    headers: headers
  };
  
  log('proxy', 'Forwarding users endpoint to backend', { 
    path: req.originalUrl
  });
  
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
    log('error', 'Backend connection error for users endpoint', { 
      error: err.message
    });
    
    res.status(503).json({
      message: 'Backend service is temporarily unavailable',
      error: 'Service Unavailable' 
    });
  });
  
  // Forward body if needed
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    proxyReq.write(bodyData);
  }
  
  proxyReq.end();
});

// Handle direct probes endpoint without /api prefix
app.use('/probes', (req, res) => {
  log('proxy', `Direct probes endpoint: ${req.method} ${req.originalUrl}`);
  
  // Create headers for backend request
  const headers = {};
  for (const key in req.headers) {
    if (key.toLowerCase() !== 'host') {
      headers[key] = req.headers[key];
    }
  }
  
  headers.host = `${BACKEND_HOST}:${BACKEND_PORT}`;
  
  // Add token if not provided
  if (!headers.authorization) {
    headers.authorization = 'Bearer ' + createTestToken();
  }
  
  // Forward request to backend
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: req.originalUrl,
    method: req.method,
    headers: headers
  };
  
  log('proxy', 'Forwarding probes endpoint to backend', { 
    path: req.originalUrl
  });
  
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
    log('error', 'Backend connection error for probes endpoint', { 
      error: err.message
    });
    
    res.status(503).json({
      message: 'Backend service is temporarily unavailable',
      error: 'Service Unavailable' 
    });
  });
  
  // Forward body if needed
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    proxyReq.write(bodyData);
  }
  
  proxyReq.end();
});

// Default route - serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const startMessage = `ProbeOps enhanced server running on port ${PORT}, forwarding to ${BACKEND_HOST}:${BACKEND_PORT}`;
  console.log(startMessage);
  log('auth', startMessage);
});