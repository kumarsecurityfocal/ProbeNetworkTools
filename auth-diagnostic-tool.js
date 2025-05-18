/**
 * ProbeOps Authentication Diagnostic Tool
 * 
 * This lightweight diagnostic tool specifically checks authentication issues
 * in both Replit and AWS environments.
 */

const express = require('express');
const { URLSearchParams } = require('url');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Configuration
const PORT = process.env.AUTH_DIAG_PORT || 8888;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const LOG_DIR = './auth-logs';
const LOG_FILE = path.join(LOG_DIR, `auth-diagnostic-${new Date().toISOString().replace(/:/g, '-')}.log`);

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Setup the log stream
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

// Logging helper
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  logStream.write(logMessage + '\n');
  
  if (data) {
    const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : data.toString();
    logStream.write(dataStr + '\n\n');
  }
}

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dashboard HTML template
const dashboardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Diagnostic Tool</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    header {
      background-color: #1a2a40;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0;
      font-size: 1.8rem;
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
    button {
      background-color: #0062cc;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background-color: #0056b3;
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
    .test-item {
      margin-bottom: 20px;
      padding: 15px;
      border-radius: 5px;
      background-color: #f8f9fa;
    }
    .test-item h3 {
      margin-top: 0;
      display: flex;
      align-items: center;
    }
    .success {
      border-left: 4px solid #28a745;
    }
    .warning {
      border-left: 4px solid #ffc107;
    }
    .error {
      border-left: 4px solid #dc3545;
    }
    .test-form {
      margin-top: 20px;
    }
    input {
      padding: 8px;
      margin-right: 10px;
      border: 1px solid #ced4da;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <header>
    <h1>ProbeOps Authentication Diagnostic Tool</h1>
  </header>

  <div class="card">
    <h2>Test Authentication Flow</h2>
    <div class="test-form">
      <form id="auth-test-form">
        <input type="text" id="username" name="username" placeholder="Username" value="admin@probeops.com">
        <input type="password" id="password" name="password" placeholder="Password" value="probeopS1@">
        <button type="submit">Test Login Flow</button>
      </form>
    </div>
    <div id="auth-results">
      <p>Click "Test Login Flow" to start the authentication diagnosis</p>
    </div>
  </div>

  <div class="card">
    <h2>System Information</h2>
    <div id="system-info"></div>
  </div>

  <script>
    // Load system information on page load
    window.onload = function() {
      fetchSystemInfo();
    };

    // Test auth flow
    document.getElementById('auth-test-form').addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      document.getElementById('auth-results').innerHTML = '<p>Testing authentication flow...</p>';
      
      fetch('/api/test-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
      .then(response => response.text())
      .then(html => {
        document.getElementById('auth-results').innerHTML = html;
      })
      .catch(error => {
        document.getElementById('auth-results').innerHTML = 
          '<div class="test-item error"><h3><span class="status red"></span>Error</h3><p>Failed to test authentication: ' + error.message + '</p></div>';
      });
    });

    // Get system info
    function fetchSystemInfo() {
      fetch('/api/system-info')
        .then(response => response.json())
        .then(data => {
          let html = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
          document.getElementById('system-info').innerHTML = html;
        })
        .catch(error => {
          document.getElementById('system-info').innerHTML = 
            '<div class="test-item error"><h3><span class="status red"></span>Error</h3><p>Failed to fetch system info: ' + error.message + '</p></div>';
        });
    }
  </script>
</body>
</html>
`;

// Main dashboard route
app.get('/', (req, res) => {
  res.send(dashboardHtml);
});

// System information endpoint
app.get('/api/system-info', async (req, res) => {
  try {
    const systemInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      platform: process.platform,
      nodeVersion: process.version,
      hostname: require('os').hostname(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: {
        // Only include safe environment variables
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        HOSTNAME: process.env.HOSTNAME,
        AWS_REGION: process.env.AWS_REGION,
        // Indicate other vars without revealing values
        DATABASE_URL: process.env.DATABASE_URL ? '(set)' : '(not set)',
        JWT_SECRET: process.env.JWT_SECRET ? '(set)' : '(not set)',
      }
    };
    
    res.json(systemInfo);
  } catch (error) {
    log('Error fetching system info:', error);
    res.status(500).json({ error: 'Failed to fetch system information' });
  }
});

// Authentication test endpoint
app.post('/api/test-auth', async (req, res) => {
  const { username, password } = req.body;
  log('Starting authentication test for user:', username);
  
  // Store test results
  const testResults = [];
  let overallSuccess = true;
  
  // Test 1: Check Authentication Process
  try {
    log('Testing authentication process...');
    
    // First test: Try JSON format
    log('Test 1A: Testing JSON format login request...');
    const jsonResult = await makeAuthRequest(username, password, 'json');
    
    if (jsonResult.success) {
      testResults.push({
        name: 'Authentication with JSON format',
        status: 'success',
        message: 'Successfully authenticated using JSON format',
        token: jsonResult.data?.access_token ? `${jsonResult.data.access_token.substring(0, 10)}...` : 'No token'
      });
    } else {
      testResults.push({
        name: 'Authentication with JSON format',
        status: 'error',
        message: `Failed to authenticate using JSON format: ${jsonResult.error}`,
        details: jsonResult,
        suggestion: 'This format is not working, but not critical if form-urlencoded works.'
      });
      
      // Don't mark overall as failed just for JSON - we'll use form-urlencoded
      // overallSuccess = false;
    }
    
    // Second test: Try form-urlencoded format
    log('Test 1B: Testing form-urlencoded format login request...');
    const formResult = await makeAuthRequest(username, password, 'form');
    
    if (formResult.success) {
      testResults.push({
        name: 'Authentication with form-urlencoded format',
        status: 'success',
        message: 'Successfully authenticated using form-urlencoded format',
        token: formResult.data?.access_token ? `${formResult.data.access_token.substring(0, 10)}...` : 'No token'
      });
      
      // If we got a valid token, we can test protected endpoints
      if (formResult.data?.access_token) {
        // Test user profile endpoint
        log('Test 2: Testing user profile endpoint with token...');
        const profileResult = await makeApiRequest(
          '/users/me', 
          'GET', 
          null, 
          { 'Authorization': `Bearer ${formResult.data.access_token}` }
        );
        
        if (profileResult.success) {
          testResults.push({
            name: 'User Profile Request',
            status: 'success',
            message: 'Successfully retrieved user profile with token',
            user: profileResult.data
          });
        } else {
          testResults.push({
            name: 'User Profile Request',
            status: 'error',
            message: `Failed to retrieve user profile: ${profileResult.error}`,
            details: profileResult
          });
          overallSuccess = false;
        }
      }
    } else {
      testResults.push({
        name: 'Authentication with form-urlencoded format',
        status: 'error',
        message: `Failed to authenticate using form-urlencoded format: ${formResult.error}`,
        details: formResult
      });
      overallSuccess = false;
      
      // Special check for HTML responses which indicate proxy issues
      if (formResult.isHtml) {
        testResults.push({
          name: 'Content Type Issue',
          status: 'error',
          message: 'The authentication endpoint is returning HTML instead of JSON. This indicates a misconfiguration or proxy issue.',
          suggestion: 'Check your nginx/proxy configuration to ensure proper handling of API requests and Content-Type headers.'
        });
      }
    }
  } catch (error) {
    log('Error during authentication tests:', error);
    testResults.push({
      name: 'Authentication Test Error',
      status: 'error',
      message: `Unexpected error during authentication tests: ${error.message}`
    });
    overallSuccess = false;
  }
  
  // Generate HTML results
  let resultsHtml = '';
  testResults.forEach(test => {
    resultsHtml += `
      <div class="test-item ${test.status}">
        <h3><span class="status ${test.status === 'success' ? 'green' : test.status === 'warning' ? 'yellow' : 'red'}"></span>${test.name}</h3>
        <p>${test.message}</p>
        ${test.details ? `<pre>${JSON.stringify(test.details, null, 2)}</pre>` : ''}
        ${test.suggestion ? `<p><strong>Suggestion:</strong> ${test.suggestion}</p>` : ''}
        ${test.user ? `<p><strong>User:</strong> ${JSON.stringify(test.user)}</p>` : ''}
        ${test.token ? `<p><strong>Token:</strong> ${test.token}</p>` : ''}
      </div>
    `;
  });
  
  // Add overall result
  resultsHtml = `
    <div class="test-item ${overallSuccess ? 'success' : 'error'}">
      <h3><span class="status ${overallSuccess ? 'green' : 'red'}"></span>Overall Result</h3>
      <p>${overallSuccess ? 'Authentication is working properly!' : 'Authentication tests failed. See details below.'}</p>
    </div>
  ` + resultsHtml;
  
  // Add timestamp
  resultsHtml += `<p>Tests completed at: ${new Date().toISOString()}</p>`;
  
  res.send(resultsHtml);
});

// Helper function to make authentication requests
async function makeAuthRequest(username, password, format) {
  const loginUrl = `${BACKEND_URL}/login`;
  log(`Making ${format} authentication request to ${loginUrl}`);
  
  let body;
  let headers = {
    'Accept': 'application/json'
  };
  
  if (format === 'json') {
    // JSON format
    body = JSON.stringify({ username, password });
    headers['Content-Type'] = 'application/json';
  } else {
    // Form-urlencoded format
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    body = params.toString();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }
  
  return makeRequest(loginUrl, 'POST', body, headers);
}

// Helper function to make API requests with authorization
async function makeApiRequest(endpoint, method, data, headers = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  return makeRequest(url, method, data, headers);
}

// Generic HTTP request helper
async function makeRequest(url, method, body, headers) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: headers
    };
    
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;
    
    log(`Making ${method} request to ${url}`);
    
    const req = httpModule.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const result = {
          statusCode: res.statusCode,
          headers: res.headers,
          rawData: responseData
        };
        
        // Check if response is JSON
        try {
          if (res.headers['content-type']?.includes('application/json')) {
            result.data = JSON.parse(responseData);
            result.success = res.statusCode >= 200 && res.statusCode < 300;
          } else {
            result.success = false;
            result.error = `Unexpected content type: ${res.headers['content-type']}`;
          }
        } catch (e) {
          result.success = false;
          result.error = `Failed to parse JSON response: ${e.message}`;
        }
        
        // Check if response is HTML
        if (responseData.includes('<!DOCTYPE') || responseData.includes('<html')) {
          result.isHtml = true;
          result.success = false;
          result.error = 'Received HTML response instead of JSON';
        }
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      log(`Request to ${url} failed:`, error.message);
      resolve({
        success: false,
        error: error.message
      });
    });
    
    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

// Start the server
app.listen(PORT, () => {
  log(`Authentication Diagnostic Tool running on port ${PORT}`);
  log(`Open http://localhost:${PORT} in your browser to use the tool`);
});