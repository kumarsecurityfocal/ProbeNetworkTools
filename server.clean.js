// Clean Express server with simple API proxying to backend
const express = require('express');
const path = require('path');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Create express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log requests
app.use((req, res, next) => {
  if (req.url.includes('/login') || req.url.includes('/auth')) {
    console.log('API Request:', {
      method: req.method,
      url: req.url
    });
  }
  next();
});

// Handle direct access to frontend routes by returning the main app
app.get(['/login', '/admin', '/dashboard', '/troubleshooting', '/database', '/profile', '/settings'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API proxy to forward all backend requests
const apiProxy = createProxyMiddleware('/api', {
  target: 'http://127.0.0.1:8000',
  pathRewrite: {
    '^/api': '' // Remove /api prefix when forwarding to backend
  },
  changeOrigin: true,
  logLevel: 'debug'
});

// Use the proxy middleware for all /api routes
app.use('/api', apiProxy);

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});