const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 5000;

// Middleware to handle static files
app.use(express.static('frontend'));
app.use('/src', express.static('frontend/src'));

// Simple route for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Serve the simple HTML page for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/src', 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});