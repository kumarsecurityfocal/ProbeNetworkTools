// Simple Auth Fixer tool for ProbeOps
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = 6000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Create a logs directory
const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected at:', res.rows[0].now);
  }
});

// Log current environment
console.log('Environment variables:');
for (const key of Object.keys(process.env).sort()) {
  if (key.includes('JWT') || key.includes('AUTH') || key.includes('SECRET')) {
    console.log(`${key}: ${key.includes('SECRET') ? '[REDACTED]' : process.env[key]}`);
  }
}

// Utility functions
function generateToken(user, secretKey, expiresIn = '24h') {
  const payload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    is_admin: user.is_admin || false,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };
  
  return jwt.sign(payload, secretKey);
}

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ProbeOps Auth Fixer</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px;
        }
        h1 { color: #333; }
        button, input[type=submit] { 
          padding: 10px 15px; 
          background: #007bff; 
          color: white; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer;
          margin: 10px 0;
        }
        button:hover, input[type=submit]:hover { background: #0069d9; }
        pre { 
          background: #f8f9fa; 
          padding: 15px; 
          border-radius: 5px; 
          overflow: auto;
          max-height: 400px;
        }
        .card {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 15px;
          margin-bottom: 20px;
        }
        .success { color: green; }
        .error { color: red; }
        input[type=text], input[type=password] {
          padding: 8px;
          margin: 5px 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          width: 100%;
          box-sizing: border-box;
        }
        label {
          display: block;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <h1>ProbeOps Authentication Fixer</h1>
      
      <div class="card">
        <h2>Fetch User from Database</h2>
        <form id="fetch-user-form">
          <label for="email">Email:</label>
          <input type="text" id="email" name="email" value="admin@probeops.com" required>
          <input type="submit" value="Fetch User">
        </form>
        <div id="user-result"></div>
      </div>
      
      <div class="card">
        <h2>Generate Admin Token</h2>
        <form id="generate-token-form">
          <label for="user-id">User ID:</label>
          <input type="text" id="user-id" name="userId" value="1" required>
          
          <label for="username">Username:</label>
          <input type="text" id="username" name="username" value="admin" required>
          
          <label for="user-email">Email:</label>
          <input type="text" id="user-email" name="email" value="admin@probeops.com" required>
          
          <label for="jwt-secret">JWT Secret:</label>
          <input type="text" id="jwt-secret" name="jwtSecret" placeholder="Enter JWT secret or leave blank for default" 
                 value="${process.env.JWT_SECRET || ''}">
          
          <label for="expiration">Expiration (hours):</label>
          <input type="text" id="expiration" name="expiration" value="24">
          
          <input type="submit" value="Generate Token">
        </form>
        <div id="token-result"></div>
      </div>
      
      <div class="card">
        <h2>Verify Token</h2>
        <form id="verify-token-form">
          <label for="token">JWT Token:</label>
          <input type="text" id="token" name="token" required>
          
          <label for="verify-secret">JWT Secret:</label>
          <input type="text" id="verify-secret" name="secret" placeholder="Enter JWT secret or leave blank for default"
                 value="${process.env.JWT_SECRET || ''}">
          
          <input type="submit" value="Verify Token">
        </form>
        <div id="verify-result"></div>
      </div>

      <div class="card">
        <h2>Create Direct Login Cookie</h2>
        <form id="create-cookie-form">
          <label for="cookie-user-id">User ID:</label>
          <input type="text" id="cookie-user-id" name="userId" value="1" required>
          
          <label for="cookie-username">Username:</label>
          <input type="text" id="cookie-username" name="username" value="admin" required>
          
          <input type="submit" value="Create Cookie & Login Link">
        </form>
        <div id="cookie-result"></div>
      </div>
      
      <script>
        // Fetch user from database
        document.getElementById('fetch-user-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const resultDiv = document.getElementById('user-result');
          resultDiv.innerHTML = '<p>Fetching user...</p>';
          
          const email = document.getElementById('email').value;
          
          try {
            const response = await fetch('/api/user-by-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (data.success) {
              // Auto-fill the token generation form
              document.getElementById('user-id').value = data.user.id;
              document.getElementById('username').value = data.user.username;
              document.getElementById('user-email').value = data.user.email;
              
              resultDiv.innerHTML = '<p class="success">User found</p><pre>' + 
                JSON.stringify(data.user, null, 2) + '</pre>';
            } else {
              resultDiv.innerHTML = '<p class="error">Error: ' + data.message + '</p>';
            }
          } catch (error) {
            resultDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
          }
        });
        
        // Generate token
        document.getElementById('generate-token-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const resultDiv = document.getElementById('token-result');
          resultDiv.innerHTML = '<p>Generating token...</p>';
          
          const userId = document.getElementById('user-id').value;
          const username = document.getElementById('username').value;
          const email = document.getElementById('user-email').value;
          const jwtSecret = document.getElementById('jwt-secret').value;
          const expiration = document.getElementById('expiration').value;
          
          try {
            const response = await fetch('/api/generate-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                userId, 
                username, 
                email, 
                jwtSecret,
                expiration
              })
            });
            
            const data = await response.json();
            
            if (data.success) {
              // Auto-fill the verification form
              document.getElementById('token').value = data.token;
              document.getElementById('verify-secret').value = jwtSecret;
              
              resultDiv.innerHTML = '<p class="success">Token generated</p><pre>' + 
                JSON.stringify(data, null, 2) + '</pre>';
                
              resultDiv.innerHTML += '<p>Token length: ' + data.token.length + ' characters</p>';
              resultDiv.innerHTML += '<p>Expiration: ' + new Date(data.payload.exp * 1000).toString() + '</p>';
              resultDiv.innerHTML += '<p><a href="/login-with-token?token=' + encodeURIComponent(data.token) + '" target="_blank">Login with this token</a></p>';
            } else {
              resultDiv.innerHTML = '<p class="error">Error: ' + data.message + '</p>';
            }
          } catch (error) {
            resultDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
          }
        });
        
        // Verify token
        document.getElementById('verify-token-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const resultDiv = document.getElementById('verify-result');
          resultDiv.innerHTML = '<p>Verifying token...</p>';
          
          const token = document.getElementById('token').value;
          const secret = document.getElementById('verify-secret').value;
          
          try {
            const response = await fetch('/api/verify-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, secret })
            });
            
            const data = await response.json();
            
            if (data.success) {
              resultDiv.innerHTML = '<p class="success">Token verified</p><pre>' + 
                JSON.stringify(data, null, 2) + '</pre>';
            } else {
              resultDiv.innerHTML = '<p class="error">Error: ' + data.message + '</p>';
              if (data.error) {
                resultDiv.innerHTML += '<pre>' + JSON.stringify(data.error, null, 2) + '</pre>';
              }
            }
          } catch (error) {
            resultDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
          }
        });
        
        // Create cookie
        document.getElementById('create-cookie-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const resultDiv = document.getElementById('cookie-result');
          resultDiv.innerHTML = '<p>Creating cookie...</p>';
          
          const userId = document.getElementById('cookie-user-id').value;
          const username = document.getElementById('cookie-username').value;
          
          try {
            const response = await fetch('/api/create-cookie', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, username })
            });
            
            const data = await response.json();
            
            if (data.success) {
              resultDiv.innerHTML = '<p class="success">Login cookie created</p>';
              resultDiv.innerHTML += `<p><a href="${data.loginUrl}" target="_blank">Click here to login directly</a></p>`;
              resultDiv.innerHTML += '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } else {
              resultDiv.innerHTML = '<p class="error">Error: ' + data.message + '</p>';
            }
          } catch (error) {
            resultDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
          }
        });
      </script>
    </body>
    </html>
  `);
});

// API routes
app.post('/api/user-by-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = result.rows[0];
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

app.post('/api/generate-token', (req, res) => {
  try {
    const { userId, username, email, jwtSecret, expiration } = req.body;
    
    // Validate inputs
    if (!userId || !username || !email) {
      return res.status(400).json({
        success: false,
        message: 'User ID, username, and email are required'
      });
    }
    
    // Use provided secret or environment variable
    const secretKey = jwtSecret || process.env.JWT_SECRET || 'probeops_default_secret_key';
    
    // Create user object
    const user = {
      id: userId,
      username,
      email,
      is_admin: true
    };
    
    // Generate token
    const exp = Math.floor(Date.now() / 1000) + (parseInt(expiration) * 60 * 60);
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      exp
    };
    
    const token = jwt.sign(payload, secretKey);
    
    // Log for debugging
    const timestamp = new Date().toISOString();
    fs.appendFileSync(
      './logs/token-generation.log', 
      `${timestamp} - Generated token for ${username} (${email}) using secret length: ${secretKey.length}\n`
    );
    
    res.json({
      success: true,
      token,
      payload,
      secretLength: secretKey.length
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating token',
      error: error.message
    });
  }
});

app.post('/api/verify-token', (req, res) => {
  try {
    const { token, secret } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    // Use provided secret or environment variable
    const secretKey = secret || process.env.JWT_SECRET || 'probeops_default_secret_key';
    
    // Verify token
    const decoded = jwt.verify(token, secretKey);
    
    // Log for debugging
    const timestamp = new Date().toISOString();
    fs.appendFileSync(
      './logs/token-verification.log', 
      `${timestamp} - Verified token for ${decoded.username || 'unknown'} using secret length: ${secretKey.length}\n`
    );
    
    res.json({
      success: true,
      decoded,
      secretLength: secretKey.length
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    
    // Log verification failures
    const timestamp = new Date().toISOString();
    fs.appendFileSync(
      './logs/token-verification.log', 
      `${timestamp} - ERROR: Token verification failed: ${error.message}\n`
    );
    
    res.status(500).json({
      success: false,
      message: 'Error verifying token',
      error: {
        name: error.name,
        message: error.message
      }
    });
  }
});

app.post('/api/create-cookie', (req, res) => {
  try {
    const { userId, username } = req.body;
    
    if (!userId || !username) {
      return res.status(400).json({
        success: false,
        message: 'User ID and username are required'
      });
    }
    
    // Create a direct login URL
    const userData = {
      id: userId,
      username,
      email: `${username}@probeops.com`,
      is_admin: true
    };
    
    const jsonData = JSON.stringify(userData);
    const base64Data = Buffer.from(jsonData).toString('base64');
    
    // Create login URL
    const loginUrl = `/direct-login?data=${encodeURIComponent(base64Data)}`;
    
    res.json({
      success: true,
      loginUrl,
      userData,
      encodedData: base64Data
    });
  } catch (error) {
    console.error('Error creating cookie:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating cookie',
      error: error.message
    });
  }
});

app.get('/login-with-token', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send('Token is required');
  }
  
  // Create a simple HTML page that sets the token in localStorage and redirects
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Login with Token</title>
      <script>
        // Store the token in localStorage
        localStorage.setItem('auth_token', '${token}');
        
        // Redirect to the dashboard
        window.location.href = '/dashboard';
      </script>
    </head>
    <body>
      <h1>Logging in with token...</h1>
      <p>If you are not redirected, <a href="/dashboard">click here</a>.</p>
    </body>
    </html>
  `);
});

app.get('/direct-login', (req, res) => {
  const { data } = req.query;
  
  if (!data) {
    return res.status(400).send('Login data is required');
  }
  
  try {
    // Decode the base64 data
    const jsonData = Buffer.from(data, 'base64').toString();
    const userData = JSON.parse(jsonData);
    
    // Create a simple HTML page that sets the user data in localStorage and redirects
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Direct Login</title>
        <script>
          // Store the user data in localStorage
          localStorage.setItem('user', '${JSON.stringify(userData)}');
          localStorage.setItem('isAuthenticated', 'true');
          
          // Redirect to the dashboard
          window.location.href = '/dashboard';
        </script>
      </head>
      <body>
        <h1>Logging in directly...</h1>
        <p>If you are not redirected, <a href="/dashboard">click here</a>.</p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error during direct login:', error);
    res.status(500).send('Error during login: ' + error.message);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Auth fixer running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the auth fixer tool`);
});