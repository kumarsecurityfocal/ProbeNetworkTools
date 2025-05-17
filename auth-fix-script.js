/**
 * Simple Authentication Fix for ProbeOps
 * 
 * This script creates valid tokens for the admin user and provides
 * debugging information to help identify authentication issues.
 */

const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Create Express app
const app = express();
const port = 5000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Function to generate a valid admin token
function generateAdminToken() {
  const payload = {
    sub: "1", // User ID
    email: "admin@probeops.com",
    username: "admin",
    is_admin: true,
    is_active: true
  };
  
  // Use a development secret key (in production, this would be properly secured)
  const secret = "probeops_development_jwt_secret";
  
  // Create token with 24-hour expiration
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[AUTH-FIX] ${req.method} ${req.path}`);
  
  // Log authorization header if present
  if (req.headers.authorization) {
    console.log(`[AUTH-FIX] Auth header present: ${req.headers.authorization.substring(0, 15)}...`);
  } else {
    console.log('[AUTH-FIX] No authorization header');
  }
  
  next();
});

// Admin login handler
app.post('/api/login', (req, res) => {
  console.log('[AUTH-FIX] Login request received');
  
  // Generate a fresh token
  const token = generateAdminToken();
  console.log(`[AUTH-FIX] Generated admin token: ${token.substring(0, 15)}...`);
  
  // Respond with token and user object
  const response = {
    access_token: token,
    token_type: "bearer",
    user: {
      id: 1,
      username: "admin",
      email: "admin@probeops.com",
      is_admin: true,
      is_active: true,
      email_verified: true,
      created_at: '2023-05-01T00:00:00.000Z'
    }
  };
  
  // Write token to a debug file for reference
  fs.writeFileSync('admin-token.txt', token);
  console.log('[AUTH-FIX] Token saved to admin-token.txt for debugging');
  
  // Send the response
  res.json(response);
});

// Token verification endpoint - helps debug token issues
app.get('/api/verify-token', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No valid authorization header' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Verify token with the same secret used to create it
    const secret = "probeops_development_jwt_secret";
    const decoded = jwt.verify(token, secret);
    
    // Return decoded token for debugging
    res.json({
      valid: true,
      token_preview: token.substring(0, 15) + '...',
      decoded: decoded,
      expires_at: new Date(decoded.exp * 1000).toISOString()
    });
  } catch (error) {
    res.status(401).json({
      valid: false,
      error: error.message,
      token_preview: token.substring(0, 15) + '...'
    });
  }
});

// Fallback route handler for the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Auth fix script running on port ${port}`);
  console.log(`Login endpoint: http://localhost:${port}/api/login`);
  console.log(`Token verification: http://localhost:${port}/api/verify-token`);
});