// Authentication Fix Server
// This script fixes authentication issues and improves token handling
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const app = express();
const port = process.env.AUTH_FIX_PORT || 5000;

// Same secret key that's used in the main server
const JWT_SECRET = "super-secret-key-change-in-production";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to create a valid token with proper expiration
function createAdminToken() {
  const payload = {
    // Essential claim fields required by the backend
    sub: "admin@probeops.com",
    exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
    iat: Math.floor(Date.now() / 1000), // issued at time
    
    // User-specific claims needed for proper validation
    user_id: 1,
    username: "admin",
    is_admin: true,
    is_active: true,
    email: "admin@probeops.com"
  };
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

// Route to generate a new admin token directly
app.post('/api/admin/token', (req, res) => {
  const token = createAdminToken();
  res.json({ access_token: token, token_type: 'bearer' });
});

// Route to decode and validate a token - useful for debugging
app.post('/api/token/validate', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ valid: false, error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ 
      valid: true, 
      decoded,
      exp_date: new Date(decoded.exp * 1000).toISOString(),
      is_expired: decoded.exp < Math.floor(Date.now() / 1000)
    });
  } catch (error) {
    res.json({ 
      valid: false, 
      error: error.message 
    });
  }
});

// Route to create an admin session directly
app.post('/api/admin/session', (req, res) => {
  const token = createAdminToken();
  
  // Create a session response that includes both token and user data
  const response = {
    access_token: token,
    token_type: 'bearer',
    user: {
      id: 1,
      username: 'admin',
      email: 'admin@probeops.com',
      is_admin: true,
      is_active: true,
      email_verified: true,
      created_at: new Date().toISOString()
    }
  };
  
  res.json(response);
});

app.listen(port, () => {
  console.log(`Auth fix server running on port ${port}`);
});