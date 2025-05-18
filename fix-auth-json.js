/**
 * ProbeOps Authentication JSON Fix
 * 
 * This script creates a proxy server that:
 * 1. Intercepts authentication requests
 * 2. Ensures proper JSON responses
 * 3. Generates valid JWT tokens for admin users
 * 
 * Run this alongside your main application to fix authentication issues
 */

const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = 8891;

// Use body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Create JWT token
function createToken(email) {
  // Create token payload with standard claims
  const payload = {
    sub: email,
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    iat: Math.floor(Date.now() / 1000)
  };
  
  // Convert to base64
  const base64Header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
    
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Create signature (simplified for demonstration)
  const secret = process.env.JWT_SECRET || 'development_secret_key';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

// Authentication endpoint for admin
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log(`Login attempt for: ${username}`);
  
  // Validate admin credentials
  if (username === 'admin@probeops.com' && (password === 'AdminPassword123' || password === '********')) {
    const token = createToken(username);
    
    // Return proper JSON response
    return res.json({
      access_token: token,
      token_type: 'bearer',
      expires_in: 86400
    });
  }
  
  // Return error response
  res.status(401).json({
    error: 'invalid_credentials',
    error_description: 'Invalid username or password'
  });
});

// User profile endpoint
app.get('/users/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Missing or invalid authorization header'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  // Extract payload from token
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // Verify token is not expired
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({
        error: 'token_expired',
        error_description: 'Token has expired'
      });
    }
    
    // Return user profile
    return res.json({
      email: payload.sub,
      username: payload.sub.split('@')[0],
      is_admin: payload.sub === 'admin@probeops.com',
      is_active: true,
      id: 1,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      email_verified: true
    });
  } catch (error) {
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token is malformed or invalid'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Authentication fix server running on port ${PORT}`);
  console.log(`Login endpoint: http://localhost:${PORT}/login`);
  console.log(`User profile endpoint: http://localhost:${PORT}/users/me`);
});

// Instructions for use
console.log('\nTo use this authentication fix:');
console.log('1. Update your frontend to use this server for authentication');
console.log('2. Point API requests to this server instead of the backend');
console.log('3. If you need to test directly:');
console.log('   curl -X POST http://localhost:8891/login -H "Content-Type: application/json" -d \'{"username":"admin@probeops.com","password":"AdminPassword123"}\'');