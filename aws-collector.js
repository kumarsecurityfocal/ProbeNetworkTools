/**
 * ProbeOps AWS Diagnostic Data Collector
 * 
 * This tool collects all the necessary data to diagnose the exact authentication
 * and path handling issues in your AWS environment.
 * 
 * Usage:
 *   node aws-collector.js
 */

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const OUTPUT_FILE = 'probeops-diagnosis.json';
const BACKEND_PORT = process.env.BACKEND_PORT || 8000;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 5000;

// Data collection points
const data = {
  system: {},
  network: {},
  paths: {},
  authentication: {},
  errors: [],
  timestamp: new Date().toISOString()
};

// Helper for async/await with timeouts
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Safe execution of shell commands
function safeExec(command) {
  try {
    return execSync(command).toString().trim();
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

// Make HTTP request with promise and timeout
function makeRequest(options, body = null, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        clearTimeout(timer);
        let parsed = null;
        try {
          if (data && res.headers['content-type']?.includes('application/json')) {
            parsed = JSON.parse(data);
          }
        } catch (e) {
          // Parsing error, use raw data
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed || data
        });
      });
    });
    
    req.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    
    req.end();
  });
}

// Collect system info
async function collectSystemInfo() {
  console.log('Collecting system information...');
  
  data.system.hostname = safeExec('hostname');
  data.system.uname = safeExec('uname -a');
  data.system.nodeVersion = safeExec('node --version');
  data.system.npmVersion = safeExec('npm --version');
  data.system.processInfo = safeExec('ps aux | grep -E "node|express|nginx|java" | grep -v grep');
  data.system.diskSpace = safeExec('df -h .');
  data.system.memory = safeExec('free -m');
  
  // Get environment variables (mask sensitive values)
  const envVars = ['NODE_ENV', 'PORT', 'BACKEND_PORT', 'JWT_SECRET', 'DATABASE_URL'];
  data.system.environment = {};
  
  for (const envVar of envVars) {
    const value = process.env[envVar];
    if (value) {
      if (envVar.includes('SECRET') || envVar.includes('DATABASE') || envVar.includes('PASSWORD')) {
        data.system.environment[envVar] = `***MASKED*** (length: ${value.length})`;
      } else {
        data.system.environment[envVar] = value;
      }
    } else {
      data.system.environment[envVar] = 'Not set';
    }
  }
  
  // Check critical directories
  data.system.directories = {};
  const dirsToCheck = ['/opt/probeops', '/opt/probeops/public', '/opt/probeops/logs'];
  
  for (const dir of dirsToCheck) {
    try {
      const stats = fs.statSync(dir);
      data.system.directories[dir] = {
        exists: true,
        isDirectory: stats.isDirectory(),
        mode: stats.mode.toString(8).slice(-3),
        owner: safeExec(`ls -ld ${dir} | awk '{print $3}'`)
      };
    } catch (error) {
      data.system.directories[dir] = {
        exists: false,
        error: error.message
      };
    }
  }
  
  // Check critical files
  data.system.files = {};
  const filesToCheck = [
    '/opt/probeops/server.js',
    '/opt/probeops/package.json',
    '/opt/probeops/public/index.html'
  ];
  
  for (const file of filesToCheck) {
    try {
      const stats = fs.statSync(file);
      data.system.files[file] = {
        exists: true,
        size: stats.size,
        mode: stats.mode.toString(8).slice(-3),
        owner: safeExec(`ls -l ${file} | awk '{print $3}'`),
        modified: stats.mtime.toISOString()
      };
    } catch (error) {
      data.system.files[file] = {
        exists: false,
        error: error.message
      };
    }
  }
}

// Collect network info
async function collectNetworkInfo() {
  console.log('Collecting network information...');
  
  data.network.interfaces = safeExec('ip addr show');
  data.network.listening = safeExec('netstat -tuln | grep LISTEN');
  data.network.routes = safeExec('netstat -rn');
  
  // Check connectivity to backend
  try {
    data.network.backendConnectivity = {
      result: await makeRequest({
        hostname: 'localhost',
        port: BACKEND_PORT,
        path: '/health',
        method: 'GET',
        timeout: 5000
      })
    };
  } catch (error) {
    data.network.backendConnectivity = {
      error: error.message
    };
  }
  
  // Check if frontend is serving
  try {
    data.network.frontendConnectivity = {
      result: await makeRequest({
        hostname: 'localhost',
        port: FRONTEND_PORT,
        path: '/',
        method: 'GET',
        timeout: 5000
      })
    };
  } catch (error) {
    data.network.frontendConnectivity = {
      error: error.message
    };
  }
}

