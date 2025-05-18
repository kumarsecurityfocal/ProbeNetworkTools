/**
 * API Routing Fix for ProbeOps
 * 
 * This script adds proper routing for API endpoints to fix 404 errors
 * on the production server. It implements a generic catch-all route handler
 * that forwards requests to the FastAPI backend.
 */

// Create a simpler version of the server.js file
const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const port = process.env.PORT || 7001;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Generic API forwarding function
function forwardToBackend(req, res) {
  // Strip /api from the path to get the backend path
  const backendPath = req.url.replace(/^\/api/, '');
  
  // Log the request
  console.log(`Forwarding request: ${req.method} ${req.url} -> ${backendPath}`);
  
  // Get authentication if available
  const authHeader = req.headers.authorization || '';
  
  // Create headers for backend request
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  
  // Forward authorization if available
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  
  // Configure the request
  const options = {
    hostname: '0.0.0.0',
    port: 8000,
    path: backendPath,
    method: req.method,
    headers: headers
  };
  
  // Create the request
  const backendReq = http.request(options, (backendRes) => {
    // Set the response status code
    res.status(backendRes.statusCode);
    
    // Collect response data
    let responseData = '';
    backendRes.on('data', (chunk) => {
      responseData += chunk;
    });
    
    // When the response is complete
    backendRes.on('end', () => {
      if (responseData) {
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(responseData);
          res.json(jsonData);
        } catch (e) {
          // Send as raw if not JSON
          res.send(responseData);
        }
      } else {
        // No data, return empty object
        res.json({});
      }
    });
  });
  
  // Handle errors
  backendReq.on('error', (error) => {
    console.error(`Backend request error: ${error.message}`);
    res.status(500).json({
      error: 'Backend server unavailable',
      message: error.message
    });
  });
  
  // Send body if this is a POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    backendReq.write(JSON.stringify(req.body));
  }
  
  // End the request
  backendReq.end();
}

// Register the catch-all API handler
app.use('/api', forwardToBackend);

// Start the server
app.listen(port, () => {
  console.log(`API fix server running on port ${port}`);
});