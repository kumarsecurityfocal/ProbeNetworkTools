// Basic express server without http-proxy-middleware
const express = require('express');
const path = require('path');
const http = require('http');

// Create express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Custom middleware to parse URL and method
app.use((req, res, next) => {
  const url = req.url;
  
  // Handle specific routes directly
  if (url.startsWith('/history')) {
    return handleHistory(req, res);
  } 
  else if (url.startsWith('/keys')) {
    return handleKeys(req, res);
  }
  else if (url.startsWith('/subscription')) {
    return handleSubscription(req, res);
  }
  else {
    // For all other routes, serve the static React app
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Handler for history endpoint
function handleHistory(req, res) {
  console.log(`History request: ${req.method} ${req.url}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  // Forward request to backend
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/history/',
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.status(backendRes.statusCode);
      
      try {
        const jsonData = JSON.parse(responseData);
        res.json(jsonData);
      } catch (e) {
        console.error('Error parsing response:', e);
        res.json([]);
      }
    });
  });
  
  backendReq.on('error', error => {
    console.error('Error with backend request:', error);
    res.status(500).json({ error: 'Failed to retrieve data' });
  });
  
  backendReq.end();
}

// Handler for keys endpoint
function handleKeys(req, res) {
  console.log(`Keys request: ${req.method} ${req.url}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Forward request to backend
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/keys/',
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.status(backendRes.statusCode);
      
      try {
        const jsonData = JSON.parse(responseData);
        res.json(jsonData);
      } catch (e) {
        console.error('Error parsing response:', e);
        res.json([]);
      }
    });
  });
  
  // Pass on request body if present
  if (req.method === 'POST' || req.method === 'PUT') {
    let requestBody = '';
    req.on('data', chunk => {
      requestBody += chunk;
    });
    
    req.on('end', () => {
      if (requestBody) {
        backendReq.write(requestBody);
      }
      backendReq.end();
    });
  } else {
    backendReq.end();
  }
}

// Handler for subscription endpoint
function handleSubscription(req, res) {
  console.log(`Subscription request: ${req.method} ${req.url}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Forward request to backend
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/users/me/subscription',
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.status(backendRes.statusCode);
      
      try {
        const jsonData = JSON.parse(responseData);
        res.json(jsonData);
      } catch (e) {
        console.error('Error parsing response:', e);
        res.json({});
      }
    });
  });
  
  backendReq.on('error', error => {
    console.error('Error with backend request:', error);
    res.status(500).json({ error: 'Failed to retrieve subscription data' });
  });
  
  backendReq.end();
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});