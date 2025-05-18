/**
 * ProbeOps AWS Diagnostics Tool
 * 
 * This script collects comprehensive diagnostic information about the AWS deployment
 * to help identify the exact issues with authentication and path handling.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');

// Configuration
const OUTPUT_DIR = process.env.OUTPUT_DIR || '.';
const DIAGNOSTICS_FILE = path.join(OUTPUT_DIR, 'probeops-diagnostics.log');
const BACKEND_PORT = 8000;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";

// Create output directory if needed
try {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
} catch (err) {
  console.error(`Error creating output directory: ${err.message}`);
}

// Clear previous diagnostics file
try {
  fs.writeFileSync(DIAGNOSTICS_FILE, '');
} catch (err) {
  console.error(`Error clearing diagnostics file: ${err.message}`);
}

// Logging function
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`;
  
  console.log(logMessage);
  
  try {
    fs.appendFileSync(DIAGNOSTICS_FILE, logMessage + '\n');
  } catch (err) {
    console.error(`Error writing to log: ${err.message}`);
  }
}

// Create token for testing
function createTestToken(email = "admin@probeops.com", isAdmin = true) {
  const payload = {
    sub: email,
    is_admin: isAdmin,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, JWT_SECRET);
}

// Make a HTTP request to the backend
async function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        let parsedData;
        try {
          parsedData = data ? JSON.parse(data) : {};
        } catch (e) {
          parsedData = { rawData: data };
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsedData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Test a specific endpoint
async function testEndpoint(path, method = 'GET', token = null, body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: path,
    method: method,
    headers: headers
  };
  
  log(`Testing endpoint: ${method} ${path}`, { withToken: !!token });
  
  try {
    const response = await makeRequest(options, body);
    log(`Response from ${path}:`, { 
      statusCode: response.statusCode,
      headers: response.headers,
      data: response.data
    });
    return response;
  } catch (error) {
    log(`Error testing ${path}:`, { error: error.message });
    return null;
  }
}

// Test login endpoint
async function testLogin(email, password) {
  log(`Testing login for ${email}`);
  
  const options = {
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const body = {
    username: email,
    password: password
  };
  
  try {
    const response = await makeRequest(options, body);
    log(`Login response for ${email}:`, { 
      statusCode: response.statusCode,
      data: response.data
    });
    return response;
  } catch (error) {
    log(`Login error for ${email}:`, { error: error.message });
    return null;
  }
}

// Analyze path routing
async function analyzePathRouting() {
  log('Analyzing path routing issues');
  
  const paths = [
    '/api/users/me',
    '/api/api/users/me',
    '/users/me',
    '/api/admin/users',
    '/admin/users',
    '/api/probes',
    '/probes'
  ];
  
  const token = createTestToken('admin@probeops.com', true);
  
  for (const path of paths) {
    await testEndpoint(path, 'GET', token);
  }
}

// Check environment variables
function checkEnvironment() {
  log('Checking environment variables');
  
  const envVars = [
    'NODE_ENV',
    'PORT',
    'JWT_SECRET',
    'DATABASE_URL'
  ];
  
  const envData = {};
  
  for (const varName of envVars) {
    const value = process.env[varName];
    envData[varName] = value ? `${value.substring(0, 3)}...` : 'not set';
  }
  
  log('Environment variables:', envData);
}

// Check server file system
function checkFileSystem() {
  log('Checking server file system');
  
  const criticalPaths = [
    '/opt/probeops/public',
    '/opt/probeops/logs',
    '/opt/probeops/server.js'
  ];
  
  for (const filePath of criticalPaths) {
    try {
      const stats = fs.statSync(filePath);
      log(`File system check for ${filePath}:`, {
        exists: true,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        permissions: stats.mode.toString(8).substring(stats.mode.toString(8).length - 3)
      });
    } catch (error) {
      log(`File system error for ${filePath}:`, { error: error.message });
    }
  }
}

// Check backend health
async function checkBackendHealth() {
  log('Checking backend health');
  
  try {
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: '/health',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    log('Backend health check:', {
      statusCode: response.statusCode,
      data: response.data
    });
  } catch (error) {
    log('Backend health check error:', { error: error.message });
  }
}

// Main diagnostic function
async function runDiagnostics() {
  log('Starting ProbeOps AWS diagnostics');
  log('------------------------------------------------');
  
  // Check environment
  checkEnvironment();
  log('------------------------------------------------');
  
  // Check file system
  checkFileSystem();
  log('------------------------------------------------');
  
  // Check backend health
  await checkBackendHealth();
  log('------------------------------------------------');
  
  // Test login endpoints
  await testLogin('admin@probeops.com', 'adminpassword');
  await testLogin('test@probeops.com', 'testpassword');
  log('------------------------------------------------');
  
  // Test endpoints with different path formats
  await analyzePathRouting();
  log('------------------------------------------------');
  
  // Test a few specific endpoints
  const adminToken = createTestToken('admin@probeops.com', true);
  const testToken = createTestToken('test@probeops.com', false);
  
  await testEndpoint('/users/me', 'GET', adminToken);
  await testEndpoint('/users/me', 'GET', testToken);
  await testEndpoint('/admin/users', 'GET', adminToken);
  await testEndpoint('/admin/users', 'GET', testToken);
  log('------------------------------------------------');
  
  log('Diagnostics completed. Results saved to ' + DIAGNOSTICS_FILE);
}

// Run diagnostics
runDiagnostics().catch(error => {
  log('Error running diagnostics:', { error: error.message });
});