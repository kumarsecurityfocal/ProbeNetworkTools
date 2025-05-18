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

// Clean the API path by removing duplicate /api prefixes
function cleanApiPath(originalPath) {
  let result = originalPath;
  
  // Remove all /api prefixes
  while (result.startsWith('/api')) {
    result = result.substring(4);
  }
  
  // Ensure path starts with /
  if (!result.startsWith('/')) {
    result = '/' + result;
  }
  
  return result;
}

// Create an HTTP server
const server = http.createServer(async (req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;
  
  // Handle API proxy requests
  if (pathname.startsWith('/api')) {
    console.log(`[API REQUEST] ${req.method} ${pathname}`);
    
    // Clean the path for backend
    const backendPath = cleanApiPath(pathname);
    console.log(`Cleaned path: ${pathname} → ${backendPath}`);
    
    // Collect request body for POST/PUT/PATCH
    let body = '';
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      await new Promise((resolve) => {
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', resolve);
      });
    }
    
    // Get auth token if present or create one
    let token = req.headers.authorization;
    if (!token && 
        !pathname.includes('/login') && 
        !pathname.includes('/auth') && 
        !pathname.includes('/register')) {
      token = 'Bearer ' + createToken();
    }
    
    // Prepare headers
    const headers = { ...req.headers };
    headers.host = `localhost:${BACKEND_PORT}`;
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
    
    // Handle proxy errors
    proxyReq.on('error', (err) => {
      console.error(`Backend error: ${err.message}`);
      
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Service Unavailable',
        message: 'Backend service is temporarily unavailable. Please try again in a moment.'
      }));
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