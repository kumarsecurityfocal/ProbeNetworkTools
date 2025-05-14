const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');
const handleKeysEndpoint = require('./keys_endpoint');

// Initialize express app
const app = express();
const port = process.env.PORT || 5000;

// API proxy middleware configuration
const apiProxyOptions = {
  target: 'http://localhost:8000', // FastAPI backend URL
  changeOrigin: true,
  secure: false,
  ws: true,
  xfwd: true,
  logLevel: 'debug',
  timeout: 60000, // Increase timeout to 60 seconds
  proxyTimeout: 60000 // Increase proxy timeout as well
};

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Create the API proxy middleware
const apiProxy = createProxyMiddleware({
  ...apiProxyOptions,
  pathRewrite: {
    '^/api': '' // Remove /api prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward authorization header if present
    const authHeader = req.headers.authorization || '';
    if (authHeader) {
      proxyReq.setHeader('Authorization', authHeader);
      console.log(`Forwarding Authorization header: ${authHeader.substring(0, 15)}...`);
    }
    console.log(`API proxy request: ${proxyReq.method} ${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`API proxy response status: ${proxyRes.statusCode}`);
  }
});

// API keys endpoint handler from external module
app.use('/keys', handleKeysEndpoint);

// Diagnostic history endpoint - Direct HTTP request approach
app.use('/history', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Diagnostics history endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Extract token from Authorization header
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  // Extract query parameters
  let path = '/history';
  if (req.url !== '/') {
    path += req.url;
  }
  
  console.log(`Making direct history request to: ${path}`);
  
  // Options for the direct HTTP request
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: path,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Create the direct HTTP request
  const historyReq = http.request(options, (historyRes) => {
    console.log(`History API status: ${historyRes.statusCode}`);
    
    // Set status code
    res.status(historyRes.statusCode);
    
    // Set response headers
    Object.keys(historyRes.headers).forEach(key => {
      if (key !== 'transfer-encoding') { // Skip this
        res.setHeader(key, historyRes.headers[key]);
      }
    });
    
    // Force content type to application/json
    res.setHeader('Content-Type', 'application/json');
    
    // Collect response data
    let responseData = '';
    historyRes.on('data', (chunk) => {
      responseData += chunk;
    });
    
    historyRes.on('end', () => {
      console.log(`History response data length: ${responseData.length} bytes`);
      
      try {
        // If it's valid JSON, parse and send it
        const jsonData = JSON.parse(responseData);
        console.log(`Successfully parsed history response as JSON with ${jsonData.length || 0} items`);
        res.json(jsonData);
      } catch (e) {
        console.error(`Error parsing history response as JSON:`, e);
        // Default to empty array if parsing fails
        res.json([]);
      }
    });
  });
  
  historyReq.on('error', (error) => {
    console.error(`Error in history request:`, error);
    res.status(500).json({ error: 'Failed to retrieve diagnostic history' });
  });
  
  historyReq.end();
});

// Subscription info endpoint - Direct HTTP request approach
app.use('/subscription', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Subscription endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Extract token from Authorization header
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    console.log('No authorization token provided for subscription endpoint');
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // We always want to fetch the current user's subscription
  const path = '/users/me/subscription';
  
  console.log(`Making direct subscription request to: ${path}`);
  
  // Options for the direct HTTP request
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: path,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Create the direct HTTP request
  const subscriptionReq = http.request(options, (subscriptionRes) => {
    console.log(`Subscription API status: ${subscriptionRes.statusCode}`);
    
    // Set status code
    res.status(subscriptionRes.statusCode);
    
    // Set response headers
    Object.keys(subscriptionRes.headers).forEach(key => {
      if (key !== 'transfer-encoding') { // Skip this
        res.setHeader(key, subscriptionRes.headers[key]);
      }
    });
    
    // Force content type to application/json
    res.setHeader('Content-Type', 'application/json');
    
    // Collect response data
    let responseData = '';
    subscriptionRes.on('data', (chunk) => {
      responseData += chunk;
    });
    
    subscriptionRes.on('end', () => {
      console.log(`Subscription response data length: ${responseData.length} bytes`);
      
      try {
        // If it's valid JSON, parse and send it
        const jsonData = JSON.parse(responseData);
        console.log(`Successfully parsed subscription response`);
        res.json(jsonData);
      } catch (e) {
        console.error(`Error parsing subscription response as JSON:`, e);
        // Default to empty object if parsing fails
        res.json({});
      }
    });
  });
  
  subscriptionReq.on('error', (error) => {
    console.error(`Error in subscription request:`, error);
    res.status(500).json({ error: 'Failed to retrieve subscription info' });
  });
  
  subscriptionReq.end();
});

// Metrics endpoint (using original URL approach)
app.use('/metrics', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Metrics endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // The backend expects /metrics/dashboard, so we need to keep the original URL structure
  console.log(`Forwarding to backend: ${apiProxyOptions.target}${req.originalUrl}`);
  console.log(`============================================`);
  
  // Override the URL with the original URL to preserve the full path
  req.url = req.originalUrl;
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
});

// General API proxy for other endpoints
app.use('/api', apiProxy);

// Serve static files from the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});