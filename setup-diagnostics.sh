#!/bin/bash
# ProbeOps Diagnostic Dashboard Setup Script
# This script installs and configures a standalone diagnostic dashboard
# that doesn't depend on the backend API

# Stop on errors
set -e

echo "=== ProbeOps Diagnostic Dashboard Setup ==="

# Create diagnostic tools directory if it doesn't exist
DIAG_DIR="/opt/probeops-diagnostics"
mkdir -p $DIAG_DIR

# Install required packages
echo "Installing required packages..."
if command -v apt >/dev/null 2>&1; then
  # For Debian/Ubuntu
  sudo apt update
  sudo apt install -y nodejs npm curl dnsutils net-tools
elif command -v yum >/dev/null 2>&1; then
  # For Amazon Linux/CentOS/RHEL
  sudo yum update -y
  sudo yum install -y nodejs npm curl bind-utils net-tools
fi

# Create package.json for the diagnostic tools
echo "Setting up diagnostic dashboard..."
cat > $DIAG_DIR/package.json << 'EOF'
{
  "name": "probeops-diagnostics",
  "version": "1.0.0",
  "description": "ProbeOps Diagnostic Dashboard",
  "main": "standalone-dashboard.js",
  "scripts": {
    "start": "node standalone-dashboard.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cors": "^2.8.5",
    "node-fetch": "^2.7.0",
    "child_process": "^1.0.2"
  }
}
EOF

# Create the standalone diagnostic dashboard
cat > $DIAG_DIR/standalone-dashboard.js << 'EOF'
/**
 * ProbeOps Standalone Diagnostic Dashboard
 * 
 * This dashboard doesn't depend on the backend API and collects
 * diagnostic information directly
 */

const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const execAsync = promisify(exec);
const app = express();
const PORT = 8888;
const VERSION = '1.1.0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure debug logs directory exists
const DEBUG_DIR = path.join(__dirname, 'debug-logs');
if (!fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

// Simple health check
app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString()
  });
});

// System status check
app.get('/status', async (req, res) => {
  try {
    // Initialize all services as offline
    const status = {
      backend: 'red',
      frontend: 'red',
      database: 'red',
      nginx: 'red',
      auth: 'red',
      aws: 'green' // AWS is available since we're running there
    };
    
    // Check backend API
    try {
      await execAsync('curl -s --connect-timeout 5 http://localhost:8000/health || echo "failed"');
      status.backend = 'green';
    } catch (e) {}
    
    // Check frontend
    try {
      await execAsync('curl -s --connect-timeout 5 http://localhost:3000 || echo "failed"');
      status.frontend = 'green';
    } catch (e) {}
    
    // Check database from environment variables
    if (process.env.DATABASE_URL) {
      try {
        const { Pool } = require('pg');
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        
        await pool.query('SELECT 1');
        status.database = 'green';
        pool.end();
      } catch (e) {}
    }
    
    // Check NGINX
    try {
      await execAsync('curl -s --connect-timeout 5 http://localhost:80 || echo "failed"');
      status.nginx = 'green';
    } catch (e) {}
    
    // Check Auth
    try {
      await execAsync('curl -s --connect-timeout 5 http://localhost:8000/auth/login || echo "failed"');
      status.auth = 'green';
    } catch (e) {}
    
    res.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

// Collect diagnostic logs
app.post('/collect-logs', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const logFilePath = path.join(DEBUG_DIR, `probeops-debug-${timestamp}.log`);
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    
    const log = (message, data = null) => {
      const logEntry = `[${new Date().toISOString()}] ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`;
      logStream.write(logEntry + '\n');
    };
    
    log('=== PROBEOPS DIAGNOSTIC LOG ===');
    log('Environment', { 
      platform: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    });
    
    // Collect system information
    log('=== SYSTEM INFORMATION ===');
    const { stdout: sysInfo } = await execAsync('uname -a || echo "System info not available"');
    log('System Info', sysInfo.trim());
    
    // Collect network information
    log('=== NETWORK INFORMATION ===');
    try {
      const { stdout: netInterfaces } = await execAsync('ifconfig || ip addr || echo "Network interface info not available"');
      log('Network Interfaces', netInterfaces.trim());
      
      const { stdout: openPorts } = await execAsync('netstat -tuln || ss -tuln || echo "Port info not available"');
      log('Open Ports', openPorts.trim());
    } catch (e) {
      log('Network info collection error', e.message);
    }
    
    // Check database connection
    log('=== DATABASE CONNECTION ===');
    if (process.env.DATABASE_URL) {
      const maskedDbUrl = process.env.DATABASE_URL.replace(/:\/\/([^:]+):([^@]+)@/, '://**USERNAME**:**PASSWORD**@');
      log('Database URL (masked)', maskedDbUrl);
      
      try {
        const { Pool } = require('pg');
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        
        await pool.query('SELECT current_database(), version()');
        log('Database Connection', 'Successful');
        
        const { rows: tables } = await pool.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        );
        log('Database Tables', tables.map(t => t.table_name));
        
        pool.end();
      } catch (e) {
        log('Database connection error', e.message);
      }
    } else {
      log('Database URL', 'Not available in environment');
    }
    
    // Check services
    log('=== SERVICE STATUS ===');
    try {
      const { stdout: services } = await execAsync('ps aux || echo "Process list not available"');
      log('Running Processes (truncated)', services.slice(0, 2000)); // Truncate to avoid huge logs
    } catch (e) {
      log('Process check error', e.message);
    }
    
    logStream.end();
    
    res.json({ 
      success: true, 
      message: 'Logs collected successfully',
      logFile: logFilePath
    });
  } catch (error) {
    console.error('Log collection error:', error);
    res.status(500).json({ error: 'Log collection failed' });
  }
});

