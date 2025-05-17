// Simple standalone server to handle token management without React components
// This provides a backup interface while we fix the main application

const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const path = require('path');

// Setup Express server
const app = express();
const port = 5000;

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Admin credentials
const ADMIN_EMAIL = 'admin@probeops.com';
const JWT_SECRET = process.env.JWT_SECRET || 'develop-secret';

// Simple middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static('frontend/dist'));

// Create an admin token for authentication
function createAdminToken() {
  return jwt.sign({ email: ADMIN_EMAIL, is_admin: true }, JWT_SECRET, { expiresIn: '1d' });
}

// Simple auth middleware
function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Basic admin login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === ADMIN_EMAIL) {
    const token = createAdminToken();
    return res.json({ token, user: { email, is_admin: true } });
  }
  
  res.status(401).json({ message: 'Invalid credentials' });
});

// Get the current user
app.get('/api/user', authMiddleware, (req, res) => {
  res.json(req.user);
});

// Token management API
// Get all tokens
app.get('/api/tokens', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM api_keys ORDER BY created_at DESC');
    res.json({ tokens: result.rows });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ message: 'Failed to fetch tokens' });
  }
});

// Create a token
app.post('/api/tokens', authMiddleware, async (req, res) => {
  try {
    const { description } = req.body;
    
    // Generate a unique token
    const tokenValue = jwt.sign({ 
      description,
      created_at: new Date().toISOString()
    }, JWT_SECRET, { expiresIn: '30d' });
    
    // Set expiry to 30 days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    // Insert into database
    const result = await pool.query(
      'INSERT INTO api_keys (description, value, expiry_date) VALUES ($1, $2, $3) RETURNING *',
      [description, tokenValue, expiryDate]
    );
    
    const token = result.rows[0];
    
    // Return token info and value
    res.status(201).json({
      ...token,
      token: tokenValue
    });
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({ message: 'Failed to create token' });
  }
});

// Delete a token
app.delete('/api/tokens/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete from database
    const result = await pool.query('DELETE FROM api_keys WHERE id = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Token not found' });
    }
    
    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    console.error('Error deleting token:', error);
    res.status(500).json({ message: 'Failed to delete token' });
  }
});

