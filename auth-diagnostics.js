/**
 * ProbeOps Auth Diagnostics Tool
 * 
 * This comprehensive diagnostic tool will help identify the exact issues with:
 * 1. The path handling for different endpoints
 * 2. Authentication token generation and validation
 * 3. The difference in behavior between admin and test users
 * 4. Backend token validation and reconnection
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Configuration
const BACKEND_PORT = 8000;
const JWT_SECRET = "super-secret-key-change-in-production";
const LOG_DIR = path.join(__dirname, 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file paths
const ADMIN_LOG = path.join(LOG_DIR, 'admin-auth-debug.log');
const TEST_LOG = path.join(LOG_DIR, 'test-auth-debug.log');
const PATH_LOG = path.join(LOG_DIR, 'path-debug.log');

// Clear previous logs
fs.writeFileSync(ADMIN_LOG, '');
fs.writeFileSync(TEST_LOG, '');
fs.writeFileSync(PATH_LOG, '');

// Logger function
function logToFile(file, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`;
  
  fs.appendFileSync(file, logMessage + '\n');
  console.log(logMessage);
}

// Create tokens for different user types
function createToken(email, expiresIn = 86400) {
  const payload = {
    sub: email,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    iat: Math.floor(Date.now() / 1000)
  };
  
  const token = jwt.sign(payload, JWT_SECRET);
  return token;
}

// Test endpoints with both user types
async function testEndpoint(endpoint, userType = 'admin') {
  const email = userType === 'admin' ? 'admin@probeops.com' : 'test@probeops.com';
  const logFile = userType === 'admin' ? ADMIN_LOG : TEST_LOG;
  
  // Create a token
  const token = createToken(email);
  logToFile(logFile, `Created token for ${email}`, { tokenStart: token.substring(0, 20) + '...' });
  
  // Decode token to verify payload
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    logToFile(logFile, `Token verified successfully`, {
      sub: decoded.sub,
      exp: new Date(decoded.exp * 1000).toISOString(),
      iat: new Date(decoded.iat * 1000).toISOString()
    });
  } catch (err) {
    logToFile(logFile, `Token verification failed`, { error: err.message });
  }
  
  // Clean path for diagnostic purposes
  const cleanedPath = cleanEndpointPath(endpoint);
  logToFile(PATH_LOG, `Path cleaning result`, { 
    original: endpoint, 
    cleaned: cleanedPath
  });
  
  // Test the endpoint
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: cleanedPath,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Host': `localhost:${BACKEND_PORT}`
      }
    };
    
    logToFile(logFile, `Testing endpoint ${endpoint} (cleaned: ${cleanedPath})`, options);
    
    const req = http.request(options, (res) => {
      logToFile(logFile, `Response status for ${endpoint}`, { 
        statusCode: res.statusCode,
        statusMessage: res.statusMessage
      });
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(data);
          logToFile(logFile, `Response data (JSON) for ${endpoint}`, jsonData);
        } catch (e) {
          // Not JSON, log as plain text (truncated if too long)
          if (data.length > 500) {
            logToFile(logFile, `Response data (text, truncated) for ${endpoint}`, data.substring(0, 500) + '...');
          } else {
            logToFile(logFile, `Response data (text) for ${endpoint}`, data);
          }
        }
        
        resolve({ 
          status: res.statusCode, 
          headers: res.headers, 
          body: data 
        });
      });
    });
    
    req.on('error', (error) => {
      logToFile(logFile, `Error testing endpoint ${endpoint}`, { error: error.message });
      resolve({ status: 0, error: error.message });
    });
    
    req.end();
  });
}

// Path cleaning function similar to server implementation for consistency
function cleanEndpointPath(originalPath) {
  let result = originalPath;
  
  // Special handling for login/auth endpoints
  if (result.includes('/auth/login') || result.includes('/api/auth/login')) {
    return '/auth/login';
  }
  
  if (result.includes('/login')) {
    return '/login'; 
  }
  
  // Special handling for user profile endpoint
  if (result.includes('/users/me') || result.includes('/api/users/me')) {
    return '/users/me';
  }
  
  // Special handling for admin endpoints
  if (result.includes('/admin/') || result.endsWith('/admin')) {
    return result.replace(/^(\/api)+/, '/api');
  }
  
  // Special handling for probes endpoint
  if (result.includes('/probes')) {
    if (result.includes('/api/probes') && result.includes('/admin')) {
      return '/api/probes' + (result.split('/probes')[1] || '');
    } else {
      return '/probes' + (result.split('/probes')[1] || '');
    }
  }
  
  // General API path handling
  const apiRegex = /^(\/api)+/;
  if (apiRegex.test(result)) {
    result = result.replace(apiRegex, '');
    
    if (!result.startsWith('/')) {
      result = '/' + result;
    }
  }
  
  return result;
}

// Test login for both user types
async function testLoginFlow(userType = 'admin') {
  const email = userType === 'admin' ? 'admin@probeops.com' : 'test@probeops.com';
  const logFile = userType === 'admin' ? ADMIN_LOG : TEST_LOG;
  
  logToFile(logFile, `Starting login flow test for ${email}`);
  
  // Test endpoints with direct login
  const loginResult = await testEndpoint('/login', userType);
  
  // Test user profile endpoint with the same token type
  if (loginResult.status === 200) {
    await testEndpoint('/api/users/me', userType);
  }
  
  // Test a few more endpoints based on user type
  if (userType === 'admin') {
    await testEndpoint('/api/admin/db-tables', userType);
    await testEndpoint('/api/probes', userType);
  } else {
    await testEndpoint('/api/probes', userType);
    await testEndpoint('/api/keys', userType);
  }
}

// Main diagnostic function
async function runDiagnostics() {
  console.log('Starting ProbeOps authentication diagnostics...');
  
  // Create both user type tokens and analyze them
  const adminToken = createToken('admin@probeops.com');
  const testToken = createToken('test@probeops.com');
  
  logToFile(ADMIN_LOG, 'Admin token', { token: adminToken });
  logToFile(TEST_LOG, 'Test token', { token: testToken });
  
  console.log('\nTesting admin user flow:');
  await testLoginFlow('admin');
  
  console.log('\nTesting test user flow:');
  await testLoginFlow('test');
  
  console.log('\nDiagnostics complete. Check the logs directory for detailed results.');
  console.log(`Admin log: ${ADMIN_LOG}`);
  console.log(`Test user log: ${TEST_LOG}`);
  console.log(`Path handling log: ${PATH_LOG}`);
}

// Run the diagnostics
runDiagnostics();