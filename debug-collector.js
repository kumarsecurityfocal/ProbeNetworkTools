/**
 * ProbeOps Debug Collector
 * 
 * This script collects comprehensive logs and diagnostic information from 
 * a Docker deployment environment to help diagnose authentication issues.
 * 
 * How to use:
 * 1. Add this script to your deployment
 * 2. Run it: node debug-collector.js
 * 3. Logs will be saved to ./debug-logs/probeops-debug-TIMESTAMP.log
 * 
 * This can be integrated into your CI/CD pipeline (deploy.sh) as needed.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { Pool } = require('pg');

// Configuration
const DEBUG_DIR = './debug-logs';
const LOG_RETENTION = 5; // Keep this many log files
const CONTAINERS = [
  'probenetworktools-backend-1',
  'probenetworktools-frontend-1',
  'probenetworktools-nginx-1',
  'probenetworktools-probe-1',
  'probenetworktools-db-1'
];

// Ensure debug directory exists
if (!fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/:/g, '-');
const logFilePath = path.join(DEBUG_DIR, `probeops-debug-${timestamp}.log`);
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Custom logging function
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  
  console.log(formattedMessage);
  logStream.write(formattedMessage + '\n');
  
  if (data) {
    const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    console.log(dataStr);
    logStream.write(dataStr + '\n');
  }
  
  logStream.write('\n');
}

// Rotate log files
async function rotateLogFiles() {
  try {
    const files = fs.readdirSync(DEBUG_DIR)
      .filter(file => file.startsWith('probeops-debug-'))
      .map(file => path.join(DEBUG_DIR, file))
      .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
    
    if (files.length > LOG_RETENTION) {
      for (let i = LOG_RETENTION; i < files.length; i++) {
        fs.unlinkSync(files[i]);
        log(`Deleted old log file: ${files[i]}`);
      }
    }
  } catch (error) {
    log('Error rotating log files:', error.message);
  }
}

// System information
async function collectSystemInfo() {
  log('===== COLLECTING SYSTEM INFORMATION =====');
  
  try {
    const { stdout: dockerVersion } = await execAsync('docker --version');
    log('Docker Version:', dockerVersion.trim());
    
    const { stdout: dockerComposeVersion } = await execAsync('docker compose version');
    log('Docker Compose Version:', dockerComposeVersion.trim());
    
    const { stdout: nodeVersion } = await execAsync('node --version');
    log('Node Version:', nodeVersion.trim());
    
    const { stdout: dockerPs } = await execAsync('docker ps');
    log('Running Docker Containers:', dockerPs);
    
    const { stdout: diskSpace } = await execAsync('df -h');
    log('Disk Space:', diskSpace);
    
    const { stdout: memInfo } = await execAsync('free -h');
    log('Memory Information:', memInfo);
  } catch (error) {
    log('Error collecting system information:', error.message);
  }
}

// Docker container logs
async function collectContainerLogs() {
  log('===== COLLECTING CONTAINER LOGS =====');
  
  for (const container of CONTAINERS) {
    try {
      log(`Getting logs for container: ${container}`);
      const { stdout: logs } = await execAsync(`docker logs ${container} --tail 1000 2>&1`);
      log(`Container Logs (${container}):`, logs);
    } catch (error) {
      log(`Error getting logs for container ${container}:`, error.message);
    }
  }
}

// Network information
async function collectNetworkInfo() {
  log('===== COLLECTING NETWORK INFORMATION =====');
  
  try {
    const { stdout: dockerNetworks } = await execAsync('docker network ls');
    log('Docker Networks:', dockerNetworks);
    
    const { stdout: networkInspect } = await execAsync('docker network inspect probenetworktools_default');
    log('ProbeOps Network Details:', networkInspect);
    
    // Get container IPs
    for (const container of CONTAINERS) {
      try {
        const { stdout: containerIp } = await execAsync(`docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${container}`);
        log(`${container} IP Address:`, containerIp.trim());
      } catch (error) {
        log(`Error getting IP for ${container}:`, error.message);
      }
    }
  } catch (error) {
    log('Error collecting network information:', error.message);
  }
}

// File system checks
async function collectFileSystemInfo() {
  log('===== COLLECTING FILE SYSTEM INFORMATION =====');
  
  for (const container of CONTAINERS) {
    try {
      // Check specific important files
      if (container.includes('backend')) {
        const { stdout: alembicIni } = await execAsync(`docker exec ${container} cat /app/alembic.ini 2>/dev/null || echo "File not found"`);
        log(`${container} alembic.ini:`, alembicIni);
        
        const { stdout: envFile } = await execAsync(`docker exec ${container} cat /app/.env 2>/dev/null || echo "File not found"`);
        log(`${container} .env file:`, envFile);
        
        const { stdout: alembicVersions } = await execAsync(`docker exec ${container} ls -la /app/alembic/versions/ 2>/dev/null || echo "Directory not found"`);
        log(`${container} alembic versions:`, alembicVersions);
      }
      
      if (container.includes('frontend')) {
        const { stdout: packageJson } = await execAsync(`docker exec ${container} cat /app/package.json 2>/dev/null || echo "File not found"`);
        log(`${container} package.json:`, packageJson);
        
        const { stdout: authContext } = await execAsync(`docker exec ${container} cat /app/src/context/AuthContext.jsx 2>/dev/null || echo "File not found"`);
        log(`${container} AuthContext.jsx:`, authContext);
        
        const { stdout: authService } = await execAsync(`docker exec ${container} cat /app/src/services/auth.js 2>/dev/null || echo "File not found"`);
        log(`${container} auth.js:`, authService);
      }
    } catch (error) {
      log(`Error collecting file system info for ${container}:`, error.message);
    }
  }
}

// Database checks
async function checkDatabaseConnection() {
  log('===== CHECKING DATABASE CONNECTION =====');
  
  try {
    // Try to get database connection string from backend container
    const { stdout: dbUrl } = await execAsync(
      `docker exec probenetworktools-backend-1 bash -c 'echo $DATABASE_URL' 2>/dev/null || echo "Not found"`
    );
    
    log('Database URL (masked):', dbUrl.includes('@') 
      ? dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//USERNAME:PASSWORD@').trim()
      : 'Not found or malformed');
    
    // Check if we can connect directly to the database container
    const { stdout: pgVersion } = await execAsync(`docker exec probenetworktools-db-1 psql -V 2>/dev/null || echo "PostgreSQL not found"`);
    log('PostgreSQL Version:', pgVersion.trim());
    
    // Check database tables (safely)
    try {
      const { stdout: tables } = await execAsync(
        `docker exec probenetworktools-db-1 psql -U postgres -c "\\dt" 2>/dev/null || echo "Could not list tables"`
      );
      log('Database Tables:', tables);
      
      // Check users table structure (without exposing data)
      const { stdout: userTableStructure } = await execAsync(
        `docker exec probenetworktools-db-1 psql -U postgres -c "\\d users" 2>/dev/null || echo "Could not describe users table"`
      );
      log('Users Table Structure:', userTableStructure);
      
      // Count users safely
      const { stdout: userCount } = await execAsync(
        `docker exec probenetworktools-db-1 psql -U postgres -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "Could not count users"`
      );
      log('User Count:', userCount);
      
      // Check admin users (safely, without exposing passwords)
      const { stdout: adminUsers } = await execAsync(
        `docker exec probenetworktools-db-1 psql -U postgres -c "SELECT email, is_admin FROM users WHERE is_admin = TRUE;" 2>/dev/null || echo "Could not list admin users"`
      );
      log('Admin Users:', adminUsers);
    } catch (error) {
      log('Error querying database:', error.message);
    }
  } catch (error) {
    log('Error checking database connection:', error.message);
  }
}

// JWT configuration
function checkJwtConfig() {
  log('===== CHECKING JWT CONFIGURATION =====');
  
  try {
    // Extract JWT config from environment or config files
    execAsync(`docker exec probenetworktools-backend-1 bash -c 'grep -r "JWT_SECRET\|jwt\\.secret" /app --include="*.py" --include="*.env" 2>/dev/null'`)
      .then(({ stdout }) => {
        // Mask the actual secret if found
        const maskedOutput = stdout.replace(/(JWT_SECRET|jwt\.secret)=(["']?)([^"'\n]+)(["']?)/g, '$1=$2***MASKED***$4');
        log('JWT Secret Configuration (masked):', maskedOutput || 'Not found in files');
      })
      .catch(error => {
        log('Error searching for JWT configuration:', error.message);
      });
    
    // Check JWT expiration settings
    execAsync(`docker exec probenetworktools-backend-1 bash -c 'grep -r "expir\|TOKEN_EXPIRY\|access_token_expires" /app --include="*.py" 2>/dev/null'`)
      .then(({ stdout }) => {
        log('JWT Expiration Settings:', stdout || 'Not found in files');
      })
      .catch(error => {
        log('Error searching for JWT expiration settings:', error.message);
      });
  } catch (error) {
    log('Error checking JWT configuration:', error.message);
  }
}

// Authentication configuration
function checkAuthConfig() {
  log('===== CHECKING AUTHENTICATION CONFIGURATION =====');
  
  try {
    // Backend auth code
    execAsync(`docker exec probenetworktools-backend-1 bash -c 'grep -r "authenticate\|login\|create_access_token" /app --include="*.py" 2>/dev/null | head -n 50'`)
      .then(({ stdout }) => {
        log('Backend Authentication Code (first 50 lines):', stdout || 'Not found');
      })
      .catch(error => {
        log('Error searching for backend auth code:', error.message);
      });
    
    // Frontend auth code
    execAsync(`docker exec probenetworktools-frontend-1 bash -c 'grep -r "login\|authentication\|isAuthenticated" /app/src --include="*.js" --include="*.jsx" 2>/dev/null | head -n 50'`)
      .then(({ stdout }) => {
        log('Frontend Authentication Code (first 50 lines):', stdout || 'Not found');
      })
      .catch(error => {
        log('Error searching for frontend auth code:', error.message);
      });
  } catch (error) {
    log('Error checking auth configuration:', error.message);
  }
}

// API endpoint tests
async function testApiEndpoints() {
  log('===== TESTING API ENDPOINTS =====');
  
  try {
    // Check if curl is available
    const { stdout: curlVersion } = await execAsync('docker exec probenetworktools-backend-1 curl --version || echo "curl not found"');
    log('Curl Version:', curlVersion.split('\n')[0]);
    
    // Test login endpoint (without exposing credentials)
    log('Testing login endpoint (masked credentials)...');
    const loginCommand = `docker exec probenetworktools-backend-1 bash -c 'curl -s -X POST http://localhost:8000/login -H "Content-Type: application/json" -d "{\\"username\\":\\"admin@probeops.com\\",\\"password\\":\\"***MASKED***\\"}" || echo "Request failed"'`;
    try {
      const { stdout: loginResponse } = await execAsync(loginCommand);
      // Mask any token in response
      const maskedResponse = loginResponse.replace(/"(access_token|token)":\s*"([^"]+)"/g, '"$1": "***MASKED_TOKEN***"');
      log('Login Endpoint Response (masked):', maskedResponse);
    } catch (error) {
      log('Error testing login endpoint:', error.message);
    }
    
    // Test user profile endpoint
    log('Testing user profile endpoint...');
    try {
      const { stdout: profileResponse } = await execAsync(`docker exec probenetworktools-backend-1 bash -c 'curl -s -X GET http://localhost:8000/users/me -H "Accept: application/json" || echo "Request failed"'`);
      log('User Profile Endpoint Response:', profileResponse);
    } catch (error) {
      log('Error testing user profile endpoint:', error.message);
    }
  } catch (error) {
    log('Error testing API endpoints:', error.message);
  }
}

// Collect all logs and information
async function collectAllLogs() {
  const startTime = new Date();
  log(`Starting comprehensive log collection at ${startTime.toISOString()}`);
  
  await rotateLogFiles();
  await collectSystemInfo();
  await collectContainerLogs();
  await collectNetworkInfo();
  await collectFileSystemInfo();
  await checkDatabaseConnection();
  checkJwtConfig();
  checkAuthConfig();
  await testApiEndpoints();
  
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  log(`Log collection completed at ${endTime.toISOString()} (took ${duration} seconds)`);
  log(`Debug logs saved to: ${logFilePath}`);
  
  logStream.end();
  console.log(`\nDebug logs have been saved to: ${logFilePath}`);
  console.log('You can now retrieve this file and share it for analysis.');
}

// Main function
collectAllLogs().catch(error => {
  log('Fatal error during log collection:', error.message);
  logStream.end();
});