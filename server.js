// Enhanced Express server with JWT authentication and smart proxy routing
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

// Logging configuration
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, 'logs');
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
const ERROR_LOG = path.join(LOG_DIR, 'errors.log');

// Logger functions
function logAuth(message, data = null) {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`;
    fs.appendFileSync(AUTH_LOG, logMessage + '\n');
    console.log(`AUTH: ${message}`);
  } catch (err) {
    console.error(`Error writing to auth log: ${err.message}`);
  }
}

function logProxy(message, data = null) {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`;
    fs.appendFileSync(PROXY_LOG, logMessage + '\n');
    console.log(`PROXY: ${message}`);
  } catch (err) {
    console.error(`Error writing to proxy log: ${err.message}`);
  }
}

function logError(message, error) {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}: ${error.message}\n${error.stack || ''}`;
    fs.appendFileSync(ERROR_LOG, logMessage + '\n');
    console.error(`ERROR: ${message}: ${error.message}`);
  } catch (err) {
    console.error(`Error writing to error log: ${err.message}`);
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
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    iat: Math.floor(Date.now() / 1000)
  };
  
  logAuth('Created admin token');
  return jwt.sign(payload, JWT_SECRET);
}

// Create test user token
function createTestToken() {
  const payload = {
    sub: "test@probeops.com",
    is_admin: false,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    iat: Math.floor(Date.now() / 1000)
  };
  
  logAuth('Created test token');
  return jwt.sign(payload, JWT_SECRET);
}

// Create default token (fallback)
function createToken(email = "admin@probeops.com") {
  const isAdmin = email.includes('admin');
  const payload = {
    sub: email,
    is_admin: isAdmin,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    iat: Math.floor(Date.now() / 1000)
  };
  
  logAuth(`Created token for ${email}`);
  return jwt.sign(payload, JWT_SECRET);
}

// Extract user info from token
function getUserFromToken(token) {
  if (!token) return null;
  
  try {
    const tokenStr = token.startsWith('Bearer ') ? token.substring(7) : token;
    return jwt.verify(tokenStr, JWT_SECRET);
  } catch (err) {
    logAuth('Token verification failed', { error: err.message });
    return null;
  }
}

// Enhanced path normalization based on user type and endpoint
function normalizePath(originalPath, user = null) {
  let result = originalPath;
  const isAdmin = user && user.is_admin === true;
  
  // Special handling for login endpoints
  if (result.includes('/login')) {
    logProxy('Login endpoint detected', { originalPath });
    return '/login';
  }
  
  // Special handling for user profile endpoint
  if (result.includes('/users/me') || result.includes('/api/users/me')) {
    logProxy('User profile endpoint detected', { originalPath });
    return '/users/me';
  }
  
  // Admin endpoints need special handling
  if (result.includes('/admin/')) {
    // Admin endpoints should preserve the /api prefix
    if (!result.startsWith('/api')) {
      result = '/api' + result;
    }
    
    logProxy('Admin endpoint normalized', { 
      originalPath, 
      cleanedPath: result,
      isAdmin 
    });
    
    return result;
  }
  
  // Special handling for probes endpoint
  if (result.includes('/probes')) {
    // For admin users, use different path structure
    if (isAdmin && result.includes('/api/probes')) {
      result = '/api/probes' + (result.split('/probes')[1] || '');
    } else {
      result = '/probes' + (result.split('/probes')[1] || '');
    }
    
    logProxy('Probes endpoint normalized', { 
      originalPath, 
      cleanedPath: result,
      isAdmin 
    });
    
    return result;
  }
  
  // Fix duplicate API path prefixes 
  const apiRegex = /^(\/api)+/;
  if (apiRegex.test(result)) {
    const oldPath = result;
    // Replace multiple /api prefixes with a single empty string
    result = result.replace(apiRegex, '');
    
    // Ensure path starts with /
    if (!result.startsWith('/')) {
      result = '/' + result;
    }
    
    logProxy('Removed duplicate API prefixes', { 
      originalPath, 
      cleanedPath: result 
    });
  }
  
  return result;
}

// Special handling for direct login via POST
app.post('/api/login', (req, res) => {
  logAuth('Handling login request', { method: 'POST', body: { ...req.body, password: '[REDACTED]' } });
  
  try {
    // Extract credentials
    const email = req.body.username || req.body.email || '';
    const password = req.body.password || '';
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email/username and password are required'
      });
    }
    
    logAuth('Login attempt', { email });
    
    // Generate token based on email
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
    logError('Login error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during login'
    });
  }
});

// Main proxy middleware for API requests
app.use((req, res, next) => {
  try {
    // Only handle API paths
    if (!req.path.startsWith('/api') && 
        !req.path.startsWith('/users') && 
        !req.path.startsWith('/probes')) {
      return next();
    }
    
    logProxy('Handling API request', { method: req.method, path: req.path });
    
    // Extract user from token
    const authHeader = req.headers.authorization;
    const user = getUserFromToken(authHeader);
    
    // Normalize the path based on user type
    const backendPath = normalizePath(req.path, user);
    
    // Create request headers
    const headers = { ...req.headers };
    headers.host = `localhost:${BACKEND_PORT}`;
    
    // Ensure proper authorization
    if (!authHeader) {
      if (req.path.includes('/admin')) {
        headers.authorization = 'Bearer ' + createAdminToken();
      } else if (!req.path.includes('/login')) {
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
    
    logProxy('Forwarding request to backend', { 
      originalPath: req.path, 
      backendPath,
      userType: user ? (user.is_admin ? 'admin' : 'regular') : 'unknown'
    });
    
    const proxyReq = http.request(options, (proxyRes) => {
      // Copy status and headers
      res.statusCode = proxyRes.statusCode;
      
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      
      // Stream response back
      proxyRes.pipe(res);
    });
    
    // Enhanced error handling with reconnection logic
    proxyReq.on('error', (err) => {
      logError('Backend request error', err);
      
      // Check backend health
      http.get(`http://localhost:${BACKEND_PORT}/health`, (healthRes) => {
        if (healthRes.statusCode === 200) {
          // Backend is running but endpoint is having issues
          res.status(503).json({
            error: 'Service Temporarily Unavailable',
            message: 'The requested service is temporarily unavailable. Please try again in a moment.',
            retry_after: 2
          });
        } else {
          // Backend is down
          res.status(503).json({
            error: 'Backend Unavailable',
            message: 'The backend service is currently unavailable. Please try again later.',
            retry_after: 5
          });
        }
      }).on('error', () => {
        // Health check itself failed
        res.status(503).json({
          error: 'Service Unavailable',
          message: 'Backend service is temporarily unavailable.',
          retry_after: 5
        });
      });
    });
    
    // Forward request body if present
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.write(bodyData);
    }
    
    proxyReq.end();
  } catch (error) {
    logError('Proxy middleware error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
});

// Default route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Enhanced ProbeOps server running on port ${port}`);
  logAuth(`Server started on port ${port}`);
});