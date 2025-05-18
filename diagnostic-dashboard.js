/**
 * ProbeOps Diagnostic Dashboard
 * 
 * A standalone diagnostic tool accessible at /diagnostics with:
 * - Log collection capabilities
 * - System status overview
 * - Authentication state monitoring
 * - Versioned script updates
 * 
 * This dashboard doesn't require authentication and is intended for
 * admin use in troubleshooting production environments.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Import the debug collector functionality
const debugCollector = require('./debug-collector.js');

// Configuration 
const PORT = process.env.DIAGNOSTIC_PORT || 8888;
const VERSION = '1.0.0';
const DEBUG_DIR = './debug-logs';
const PASSWORD = process.env.DIAGNOSTIC_PASSWORD || 'probeops-diagnostics'; // Basic protection

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure debug directory exists
if (!fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

// Add a simple health check endpoint for monitoring
app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Create basic HTML template
const createHtml = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProbeOps Diagnostics</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f7f9fc;
    }
    header {
      background-color: #1a2a40;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      margin: 0;
      font-size: 1.8rem;
    }
    .version {
      font-size: 0.8rem;
      color: #bbb;
    }
    .card {
      background-color: white;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
    .card h2 {
      margin-top: 0;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
      color: #1a2a40;
    }
    button, .button {
      background-color: #0062cc;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    button:hover, .button:hover {
      background-color: #0056b3;
    }
    button.secondary {
      background-color: #6c757d;
    }
    button.secondary:hover {
      background-color: #5a6268;
    }
    button.danger {
      background-color: #dc3545;
    }
    button.danger:hover {
      background-color: #c82333;
    }
    pre {
      background-color: #f8f9fa;
      border-radius: 4px;
      padding: 15px;
      overflow: auto;
      font-size: 13px;
      max-height: 400px;
    }
    .status {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    }
    .status.green {
      background-color: #28a745;
    }
    .status.yellow {
      background-color: #ffc107;
    }
    .status.red {
      background-color: #dc3545;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
    }
    .log-entry {
      margin-bottom: 10px;
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 4px;
      border-left: 4px solid #0062cc;
    }
    .log-time {
      font-size: 0.8rem;
      color: #6c757d;
    }
    input, select {
      width: 100%;
      padding: 8px;
      margin-bottom: 15px;
      border: 1px solid #ced4da;
      border-radius: 4px;
    }
    .hidden {
      display: none;
    }
    #password-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background-color: white;
      padding: 20px;
      border-radius: 5px;
      width: 300px;
    }
    #auth-failed {
      color: #dc3545;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div id="main-content">
    <header>
      <div>
        <h1>ProbeOps Diagnostic Dashboard</h1>
        <span class="version">Version ${VERSION}</span>
      </div>
      <div>
        <button onclick="collectLogs()">Collect Logs</button>
        <button class="secondary" onclick="checkStatus()">Refresh Status</button>
      </div>
    </header>

    <div class="card">
      <h2>System Status</h2>
      <div class="grid" id="status-grid">
        <div>
          <span class="status" id="backend-status"></span>
          Backend API
        </div>
        <div>
          <span class="status" id="frontend-status"></span>
          Frontend App
        </div>
        <div>
          <span class="status" id="database-status"></span>
          Database
        </div>
        <div>
          <span class="status" id="nginx-status"></span>
          NGINX
        </div>
        <div>
          <span class="status" id="auth-status"></span>
          Authentication
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Log Collection</h2>
      <div>
        <p>Collect comprehensive logs from all containers for diagnosis. This may take a few moments.</p>
        <select id="log-level">
          <option value="standard">Standard Logs</option>
          <option value="verbose">Verbose Logs</option>
          <option value="security">Security Audit</option>
        </select>
        <button onclick="collectLogs()">Collect Logs</button>
        <div id="collection-status"></div>
      </div>
    </div>

    <div class="card">
      <h2>Authentication Test</h2>
      <div>
        <p>Test authentication flow to validate credential handling.</p>
        <input type="text" id="test-username" placeholder="Username (e.g., admin@probeops.com)">
        <input type="password" id="test-password" placeholder="Password">
        <button onclick="testAuth()">Test Authentication</button>
        <pre id="auth-result"></pre>
      </div>
    </div>

    <div class="card">
      <h2>Recent Logs</h2>
      <div>
        <button class="secondary" onclick="loadRecentLogs()">Refresh Logs</button>
        <button class="secondary" onclick="downloadSelectedLog()">Download Selected</button>
        <select id="log-file-select" onchange="displayLogFile()">
          <option value="">Select a log file...</option>
        </select>
        <pre id="log-content"></pre>
      </div>
    </div>

    <div class="card">
      <h2>Diagnostic Actions</h2>
      <div>
        <button onclick="checkJwt()">Check JWT Configuration</button>
        <button onclick="testDatabaseConnection()">Test Database Connection</button>
        <button onclick="checkContainerHealth()">Check Container Health</button>
        <button class="danger" onclick="confirm('Are you sure you want to restart all services?') && restartServices()">Restart All Services</button>
        <pre id="action-result"></pre>
      </div>
    </div>

    <div class="card">
      <h2>Update Diagnostic Tools</h2>
      <div>
        <p>Update the diagnostic script to the latest version.</p>
        <input type="text" id="script-url" placeholder="GitHub URL (leave blank for default repo)">
        <button onclick="updateScript()">Update Diagnostic Tools</button>
        <div id="update-status"></div>
      </div>
    </div>
  </div>

  <script>
    // Initialize dashboard immediately without authentication
    window.onload = function() {
      checkStatus();
      loadRecentLogs();
    };

    // Check system status
    function checkStatus() {
      fetch('./status')
        .then(response => response.json())
        .then(data => {
          for (const [service, status] of Object.entries(data)) {
            const element = document.getElementById(\`\${service}-status\`);
            if (element) {
              element.className = 'status ' + status;
            }
          }
        });
    }

    // Collect logs
    function collectLogs() {
      const logLevel = document.getElementById('log-level').value;
      document.getElementById('collection-status').innerHTML = 'Collecting logs, please wait...';
      
      fetch(\`/diagnostics/collect-logs?level=\${logLevel}\`)
        .then(response => response.json())
        .then(data => {
          document.getElementById('collection-status').innerHTML = 
            \`Logs collected successfully: <a href="/diagnostics/download/\${data.filename}">\${data.filename}</a>\`;
          loadRecentLogs();
        })
        .catch(error => {
          document.getElementById('collection-status').innerHTML = 'Error collecting logs: ' + error;
        });
    }

    // Test authentication flow
    function testAuth() {
      const username = document.getElementById('test-username').value;
      const password = document.getElementById('test-password').value;
      
      document.getElementById('auth-result').textContent = 'Testing authentication...';
      
      fetch('/diagnostics/test-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      .then(response => response.json())
      .then(data => {
        document.getElementById('auth-result').textContent = JSON.stringify(data, null, 2);
      })
      .catch(error => {
        document.getElementById('auth-result').textContent = 'Error: ' + error;
      });
    }

    // Load list of recent log files
    function loadRecentLogs() {
      fetch('/diagnostics/logs')
        .then(response => response.json())
        .then(data => {
          const select = document.getElementById('log-file-select');
          select.innerHTML = '<option value="">Select a log file...</option>';
          
          data.logs.forEach(log => {
            const option = document.createElement('option');
            option.value = log;
            option.textContent = log;
            select.appendChild(option);
          });
        });
    }

    // Display selected log file
    function displayLogFile() {
      const filename = document.getElementById('log-file-select').value;
      if (!filename) {
        document.getElementById('log-content').textContent = 'Select a log file to view';
        return;
      }
      
      fetch(\`/diagnostics/logs/\${filename}\`)
        .then(response => response.text())
        .then(data => {
          document.getElementById('log-content').textContent = data;
        })
        .catch(error => {
          document.getElementById('log-content').textContent = 'Error loading log: ' + error;
        });
    }

    // Download selected log
    function downloadSelectedLog() {
      const filename = document.getElementById('log-file-select').value;
      if (filename) {
        window.location.href = \`/diagnostics/download/\${filename}\`;
      }
    }

    // JWT configuration check
    function checkJwt() {
      document.getElementById('action-result').textContent = 'Checking JWT configuration...';
      
      fetch('/diagnostics/check-jwt')
        .then(response => response.json())
        .then(data => {
          document.getElementById('action-result').textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
          document.getElementById('action-result').textContent = 'Error: ' + error;
        });
    }

    // Test database connection
    function testDatabaseConnection() {
      document.getElementById('action-result').textContent = 'Testing database connection...';
      
      fetch('/diagnostics/test-db')
        .then(response => response.json())
        .then(data => {
          document.getElementById('action-result').textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
          document.getElementById('action-result').textContent = 'Error: ' + error;
        });
    }

    // Check container health
    function checkContainerHealth() {
      document.getElementById('action-result').textContent = 'Checking container health...';
      
      fetch('/diagnostics/container-health')
        .then(response => response.json())
        .then(data => {
          document.getElementById('action-result').textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
          document.getElementById('action-result').textContent = 'Error: ' + error;
        });
    }

    // Restart services
    function restartServices() {
      document.getElementById('action-result').textContent = 'Restarting services...';
      
      fetch('/diagnostics/restart-services', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
          document.getElementById('action-result').textContent = JSON.stringify(data, null, 2);
          setTimeout(checkStatus, 5000); // Check status after 5 seconds
        })
        .catch(error => {
          document.getElementById('action-result').textContent = 'Error: ' + error;
        });
    }

    // Update diagnostic script
    function updateScript() {
      const scriptUrl = document.getElementById('script-url').value;
      document.getElementById('update-status').textContent = 'Updating diagnostic tools...';
      
      fetch('/diagnostics/update-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scriptUrl })
      })
      .then(response => response.json())
      .then(data => {
        document.getElementById('update-status').textContent = data.message;
      })
      .catch(error => {
        document.getElementById('update-status').textContent = 'Error: ' + error;
      });
    }
  </script>
</body>
</html>
`;

// Handle ALL routes - this makes it work in every environment
app.use('*', (req, res, next) => {
  // If this is an API request, continue to the correct handler
  if (req.path.includes('/auth') || 
      req.path.includes('/status') || 
      req.path.includes('/collect-logs') ||
      req.path.includes('/logs') || 
      req.path.includes('/test-') || 
      req.path.includes('/check-') ||
      req.path.includes('/container-') ||
      req.path.includes('/restart-') ||
      req.path.includes('/update-')) {
    return next();
  }
  
  // Otherwise, serve the dashboard HTML
  res.send(createHtml());
});

// Authentication
app.post('*/auth', (req, res) => {
  const { password } = req.body;
  res.json({ authenticated: password === PASSWORD });
});

