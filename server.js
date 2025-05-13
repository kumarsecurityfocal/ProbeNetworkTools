const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// For any request that doesn't match a static file
// serve the index.html - use explicit routes instead of wildcard to avoid path-to-regexp issues
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Explicit route for API test
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Fallback route for SPA support - use specific named parameters instead of wildcard
app.get('/:page', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});