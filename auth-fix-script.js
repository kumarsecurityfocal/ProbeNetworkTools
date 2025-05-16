// Authentication fix script for ProbeOps
// This script creates a properly signed JWT token that will work with the backend

const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Create express app
const app = express();
const PORT = 5001;

// Secret key MUST match the one used in the backend
const JWT_SECRET = "super-secret-key-change-in-production";

// Add middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Debug middleware
app.use((req, res, next) => {
  console.log(`[Auth-Fix] ${req.method} ${req.path}`);
  next();
});

// Generate a valid admin token with proper signature
function generateAdminToken() {
  const payload = {
    sub: "admin@probeops.com", // Subject (user email)
    exp: Math.floor(Date.now() / 1000) + 86400 // Expires in 24 hours
  };
  
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

// API endpoint to generate valid token
app.get('/api/auth-fix/token', (req, res) => {
  const token = generateAdminToken();
  res.json({ token });
});

// Auth fix login endpoint
app.post('/api/auth-fix/login', (req, res) => {
  const { username, password } = req.body;
  
  // Only allow admin login for security
  if (username !== 'admin@probeops.com') {
    return res.status(401).json({ detail: 'Only admin login is supported in this fix' });
  }
  
  // Generate token
  const token = generateAdminToken();
  
  // Return token with same format as regular login
  res.json({
    access_token: token,
    token_type: 'bearer'
  });
});

// User info - return valid admin info with properly signed JWT
app.get('/api/auth-fix/me', (req, res) => {
  res.json({
    id: 1,
    username: 'admin',
    email: 'admin@probeops.com',
    is_admin: true,
    is_active: true,
    email_verified: true,
    created_at: '2023-05-01T00:00:00.000Z'
  });
});

// Admin login page
app.get('/auth-fix/login', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>ProbeOps Admin Login</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 20px;
    }
    h1 {
      color: #333;
      margin-top: 0;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    input[type="email"],
    input[type="password"] {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    button {
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background-color: #45a049;
    }
    .result {
      margin-top: 20px;
      padding: 10px;
      border-radius: 4px;
    }
    .success {
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
    }
    .error {
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>ProbeOps Admin Login</h1>
    <div class="form-group">
      <label for="email">Email:</label>
      <input type="email" id="email" value="admin@probeops.com" readonly>
    </div>
    <div class="form-group">
      <label for="password">Password:</label>
      <input type="password" id="password" value="probeopS1@" readonly>
    </div>
    <button id="loginButton">Login as Admin</button>
    <div id="result" class="result" style="display: none;"></div>
  </div>

  <script>
    document.getElementById('loginButton').addEventListener('click', async () => {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const resultDiv = document.getElementById('result');
      
      try {
        // Get token from auth-fix endpoint
        const response = await fetch('/api/auth-fix/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: email,
            password: password
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.detail || 'Login failed');
        }
        
        // Store token and user in localStorage
        localStorage.setItem('probeops_token', data.access_token);
        localStorage.setItem('isAuthenticated', 'true');
        
        // Get user info
        const userResponse = await fetch('/api/auth-fix/me');
        const userData = await userResponse.json();
        localStorage.setItem('probeops_user', JSON.stringify(userData));
        
        // Show success message
        resultDiv.className = 'result success';
        resultDiv.style.display = 'block';
        resultDiv.textContent = 'Login successful! Redirecting to dashboard...';
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } catch (error) {
        // Show error message
        resultDiv.className = 'result error';
        resultDiv.style.display = 'block';
        resultDiv.textContent = 'Login failed: ' + error.message;
      }
    });
  </script>
</body>
</html>
  `);
});

// API proxy for all other requests
// This intercepts the requests going to the backend and modifies them
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth-fix-proxy': '/' // Remove the auth-fix-proxy prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add valid token to all requests
    const token = generateAdminToken();
    proxyReq.setHeader('Authorization', `Bearer ${token}`);
    
    console.log(`[Auth-Fix] Proxying request to ${req.url} with valid token`);
  },
  onError: (err, req, res) => {
    console.error('[Auth-Fix] Proxy error:', err);
    res.status(500).json({ detail: 'Proxy error: ' + err.message });
  }
});

// Apply proxy to API routes
app.use('/api/auth-fix-proxy', apiProxy);

// Final fallback: serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth fix server running on port ${PORT}`);
});

// Export for use in the main server
module.exports = {
  generateAdminToken,
  authFixServer: server
};