// HTML for the simple token management interface
app.get('/token-manager', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ProbeOps Token Manager</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
        }
        button {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 10px;
        }
        button.delete {
          background: #f44336;
        }
        input[type="text"] {
          padding: 8px;
          width: 300px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f2f2f2;
        }
        .token-value {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          margin-top: 20px;
          word-break: break-all;
        }
        .status-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }
        .status-valid {
          background-color: #e8f5e9;
          color: #388e3c;
        }
        .status-expired {
          background-color: #ffecb3;
          color: #ff8f00;
        }
        .status-used {
          background-color: #e0e0e0;
          color: #616161;
        }
        .token-form {
          margin-bottom: 20px;
          display: flex;
          align-items: center;
        }
        .hide {
          display: none;
        }
        .logout {
          background: #607d8b;
          float: right;
        }
        .login-container {
          max-width: 400px;
          margin: 100px auto;
          padding: 20px;
          background: white;
          border-radius: 5px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      </style>
    </head>
    <body>
      <div id="login-section" class="login-container hide">
        <h2>Login to Token Manager</h2>
        <div>
          <div style="margin-bottom: 15px;">
            <label for="email">Email:</label>
            <input type="email" id="email" placeholder="admin@probeops.com" style="width: 100%; padding: 8px; margin-top: 5px;">
          </div>
          <div style="margin-bottom: 15px;">
            <label for="password">Password:</label>
            <input type="password" id="password" placeholder="Enter your password" style="width: 100%; padding: 8px; margin-top: 5px;">
          </div>
          <button id="login-btn" style="width: 100%;">Login</button>
        </div>
      </div>
      
      <div id="app" class="container hide">
        <div class="nav">
          <h1>ProbeOps Token Manager</h1>
          <button id="logout-btn" class="logout">Logout</button>
        </div>
        
        <div class="token-form">
          <input type="text" id="token-description" placeholder="Enter token description...">
          <button id="create-token-btn">Create Token</button>
        </div>
        
        <div id="new-token" class="token-value hide">
          <h3>Your New Token</h3>
          <p>Save this token securely. It will not be shown again.</p>
          <div id="token-display"></div>
          <button id="copy-token-btn">Copy Token</button>
        </div>
        
        <h2>Your Tokens</h2>
        <table id="tokens-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="tokens-list"></tbody>
        </table>
      </div>
      
      <script>
        let authToken = localStorage.getItem('authToken');
        const apiBaseUrl = '';
        
        // Check if user is logged in
        function checkAuth() {
          if (!authToken) {
            document.getElementById('login-section').classList.remove('hide');
            document.getElementById('app').classList.add('hide');
            return false;
          }
          
          document.getElementById('login-section').classList.add('hide');
          document.getElementById('app').classList.remove('hide');
          return true;
        }
        
        // Format date
        function formatDate(dateStr) {
          if (!dateStr) return 'N/A';
          const date = new Date(dateStr);
          return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
        
        // Check if a token is expired
        function isExpired(dateStr) {
          if (!dateStr) return false;
          return new Date(dateStr) < new Date();
        }
        
        // Fetch tokens
        async function fetchTokens() {
          try {
            const response = await fetch(apiBaseUrl + '/api/tokens', {
              headers: {
                'Authorization': 'Bearer ' + authToken
              }
            });
            
            if (!response.ok) {
              if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('authToken');
                authToken = null;
                checkAuth();
                return;
              }
              throw new Error('Failed to fetch tokens');
            }
            
            const data = await response.json();
            
            // Clear table
            const tokensList = document.getElementById('tokens-list');
            tokensList.innerHTML = '';
            
            // Add tokens to table
            data.tokens.forEach(token => {
              const row = document.createElement('tr');
              
              // Determine status
              let statusClass = 'status-valid';
              let statusText = 'Valid';
              
              if (token.used) {
                statusClass = 'status-used';
                statusText = 'Used';
              } else if (isExpired(token.expiry_date)) {
                statusClass = 'status-expired';
                statusText = 'Expired';
              }
              
              row.innerHTML = \`
                <td>\${token.id || 'N/A'}</td>
                <td>\${token.description || 'No description'}</td>
                <td>\${formatDate(token.created_at)}</td>
                <td>\${formatDate(token.expiry_date)}</td>
                <td><span class="status-badge \${statusClass}">\${statusText}</span></td>
                <td><button class="delete" data-id="\${token.id}">Revoke</button></td>
              \`;
              
              tokensList.appendChild(row);
            });
            
            // Add event listeners to delete buttons
            document.querySelectorAll('.delete').forEach(button => {
              button.addEventListener('click', () => {
                if (confirm('Are you sure you want to revoke this token?')) {
                  revokeToken(button.dataset.id);
                }
              });
            });
          } catch (error) {
            console.error('Error fetching tokens:', error);
            alert('Failed to fetch tokens: ' + error.message);
          }
        }
        
        // Login function
        async function login(email, password) {
          try {
            const response = await fetch(apiBaseUrl + '/api/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) {
              throw new Error('Login failed');
            }
            
            const data = await response.json();
            authToken = data.token;
            
            // Save token
            localStorage.setItem('authToken', authToken);
            
            // Show app
            checkAuth();
            
            // Fetch tokens
            fetchTokens();
          } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
          }
        }
        
        // Create token
        async function createToken(description) {
          try {
            const response = await fetch(apiBaseUrl + '/api/tokens', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
              },
              body: JSON.stringify({ description })
            });
            
            if (!response.ok) {
              throw new Error('Failed to create token');
            }
            
            const data = await response.json();
            
            // Show new token
            document.getElementById('new-token').classList.remove('hide');
            document.getElementById('token-display').textContent = data.token;
            
            // Clear input
            document.getElementById('token-description').value = '';
            
            // Refresh token list
            fetchTokens();
          } catch (error) {
            console.error('Error creating token:', error);
            alert('Failed to create token: ' + error.message);
          }
        }
        
        // Revoke token
        async function revokeToken(id) {
          try {
            const response = await fetch(\`\${apiBaseUrl}/api/tokens/\${id}\`, {
              method: 'DELETE',
              headers: {
                'Authorization': 'Bearer ' + authToken
              }
            });
            
            if (!response.ok) {
              throw new Error('Failed to revoke token');
            }
            
            // Refresh token list
            fetchTokens();
          } catch (error) {
            console.error('Error revoking token:', error);
            alert('Failed to revoke token: ' + error.message);
          }
        }
        
        // Event listeners
        document.addEventListener('DOMContentLoaded', () => {
          // Initial check
          if (checkAuth()) {
            fetchTokens();
          }
          
          // Login
          document.getElementById('login-btn').addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            login(email, password);
          });
          
          // Create token
          document.getElementById('create-token-btn').addEventListener('click', () => {
            const description = document.getElementById('token-description').value;
            if (!description) {
              alert('Please enter a description');
              return;
            }
            createToken(description);
          });
          
          // Copy token
          document.getElementById('copy-token-btn').addEventListener('click', () => {
            const tokenText = document.getElementById('token-display').textContent;
            navigator.clipboard.writeText(tokenText)
              .then(() => {
                alert('Token copied to clipboard');
              })
              .catch(err => {
                console.error('Failed to copy:', err);
                alert('Failed to copy token: ' + err.message);
              });
          });
          
          // Logout
          document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('authToken');
            authToken = null;
            checkAuth();
          });
        });
      </script>
    </body>
    </html>
  `);
});

// Serve frontend static files
app.get('*', (req, res) => {
  // Attempt to serve the React app
  res.sendFile(path.join(__dirname, '/frontend/dist/index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Auth fix server running on port ${port}`);
  console.log('Visit /token-manager to manage your tokens');
});