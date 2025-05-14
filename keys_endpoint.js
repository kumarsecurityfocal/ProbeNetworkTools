// API keys endpoint handler using direct HTTP requests
const http = require('http');

function handleKeysEndpoint(req, res) {
  console.log(`============================================`);
  console.log(`API keys endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Authorization header present: ${req.headers.authorization ? 'YES' : 'NO'}`);
  
  // Extract the token from Authorization header
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    console.log('No authorization token provided for API keys endpoint');
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Build the correct URL path based on the request
  let path = '/keys';
  
  // If it's not just /keys or /keys/ add the rest of the path
  if (req.url !== '/' && req.url !== '') {
    path += req.url;
  } else {
    // Ensure trailing slash for root endpoint
    path += '/';
  }
  
  console.log(`Making direct API keys request to: ${path}`);
  
  // Collect request body for POST/PUT/DELETE requests
  let bodyData = '';
  req.on('data', chunk => {
    bodyData += chunk;
  });
  
  req.on('end', () => {
    // Log the request body for POST/PUT requests
    if (bodyData && (req.method === 'POST' || req.method === 'PUT')) {
      console.log(`API keys ${req.method} request body: ${bodyData}`);
    }
    
    // Create the options for the direct HTTP request
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: path,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    // Create the direct HTTP request
    const keysReq = http.request(options, (keysRes) => {
      console.log(`API keys response status: ${keysRes.statusCode}`);
      
      // Forward the status code
      res.status(keysRes.statusCode);
      
      // Forward headers
      Object.keys(keysRes.headers).forEach(key => {
        if (key !== 'transfer-encoding') { // Skip this as it can cause issues
          res.setHeader(key, keysRes.headers[key]);
        }
      });
      
      // Force content type to application/json
      res.setHeader('Content-Type', 'application/json');
      
      // Collect and forward the response data
      let responseData = '';
      keysRes.on('data', (chunk) => {
        responseData += chunk;
      });
      
      keysRes.on('end', () => {
        console.log(`API keys response data length: ${responseData.length} bytes`);
        
        try {
          // If it's valid JSON, parse and send it
          const jsonData = JSON.parse(responseData);
          console.log(`Successfully parsed API keys response as JSON with ${Array.isArray(jsonData) ? jsonData.length : 1} items`);
          res.json(jsonData);
        } catch (e) {
          console.error(`Error parsing API keys response as JSON:`, e);
          // For GET requests return empty array, for other requests return empty object
          if (req.method === 'GET') {
            res.json([]);
          } else {
            res.json({});
          }
        }
      });
    });
    
    keysReq.on('error', (error) => {
      console.error(`Error in API keys request:`, error);
      res.status(500).json({ error: 'Failed to process API keys request' });
    });
    
    // Write the body data if any
    if (bodyData) {
      keysReq.write(bodyData);
    }
    
    // End the request
    keysReq.end();
  });
}

module.exports = handleKeysEndpoint;