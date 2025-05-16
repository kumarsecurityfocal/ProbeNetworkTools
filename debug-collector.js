// Debug and diagnostic log collector for ProbeOps
const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { Pool } = require('pg');

// Setup express router
const app = express();
const router = express.Router();
const PORT = 7000;

// Add middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Function to collect system logs
function collectSystemLogs() {
  return new Promise((resolve, reject) => {
    exec('ps aux | grep node', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject(error);
      }
      resolve({ processes: stdout });
    });
  });
}

// Function to check database connectivity
async function checkDatabaseConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Test connection
    const result = await pool.query('SELECT current_timestamp as time, current_database() as database');
    
    // Get tables
    const tables = await pool.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t 
      WHERE table_schema = 'public'
    `);
    
    return {
      connected: true,
      timestamp: result.rows[0].time,
      database: result.rows[0].database,
      tables: tables.rows.map(t => ({
        name: t.table_name,
        columns: t.column_count
      }))
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
      stack: err.stack
    };
  } finally {
    await pool.end();
  }
}

// Function to check JWT configuration
function checkJwtConfig() {
  return {
    jwt_secret_exists: !!process.env.JWT_SECRET,
    jwt_secret_length: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
    jwt_expires_in: process.env.JWT_EXPIRES_IN || '24h'
  };
}

// Function to check auth-related environment variables
function checkAuthConfig() {
  return {
    has_admin_user: !!process.env.ADMIN_USERNAME,
    has_admin_password: !!process.env.ADMIN_PASSWORD,
    auth_mode: process.env.AUTH_MODE || 'jwt'
  };
}

// Endpoint to gather diagnostic information
router.get('/diagnostics', async (req, res) => {
  try {
    const systemLogs = await collectSystemLogs();
    const dbConnection = await checkDatabaseConnection();
    const jwtConfig = checkJwtConfig();
    const authConfig = checkAuthConfig();
    
    // Get environment variables (sanitized)
    const envVars = {};
    Object.keys(process.env).forEach(key => {
      // Skip sensitive information
      if (key.includes('SECRET') || 
          key.includes('PASSWORD') || 
          key.includes('KEY')) {
        envVars[key] = '[REDACTED]';
      } else {
        envVars[key] = process.env[key];
      }
    });
    
    const diagnosticData = {
      timestamp: new Date().toISOString(),
      system: {
        nodejs_version: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      processes: systemLogs.processes,
      database: dbConnection,
      jwt: jwtConfig,
      auth: authConfig,
      environment: envVars
    };
    
    // Write to file
    const filename = `diagnostic-log-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(logsDir, filename),
      JSON.stringify(diagnosticData, null, 2)
    );
    
    res.json({
      success: true,
      message: 'Diagnostic data collected',
      data: diagnosticData,
      file: filename
    });
  } catch (error) {
    console.error('Error collecting diagnostics:', error);
    res.status(500).json({
      success: false,
      message: 'Error collecting diagnostic data',
      error: error.message
    });
  }
});

// Endpoint to test JWT token generation
router.post('/test-jwt', (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const { username, email, is_admin = false } = req.body;
    
    if (!username && !email) {
      return res.status(400).json({
        success: false,
        message: 'Username or email is required'
      });
    }
    
    const payload = {
      sub: 1, // Sample user ID
      username: username || 'test',
      email: email || 'test@example.com',
      is_admin: is_admin,
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };
    
    // Use environment JWT secret or fallback
    const secret = process.env.JWT_SECRET || 'debug_testing_secret';
    
    const token = jwt.sign(payload, secret);
    
    res.json({
      success: true,
      token,
      payload,
      debug_info: {
        secret_length: secret.length,
        secret_preview: `${secret.substr(0, 3)}...${secret.substr(-3)}`,
        exp_time: new Date(payload.exp * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating JWT:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating JWT',
      error: error.message
    });
  }
});

// Endpoint to test a JWT token
router.post('/verify-jwt', (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    // Use environment JWT secret or fallback
    const secret = process.env.JWT_SECRET || 'debug_testing_secret';
    
    const decoded = jwt.verify(token, secret);
    
    res.json({
      success: true,
      valid: true,
      decoded,
      debug_info: {
        secret_length: secret.length,
        secret_preview: `${secret.substr(0, 3)}...${secret.substr(-3)}`,
        token_type: token.split('.').length === 3 ? 'JWT' : 'Unknown'
      }
    });
  } catch (error) {
    console.error('Error verifying JWT:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying JWT',
      error: error.message,
      error_type: error.name
    });
  }
});

// Endpoint to test database queries
router.post('/test-db-query', async (req, res) => {
  try {
    const { query = 'SELECT current_timestamp' } = req.body;
    
    // Only allow SELECT queries for security
    if (!query.trim().toLowerCase().startsWith('select')) {
      return res.status(403).json({
        success: false,
        message: 'Only SELECT queries are allowed'
      });
    }
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const result = await pool.query(query);
    await pool.end();
    
    res.json({
      success: true,
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields.map(f => f.name)
    });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({
      success: false,
      message: 'Error executing query',
      error: error.message
    });
  }
});

// Endpoint to collect network info
router.get('/network-info', (req, res) => {
  exec('netstat -tuln', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error collecting network info',
        error: error.message
      });
    }
    
    res.json({
      success: true,
      network_info: stdout
    });
  });
});

