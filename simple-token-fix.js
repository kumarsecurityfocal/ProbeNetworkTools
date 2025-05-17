// This is a simple standalone script to help fix the token management interface
// Run it to apply a temporary fix to the token interface problems

const express = require('express');
const app = express();
const port = 5001;

// Load JWT for token verification
const jwt = require('jsonwebtoken');

// Basic middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage for tokens since this is a temporary fix
const tokens = [];

// Get all tokens
app.get('/api/tokens', (req, res) => {
  res.json({ tokens });
});

// Create a token
app.post('/api/tokens', (req, res) => {
  const { description } = req.body;
  
  // Create a simple token
  const id = Date.now().toString();
  const created_at = new Date().toISOString();
  // Set expiry to 30 days from now
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  
  // Create a simple JWT token
  const secret = process.env.JWT_SECRET || 'temporary-secret-key';
  const token = jwt.sign({
    id,
    description,
    created_at
  }, secret, { expiresIn: '30d' });
  
  // Store token info (not the actual token for security)
  const tokenInfo = {
    id,
    description,
    created_at,
    expiry_date: expiryDate.toISOString(),
    used: false
  };
  
  tokens.push(tokenInfo);
  
  // Return both token info and the actual token
  res.status(201).json({
    ...tokenInfo,
    token
  });
});

// Delete a token
app.delete('/api/tokens/:id', (req, res) => {
  const { id } = req.params;
  const index = tokens.findIndex(t => t.id === id);
  
  if (index !== -1) {
    tokens.splice(index, 1);
    res.status(200).json({ message: 'Token revoked successfully' });
  } else {
    res.status(404).json({ message: 'Token not found' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Token fix server running on port ${port}`);
  console.log('Use this server for token management until the main interface is fixed');
});