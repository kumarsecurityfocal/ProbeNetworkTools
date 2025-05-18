/**
 * Simple direct frontend server for ProbeOps development
 * This server serves the React frontend directly without NGINX
 */

const express = require('express');
const path = require('path');
const http = require('http');

// Create express app
const app = express();
const port = process.env.PORT || 3000;

// Handle API proxying directly without http-proxy-middleware
app.use('/api', (req, res) => {
  console.log(`Proxying API request: ${req.method} ${req.url}`);
  
  // Forward the request to the backend API
  const options = {
    hostname: '127.0.0.1',
    port: 8000,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: '127.0.0.1:8000'
    }
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    
    // Copy headers from proxy response
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Pipe the proxy response to our response
    proxyRes.pipe(res);
  });
  
  // Handle errors
  proxyReq.on('error', (e) => {
    console.error(`Proxy error: ${e.message}`);
    res.status(500).send({ error: 'Proxy error', message: e.message });
  });
  
  // If there's a request body, pipe it to the proxy request
  if (req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  proxyReq.end();
});

// Serve static files from the frontend dist directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// For all other routes, serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Direct frontend server running at http://0.0.0.0:${port}`);
  console.log(`API requests are proxied to http://127.0.0.1:8000`);
});

console.log('====== Development Mode Details ======');
console.log('- Frontend served directly (no NGINX)');
console.log('- Backend authentication is bypassed');
console.log('- All users have admin access');
console.log('====================================');