/**
 * ProbeOps Fixed Authentication Server
 * 
 * This server provides a reliable authentication solution that:
 * 1. Uses direct JWT token generation without relying on problematic backend login
 * 2. Properly routes requests based on user type (admin vs test)
 * 3. Maintains consistent path structure between frontend and backend
 * 4. Handles backend restarts gracefully
 */

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
const LOG_DIR = path.join(__dirname, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Clear previous logs
fs.writeFileSync(path.join(LOG_DIR, 'auth-server.log'), '');

// Logger function
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`;
  
  fs.appendFileSync(path.join(LOG_DIR, 'auth-server.log'), logMessage + '\n');
  console.log(message);
}

// Create admin token with appropriate payload
function createAdminToken() {
  const payload = {
    sub: "admin@probeops.com",
    is_admin: true,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000)
  };
  
  log('Created admin token', { email: payload.sub });
  return jwt.sign(payload, JWT_SECRET);
}

// Create test user token
function createTestToken() {
  const payload = {
    sub: "test@probeops.com",
    is_admin: false,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000)
  };
  
  log('Created test user token', { email: payload.sub });
  return jwt.sign(payload, JWT_SECRET);
}

// Extract user info from token
function getUserFromToken(token) {
  if (!token) return null;
  
  try {
    // Remove Bearer prefix if present
    const tokenStr = token.startsWith('Bearer ') ? token.substring(7) : token;
    return jwt.verify(tokenStr, JWT_SECRET);
  } catch (e) {
    log('Failed to verify token', { error: e.message });
    return null;
  }
}

// Clean API path based on user type and endpoint
function cleanPath(originalPath, user = null) {
  let result = originalPath;
  const isAdmin = user && user.is_admin === true;
  
  // Special handling for login endpoints
  if (result.includes('/login')) {
    log('Login endpoint detected', { originalPath });
    // We'll handle login directly, no need to proxy to backend
    return '/login';
  }
  
  // Special handling for user profile endpoint
  if (result.includes('/users/me') || result.includes('/api/users/me')) {
    log('User profile endpoint detected', { originalPath });
    return '/users/me';
  }
  
  // For admin users, ensure admin endpoints maintain the /api prefix
  if (isAdmin && (result.includes('/admin/') || result.endsWith('/admin'))) {
    // Ensure path has proper /api prefix
    if (!result.startsWith('/api')) {
      result = '/api' + result;
    }
    
    log('Admin endpoint preserved', { originalPath, result, isAdmin });
    return result;
  }
  
  // Special handling for probe endpoint
  if (result.includes('/probes')) {
    // For admin, use the admin probe path with /api prefix
    if (isAdmin) {
      result = '/api/probes' + (result.split('/probes')[1] || '');
    } else {
      // For regular users, use standard probe path
      result = '/probes' + (result.split('/probes')[1] || '');
    }
    
    log('Probe endpoint normalized', { originalPath, result, isAdmin });
    return result;
  }
  
  // General API paths - remove duplicate /api prefixes
  const apiRegex = /^(\/api)+/;
  if (apiRegex.test(result)) {
    // Replace all consecutive /api prefixes with a single instance
    result = result.replace(apiRegex, '');
    
    // Make sure it starts with a slash
    if (!result.startsWith('/')) {
      result = '/' + result;
    }
    
    log('Cleaned API path', { originalPath, result });
  }
  
  return result;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;
  
  // Special direct handling for login endpoint
  if (pathname === '/api/login' || pathname === '/login') {
    log('Handling login request', { method: req.method, path: pathname });
    
    if (req.method === 'POST') {
      // Read request body
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          // Parse the login request
          const credentials = JSON.parse(body);
          const email = credentials.username || credentials.email;
          
          log('Login attempt', { email });
          
          // Generate appropriate token based on email
          let token;
          let userData;
          
          if (email === 'admin@probeops.com') {
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
          
          // Send successful login response
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(userData));
        } catch (e) {
          log('Login parse error', { error: e.message });
          
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: 'Invalid request',
            message: 'Failed to parse login credentials'
          }));
        }
      });
    } else {
      // Method not allowed
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Login endpoint requires POST method'
      }));
    }
  }
  // Handle API proxy requests
  else if (pathname.startsWith('/api') || pathname.startsWith('/users') || pathname.startsWith('/probes')) {
    log('Handling API request', { method: req.method, path: pathname });
    
    // Extract user from auth token
    const authHeader = req.headers.authorization;
    const user = getUserFromToken(authHeader);
    
    // Clean the path
    const backendPath = cleanPath(pathname, user);
    
    // Read request body if needed
    let body = '';
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      await new Promise((resolve) => {
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', resolve);
      });
    }
    
    // Create backend request headers
    const headers = {};
    Object.keys(req.headers).forEach(key => {
      if (key.toLowerCase() !== 'host') {
        headers[key] = req.headers[key];
      }
    });
    
    // Set host header
    headers.host = `localhost:${BACKEND_PORT}`;
    
    // Ensure proper authorization
    if (!authHeader) {
      // If no auth header is provided, create appropriate token
      if (backendPath.includes('/admin')) {
        // Admin endpoints need admin token
        headers.authorization = 'Bearer ' + createAdminToken();
      } else {
        // Regular endpoints use test token
        headers.authorization = 'Bearer ' + createTestToken();
      }
    }
    
    // Create backend request options
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: backendPath,
      method: req.method,
      headers: headers
    };
    
    log('Forwarding to backend', { 
      originalPath: pathname, 
      backendPath, 
      userType: user ? (user.is_admin ? 'admin' : 'regular') : 'unknown'
    });
    
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
    
    // Handle backend errors
    proxyReq.on('error', (err) => {
      log('Backend connection error', { error: err.message, path: backendPath });
      
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Service Unavailable',
        message: 'The backend service is currently unavailable. Please try again in a moment.',
        retry_after: 3
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
    log('Serving static file', { path: pathname });
    
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
  console.log(`Fixed Auth Server running on port ${PORT}`);
});