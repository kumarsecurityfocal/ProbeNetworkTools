// Debug Collector Utility
// This module handles collecting system logs, database status, and other debugging information
const fs = require('fs');
const { exec } = require('child_process');
const http = require('http');
const { Pool } = require('pg');

let debugEnabled = false;

// Function to collect system logs
function collectSystemLogs() {
  return new Promise((resolve, reject) => {
    let logs = '';
    logs += '=== SERVER LOGS ===\n\n';
    
    // Get available log files
    try {
      // Try to collect logs from standard locations
      const serverLogs = fs.existsSync('./logs/server.log') 
        ? fs.readFileSync('./logs/server.log', 'utf8') 
        : 'Server log file not found';
      
      logs += 'Server Logs:\n' + serverLogs + '\n\n';
    } catch (error) {
      logs += `Error reading server logs: ${error.message}\n\n`;
    }
    
    // Get docker container logs if running in Docker
    exec('docker ps', (error, stdout, stderr) => {
      if (error) {
        logs += 'Not running in Docker or Docker not accessible\n\n';
      } else {
        logs += 'Docker Containers:\n' + stdout + '\n\n';
      }
      
      // Get system info
      logs += '=== SYSTEM INFO ===\n\n';
      exec('node -v && npm -v', (error, stdout, stderr) => {
        logs += 'Node and NPM versions:\n' + stdout + '\n\n';
        
        // Check backend API status
        logs += '=== BACKEND API STATUS ===\n\n';
        try {
          const req = http.request({
            hostname: 'localhost',
            port: 8000,
            path: '/health',
            method: 'GET'
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              logs += `Backend API Status: ${res.statusCode}\n`;
              logs += `Response: ${data}\n\n`;
              
              // Check environment variables (redact sensitive info)
              logs += '=== ENVIRONMENT VARIABLES ===\n\n';
              const env = {...process.env};
              
              // Redact sensitive info
              ['DATABASE_URL', 'JWT_SECRET', 'SECRET_KEY', 'PASSWORD', 'APIKEY', 'TOKEN'].forEach(key => {
                Object.keys(env).forEach(envKey => {
                  if (envKey.toUpperCase().includes(key)) {
                    env[envKey] = '[REDACTED]';
                  }
                });
              });
              
              logs += `Environment Variables:\n${JSON.stringify(env, null, 2)}\n\n`;
              
              // Check memory usage
              logs += '=== MEMORY USAGE ===\n\n';
              logs += `Memory Usage: ${JSON.stringify(process.memoryUsage(), null, 2)}\n\n`;
              
              // Add debug status
              logs += '=== DEBUG STATUS ===\n\n';
              logs += `Debug Mode: ${debugEnabled ? 'Enabled' : 'Disabled'}\n\n`;
              
              resolve(logs);
            });
          });
          
          req.on('error', (error) => {
            logs += `Backend API Error: ${error.message}\n\n`;
            
            // Continue with the rest of the logs
            resolve(logs);
          });
          
          req.end();
        } catch (error) {
          logs += `Error checking backend API: ${error.message}\n\n`;
          resolve(logs);
        }
      });
    });
  });
}

// Function to check database connection
async function checkDatabaseConnection() {
  let results = {
    status: 'unknown',
    version: null,
    tables: [],
    connectionInfo: {},
    error: null
  };
  
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    results.status = 'error';
    results.error = 'DATABASE_URL environment variable not found';
    return results;
  }
  
  // Create a connection pool
  const pool = new Pool({
    connectionString: dbUrl
  });
  
  try {
    // Test connection and get version
    const versionRes = await pool.query('SELECT version()');
    results.version = versionRes.rows[0].version;
    results.status = 'connected';
    
    // Get table list
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    results.tables = tablesRes.rows.map(row => row.table_name);
    
    // Get connection info (redacted)
    const connInfo = new URL(dbUrl);
    results.connectionInfo = {
      host: connInfo.hostname,
      port: connInfo.port,
      database: connInfo.pathname.substring(1),
      user: '[REDACTED]',
      ssl: dbUrl.includes('sslmode=')
    };
  } catch (error) {
    results.status = 'error';
    results.error = error.message;
  } finally {
    // Close the pool
    await pool.end();
  }
  
  return results;
}

// Function to check JWT configuration
function checkJwtConfig() {
  const jwt = require('jsonwebtoken');
  const results = {
    jwtSecretConfigured: false,
    jwtAlgorithm: null,
    jwtExpiration: null,
    error: null
  };
  
  try {
    // Check if JWT_SECRET is configured
    const jwtSecret = process.env.JWT_SECRET;
    results.jwtSecretConfigured = !!jwtSecret;
    
    // Create a test token to check algorithm and expiration
    if (jwtSecret) {
      // Get the algorithm from a test token
      const testToken = jwt.sign({ test: true }, jwtSecret);
      const decoded = jwt.decode(testToken, { complete: true });
      
      results.jwtAlgorithm = decoded.header.alg;
      
      // Check expiration configuration for a typical token
      const testUserToken = jwt.sign(
        { sub: 'test@example.com' }, 
        jwtSecret, 
        { expiresIn: process.env.JWT_EXPIRATION || '1d' }
      );
      const decodedUser = jwt.decode(testUserToken);
      
      // Calculate expiration in hours
      if (decodedUser.exp) {
        const expiresInSeconds = decodedUser.exp - decodedUser.iat;
        results.jwtExpiration = `${(expiresInSeconds / 3600).toFixed(1)} hours`;
      }
    }
  } catch (error) {
    results.error = error.message;
  }
  
  return results;
}

// Function to check authentication configuration
function checkAuthConfig() {
  return {
    authMethod: 'JWT',
    tokenLifetime: process.env.JWT_EXPIRATION || '1d',
    sessionPersistence: false,
    adminEmail: process.env.ADMIN_EMAIL || 'admin@probeops.com',
    debugMode: debugEnabled
  };
}

// Toggle debug mode
function toggleDebugMode(enabled) {
  debugEnabled = enabled;
  return { debug_enabled: debugEnabled };
}

// Get debug status
function getDebugStatus() {
  return { debug_enabled: debugEnabled };
}

module.exports = {
  collectSystemLogs,
  checkDatabaseConnection,
  checkJwtConfig,
  checkAuthConfig,
  toggleDebugMode,
  getDebugStatus
};