// Test path handling
async function testPathHandling() {
  console.log('Testing path handling...');
  
  const pathsToTest = [
    '/api/users/me',
    '/api/api/users/me',
    '/users/me',
    '/api/admin/users',
    '/admin/users',
    '/api/probes',
    '/probes'
  ];
  
  for (const testPath of pathsToTest) {
    try {
      const result = await makeRequest({
        hostname: 'localhost',
        port: BACKEND_PORT,
        path: testPath,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer dummy-token-for-testing'
        }
      });
      
      data.paths[testPath] = {
        statusCode: result.statusCode,
        contentType: result.headers['content-type'] || 'none',
        responseSize: typeof result.data === 'string' ? result.data.length : JSON.stringify(result.data).length
      };
    } catch (error) {
      data.paths[testPath] = {
        error: error.message
      };
    }
    
    // Short delay between requests
    await timeout(300);
  }
}

// Test authentication
async function testAuthentication() {
  console.log('Testing authentication...');
  
  // Test login attempts
  const loginTests = [
    { username: 'admin@probeops.com', password: 'adminpassword' },
    { username: 'test@probeops.com', password: 'testpassword' }
  ];
  
  for (const credentials of loginTests) {
    const username = credentials.username;
    
    try {
      const loginResult = await makeRequest({
        hostname: 'localhost',
        port: BACKEND_PORT,
        path: '/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, credentials);
      
      data.authentication[`login_${username}`] = {
        statusCode: loginResult.statusCode,
        success: loginResult.statusCode >= 200 && loginResult.statusCode < 300,
        hasToken: !!(loginResult.data && loginResult.data.access_token)
      };
      
      // If login successful, try to use the token
      if (loginResult.data && loginResult.data.access_token) {
        const token = loginResult.data.access_token;
        
        try {
          const profileResult = await makeRequest({
            hostname: 'localhost',
            port: BACKEND_PORT,
            path: '/users/me',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          data.authentication[`profile_${username}`] = {
            statusCode: profileResult.statusCode,
            success: profileResult.statusCode >= 200 && profileResult.statusCode < 300
          };
        } catch (error) {
          data.authentication[`profile_${username}`] = {
            error: error.message
          };
        }
      }
    } catch (error) {
      data.authentication[`login_${username}`] = {
        error: error.message
      };
    }
    
    // Short delay between tests
    await timeout(500);
  }
}

// Collect error logs
async function collectErrorLogs() {
  console.log('Collecting error logs...');
  
  const logFiles = [
    '/opt/probeops/logs/error.log',
    '/opt/probeops/logs/app.log',
    '/opt/probeops/logs/express.log',
    '/var/log/nginx/error.log'
  ];
  
  for (const logFile of logFiles) {
    try {
      // Get last 20 lines of each log
      const logContent = safeExec(`tail -n 20 ${logFile} 2>/dev/null || echo "File not found"`);
      
      if (logContent && !logContent.includes('File not found')) {
        data.errors.push({
          file: logFile,
          content: logContent
        });
      }
    } catch (error) {
      // Skip if file not accessible
    }
  }
}

// Main function
async function collectDiagnosticData() {
  console.log('Starting ProbeOps AWS diagnostic data collection...');
  
  try {
    await collectSystemInfo();
    await collectNetworkInfo();
    await testPathHandling();
    await testAuthentication();
    await collectErrorLogs();
    
    // Save results to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    
    console.log(`Diagnostic data collection complete. Results saved to ${OUTPUT_FILE}`);
    console.log('Please send this file to the development team for analysis.');
    
  } catch (error) {
    console.error('Error during data collection:', error);
    data.collectionError = error.message;
    
    // Still save whatever data we collected
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    console.log(`Data collection encountered errors. Partial results saved to ${OUTPUT_FILE}`);
  }
}

// Run the collection
collectDiagnosticData();