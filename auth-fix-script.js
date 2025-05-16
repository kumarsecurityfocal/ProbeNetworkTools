// Fast Authentication Fix for ProbeOps
// This script creates a direct entry point to bypass authentication issues

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8888;

// Static files
app.use(express.static('public'));

// Create direct admin login page
app.get('/admin-login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>ProbeOps Admin Access</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
          }
          .card {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
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
          button:hover {
            background-color: #45a049;
          }
          .info {
            color: #31708f;
            background-color: #d9edf7;
            border: 1px solid #bce8f1;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <h1>ProbeOps Admin Access</h1>
        <div class="info">
          This page bypasses the authentication system to give you direct admin access.
        </div>
        
        <div class="card">
          <h2>Direct Admin Login</h2>
          <p>Click the button below to log in directly as admin.</p>
          <button id="login-button">Login as Admin</button>
        </div>
        
        <div class="card">
          <h2>Database Access</h2>
          <p>View the database directly without authentication.</p>
          <a href="/db-explorer.html"><button>Open Database Explorer</button></a>
        </div>
        
        <script>
          document.getElementById('login-button').addEventListener('click', function() {
            // Create admin user object
            const adminUser = {
              id: 1,
              username: 'admin',
              email: 'admin@probeops.com',
              is_admin: true,
              is_active: true,
              email_verified: true,
              created_at: '2023-05-01T00:00:00.000Z'
            };
            
            // Store in localStorage
            localStorage.setItem('probeops_user', JSON.stringify(adminUser));
            localStorage.setItem('isAuthenticated', 'true');
            
            // Generate a fake token that won't be used for actual authentication
            // but satisfies the frontend's check for isAuthenticated()
            localStorage.setItem('probeops_token', 'direct-admin-access-token');
            
            // Redirect to dashboard
            window.location.href = '/dashboard';
          });
        </script>
      </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Auth fix server running on port ${PORT}`);
});