// Get recent logs
app.get('/recent-logs', (req, res) => {
  try {
    const logFiles = fs.readdirSync(DEBUG_DIR)
      .filter(file => file.startsWith('probeops-debug-'))
      .sort()
      .reverse()
      .slice(0, 10); // Last 10 logs
      
    const logs = logFiles.map(file => {
      const filePath = path.join(DEBUG_DIR, file);
      const stats = fs.statSync(filePath);
      const timestamp = file.match(/probeops-debug-(.+)\.log/)[1].replace(/-/g, ':');
      
      return {
        file,
        path: filePath,
        timestamp,
        size: stats.size,
        created: stats.birthtime
      };
    });
    
    res.json(logs);
  } catch (error) {
    console.error('Recent logs error:', error);
    res.status(500).json({ error: 'Failed to get recent logs' });
  }
});

// Download a specific log file
app.get('/download-log/:file', (req, res) => {
  try {
    const filePath = path.join(DEBUG_DIR, req.params.file);
    
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: 'Log file not found' });
    }
  } catch (error) {
    console.error('Download log error:', error);
    res.status(500).json({ error: 'Failed to download log' });
  }
});

// Create HTML page
const htmlContent = `
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
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    button:hover {
      background-color: #0056b3;
    }
    button.secondary {
      background-color: #6c757d;
    }
    button.secondary:hover {
      background-color: #5a6268;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
    }
    .status {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 10px;
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
    table {
      width: 100%;
      border-collapse: collapse;
    }
    table th, table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    table th {
      background-color: #f8f9fa;
    }
    pre {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-size: 0.9rem;
    }
    .hidden {
      display: none;
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
        <div>
          <span class="status" id="aws-status"></span>
          AWS Environment
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Recent Diagnostic Logs</h2>
      <div id="logs-container">
        <p id="no-logs" class="hidden">No diagnostic logs found.</p>
        <table id="logs-table" class="hidden">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Size</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="logs-body"></tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h2>Diagnostic Actions</h2>
      <div id="actions-container">
        <button onclick="runScript('system-check')">System Check</button>
        <button onclick="runScript('network-check')">Network Check</button>
        <button onclick="runScript('auth-check')">Auth Check</button>
        <button onclick="runScript('db-check')">Database Check</button>
      </div>
      <div id="script-output" class="hidden">
        <h3>Script Output</h3>
        <pre id="output-content"></pre>
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
        })
        .catch(error => {
          console.error('Status check failed:', error);
        });
    }

    // Collect logs
    function collectLogs() {
      fetch('./collect-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Diagnostic logs collected successfully.');
          loadRecentLogs();
        } else {
          alert('Failed to collect logs: ' + data.error);
        }
      })
      .catch(error => {
        console.error('Log collection failed:', error);
        alert('Log collection failed: ' + error.message);
      });
    }

    // Load recent logs
    function loadRecentLogs() {
      fetch('./recent-logs')
        .then(response => response.json())
        .then(logs => {
          const noLogsEl = document.getElementById('no-logs');
          const tableEl = document.getElementById('logs-table');
          const bodyEl = document.getElementById('logs-body');
          
          if (logs.length === 0) {
            noLogsEl.classList.remove('hidden');
            tableEl.classList.add('hidden');
            return;
          }
          
          noLogsEl.classList.add('hidden');
          tableEl.classList.remove('hidden');
          
          bodyEl.innerHTML = '';
          logs.forEach(log => {
            const row = document.createElement('tr');
            
            const timestampCell = document.createElement('td');
            timestampCell.textContent = new Date(log.created).toLocaleString();
            
            const sizeCell = document.createElement('td');
            sizeCell.textContent = Math.round(log.size / 1024) + ' KB';
            
            const actionsCell = document.createElement('td');
            const downloadBtn = document.createElement('a');
            downloadBtn.className = 'button';
            downloadBtn.textContent = 'Download';
            downloadBtn.href = './download-log/' + log.file;
            actionsCell.appendChild(downloadBtn);
            
            row.appendChild(timestampCell);
            row.appendChild(sizeCell);
            row.appendChild(actionsCell);
            
            bodyEl.appendChild(row);
          });
        })
        .catch(error => {
          console.error('Failed to load logs:', error);
        });
    }

    // Run diagnostic script
    function runScript(scriptType) {
      const outputEl = document.getElementById('script-output');
      const contentEl = document.getElementById('output-content');
      
      outputEl.classList.remove('hidden');
      contentEl.textContent = 'Running script...';
      
      fetch('./run-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: scriptType })
      })
      .then(response => response.json())
      .then(data => {
        contentEl.textContent = data.output || 'Script completed with no output.';
      })
      .catch(error => {
        console.error('Script execution failed:', error);
        contentEl.textContent = 'Script execution failed: ' + error.message;
      });
    }
  </script>
</body>
</html>
`;

