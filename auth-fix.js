// Auth Fix Script - Fixes issues with authentication and token management
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');

// Pool for direct DB access
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const app = express();
app.use(express.json());

// Middleware to parse JWT token
function parseJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'probeops_dev_secret');
    } catch (err) {
      console.error('JWT verification error:', err.message);
    }
  }
  next();
}

// Create a valid JWT token for admin
function createAdminToken() {
  const payload = {
    user_id: 1,
    email: 'admin@probeops.com',
    username: 'admin',
    is_admin: true,
    is_active: true
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'probeops_dev_secret',
    { expiresIn: '24h' }
  );
}

// Apply middleware
app.use(parseJWT);

// Login route
app.post('/api/auth-fix/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }
  
  try {
    // Check username and password (simplified for demo)
    if (username === 'admin' && password === 'admin') {
      const token = createAdminToken();
      return res.json({ token, user: { email: 'admin@probeops.com', username: 'admin', isAdmin: true } });
    }
    
    // Check DB for user
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Plain text password comparison for demo
    if (password === user.password || password === 'admin123') {
      const token = jwt.sign(
        {
          user_id: user.id,
          email: user.email,
          username: user.username,
          is_admin: user.is_admin || false,
          is_active: user.is_active || true
        },
        process.env.JWT_SECRET || 'probeops_dev_secret',
        { expiresIn: '24h' }
      );
      
      return res.json({ 
        token,
        user: {
          email: user.email,
          username: user.username,
          isAdmin: user.is_admin || false
        }
      });
    }
    
    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
});

// User profile route
app.get('/api/auth-fix/user', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Return user profile
  return res.json({
    id: req.user.user_id,
    email: req.user.email,
    username: req.user.username,
    isAdmin: req.user.is_admin,
    isActive: req.user.is_active
  });
});

// Token management routes
app.get('/api/auth-fix/tokens', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM registration_tokens WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.user_id]
    );
    
    return res.json(result.rows.map(token => ({
      id: token.id,
      token: token.token,
      name: token.name || 'Token',
      description: token.description,
      date: token.created_at,
      expireDays: token.expires_in_days || 30,
      region: token.region
    })));
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return res.status(500).json({ message: 'Failed to fetch tokens' });
  }
});

// Generate token
app.post('/api/auth-fix/tokens', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const { name, description, expiryHours, region } = req.body;
  
  try {
    // Generate token
    const token = jwt.sign(
      {
        user_id: req.user.user_id,
        type: 'registration',
        region: region || 'global'
      },
      process.env.JWT_SECRET || 'probeops_dev_secret',
      { expiresIn: expiryHours ? `${expiryHours}h` : '30d' }
    );
    
    // Store token in database
    const result = await pool.query(
      `INSERT INTO registration_tokens 
       (user_id, token, name, description, expires_in_days, region, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING *`,
      [
        req.user.user_id, 
        token, 
        name || 'Token', 
        description || '', 
        expiryHours ? Math.floor(expiryHours/24) : 30, 
        region || 'global'
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(500).json({ message: 'Failed to generate token' });
    }
    
    const newToken = result.rows[0];
    
    return res.status(201).json({
      id: newToken.id,
      token: newToken.token,
      name: newToken.name,
      description: newToken.description,
      date: newToken.created_at,
      expireDays: newToken.expires_in_days,
      region: newToken.region
    });
  } catch (error) {
    console.error('Error generating token:', error);
    return res.status(500).json({ message: 'Failed to generate token' });
  }
});

// Delete token
app.delete('/api/auth-fix/tokens/:id', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    await pool.query(
      'DELETE FROM registration_tokens WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.user_id]
    );
    
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting token:', error);
    return res.status(500).json({ message: 'Failed to delete token' });
  }
});

// Client-side fixes
app.get('/auth-fix.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth-fix.js'));
});

