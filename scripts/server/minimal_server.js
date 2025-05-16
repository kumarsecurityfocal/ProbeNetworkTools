const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');

// Create express app
const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Proxy configuration
const apiProxyOptions = {
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '' // Remove /api prefix when forwarding
  },
  onProxyReq: (proxyReq, req) => {
    // Forward auth header if present
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  }
};

// Create proxy middleware
const apiProxy = createProxyMiddleware(apiProxyOptions);

// API keys endpoint - Direct HTTP request
app.use('/keys', (req, res) => {
  console.log(`API keys request: ${req.method} ${req.url}`);
  
  // Extract token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Build path
  let path = '/keys';
  if (req.url !== '/' && req.url !== '') {
    path += req.url;
  } else {
    path += '/';
  }
  
  // Collect request body for POST/PUT
  let bodyData = '';
  req.on('data', chunk => {
    bodyData += chunk;
  });
  
  req.on('end', () => {
    // Create HTTP request options
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: path,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    // Make the request
    const backendReq = http.request(options, (backendRes) => {
      // Forward status
      res.status(backendRes.statusCode);
      
      // Forward headers
      Object.keys(backendRes.headers).forEach(key => {
        if (key !== 'transfer-encoding') {
          res.setHeader(key, backendRes.headers[key]);
        }
      });
      
      // Set content type
      res.setHeader('Content-Type', 'application/json');
      
      // Collect response data
      let responseData = '';
      backendRes.on('data', chunk => {
        responseData += chunk;
      });
      
      backendRes.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          res.json(jsonData);
        } catch (e) {
          console.error('Failed to parse JSON response');
          if (req.method === 'GET') {
            res.json([]);
          } else {
            res.json({});
          }
        }
      });
    });
    
    backendReq.on('error', error => {
      console.error('Backend request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
    
    // Send body data if present
    if (bodyData) {
      backendReq.write(bodyData);
    }
    
    backendReq.end();
  });
});

// History endpoint - Direct HTTP request
app.use('/history', (req, res) => {
  console.log(`History request: ${req.method} ${req.url}`);
  
  // Extract token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  // Build path
  let path = '/history';
  if (req.url !== '/' && req.url !== '') {
    path += req.url;
  }
  
  // Create HTTP request options
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: path,
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Make the request
  const backendReq = http.request(options, (backendRes) => {
    // Forward status
    res.status(backendRes.statusCode);
    
    // Forward headers
    Object.keys(backendRes.headers).forEach(key => {
      if (key !== 'transfer-encoding') {
        res.setHeader(key, backendRes.headers[key]);
      }
    });
    
    // Set content type
    res.setHeader('Content-Type', 'application/json');
    
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      try {
        const jsonData = JSON.parse(responseData);
        res.json(jsonData);
      } catch (e) {
        console.error('Failed to parse JSON response');
        res.json([]);
      }
    });
  });
  
  backendReq.on('error', error => {
    console.error('Backend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
  
  backendReq.end();
});

// Subscription endpoint - Direct HTTP request
app.use('/subscription', (req, res) => {
  console.log(`Subscription request: ${req.method} ${req.url}`);
  
  // Extract token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Create HTTP request options
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/users/me/subscription',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Make the request
  const backendReq = http.request(options, (backendRes) => {
    // Forward status
    res.status(backendRes.statusCode);
    
    // Forward headers
    Object.keys(backendRes.headers).forEach(key => {
      if (key !== 'transfer-encoding') {
        res.setHeader(key, backendRes.headers[key]);
      }
    });
    
    // Set content type
    res.setHeader('Content-Type', 'application/json');
    
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      try {
        const jsonData = JSON.parse(responseData);
        res.json(jsonData);
      } catch (e) {
        console.error('Failed to parse JSON response');
        res.json({});
      }
    });
  });
  
  backendReq.on('error', error => {
    console.error('Backend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
  
  backendReq.end();
});

// Metrics endpoint - Uses URL rewriting
app.use('/metrics', (req, res, next) => {
  console.log(`Metrics request: ${req.method} ${req.originalUrl}`);
  req.url = req.originalUrl; // Preserve the original URL
  apiProxy(req, res, next);
});

// General API proxy for other endpoints
app.use('/api', apiProxy);

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});