// Create public directory and HTML page
if (!fs.existsSync(path.join(__dirname, 'public'))) {
  fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
}

fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), htmlContent);

// Run diagnostic script
app.post('/run-script', async (req, res) => {
  try {
    const { script } = req.body;
    let command = '';
    
    switch (script) {
      case 'system-check':
        command = 'uname -a && uptime && free -h && df -h';
        break;
      case 'network-check':
        command = 'ifconfig || ip addr && netstat -tuln || ss -tuln';
        break;
      case 'auth-check':
        command = 'curl -s -I http://localhost:8000/auth/login || echo "Auth service not available"';
        break;
      case 'db-check':
        if (process.env.DATABASE_URL) {
          command = 'psql -c "\\l" $DATABASE_URL || echo "Database connection failed"';
        } else {
          command = 'echo "DATABASE_URL not available"';
        }
        break;
      default:
        return res.status(400).json({ error: 'Invalid script type' });
    }
    
    const { stdout, stderr } = await execAsync(command);
    res.json({ output: stdout + stderr });
  } catch (error) {
    console.error('Script execution error:', error);
    res.json({ output: 'Error: ' + error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`ProbeOps Diagnostic Dashboard running on port ${PORT}`);
  console.log(`Dashboard available at: http://localhost:${PORT}`);
});
EOF

# Create a systemd service file for the diagnostic dashboard
echo "Creating systemd service..."
cat > /tmp/probeops-diagnostics.service << 'EOF'
[Unit]
Description=ProbeOps Diagnostic Dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/probeops-diagnostics
ExecStart=/usr/bin/node /opt/probeops-diagnostics/standalone-dashboard.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=probeops-diagnostics
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/probeops-diagnostics.service /etc/systemd/system/

# Install dependencies
echo "Installing Node.js dependencies..."
cd $DIAG_DIR
npm install

# Create empty debug logs directory
mkdir -p $DIAG_DIR/debug-logs

# Enable and start the service
echo "Starting diagnostic dashboard service..."
sudo systemctl daemon-reload
sudo systemctl enable probeops-diagnostics
sudo systemctl start probeops-diagnostics

# Show status
echo "=== Installation Complete ==="
echo "ProbeOps Diagnostic Dashboard is now installed and running at:"
echo "http://$(hostname -I | awk '{print $1}'):8888"
echo ""
echo "To check the service status:"
echo "sudo systemctl status probeops-diagnostics"
echo ""
echo "To view logs:"
echo "sudo journalctl -u probeops-diagnostics -f"