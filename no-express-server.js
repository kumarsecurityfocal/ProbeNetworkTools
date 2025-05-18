// Simple HTTP server (without Express) to avoid path-to-regexp errors
const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const url = require('url');

// Configuration
const PORT = process.env.PORT || 5000;
const BACKEND_PORT = 8000;
const JWT_SECRET = "super-secret-key-change-in-production";
const PUBLIC_DIR = path.join(__dirname, 'public');

// Create a valid JWT token
function createToken(email = "admin@probeops.com") {
  const payload = {
    sub: email,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000)
  };
  
  console.log(`Creating token for ${email}`);
  const token = jwt.sign(payload, JWT_SECRET);
  return token;
}

// Enhanced logging for diagnostics
function logDebug(message, data = null) {
  const logMessage = `[${new Date().toISOString()}] ${message}${data ? ': ' + JSON.stringify(data) : ''}`;
  console.log(logMessage);
  
  // Optionally write to a file if needed
  // fs.appendFileSync('/opt/probeops/logs/proxy-debug.log', logMessage + '\n');
}

// Clean the API path by removing duplicate /api prefixes
function cleanApiPath(originalPath) {
  let result = originalPath;
  
  // Log the original path for debugging
  logDebug(`Cleaning path`, { original: originalPath });
  
  // Special handling for login/auth endpoints - critical for consistent authentication
  if (result.includes('/auth/login') || result.includes('/api/auth/login')) {
    logDebug(`Auth login endpoint detected`, { result: '/auth/login' });
    return '/auth/login';
  }
  
  if (result.includes('/login')) {
    // Handle both /api/login and /login consistently
    logDebug(`Standard login endpoint detected`, { result: '/login' });
    return '/login'; 
  }
  
  // Special handling for authentication-related endpoints
  if (result.includes('/users/me') || result.includes('/api/users/me')) {
    logDebug(`User profile endpoint detected`, { result: '/users/me' });
    return '/users/me';
  }
  
  // Special handling for admin endpoints which need to be preserved with correct structure
  if (result.includes('/admin/') || result.endsWith('/admin')) {
    // For admin endpoints, ensure we keep a single /api prefix
    const adminPath = result.replace(/^(\/api)+/, '/api');
    logDebug(`Admin endpoint detected and preserved`, { 
      original: originalPath, 
      cleaned: adminPath
    });
    return adminPath;
  }
  
  // Special handling for probes endpoint which seems to cause null issues
  if (result.includes('/probes')) {
    // We need to preserve the original structure but ensure consistency
    let probePath;
    
    // If it's directly in the API path, keep the /api prefix for admin
    if (result.includes('/api/probes') && result.includes('/admin')) {
      probePath = '/api/probes' + (result.split('/probes')[1] || '');
    } else {
      // For standard probe paths, normalize
      probePath = '/probes' + (result.split('/probes')[1] || '');
    }
    
    logDebug(`Probes endpoint detected`, { 
      original: originalPath, 
      cleaned: probePath,
      isAdmin: result.includes('/admin')
    });
    return probePath;
  }
  
  // Better handling for /api prefixes - use regex to match all occurrences
  const apiRegex = /^(\/api)+/;
  if (apiRegex.test(result)) {
    // Replace all consecutive /api prefixes with a single empty string
    result = result.replace(apiRegex, '');
    
    // Ensure path starts with /
    if (!result.startsWith('/')) {
      result = '/' + result;
    }
    
    logDebug(`Fixed multiple /api prefixes`, { 
      original: originalPath,
      cleaned: result 
    });
  }
  
  return result;
}

