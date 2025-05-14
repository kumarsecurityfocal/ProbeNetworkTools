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
  timeout: 60000, // Increase timeout to 60 seconds
  proxyTimeout: 60000, // Increase proxy timeout as well
  // No prefix rewrite - we'll handle this manually in our middleware
  onProxyReq: (proxyReq, req, res) => {
    // Log proxy request for debugging
    console.log(`Proxying to: ${req.method} ${proxyReq.path}`);
    console.log(`Original URL: ${req.originalUrl}, URL: ${req.url}`);
    console.log(`Target URL: ${apiProxyOptions.target}${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log proxy response for debugging
    console.log(`Proxy response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    console.error('Failed URL:', req.method, req.originalUrl);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'API Proxy Error', 
        message: err.message,
        path: req.originalUrl 
      });
    }
  }
};

// Create API proxy middleware
const apiProxy = createProxyMiddleware(apiProxyOptions);

// Define special routes before static file handling

// No need for separate routes to add /api prefix since we're using it consistently now

// Legacy route for /me (redirects to /users/me for backward compatibility)
app.use('/me', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Legacy /me endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/users/me`);
  console.log(`============================================`);
  
  // Override the URL to point to the new endpoint
  req.url = '/users/me';
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
});

// Explicitly proxy all /users/* endpoints to the backend
app.use('/users', (req, res, next) => {
  console.log(`============================================`);
  console.log(`User endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/users${req.url}`);
  console.log(`============================================`);
  
  // Let the proxy middleware handle the request - keep the original URL intact
  return apiProxy(req, res, next);
});

// Handle routes with /api prefix and prevent duplicate prefixes
app.use('/api', (req, res, next) => {
  // Create a custom path to avoid double /api prefixes
  // The path that FastAPI expects is already /api/[endpoint]
  const backendPath = req.url; // This is already '/endpoint' without the '/api' prefix
  
  console.log(`============================================`);
  console.log(`API request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Path without duplicate prefix: ${backendPath}`);
  console.log(`Forwarding to backend: ${apiProxyOptions.target}${backendPath}`);
  console.log(`============================================`);
  
  // Manually modify the URL to avoid proxy middleware's automatic handling
  req.url = backendPath;
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
});

// Explicitly proxy the /login endpoint to the backend
app.use('/login', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Login request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/login`);
  console.log(`============================================`);
  
  // Override the URL to ensure it points to exactly /login
  req.url = '/login';
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
});

// Explicitly proxy the /register endpoint to the backend
app.use('/register', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Register request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/register`);
  console.log(`============================================`);
  
  // Override the URL to ensure it points to exactly /register
  req.url = '/register';
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
});

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

// Fallback route for SPA support - handle specified routes explicitly 
// These are the main routes in our React app
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/diagnostics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/scheduled-probes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For GET requests to /login, serve the React app
// POST requests are already handled by the proxy middleware above
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For GET requests to /register, serve the React app
// POST requests are already handled by the proxy middleware above
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/reports', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});