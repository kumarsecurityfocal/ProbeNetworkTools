const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// API proxy middleware configuration
const apiProxyOptions = {
  target: 'http://localhost:8000', // FastAPI backend URL
  changeOrigin: true,
  secure: false,
  ws: true,
  xfwd: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    // Log proxy request for debugging
    console.log(`Proxying to: ${req.method} ${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log proxy response for debugging
    console.log(`Proxy response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'API Proxy Error', message: err.message });
  }
};

// Create API proxy middleware
const apiProxy = createProxyMiddleware(apiProxyOptions);

// Use API proxy for /api/* routes
app.use('/api', apiProxy);

// Also proxy auth routes directly
app.use('/login', apiProxy);
app.use('/register', apiProxy);

// Serve static files from the public directory (built frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Also serve files from the frontend directory for development
app.use('/src', express.static(path.join(__dirname, 'frontend', 'src')));

// For any request that doesn't match a static file
// serve the index.html - use explicit routes instead of wildcard to avoid path-to-regexp issues
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Explicit route for server test (not proxied)
app.get('/server/test', (req, res) => {
  res.json({ message: 'Express server is working!' });
});

// Fallback route for SPA support - use specific named parameters instead of wildcard
app.get('/:page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});