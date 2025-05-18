/**
 * ProbeOps Auth Test Script
 *
 * This script simulates and tests the exact auth flow from frontend to backend:
 * - Attempts to login with both user types using correct POST method
 * - Tests the user profile endpoint to verify token validity
 * - Tests admin endpoint access for both user types
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Constants
const BACKEND_PORT = 8000;
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'auth-test.log');

// Create log directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Clear previous log
fs.writeFileSync(LOG_FILE, '');

// Logger
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`;
  
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
  console.log(logMessage);
}

// HTTP request helper
async function makeRequest(options, body = null) {
  return new Promise((resolve) => {
    if (body) {
      // When sending a body, make sure Content-Type and Content-Length are set
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers = options.headers || {};
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
      
      // Log the actual body being sent for debugging
      console.log(`Request body: ${bodyString}`);
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonData
          });
        } catch (e) {
          // Not JSON
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message
      });
    });
    
    if (body) {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(bodyString);
    }
    
    req.end();
  });
}

// Test login with correct POST method
async function testLogin(email, password) {
  log(`Testing login for ${email}`);
  
  const options = {
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': `localhost:${BACKEND_PORT}`
    }
  };
  
  const body = {
    username: email,  // FastAPI expects 'username' not 'email'
    password
  };
  
  const result = await makeRequest(options, body);
  log(`Login result for ${email}`, {
    status: result.status,
    body: result.body
  });
  
  return result;
}

// Test user profile endpoint with token
async function testUserProfile(token) {
  log('Testing user profile endpoint');
  
  const options = {
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: '/users/me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Host': `localhost:${BACKEND_PORT}`
    }
  };
  
  const result = await makeRequest(options);
  log('User profile result', {
    status: result.status,
    body: result.body
  });
  
  return result;
}

// Test admin endpoints with token
async function testAdminEndpoint(token, endpoint = '/admin/users') {
  log(`Testing admin endpoint: ${endpoint}`);
  
  const options = {
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Host': `localhost:${BACKEND_PORT}`
    }
  };
  
  const result = await makeRequest(options);
  log(`Admin endpoint result: ${endpoint}`, {
    status: result.status,
    body: result.body
  });
  
  return result;
}

// Test probe endpoints with token
async function testProbeEndpoint(token, isAdmin = false) {
  const endpoint = isAdmin ? '/api/probes' : '/probes';
  log(`Testing probe endpoint: ${endpoint}`);
  
  const options = {
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: endpoint,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Host': `localhost:${BACKEND_PORT}`
    }
  };
  
  const result = await makeRequest(options);
  log(`Probe endpoint result (${isAdmin ? 'admin' : 'user'})`, {
    status: result.status
  });
  
  return result;
}

// Main test suite
async function runTests() {
  console.log('Starting auth flow tests...');
  
  // Test admin login
  log('==== ADMIN TESTS ====');
  const adminLoginResult = await testLogin('admin@probeops.com', 'adminpassword');
  
  if (adminLoginResult.status === 200 && adminLoginResult.body.access_token) {
    const adminToken = adminLoginResult.body.access_token;
    
    // Test admin user profile
    await testUserProfile(adminToken);
    
    // Test admin endpoints with admin token
    await testAdminEndpoint(adminToken, '/admin/db-tables');
    await testAdminEndpoint(adminToken, '/admin/debug-status');
    
    // Test probe endpoints as admin
    await testProbeEndpoint(adminToken, true);
  }
  
  // Test user login
  log('\n==== USER TESTS ====');
  const userLoginResult = await testLogin('test@probeops.com', 'testpassword');
  
  if (userLoginResult.status === 200 && userLoginResult.body.access_token) {
    const userToken = userLoginResult.body.access_token;
    
    // Test user profile
    await testUserProfile(userToken);
    
    // Test probe endpoints as user
    await testProbeEndpoint(userToken, false);
    
    // Test admin access as standard user (should be denied)
    await testAdminEndpoint(userToken, '/admin/db-tables');
  }
  
  console.log(`\nAuth tests completed. Check ${LOG_FILE} for detailed results.`);
}

// Run the tests
runTests();