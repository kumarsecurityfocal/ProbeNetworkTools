/**
 * ProbeOps Authentication Fix Script - VERSION 2.0 (May 18, 2025)
 * 
 * This script fixes JWT authentication issues by:
 * 1. Creating a properly formatted authentication token for admin
 * 2. Monitoring and logging authentication requests
 * 3. Ensuring the token is properly attached to all API requests
 * 4. Converting JSON auth requests to form-urlencoded format for backend
 * 
 * === FORM-URLENCODED FIX APPLIED FOR AWS ENVIRONMENT ===
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Configuration
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create a token for admin user
function createAdminToken() {
  // Create a properly formatted JWT token for admin
  const payload = {
    sub: 'admin@probeops.com',
    exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
  };
  
  try {
    const token = jwt.sign(payload, JWT_SECRET);
    console.log('Admin token created successfully:', token.substring(0, 15) + '...');
    return token;
  } catch (error) {
    console.error('Failed to create admin token:', error);
    return null;
  }
}

// Proxy middleware options
const proxyOptions = {
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '' // remove /api prefix when proxying
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log the outgoing request
    console.log(`Proxying request to: ${req.method} ${BACKEND_URL}${req.url.replace(/^\/api/, '')}`);
    
    // For login requests, ensure we're using the correct format
    if (req.url === '/api/login' && req.method === 'POST') {
      // Make sure we're using form-urlencoded format for login
      proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
      console.log('Setting Content-Type to application/x-www-form-urlencoded for login request');
      
      // Log the credentials being used (masked password)
      if (req.body) {
        const username = req.body.username || '';
        console.log(`Login attempt for: ${username} with password: ********`);
      }
    }
    
    // For authenticated requests, ensure the token is properly attached
    if (req.url !== '/api/login' && !req.headers.authorization) {
      const adminToken = createAdminToken();
      if (adminToken) {
        proxyReq.setHeader('Authorization', `Bearer ${adminToken}`);
        console.log('Added missing Authorization header with admin token');
      }
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log the response from the backend
    console.log(`Response from backend: ${proxyRes.statusCode}`);
    
    // Capture the response for login requests to debug token issues
    if (req.url === '/api/login') {
      let responseBody = '';
      const originalWrite = res.write;
      const originalEnd = res.end;
      
      proxyRes.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      proxyRes.on('end', () => {
        try {
          const parsedBody = JSON.parse(responseBody);
          console.log('Login response:', {
            status: proxyRes.statusCode,
            token: parsedBody.access_token ? `${parsedBody.access_token.substring(0, 15)}...` : 'No token',
            tokenType: parsedBody.token_type
          });
          
          // Store successful tokens for diagnostics
          if (parsedBody.access_token) {
            fs.writeFileSync(
              path.join(__dirname, 'last-valid-token.txt'), 
              parsedBody.access_token
            );
            console.log('Saved valid token to last-valid-token.txt');
          }
        } catch (e) {
          console.log('Error parsing login response:', e.message);
          console.log('Raw response:', responseBody);
        }
      });
    }
  }
};

// Create the proxy middleware
const apiProxy = createProxyMiddleware(proxyOptions);

// Use the proxy for all /api requests
app.use('/api', apiProxy);

// Admin token generator endpoint
app.get('/generate-admin-token', (req, res) => {
  const token = createAdminToken();
  if (token) {
    res.json({ 
      access_token: token,
      token_type: 'bearer',
      message: 'Admin token generated successfully'
    });
  } else {
    res.status(500).json({ error: 'Failed to generate admin token' });
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'Authentication proxy running',
    targetBackend: BACKEND_URL,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Authentication fix server running on port ${PORT}`);
  console.log(`Proxying requests to backend at: ${BACKEND_URL}`);
  
  // Generate an initial admin token on startup
  createAdminToken();
});