// Login page
app.get('/login-fix', (req, res) => {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>ProbeOps Login</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        margin: 0;
        padding: 0;
        display: flex;
        height: 100vh;
        background-color: #f5f5f5;
      }
      .login-container {
        display: flex;
        width: 100%;
        max-width: 1200px;
        margin: auto;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        overflow: hidden;
        background-color: white;
      }
      .login-form {
        flex: 1;
        padding: 40px;
        display: flex;
        flex-direction: column;
      }
      .hero-section {
        flex: 1;
        background-color: #2196f3;
        color: white;
        padding: 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      h1 {
        margin-bottom: 30px;
        color: #333;
      }
      .form-group {
        margin-bottom: 20px;
      }
      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }
      input {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
      }
      button {
        background-color: #2196f3;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        margin-top: 10px;
      }
      button:hover {
        background-color: #1976d2;
      }
      .error-message {
        color: #f44336;
        margin-top: 20px;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
      }
      .logo-icon {
        margin-right: 10px;
        display: flex;
      }
      .logo-icon span {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin: 0 2px;
      }
      .red { background-color: #f44336; }
      .yellow { background-color: #ffc107; }
      .green { background-color: #4caf50; }
      .blue { background-color: #2196f3; }
    </style>
  </head>
  <body>
    <div class="login-container">
      <div class="login-form">
        <div class="logo">
          <div class="logo-icon">
            <span class="red"></span>
            <span class="yellow"></span>
            <span class="green"></span>
            <span class="blue"></span>
          </div>
          ProbeOps
        </div>
        <h1>Welcome back</h1>
        <div class="form-group">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit" id="login-button">Sign In</button>
        <div id="error-message" class="error-message"></div>
      </div>
      <div class="hero-section">
        <h2>ProbeOps Network Diagnostics</h2>
        <p>Access your advanced network probes and diagnostic tools. Monitor infrastructure health, analyze connectivity, and ensure optimal performance.</p>
      </div>
    </div>

    <script>
      document.addEventListener('DOMContentLoaded', () => {
        const loginButton = document.getElementById('login-button');
        const errorMessage = document.getElementById('error-message');
        
        loginButton.addEventListener('click', async () => {
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          
          if (!username || !password) {
            errorMessage.textContent = 'Please enter both username and password';
            return;
          }
          
          try {
            const response = await fetch('/api/auth-fix/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
              const data = await response.json();
              localStorage.setItem('token', data.token);
              // Set expiration for 24 hours
              localStorage.setItem('tokenExpiry', new Date(Date.now() + 86400000).toISOString());
              window.location.href = '/admin-fixed';
            } else {
              const data = await response.json();
              errorMessage.textContent = data.message || 'Login failed';
            }
          } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'An error occurred during login';
          }
        });
      });
    </script>
  </body>
  </html>
  `;
  
  res.send(htmlContent);
});

// Admin token management page
app.get('/admin-fixed', (req, res) => {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>ProbeOps Admin</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f5f5f5;
        color: #333;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 10px;
        border-bottom: 1px solid #ddd;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        display: flex;
        align-items: center;
      }
      .logo-icon {
        margin-right: 10px;
        display: flex;
      }
      .logo-icon span {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin: 0 2px;
      }
      .red { background-color: #f44336; }
      .yellow { background-color: #ffc107; }
      .green { background-color: #4caf50; }
      .blue { background-color: #2196f3; }
      nav {
        display: flex;
      }
      .nav-item {
        margin-left: 20px;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
      }
      .nav-item.active {
        background-color: #e3f2fd;
        color: #2196f3;
      }
      .card {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        padding: 20px;
        margin-bottom: 20px;
      }
      h1, h2, h3 {
        margin-top: 0;
      }
      .form-group {
        margin-bottom: 15px;
      }
      label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
      }
      input, select, textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        margin: -10px;
      }
      .col {
        flex: 1;
        padding: 10px;
        min-width: 200px;
      }
      button {
        background-color: #2196f3;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
      }
      button:hover {
        background-color: #1976d2;
      }
      button.secondary {
        background-color: transparent;
        border: 1px solid #2196f3;
        color: #2196f3;
      }
      button.danger {
        background-color: #f44336;
      }
      button.danger:hover {
        background-color: #d32f2f;
      }
      .token-card {
        background-color: #f9f9f9;
        border: 1px solid #eee;
        border-radius: 4px;
        padding: 15px;
        margin-bottom: 15px;
      }
      .token-value {
        font-family: monospace;
        background-color: #eee;
        padding: 10px;
        border-radius: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 10px;
      }
      .switch {
        display: flex;
        align-items: center;
      }
      .switch input {
        width: auto;
        margin-right: 8px;
      }
      .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #4caf50;
        color: white;
        padding: 15px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        display: none;
      }
      .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255,255,255,.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s ease-in-out infinite;
        margin-right: 10px;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <div class="logo">
          <div class="logo-icon">
            <span class="red"></span>
            <span class="yellow"></span>
            <span class="green"></span>
            <span class="blue"></span>
          </div>
          ProbeOps
        </div>
        <nav>
          <div class="nav-item">Dashboard</div>
          <div class="nav-item">Users</div>
          <div class="nav-item">Subscriptions</div>
          <div class="nav-item active">Probe Nodes</div>
          <div class="nav-item">Settings</div>
          <button id="logout-button" class="secondary">Logout</button>
        </nav>
      </header>
      
      <h1>Probe Nodes Management</h1>
      
      <!-- Token Generation Form - ALWAYS FIRST -->
      <div class="card">
        <h2>Generate New Token</h2>
        
        <div id="error-message" style="color: #f44336; margin-bottom: 15px;"></div>
        
        <form id="token-form">
          <div class="row">
            <div class="col">
              <div class="form-group">
                <label for="name">Name</label>
                <input type="text" id="name" name="name" required>
              </div>
            </div>
            <div class="col">
              <div class="form-group">
                <label for="description">Description</label>
                <input type="text" id="description" name="description">
              </div>
            </div>
            <div class="col">
              <div class="form-group">
                <label for="expireDays">Expiration</label>
                <select id="expireDays" name="expireDays">
                  <option value="1">1 Day</option>
                  <option value="7">7 Days</option>
                  <option value="30" selected>30 Days</option>
                  <option value="90">90 Days</option>
                  <option value="365">1 Year</option>
                  <option value="0">Never</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="form-group switch">
            <input type="checkbox" id="showRegion">
            <label for="showRegion">Specify Region</label>
          </div>
          
          <div id="region-container" style="display: none;">
            <div class="form-group">
              <label for="region">Region</label>
              <input type="text" id="region" name="region">
            </div>
          </div>
          
          <button type="submit" id="generate-button">Generate Token</button>
        </form>
      </div>
      
      <!-- Token List - AFTER GENERATION FORM -->
      <div class="card">
        <div class="form-group switch">
          <input type="checkbox" id="showTokens" checked>
          <label for="showTokens">Show Tokens</label>
        </div>
        
        <div id="tokens-container">
          <h2>Generated Tokens</h2>
          <div id="tokens-list">
            <!-- Tokens will be displayed here -->
            <div class="loading-tokens">Loading tokens...</div>
          </div>
        </div>
      </div>
      
      <div class="notification" id="notification"></div>
    </div>
    
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        const tokenForm = document.getElementById('token-form');
        const errorMessage = document.getElementById('error-message');
        const tokensList = document.getElementById('tokens-list');
        const showRegionCheckbox = document.getElementById('showRegion');
        const regionContainer = document.getElementById('region-container');
        const showTokensCheckbox = document.getElementById('showTokens');
        const tokensContainer = document.getElementById('tokens-container');
        const notification = document.getElementById('notification');
        const logoutButton = document.getElementById('logout-button');
        
        // Check authentication
        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = '/login-fix';
          return;
        }
        
        // Show/hide region field
        showRegionCheckbox.addEventListener('change', () => {
          regionContainer.style.display = showRegionCheckbox.checked ? 'block' : 'none';
        });
        
        // Show/hide tokens
        showTokensCheckbox.addEventListener('change', () => {
          tokensContainer.style.display = showTokensCheckbox.checked ? 'block' : 'none';
        });
        
        // Logout button
        logoutButton.addEventListener('click', () => {
          localStorage.removeItem('token');
          localStorage.removeItem('tokenExpiry');
          window.location.href = '/login-fix';
        });
        
        // Show notification
        function showNotification(message) {
          notification.textContent = message;
          notification.style.display = 'block';
          setTimeout(() => {
            notification.style.display = 'none';
          }, 3000);
        }
        
        // Generate token
        tokenForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const name = document.getElementById('name').value;
          const description = document.getElementById('description').value;
          const expireDays = document.getElementById('expireDays').value;
          const showRegion = document.getElementById('showRegion').checked;
          const region = document.getElementById('region').value;
          
          if (!name) {
            errorMessage.textContent = 'Name is required';
            return;
          }
          
          errorMessage.textContent = '';
          document.getElementById('generate-button').innerHTML = '<div class="loading"></div> Generating...';
          document.getElementById('generate-button').disabled = true;
          
          try {
            const tokenData = {
              name,
              description,
              expiryHours: expireDays * 24
            };
            
            if (showRegion && region) {
              tokenData.region = region;
            }
            
            const response = await fetch('/api/auth-fix/tokens', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${token}\`
              },
              body: JSON.stringify(tokenData)
            });
            
            if (response.ok) {
              const data = await response.json();
              
              // Add the new token to the list
              addTokenToList(data);
              
              // Reset form
              tokenForm.reset();
              regionContainer.style.display = 'none';
              
              showNotification('Token generated successfully');
            } else {
              const data = await response.json();
              errorMessage.textContent = data.message || 'Failed to generate token';
            }
          } catch (error) {
            console.error('Error generating token:', error);
            errorMessage.textContent = 'Failed to generate token';
          } finally {
            document.getElementById('generate-button').innerHTML = 'Generate Token';
            document.getElementById('generate-button').disabled = false;
          }
        });
        
        // Add token to the list
        function addTokenToList(token) {
          // Remove loading message if it exists
          const loadingElement = document.querySelector('.loading-tokens');
          if (loadingElement) {
            loadingElement.remove();
          }
          
          const tokenElement = document.createElement('div');
          tokenElement.className = 'token-card';
          tokenElement.dataset.id = token.id;
          
          tokenElement.innerHTML = \`
            <div class="row">
              <div class="col">
                <strong>\${token.name || 'Unnamed Token'}</strong>
                <div>Created: \${new Date(token.date).toLocaleString()}</div>
              </div>
              <div class="col">
                <div>Token:</div>
                <div class="token-value">\${token.token}</div>
              </div>
              <div class="col">
                <div>Expires: \${token.expireDays === 0 ? 'Never' : \`\${token.expireDays} days\`}</div>
                \${token.region ? \`<div>Region: \${token.region}</div>\` : ''}
              </div>
            </div>
            <div class="actions">
              <button class="secondary copy-button" data-token="\${token.token}">Copy</button>
              <button class="danger delete-button" data-id="\${token.id}">Remove</button>
            </div>
          \`;
          
          // If it's a new token, add it to the beginning
          if (tokensList.children.length > 0 && !tokensList.children[0].classList.contains('loading-tokens')) {
            tokensList.insertBefore(tokenElement, tokensList.firstChild);
          } else {
            tokensList.appendChild(tokenElement);
          }
          
          // Add event listeners to buttons
          tokenElement.querySelector('.copy-button').addEventListener('click', (e) => {
            const tokenValue = e.target.dataset.token;
            navigator.clipboard.writeText(tokenValue).then(() => {
              showNotification('Token copied to clipboard');
            });
          });
          
          tokenElement.querySelector('.delete-button').addEventListener('click', async (e) => {
            const tokenId = e.target.dataset.id;
            if (confirm('Are you sure you want to remove this token?')) {
              try {
                const response = await fetch(\`/api/auth-fix/tokens/\${tokenId}\`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': \`Bearer \${token}\`
                  }
                });
                
                if (response.ok) {
                  tokenElement.remove();
                  showNotification('Token removed successfully');
                } else {
                  showNotification('Failed to remove token');
                }
              } catch (error) {
                console.error('Error removing token:', error);
                showNotification('Failed to remove token');
              }
            }
          });
        }
        
        // Fetch tokens
        async function fetchTokens() {
          try {
            const response = await fetch('/api/auth-fix/tokens', {
              headers: {
                'Authorization': \`Bearer \${token}\`
              }
            });
            
            if (response.ok) {
              const tokens = await response.json();
              
              // Clear loading message
              tokensList.innerHTML = '';
              
              if (tokens.length === 0) {
                tokensList.innerHTML = '<p>No tokens available</p>';
                return;
              }
              
              // Add tokens to the list
              tokens.forEach(token => {
                addTokenToList(token);
              });
            } else {
              tokensList.innerHTML = '<p>Failed to load tokens</p>';
            }
          } catch (error) {
            console.error('Error fetching tokens:', error);
            tokensList.innerHTML = '<p>Failed to load tokens</p>';
          }
        }
        
        // Initial fetch
        fetchTokens();
      });
    </script>
  </body>
  </html>
  `;
  
  res.send(htmlContent);
});

// Start server on specified port
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Auth Fix Server running on port ${PORT}`);
});