// Register routes
app.use('/debug', router);

// HTML debug interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ProbeOps Debug Interface</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px;
        }
        h1 { color: #333; }
        button { 
          padding: 10px 15px; 
          background: #007bff; 
          color: white; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer;
          margin: 10px 0;
        }
        button:hover { background: #0069d9; }
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
      </style>
    </head>
    <body>
      <h1>ProbeOps Debug Interface</h1>
      
      <div class="card">
        <h2>System Diagnostics</h2>
        <button id="run-diagnostics">Run Full Diagnostics</button>
        <div id="diagnostics-result"></div>
      </div>
      
      <div class="card">
        <h2>JWT Token Testing</h2>
        <div>
          <label>Username: <input id="jwt-username" type="text" value="admin" /></label><br/>
          <label>Email: <input id="jwt-email" type="text" value="admin@probeops.com" /></label><br/>
          <label>Admin: <input id="jwt-admin" type="checkbox" checked /></label><br/>
          <button id="generate-jwt">Generate JWT</button>
        </div>
        <div id="jwt-result"></div>
        
        <hr/>
        
        <div>
          <label>Token to verify: <input id="verify-token" type="text" style="width:400px" /></label><br/>
          <button id="verify-jwt">Verify JWT</button>
        </div>
        <div id="verify-result"></div>
      </div>
      
      <div class="card">
        <h2>Database Testing</h2>
        <div>
          <label>SQL Query: <input id="db-query" type="text" value="SELECT * FROM users LIMIT 5" style="width:400px" /></label><br/>
          <button id="run-query">Run Query</button>
        </div>
        <div id="query-result"></div>
      </div>
      
      <div class="card">
        <h2>Network Information</h2>
        <button id="network-info">Get Network Info</button>
        <div id="network-result"></div>
      </div>

      <script>
        // Run diagnostics
        document.getElementById('run-diagnostics').addEventListener('click', async () => {
          const resultDiv = document.getElementById('diagnostics-result');
          resultDiv.innerHTML = '<p>Loading diagnostics...</p>';
          
          try {
            const response = await fetch('/debug/diagnostics');
            const data = await response.json();
            
            resultDiv.innerHTML = '<p class="success">Diagnostics completed</p><pre>' + 
              JSON.stringify(data, null, 2) + '</pre>';
          } catch (error) {
            resultDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
          }
        });
        
        // Generate JWT
        document.getElementById('generate-jwt').addEventListener('click', async () => {
          const resultDiv = document.getElementById('jwt-result');
          resultDiv.innerHTML = '<p>Generating JWT...</p>';
          
          const username = document.getElementById('jwt-username').value;
          const email = document.getElementById('jwt-email').value;
          const isAdmin = document.getElementById('jwt-admin').checked;
          
          try {
            const response = await fetch('/debug/test-jwt', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ username, email, is_admin: isAdmin })
            });
            
            const data = await response.json();
            
            if (data.success) {
              document.getElementById('verify-token').value = data.token;
              resultDiv.innerHTML = '<p class="success">JWT generated</p><pre>' + 
                JSON.stringify(data, null, 2) + '</pre>';
            } else {
              resultDiv.innerHTML = '<p class="error">Error: ' + data.message + '</p>';
            }
          } catch (error) {
            resultDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
          }
        });
        
        // Verify JWT
        document.getElementById('verify-jwt').addEventListener('click', async () => {
          const resultDiv = document.getElementById('verify-result');
          resultDiv.innerHTML = '<p>Verifying JWT...</p>';
          
          const token = document.getElementById('verify-token').value;
          
          try {
            const response = await fetch('/debug/verify-jwt', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ token })
            });
            
            const data = await response.json();
            
            if (data.success) {
              resultDiv.innerHTML = '<p class="success">JWT verified</p><pre>' + 
                JSON.stringify(data, null, 2) + '</pre>';
            } else {
              resultDiv.innerHTML = '<p class="error">Error: ' + data.message + '</p><pre>' + 
                JSON.stringify(data, null, 2) + '</pre>';
            }
          } catch (error) {
            resultDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
          }
        });
        
        // Run DB query
        document.getElementById('run-query').addEventListener('click', async () => {
          const resultDiv = document.getElementById('query-result');
          resultDiv.innerHTML = '<p>Executing query...</p>';
          
          const query = document.getElementById('db-query').value;
          
          try {
            const response = await fetch('/debug/test-db-query', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ query })
            });
            
            const data = await response.json();
            
            if (data.success) {
              resultDiv.innerHTML = '<p class="success">Query executed</p><pre>' + 
                JSON.stringify(data, null, 2) + '</pre>';
            } else {
              resultDiv.innerHTML = '<p class="error">Error: ' + data.message + '</p>';
            }
          } catch (error) {
            resultDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
          }
        });
        
        // Get network info
        document.getElementById('network-info').addEventListener('click', async () => {
          const resultDiv = document.getElementById('network-result');
          resultDiv.innerHTML = '<p>Getting network info...</p>';
          
          try {
            const response = await fetch('/debug/network-info');
            const data = await response.json();
            
            if (data.success) {
              resultDiv.innerHTML = '<p class="success">Network info retrieved</p><pre>' + 
                data.network_info + '</pre>';
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

// Start server
app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
});

module.exports = app;