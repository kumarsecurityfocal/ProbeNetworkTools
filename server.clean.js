/**
 * ProbeOps Clean API Proxy
 * 
 * This is a simplified proxy server that forwards requests to the backend API
 * without complex token handling or authentication checks.
 * 
 * IMPORTANT: This file is used only in development mode with AUTH_BYPASS=true.
 * DO NOT use this in production!
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Parse JSON request bodies
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));

// Configure backend API proxy
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Proxy API requests to the backend
app.use('/api', (req, res, next) => {
  console.log(`Generic API request: ${req.method} ${req.url}`);
  
  // Extract the path after /api
  const backendPath = req.url;
  console.log(`Generic API backendPath: ${backendPath}`);
  
  // Forward request to backend with admin credentials (for auth bypass)
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api': '', // Remove the /api prefix when forwarding
    },
    onError: (err, req, res) => {
      console.error('Error with backend request:', err);
      res.status(500).send('Backend service unavailable');
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add a header indicating this is an auth bypass request
      proxyReq.setHeader('X-Auth-Bypass', 'true');
    }
  })(req, res, next);
});

// For all other requests, serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});