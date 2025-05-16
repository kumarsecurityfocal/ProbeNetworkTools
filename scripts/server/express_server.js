const express = require('express');
const path = require('path');
const http = require('http');

// Create express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// History endpoint for GET requests
app.get('/history', (req, res) => {
  console.log(`GET history request`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/history/',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  const backendReq = http.request(options, (backendRes) => {
    let responseData = '';
    
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      try {
        const jsonData = JSON.parse(responseData);
        res.json(jsonData);
      } catch (e) {
        console.error('Failed to parse response:', e);
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

// API keys endpoint for GET requests
app.get('/keys', (req, res) => {
  console.log(`GET keys request`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/keys/',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  const backendReq = http.request(options, (backendRes) => {
    let responseData = '';
    
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      try {
        const jsonData = JSON.parse(responseData);
        res.json(jsonData);
      } catch (e) {
        console.error('Failed to parse response:', e);
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

// Subscription endpoint
app.get('/subscription', (req, res) => {
  console.log(`GET subscription request`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
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
  
  const backendReq = http.request(options, (backendRes) => {
    let responseData = '';
    
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      try {
        const jsonData = JSON.parse(responseData);
        res.json(jsonData);
      } catch (e) {
        console.error('Failed to parse response:', e);
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

// Static route for all other paths
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});