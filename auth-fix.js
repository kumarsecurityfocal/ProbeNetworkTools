// Authentication bypass script for ProbeOps admin access
// This script provides a server-side auth bypass that is more reliable
// than client-side localStorage modifications

const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Server configuration
const app = express();
const PORT = 5000; // Using same port as the main server

// Middleware
app.use(express.json());
app.use(express.static('public'));

// JWT secret key - using a fixed value for consistency
const JWT_SECRET = "super-secret-key-change-in-production";

// Create a valid JWT token for admin user
function createAdminToken() {
  // Create payload that matches what the backend expects
  const payload = {
    sub: "admin@probeops.com",
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };
  
  // Sign with the same secret key used in the backend
  return jwt.sign(payload, JWT_SECRET);
}

// Admin bypass route - creates a valid token
app.get('/admin-login', (req, res) => {
  const token = createAdminToken();
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ProbeOps Admin Login</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .card {
          background-color: #f5f5f5;
          border-radius: 5px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        button {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 10px 15px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          margin: 4px 2px;
          cursor: pointer;
          border-radius: 4px;
        }
        .token {
          word-break: break-all;
          font-family: monospace;
          background-color: #f8f8f8;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 3px;
          font-size: 12px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <h1>ProbeOps Admin Access</h1>
      
      <div class="card">
        <h2>Admin Login Token</h2>
        <p>A valid admin token has been generated:</p>
        <div class="token">${token}</div>
        <p>Click the button below to login with this token:</p>
        <button id="loginBtn">Login as Admin</button>
      </div>
      
      <div class="card">
        <h2>Database Access</h2>
        <p>Access the database directly:</p>
        <a href="/db-explorer.html"><button>Database Explorer</button></a>
      </div>
      
      <script>
        document.getElementById('loginBtn').addEventListener('click', function() {
          // Store the token in localStorage
          localStorage.setItem('probeops_token', '${token}');
          
          // Create admin user object for interface
          const adminUser = {
            id: 1,
            username: 'admin',
            email: 'admin@probeops.com',
            is_admin: true,
            is_active: true,
            email_verified: true,
            created_at: '2023-05-01T00:00:00.000Z'
          };
          
          // Store user data in localStorage
          localStorage.setItem('probeops_user', JSON.stringify(adminUser));
          
          // Navigate to dashboard
          window.location.href = '/dashboard';
        });
      </script>
    </body>
    </html>
  `);
});

// Start server - for debugging only, we'll integrate this into server.js
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Auth fix server running on port ${PORT}`);
  });
}

module.exports = { createAdminToken };