// System status check
app.get('*/status', async (req, res) => {
  try {
    const status = {
      backend: 'red',
      frontend: 'red',
      database: 'red',
      nginx: 'red',
      auth: 'red'
    };
    
    // Check container status
    const { stdout: dockerPs } = await execAsync('docker ps');
    
    if (dockerPs.includes('probenetworktools-backend-1')) status.backend = 'green';
    if (dockerPs.includes('probenetworktools-frontend-1')) status.frontend = 'green';
    if (dockerPs.includes('probenetworktools-db-1')) status.database = 'green';
    if (dockerPs.includes('probenetworktools-nginx-1')) status.nginx = 'green';
    
    // Check authentication by testing the login endpoint
    try {
      const { stdout: curlOutput } = await execAsync(
        `curl -s -X GET http://localhost:8000/health`
      );
      
      if (curlOutput.includes('healthy')) {
        status.auth = 'yellow'; // Basic endpoint is healthy, but not full auth check
        
        // Do a proper auth check with curl
        try {
          const { stdout: authTest } = await execAsync(
            `curl -s -X POST http://localhost:8000/login -H "Content-Type: application/json" -d '{"username":"test@probeops.com","password":"test"}'`
          );
          
          // If we get a proper error (not connection refused), auth is working
          if (authTest.includes('detail') || authTest.includes('access_token')) {
            status.auth = 'green';
          }
        } catch (error) {
          // If curl fails, keep it yellow
        }
      }
    } catch (error) {
      // Endpoint not accessible, keep red
    }
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Collect logs
app.get('*/collect-logs', async (req, res) => {
  try {
    const logLevel = req.query.level || 'standard';
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `probeops-debug-${timestamp}.log`;
    
    // Use the debug collector to gather logs
    await debugCollector.collectAllLogs(logLevel);
    
    res.json({ success: true, filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test authentication flow
app.post('*/test-auth', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Attempt login with provided credentials
    const { stdout: loginOutput } = await execAsync(
      `curl -s -X POST http://localhost:8000/login -H "Content-Type: application/json" -d '{"username":"${username}","password":"${password}"}'`
    );
    
    let loginResult;
    try {
      loginResult = JSON.parse(loginOutput);
    } catch (e) {
      loginResult = { raw: loginOutput };
    }
    
    // If login successful, try getting user profile
    let profileResult = null;
    if (loginResult.access_token) {
      try {
        const { stdout: profileOutput } = await execAsync(
          `curl -s -X GET http://localhost:8000/users/me -H "Authorization: Bearer ${loginResult.access_token}"`
        );
        
        try {
          profileResult = JSON.parse(profileOutput);
        } catch (e) {
          profileResult = { raw: profileOutput };
        }
      } catch (error) {
        profileResult = { error: error.message };
      }
    }
    
    res.json({
      login: loginResult,
      profile: profileResult,
      summary: {
        success: !!loginResult.access_token,
        profileFetched: !!profileResult && !profileResult.error,
        tokenParsed: !!loginResult.access_token && typeof loginResult.access_token === 'string'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of log files
app.get('*/logs', (req, res) => {
  try {
    const logs = fs.readdirSync(DEBUG_DIR)
      .filter(file => file.startsWith('probeops-debug-'))
      .sort((a, b) => fs.statSync(path.join(DEBUG_DIR, b)).mtime.getTime() - 
                      fs.statSync(path.join(DEBUG_DIR, a)).mtime.getTime());
    
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific log file content
app.get('*/logs/:filename', (req, res) => {
  try {
    const filePath = path.join(DEBUG_DIR, req.params.filename);
    
    // Validate filename for security
    if (!req.params.filename.startsWith('probeops-debug-') || !fs.existsSync(filePath)) {
      return res.status(404).send('Log file not found');
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    res.send(content);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Download log file
app.get('*/download/:filename', (req, res) => {
  try {
    const filePath = path.join(DEBUG_DIR, req.params.filename);
    
    // Validate filename for security
    if (!req.params.filename.startsWith('probeops-debug-') || !fs.existsSync(filePath)) {
      return res.status(404).send('Log file not found');
    }
    
    res.download(filePath);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Check JWT configuration
app.get('*/check-jwt', async (req, res) => {
  try {
    let jwtInfo = {
      secret: 'MASKED',
      expiration: 'unknown',
      configuration: []
    };
    
    // Check JWT configuration in files
    const { stdout: jwtConfig } = await execAsync(
      `docker exec probenetworktools-backend-1 bash -c 'grep -r "JWT_SECRET\\|jwt\\.secret" /app --include="*.py" --include="*.env" 2>/dev/null'`
    );
    
    if (jwtConfig) {
      jwtInfo.found = true;
      jwtInfo.configuration = jwtConfig.split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/(JWT_SECRET|jwt\.secret)=(["']?)([^"'\n]+)(["']?)/g, '$1=$2***MASKED***$4'));
    }
    
    // Check expiration settings
    const { stdout: expirationConfig } = await execAsync(
      `docker exec probenetworktools-backend-1 bash -c 'grep -r "expir\\|TOKEN_EXPIRY\\|access_token_expires" /app --include="*.py" 2>/dev/null'`
    );
    
    if (expirationConfig) {
      jwtInfo.expiration = expirationConfig.split('\n')
        .filter(line => line.trim());
    }
    
    res.json(jwtInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test database connection
app.get('*/test-db', async (req, res) => {
  try {
    let dbInfo = {
      connection: false,
      tablesFound: false,
      users: 0,
      adminUsers: 0,
      details: {}
    };
    
    // Check database connection
    try {
      const { stdout: dbUrl } = await execAsync(
        `docker exec probenetworktools-backend-1 bash -c 'echo $DATABASE_URL' 2>/dev/null || echo "Not found"`
      );
      
      dbInfo.details.connectionString = dbUrl.includes('@') 
        ? dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//USERNAME:PASSWORD@').trim()
        : 'Not found or malformed';
      
      // Check if tables exist
      const { stdout: tables } = await execAsync(
        `docker exec probenetworktools-db-1 psql -U postgres -c "\\dt" 2>/dev/null || echo "Could not list tables"`
      );
      
      if (!tables.includes('Could not list tables')) {
        dbInfo.connection = true;
        dbInfo.tablesFound = !tables.includes('No relations found');
        dbInfo.details.tables = tables;
        
        // Count users if tables exist
        if (dbInfo.tablesFound) {
          const { stdout: userCount } = await execAsync(
            `docker exec probenetworktools-db-1 psql -U postgres -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "Could not count users"`
          );
          
          if (!userCount.includes('Could not count users')) {
            dbInfo.users = parseInt(userCount.match(/\d+/)[0], 10);
          }
          
          const { stdout: adminUsers } = await execAsync(
            `docker exec probenetworktools-db-1 psql -U postgres -c "SELECT COUNT(*) FROM users WHERE is_admin = TRUE;" 2>/dev/null || echo "Could not count admin users"`
          );
          
          if (!adminUsers.includes('Could not count')) {
            dbInfo.adminUsers = parseInt(adminUsers.match(/\d+/)[0], 10);
          }
        }
      }
    } catch (error) {
      dbInfo.error = error.message;
    }
    
    res.json(dbInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check container health
app.get('*/container-health', async (req, res) => {
  try {
    const containers = [
      'probenetworktools-backend-1',
      'probenetworktools-frontend-1',
      'probenetworktools-nginx-1',
      'probenetworktools-probe-1',
      'probenetworktools-db-1'
    ];
    
    let healthData = {};
    
    for (const container of containers) {
      try {
        // Get container status
        const { stdout: status } = await execAsync(`docker inspect --format='{{.State.Status}}' ${container}`);
        
        // Get container health if available
        let health = null;
        try {
          const { stdout: healthCheck } = await execAsync(
            `docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no health check{{end}}' ${container}`
          );
          health = healthCheck.trim();
        } catch (error) {
          health = 'health check error';
        }
        
        // Get container uptime
        const { stdout: started } = await execAsync(
          `docker inspect --format='{{.State.StartedAt}}' ${container}`
        );
        
        // Get container resource usage (simplified)
        const { stdout: stats } = await execAsync(
          `docker stats ${container} --no-stream --format "{{.CPUPerc}},{{.MemUsage}}"`
        );
        
        const [cpu, memory] = stats.split(',');
        
        healthData[container] = {
          status: status.trim(),
          health,
          started: started.trim(),
          cpu: cpu.trim(),
          memory: memory.trim()
        };
      } catch (error) {
        healthData[container] = { error: error.message };
      }
    }
    
    res.json(healthData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restart services
app.post('*/restart-services', async (req, res) => {
  try {
    // Restart Docker Compose services
    await execAsync('docker compose restart');
    
    res.json({
      success: true,
      message: 'Services are restarting. Please wait a moment and refresh the status.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update diagnostic script
app.post('*/update-script', async (req, res) => {
  try {
    const { url } = req.body;
    const defaultUrl = 'https://raw.githubusercontent.com/probeops/diagnostics/main/debug-collector.js';
    const scriptUrl = url || defaultUrl;
    
    // Download new script
    const { stdout: curl } = await execAsync(`curl -s ${scriptUrl} -o debug-collector.js.new`);
    
    // Check if download was successful
    if (fs.existsSync('debug-collector.js.new')) {
      // Create backup of current script
      if (fs.existsSync('debug-collector.js')) {
        fs.copyFileSync('debug-collector.js', 'debug-collector.js.bak');
      }
      
      // Replace current script with new one
      fs.renameSync('debug-collector.js.new', 'debug-collector.js');
      
      res.json({
        success: true,
        message: 'Diagnostic tools updated successfully. A backup of the previous version was created.'
      });
    } else {
      res.status(500).json({ error: 'Failed to download new script' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server on a dedicated diagnostic port 8888
// Use the PORT variable defined at the top of the file
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Diagnostic dashboard running on port ${PORT}`);
  console.log(`Access at: http://your-ip-or-domain:${PORT}/`);
  console.log('NOTE: Make sure port 8888 is open in your AWS security group');
});