// Create an HTTP server
const server = http.createServer(async (req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;
  
  // Handle API proxy requests
  if (pathname.startsWith('/api') || pathname === '/login') {
    logDebug(`[API REQUEST] ${req.method} ${pathname}`);
    
    // Clean the path for backend
    const backendPath = cleanApiPath(pathname);
    logDebug(`Cleaned path for backend request`, { 
      original: pathname, 
      cleaned: backendPath 
    });
    
    // Collect request body for POST/PUT/PATCH
    let body = '';
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      await new Promise((resolve) => {
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', resolve);
      });
      
      // Log the request body for debugging (but don't log passwords)
      try {
        const bodyObj = JSON.parse(body);
        if (bodyObj.password) {
          bodyObj.password = '********'; // Mask password
        }
        logDebug(`Request body`, bodyObj);
      } catch (e) {
        // Not JSON or other parsing error
        logDebug(`Request body not JSON or error parsing`, { error: e.message });
      }
    }
    
    // Get auth token from request headers
    let token = req.headers.authorization;
    
    // Debug token information
    if (token) {
      logDebug(`Using existing authorization token`, { 
        hasToken: true,
        tokenStart: token.substring(0, 20) + '...' 
      });
      
      // Analyze token structure
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          // This is a JWT token, decode the payload (middle part)
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          logDebug(`Token payload`, {
            sub: payload.sub,
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'none',
            iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'none'
          });
        }
      } catch (e) {
        logDebug(`Error analyzing token`, { error: e.message });
      }
    } else if (!pathname.includes('/login') && 
        !pathname.includes('/auth') && 
        !pathname.includes('/register')) {
      // Create fallback token for non-auth endpoints
      token = 'Bearer ' + createToken();
      logDebug(`Created fallback token`, { tokenCreated: true });
    }
    
    // Prepare headers - copy them all except host
    const headers = {};
    Object.keys(req.headers).forEach(key => {
      if (key.toLowerCase() !== 'host') {
        headers[key] = req.headers[key];
      }
    });
    
    // Set correct host header for backend
    headers.host = `localhost:${BACKEND_PORT}`;
    
    // Add authorization if needed
    if (token) {
      headers.authorization = token;
    }
    
    // Create proxy request options
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: backendPath,
      method: req.method,
      headers: headers
    };
    
    // Forward request to backend
    const proxyReq = http.request(options, (proxyRes) => {
      // Copy status and headers
      res.statusCode = proxyRes.statusCode;
      
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      
      // Stream response data
      proxyRes.pipe(res);
    });
    
    // Enhanced error handling with reconnection logic
    proxyReq.on('error', (err) => {
      logDebug(`Backend connection error`, { 
        error: err.message,
        path: backendPath,
        method: req.method
      });
      
      // Try reconnecting to the backend with a health check
      http.get(`http://localhost:${BACKEND_PORT}/health`, (healthRes) => {
        if (healthRes.statusCode === 200) {
          logDebug(`Backend is healthy despite connection error`, { 
            statusCode: healthRes.statusCode 
          });
          
          // Collect health check data
          let healthData = '';
          healthRes.on('data', chunk => { healthData += chunk; });
          healthRes.on('end', () => {
            try {
              // Parse health response
              const healthInfo = JSON.parse(healthData);
              logDebug(`Backend health info`, healthInfo);
              
              // Send a specialized error for auth issues
              if (backendPath.includes('/login') || backendPath.includes('/auth')) {
                res.statusCode = 503;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  error: 'Authentication Service Unavailable',
                  message: 'The authentication service is restarting. Please try again in a moment.',
                  details: 'Backend is healthy but auth service may be initializing.',
                  retry_after: 2
                }));
              } else {
                // General error for other endpoints
                res.statusCode = 503;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  error: 'Service Temporarily Unavailable',
                  message: 'The requested service is restarting. Please refresh or try again.',
                  health_status: healthInfo.status,
                  retry_after: 2
                }));
              }
            } catch (e) {
              // Health check response wasn't valid JSON
              logDebug(`Error parsing health check data`, { error: e.message });
              sendDefaultErrorResponse();
            }
          });
        } else {
          // Health check failed
          logDebug(`Backend health check failed`, { statusCode: healthRes.statusCode });
          sendDefaultErrorResponse();
        }
      }).on('error', () => {
        // Health check request failed completely
        logDebug(`Backend is down - health check request failed`);
        sendDefaultErrorResponse();
      });
      
      // Default error response function
      function sendDefaultErrorResponse() {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'Service Unavailable',
          message: 'Backend service is temporarily unavailable. Please try again in a moment.',
          retry_after: 5
        }));
      }
    });
    
    // Send body data if present
    if (body) {
      proxyReq.write(body);
    }
    
    proxyReq.end();
    
  } else {
    // Serve static files
    let filePath;
    
    if (pathname === '/') {
      // Serve index.html for root
      filePath = path.join(PUBLIC_DIR, 'index.html');
    } else {
      // Serve requested file
      filePath = path.join(PUBLIC_DIR, pathname);
    }
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        // File not found, serve index.html for SPA routing
        filePath = path.join(PUBLIC_DIR, 'index.html');
      }
      
      // Get file extension
      const extname = path.extname(filePath);
      
      // Set content type based on extension
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
      
      // Read and serve the file
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
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});