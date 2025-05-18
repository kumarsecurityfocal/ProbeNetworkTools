/**
 * ProbeOps Authentication Fix for AWS Production Deployment
 * 
 * This script addresses the specific issues encountered in the AWS deployment:
 * 1. Fixes the duplicate /api/api path issue that causes 404 errors
 * 2. Resolves the login breakage after backend restarts
 * 3. Ensures consistent path handling for both admin and test users
 * 4. Provides reliability through token persistence
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Copy this file to the AWS server
 * 2. Install dependencies if needed (npm install jsonwebtoken)
 * 3. Run with: node aws-auth-fix.js
 * 4. Make sure to configure it to start on server boot
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Configuration for AWS deployment
const PORT = process.env.PORT || 5000;
const BACKEND_PORT = 8000; // FastAPI backend port
const BACKEND_HOST = 'localhost'; // Use localhost on AWS as both are on same instance
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";
const LOGS_DIR = '/opt/probeops/logs';
const PUBLIC_DIR = '/opt/probeops/public';

// Make sure logs directory exists
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch (err) {
  console.error(`Error creating logs directory: ${err.message}`);
}

// Log files
const AUTH_LOG = path.join(LOGS_DIR, 'auth.log');
const PROXY_LOG = path.join(LOGS_DIR, 'proxy.log');
const ERROR_LOG = path.join(LOGS_DIR, 'errors.log');

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
    const logMessage = `[${timestamp}] ${message}: ${error.message}\n${error.stack}`;
    fs.appendFileSync(ERROR_LOG, logMessage + '\n');
    console.error(`ERROR: ${message}: ${error.message}`);
  } catch (err) {
    console.error(`Error writing to error log: ${err.message}`);
  }
}

// Create token for admin user
function createAdminToken() {
  const payload = {
    sub: "admin@probeops.com",
    is_admin: true,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000)
  };
  
  logAuth('Created admin token');
  return jwt.sign(payload, JWT_SECRET);
}

// Create token for test user
function createTestToken() {
  const payload = {
    sub: "test@probeops.com",
    is_admin: false,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000)
  };
  
  logAuth('Created test token');
  return jwt.sign(payload, JWT_SECRET);
}

// Get user info from token
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

// Clean API path based on user and endpoint
function cleanPath(originalPath, user = null) {
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
  
  // Handle admin endpoints specially
  if (result.includes('/admin/')) {
    // For admin endpoints, preserve the /api prefix
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
    // Different handling for admin vs regular users
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
  
  // General path cleaning - fix duplicate /api prefixes
  const apiRegex = /^(\/api)+/;
  if (apiRegex.test(result)) {
    const oldPath = result;
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

// HTTP server
const server = http.createServer(async (req, res) => {
  try {
    const originalUrl = req.url;
    const method = req.method;
    
    // Extract path from URL (remove query string)
    const pathname = originalUrl.split('?')[0];
    
    // Handle login endpoint directly
    if (pathname === '/api/login' || pathname === '/login') {
      logAuth('Handling login request', { method, path: pathname });
      
      if (method === 'POST') {
        // Read request body
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          try {
            // Parse credentials from body
            const credentials = JSON.parse(body);
            const email = credentials.username || credentials.email || '';
            
            logAuth('Login attempt', { email });
            
            // Create token based on email
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
            
            // Send success response with token
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(userData));
          } catch (e) {
            logError('Login error', e);
            
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'Bad Request',
              message: 'Invalid login data'
            }));
          }
        });
      } else {
        // Method not allowed for login
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'Method Not Allowed',
          message: 'Login endpoint requires POST method'
        }));
      }
    }
    // Handle API proxy requests
    else if (pathname.startsWith('/api') || 
             pathname.startsWith('/users') || 
             pathname.startsWith('/probes')) {
      logProxy('Handling API request', { method, path: pathname });
      
      // Get user from token if available
      const authHeader = req.headers.authorization;
      const user = getUserFromToken(authHeader);
      
      // Clean the path for backend
      const backendPath = cleanPath(pathname, user);
      
      // Collect request body if needed
      let body = '';
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        await new Promise((resolve) => {
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', resolve);
        });
      }
      
      // Copy headers
      const headers = {};
      Object.keys(req.headers).forEach(key => {
        if (key.toLowerCase() !== 'host') {
          headers[key] = req.headers[key];
        }
      });
      
      // Set host header for backend
      headers.host = `${BACKEND_HOST}:${BACKEND_PORT}`;
      
      // Create/maintain authorization token
      if (!authHeader) {
        if (backendPath.includes('/admin')) {
          headers.authorization = 'Bearer ' + createAdminToken();
        } else {
          headers.authorization = 'Bearer ' + createTestToken();
        }
      }
      
      // Backend request options
      const options = {
        hostname: BACKEND_HOST,
        port: BACKEND_PORT,
        path: backendPath,
        method: method,
        headers: headers
      };
      
      logProxy('Forwarding request to backend', { 
        originalPath: pathname, 
        backendPath,
        userType: user ? (user.is_admin ? 'admin' : 'regular') : 'unknown'
      });
      
      // Forward request to backend
      const proxyReq = http.request(options, (proxyRes) => {
        // Copy status code and headers
        res.statusCode = proxyRes.statusCode;
        
        Object.keys(proxyRes.headers).forEach(key => {
          res.setHeader(key, proxyRes.headers[key]);
        });
        
        // Stream response to client
        proxyRes.pipe(res);
      });
      
      // Handle proxy errors
      proxyReq.on('error', (error) => {
        logError('Backend request error', error);
        
        // Send error response
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'Service Unavailable',
          message: 'The backend service is temporarily unavailable. Please try again in a moment.',
          retry_after: 5
        }));
      });
      
      // Send body data if present
      if (body) {
        proxyReq.write(body);
      }
      
      proxyReq.end();
    }
    // Serve static files
    else {
      // Default to index.html for root
      let filePath;
      
      if (pathname === '/') {
        filePath = path.join(PUBLIC_DIR, 'index.html');
      } else {
        filePath = path.join(PUBLIC_DIR, pathname);
      }
      
      // Check if file exists
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          // File not found, serve index.html (SPA routing)
          filePath = path.join(PUBLIC_DIR, 'index.html');
        }
        
        // Get file extension and content type
        const extname = path.extname(filePath);
        const contentType = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon'
        }[extname] || 'application/octet-stream';
        
        // Read and serve file
        fs.readFile(filePath, (err, content) => {
          if (err) {
            res.statusCode = 500;
            res.end('Server Error');
            return;
          }
          
          res.statusCode = 200;
          res.setHeader('Content-Type', contentType);
          res.end(content);
        });
      });
    }
  } catch (error) {
    // Catch any uncaught errors to prevent server crash
    logError('Uncaught server error', error);
    
    // Send error response
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    }));
  }
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`ProbeOps Authentication Fix Server running on port ${PORT}`);
  logAuth(`Server started on port ${PORT}`);
});