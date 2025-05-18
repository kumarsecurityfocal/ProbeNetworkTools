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
// Only import pg if DATABASE_URL is available
let Pool;
try {
  if (process.env.DATABASE_URL) {
    Pool = require('pg').Pool;
  }
} catch (err) {
  console.log('PostgreSQL module not available, database checks will be skipped');
}

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
  
  try {
    // First check if Docker is available
    await execAsync('command -v docker');
    
    // If Docker is available, collect container logs
    for (const container of CONTAINERS) {
      try {
        log(`Getting logs for container: ${container}`);
        const { stdout: logs } = await execAsync(`docker logs ${container} --tail 1000 2>&1`);
        log(`Container Logs (${container}):`, logs);
      } catch (error) {
        log(`Error getting logs for container ${container}:`, error.message);
      }
    }
  } catch (error) {
    log(`Docker not installed or not available, skipping container logs`);
  }
}

// Network information
async function collectNetworkInfo() {
  log('===== COLLECTING NETWORK INFORMATION =====');
  
  try {
    // Check if Docker is available
    try {
      await execAsync('command -v docker');
      
      // Docker is available, collect Docker network info
      try {
        const { stdout: dockerNetworks } = await execAsync('docker network ls');
        log('Docker Networks:', dockerNetworks);
        
        const { stdout: networkInspect } = await execAsync('docker network inspect probenetworktools_default 2>/dev/null || echo "Network not found"');
        log('ProbeOps Network Details:', networkInspect);
        
        // Get container IPs
        for (const container of CONTAINERS) {
          try {
            const { stdout: containerIp } = await execAsync(`docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${container} 2>/dev/null || echo "Not found"`);
            log(`${container} IP Address:`, containerIp.trim());
          } catch (error) {
            log(`Error getting IP for ${container}:`, error.message);
          }
        }
      } catch (error) {
        log('Error collecting Docker network information:', error.message);
      }
    } catch (dockerError) {
      // Docker not available, collect basic network info
      log('Docker not found, collecting basic network information');
      
      try {
        // Get network interfaces
        const { stdout: interfaces } = await execAsync('ip -brief addr 2>/dev/null || ifconfig 2>/dev/null || echo "Network interface commands not available"');
        log('Network Interfaces:', interfaces);
        
        // Check ports
        const { stdout: ports } = await execAsync('netstat -tulpn 2>/dev/null || ss -tulpn 2>/dev/null || echo "Port checking commands not available"');
        log('Open Ports:', ports);
        
        // Check diagnostic port
        const { stdout: diagnosticPort } = await execAsync('netstat -tulpn 2>/dev/null | grep 8888 || ss -tulpn 2>/dev/null | grep 8888 || echo "Port 8888 not found in listening ports"');
        log('Diagnostic Port Status:', diagnosticPort);
      } catch (netError) {
        log('Error collecting basic network information:', netError.message);
      }
    }
  } catch (error) {
    log('Error in network information collection:', error.message);
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
  
  // First check environment variables
  const dbUrlEnv = process.env.DATABASE_URL || '';
  const maskedDbUrl = dbUrlEnv.replace(/\/\/([^:]+):([^@]+)@/, '//***USERNAME***:***PASSWORD***@');
  log('Database URL (masked):', maskedDbUrl || 'Not found in environment variables');
  
  try {
    // METHOD 1: Try direct connection using node-postgres if available
    if (Pool && process.env.DATABASE_URL) {
      try {
        log('Attempting direct database connection using node-postgres...');
        const pool = new Pool();
        const client = await pool.connect();
        log('✅ Direct database connection successful');
        
        try {
          // Check database tables
          const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'`);
          
          if (tablesResult.rows.length > 0) {
            log('Database Tables:', tablesResult.rows.map(row => row.table_name).join(', '));
            
            // Check if users table exists
            if (tablesResult.rows.some(row => row.table_name === 'users')) {
              // Count users
              const userCountResult = await client.query('SELECT COUNT(*) FROM users');
              log('User Count:', userCountResult.rows[0].count);
              
              // Check admin users
              const adminUsersResult = await client.query(`
                SELECT email, username, is_admin 
                FROM users 
                WHERE is_admin = TRUE 
                LIMIT 5`);
              
              log('Admin Users:', JSON.stringify(adminUsersResult.rows, null, 2));
            } else {
              log('Users table not found in database');
            }
          } else {
            log('No tables found in the public schema');
          }
        } catch (queryError) {
          log('Error querying database:', queryError.message);
        }
        
        client.release();
        await pool.end();
      } catch (pgError) {
        log('Direct database connection failed:', pgError.message);
        tryBackupMethods();
      }
    } else {
      log('PostgreSQL client not available or DATABASE_URL not set, trying backup methods');
      tryBackupMethods();
    }
  } catch (error) {
    log('Error in database connection check:', error.message);
    tryBackupMethods();
  }
  
  // Try alternative methods if direct connection fails
  async function tryBackupMethods() {
    try {
      // METHOD 2: Try local psql command
      try {
        const { stdout: pgVersion } = await execAsync('psql -V 2>/dev/null');
        log('PostgreSQL client found:', pgVersion.trim());
        
        if (process.env.PGDATABASE && process.env.PGUSER) {
          log('PostgreSQL environment variables found, attempting direct psql connection');
          
          try {
            const { stdout: tables } = await execAsync('psql -c "\\dt" 2>/dev/null');
            log('Database Tables (from psql):', tables);
            
            const { stdout: userCount } = await execAsync('psql -c "SELECT COUNT(*) FROM users;" 2>/dev/null');
            log('User Count (from psql):', userCount);
          } catch (psqlError) {
            log('Error using local psql:', psqlError.message);
          }
        } else {
          log('PostgreSQL environment variables not set for direct psql connection');
        }
      } catch (psqlNotFound) {
        log('PostgreSQL client not found locally');
      }
      
      // METHOD 3: Try Docker container connection if Docker is available
      try {
        const { stdout: dockerCheck } = await execAsync('command -v docker');
        if (dockerCheck) {
          log('Docker found, attempting to check database via container');
          
          try {
            const { stdout: dbContainer } = await execAsync('docker ps | grep postgres');
            if (dbContainer) {
              const containerName = dbContainer.split(/\s+/)[0];
              log('Found PostgreSQL container:', containerName);
              
              try {
                const { stdout: tables } = await execAsync(`docker exec ${containerName} psql -U postgres -c "\\dt" 2>/dev/null`);
                log('Database Tables (from container):', tables);
              } catch (containerError) {
                log('Error querying database from container:', containerError.message);
              }
            } else {
              log('No PostgreSQL container found running');
            }
          } catch (dockerPsError) {
            log('Error checking for PostgreSQL containers:', dockerPsError.message);
          }
        }
      } catch (dockerNotFound) {
        log('Docker not available on this system');
      }
    } catch (backupError) {
      log('All database connection methods failed:', backupError.message);
    }
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