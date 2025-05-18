/**
 * Simple Authentication Test Tool
 * 
 * This script specifically tests authentication endpoints
 * and captures the raw response to identify issues.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');

// Configuration
const LOG_FILE = './auth-test.log';
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
const loginUrl = `${backendUrl}/login`;

// Test credentials
const credentials = {
  username: 'admin@probeops.com',
  password: 'probeopS1@'
};

// Prepare log file
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'w' });

// Logging function
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  
  console.log(formattedMessage);
  logStream.write(formattedMessage + '\n');
  
  if (data) {
    const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    console.log(dataStr);
    logStream.write(dataStr + '\n\n');
  }
}

// Make an HTTP request
function makeRequest(url, method, data, headers = {}) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };
    
    let requestBody = null;
    
    // Handle form data for login requests
    if (method === 'POST' && url.includes('/login') && data) {
      log('Using form-urlencoded format for login request');
      // Convert to form-urlencoded format
      const formData = new URLSearchParams();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });
      
      requestBody = formData.toString();
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.headers['Content-Length'] = Buffer.byteLength(requestBody);
    } 
    // Regular JSON for other requests
    else if (data) {
      requestBody = JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(requestBody);
    }
    
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;
    
    log(`Making ${method} request to ${url}`);
    log('Request payload:', data);
    log('Request headers:', options.headers);
    
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
            result.json = JSON.parse(responseData);
          }
        } catch (e) {
          result.parseError = e.message;
        }
        
        // Check if response is HTML
        if (responseData.includes('<!DOCTYPE') || responseData.includes('<html')) {
          result.isHtml = true;
        }
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      log(`Request to ${url} failed:`, error.message);
      resolve({ error: error.message });
    });
    
    if (requestBody) {
      log('Sending data:', requestBody);
      req.write(requestBody);
    }
    
    req.end();
  });
}

// Main test function
async function testAuthentication() {
  log('== Starting Authentication Test ==');
  log(`Testing login endpoint: ${loginUrl}`);
  log('Using credentials:', { 
    username: credentials.username, 
    password: credentials.password.replace(/./g, '*') 
  });
  
  // Test 1: Login request
  const loginResult = await makeRequest(loginUrl, 'POST', credentials);
  
  log('Login Response Status:', loginResult.statusCode);
  log('Login Response Headers:', loginResult.headers);
  
  if (loginResult.isHtml) {
    log('WARNING: Login endpoint returned HTML instead of JSON. This is likely the cause of the auth issue.');
    log('HTML snippet:', loginResult.rawData.substring(0, 500) + '...');
  }
  
  if (loginResult.json) {
    log('Login Response JSON:', loginResult.json);
    
    // If we got a token, try the profile endpoint
    if (loginResult.json.access_token) {
      const token = loginResult.json.access_token;
      log('Successfully received token:', token.substring(0, 10) + '...');
      
      // Test 2: Profile request
      const profileUrl = `${backendUrl}/users/me`;
      log(`Testing profile endpoint: ${profileUrl}`);
      
      const profileResult = await makeRequest(profileUrl, 'GET', null, {
        'Authorization': `Bearer ${token}`
      });
      
      log('Profile Response Status:', profileResult.statusCode);
      log('Profile Response Headers:', profileResult.headers);
      
      if (profileResult.isHtml) {
        log('WARNING: Profile endpoint returned HTML instead of JSON');
        log('HTML snippet:', profileResult.rawData.substring(0, 500) + '...');
      } else if (profileResult.json) {
        log('Profile Response JSON:', profileResult.json);
      } else {
        log('Profile Response Raw:', profileResult.rawData);
      }
    }
  } else if (loginResult.parseError) {
    log('ERROR: Failed to parse JSON response:', loginResult.parseError);
  }
  
  log('== Authentication Test Complete ==');
  log(`Full results saved to ${LOG_FILE}`);
}

// Run the test
testAuthentication()
  .catch(error => {
    log('Unexpected error:', error);
  })
  .finally(() => {
    logStream.end();
  });