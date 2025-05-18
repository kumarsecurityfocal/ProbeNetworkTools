/**
 * Simple direct frontend server for ProbeOps development
 * This server serves the React frontend directly without NGINX or authentication
 */

const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Create express app
const app = express();
const port = process.env.PORT || 3000;

// Set up API proxy to forward requests to the backend
// This assumes the backend is running on port 8000
const apiProxy = createProxyMiddleware('/api', {
  target: 'http://127.0.0.1:8000',
  pathRewrite: {
    '^/api': '' // Remove /api prefix when forwarding to backend
  },
  changeOrigin: true,
  logLevel: 'debug'
});

// Use the proxy middleware
app.use('/api', apiProxy);

// Serve static files from the frontend build directory
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