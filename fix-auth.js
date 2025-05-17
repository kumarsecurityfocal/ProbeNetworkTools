/**
 * Production Authentication Fix
 * 
 * This script:
 * 1. Creates a diagnostic tool for the JWT token issue
 * 2. Provides a fix for the direct hardcoded token
 * 3. Can be run in your production environment
 */

const fs = require('fs');
const path = require('path');

// Configuration - adjust these based on your environment
const config = {
  frontendDir: process.env.FRONTEND_DIR || '/home/ubuntu/ProbeNetworkTools/frontend',
  publicDir: process.env.PUBLIC_DIR || '/home/ubuntu/ProbeNetworkTools/public',
  backupDir: process.env.BACKUP_DIR || './backups'
};

// Create backup directory if it doesn't exist
if (!fs.existsSync(config.backupDir)) {
  fs.mkdirSync(config.backupDir, { recursive: true });
}

// Timestamp for backups
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Main function to check authentication implementation
function checkAuthImplementation() {
  console.log('===== ProbeOps Authentication Check =====');
  const apiJsPath = path.join(config.frontendDir, 'src/services/api.js');
  const authJsPath = path.join(config.frontendDir, 'src/services/auth.js');
  
  console.log(`\nChecking API service: ${apiJsPath}`);
  if (!fs.existsSync(apiJsPath)) {
    console.error(`File not found: ${apiJsPath}`);
    return false;
  }
  
  console.log(`Checking Auth service: ${authJsPath}`);
  if (!fs.existsSync(authJsPath)) {
    console.error(`File not found: ${authJsPath}`);
    return false;
  }
  
  // Read file contents
  const apiJs = fs.readFileSync(apiJsPath, 'utf8');
  const authJs = fs.readFileSync(authJsPath, 'utf8');
  
  // Check for problematic patterns
  let problemsFound = false;
  
  // Check 1: Search for hardcoded admin token
  if (apiJs.includes('admin-direct-access')) {
    console.error('❌ Found hardcoded admin token in api.js');
    console.log('   This can cause authentication issues as it\'s not a valid JWT');
    problemsFound = true;
  } else {
    console.log('✅ No hardcoded admin token found in api.js');
  }
  
  // Check 2: Verify token storage
  if (apiJs.includes('localStorage.setItem(\'probeops_token\'')) {
    console.log('✅ Token is being stored in localStorage');
  } else if (authJs.includes('localStorage.setItem(TOKEN_KEY')) {
    console.log('✅ Token is being stored in localStorage via TOKEN_KEY');
  } else {
    console.error('❌ Cannot find token storage mechanism');
    problemsFound = true;
  }
  
  // Check 3: Verify auth header
  if (apiJs.includes('Authorization') && apiJs.includes('Bearer')) {
    console.log('✅ Authorization header is being set with Bearer token');
  } else {
    console.error('❌ Cannot confirm Authorization header is properly set');
    problemsFound = true;
  }
  
  // Extract login endpoint
  let loginEndpoint = 'unknown';
  const loginEndpointMatch = apiJs.match(/api\.post\(['"]([^'"]+)['"]/);
  if (loginEndpointMatch && loginEndpointMatch[1]) {
    loginEndpoint = loginEndpointMatch[1];
    console.log(`✅ Login endpoint: ${loginEndpoint}`);
  } else {
    console.log('⚠️ Could not determine login endpoint');
  }
  
  // Provide suggestions
  console.log('\n===== Recommendations =====');
  if (problemsFound) {
    console.log('Found potential authentication issues. Consider the following fixes:');
    
    console.log('\n1. Update the login function to use only the actual JWT token:');
    console.log(`
// Ensure token is properly stored
if (response.data && response.data.access_token) {
  localStorage.setItem('probeops_token', response.data.access_token);
  console.log("Token saved:", response.data.access_token.substring(0, 10) + "...");
} else {
  console.error("No access_token found in login response");
}
`);
    
    console.log('\n2. Verify the login response structure matches what your code expects:');
    console.log(`
// The login endpoint should return:
{
  "access_token": "eyJ0eXAiOi...", // Valid JWT token
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "admin@probeops.com",
    "username": "admin",
    "is_admin": true
  }
}
`);
    
    console.log('\n3. Ensure the token is attached to API requests:');
    console.log(`
// In your request interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('probeops_token');
  if (token) {
    config.headers['Authorization'] = \`Bearer \${token}\`;
  }
  return config;
});
`);
    
  } else {
    console.log('✅ No obvious authentication issues found in the code.');
    console.log('If you are still experiencing issues, the problem might be:');
    console.log('1. Backend token validation is rejecting the token');
    console.log('2. Token format mismatch between frontend and backend');
    console.log('3. Cross-origin issues with token transmission');
  }
  
  console.log('\n===== Authentication Check Complete =====');
  return !problemsFound;
}

// Execute the check
checkAuthImplementation();