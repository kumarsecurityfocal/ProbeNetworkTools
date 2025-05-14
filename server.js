// Enhanced express server with direct HTTP backend proxying
const express = require('express');
const path = require('path');
const http = require('http');

// Create express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Parse and handle API routes
app.use((req, res, next) => {
  const url = req.url;
  
  // Handle specific routes directly
  if (url.startsWith('/login') || url.startsWith('/token')) {
    return handleLogin(req, res);
  } 
  else if (url.startsWith('/users/me')) {
    return handleUserProfile(req, res);
  }
  else if (url.startsWith('/history')) {
    return handleHistory(req, res);
  } 
  else if (url.startsWith('/keys')) {
    return handleKeys(req, res);
  }
  else if (url.startsWith('/subscription')) {
    return handleSubscription(req, res);
  }
  else if (url.startsWith('/diagnostics')) {
    return handleDiagnostics(req, res);
  }
  else if (url.startsWith('/probes')) {
    return handleProbes(req, res);
  }
  else if (url.startsWith('/api/')) {
    // Generic API handler for other endpoints
    return handleGenericApi(req, res);
  }
  else {
    // For all other routes, serve the static React app
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Handler for login endpoint
function handleLogin(req, res) {
  console.log(`Login request: ${req.method} ${req.url}`);
  
  // Check if this is a GET request, which we should ignore
  if (req.method === 'GET') {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  
  // Determine if this is JSON or form login
  const isJsonLogin = req.url.includes('/login/json');
  
  // FastAPI expects requests at /login (not /token)
  const loginPath = '/login';
  
  // Extract username and password
  let username, password;
  
  if (isJsonLogin) {
    // Handle JSON login - get from request body
    username = req.body.username;
    password = req.body.password;
    
    console.log(`JSON login with username: ${username}`);
  } else {
    // Handle form login - get from request body
    username = req.body.username;
    password = req.body.password;
    
    console.log(`Form login with username: ${username}`);
  }
  
  // If missing credentials, return error
  if (!username || !password) {
    return res.status(400).json({ detail: 'Username and password are required' });
  }
  
  // Format request for backend token endpoint
  // FastAPI OAuth2 expects form data
  const requestBody = new URLSearchParams();
  requestBody.append('username', username);
  requestBody.append('password', password);
  const requestBodyString = requestBody.toString();
  
  console.log(`Forwarding authentication to: ${loginPath}`);
  
  // Forward request to backend
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: loginPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': requestBodyString.length
    }
  };
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.status(backendRes.statusCode);
      
      if (backendRes.statusCode >= 400) {
        console.log(`Login failed with status ${backendRes.statusCode}`);
        return res.send(responseData);
      }
      
      try {
        const jsonData = JSON.parse(responseData);
        console.log('Login successful, returning token');
        return res.json(jsonData);
      } catch (e) {
        console.error('Error parsing login response:', e);
        return res.status(500).json({ detail: 'Invalid response from authentication server' });
      }
    });
  });
  
  backendReq.on('error', error => {
    console.error('Error with login request:', error);
    return res.status(500).json({ detail: 'Authentication server unavailable' });
  });
  
  // Write body and end request
  backendReq.write(requestBodyString);
  backendReq.end();
}

// Handler for user profile endpoint
function handleUserProfile(req, res) {
  console.log(`User profile request: ${req.method} ${req.url}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Forward request to backend
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: req.url,
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.status(backendRes.statusCode);
      
      try {
        const jsonData = JSON.parse(responseData);
        res.json(jsonData);
      } catch (e) {
        console.error('Error parsing user profile response:', e);
        res.send(responseData);
      }
    });
  });
  
  // Handle request body if present
  if (req.method === 'POST' || req.method === 'PUT') {
    if (req.body && Object.keys(req.body).length > 0) {
      backendReq.write(JSON.stringify(req.body));
    }
  }
  
  backendReq.on('error', error => {
    console.error('Error with user profile request:', error);
    res.status(500).json({ detail: 'User profile server unavailable' });
  });
  
  backendReq.end();
}

// Handler for history endpoint
function handleHistory(req, res) {
  console.log(`History request: ${req.method} ${req.url}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Extract query parameters if any
  const url = new URL(`http://localhost${req.url}`);
  const searchParams = url.searchParams.toString();
  
  // Looking at main.py, the routers don't have a prefix, so the history endpoint
  // should be accessible at /history directly
  const pathWithParams = `/history${searchParams ? '?' + searchParams : ''}`;
  
  console.log(`Forwarding to backend: ${pathWithParams}`);
  
  // Forward request to backend
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: pathWithParams,
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.status(backendRes.statusCode);
      
      // If we received a 307 redirect or 404, log it but return an empty array instead
      if (backendRes.statusCode === 307 || backendRes.statusCode === 404) {
        console.log(`Received ${backendRes.statusCode} from backend, returning empty array`);
        return res.json([]);
      }
      
      if (responseData) {
        try {
          const jsonData = JSON.parse(responseData);
          console.log(`Received history data with ${jsonData.length} items`);
          res.json(jsonData);
        } catch (e) {
          console.error('Error parsing response:', e);
          res.json([]);
        }
      } else {
        res.json([]);
      }
    });
  });
  
  backendReq.on('error', error => {
    console.error('Error with backend request:', error);
    res.status(500).json({ error: 'Failed to retrieve data' });
  });
  
  backendReq.end();
}

// Handler for keys endpoint
function handleKeys(req, res) {
  console.log(`Keys request: ${req.method} ${req.url}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Extract path and query parameters
  const url = new URL(`http://localhost${req.url}`);
  const pathPart = url.pathname;
  const searchParams = url.searchParams.toString();
  
  // Determine backend path
  let backendPath = pathPart;
  if (backendPath === '/keys') {
    backendPath = '/keys/';
  }
  
  // Add query parameters if any
  if (searchParams) {
    backendPath += `?${searchParams}`;
  }
  
  // Forward request to backend
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: backendPath,
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  console.log(`Forwarding to backend: ${options.method} ${options.path}`);
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.status(backendRes.statusCode);
      
      if (responseData) {
        try {
          const jsonData = JSON.parse(responseData);
          res.json(jsonData);
        } catch (e) {
          console.error('Error parsing response:', e);
          res.json([]);
        }
      } else {
        res.json([]);
      }
    });
  });
  
  // Handle request body if present
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    const bodyData = JSON.stringify(req.body);
    backendReq.write(bodyData);
    console.log(`Request body: ${bodyData}`);
  }
  
  backendReq.on('error', error => {
    console.error('Error with backend request:', error);
    res.status(500).json({ error: 'Failed to process API key request' });
  });
  
  backendReq.end();
}

// Handler for subscription endpoint
function handleSubscription(req, res) {
  console.log(`Subscription request: ${req.method} ${req.url}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Forward request to backend
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/users/me/subscription',
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.status(backendRes.statusCode);
      
      if (responseData) {
        try {
          const jsonData = JSON.parse(responseData);
          res.json(jsonData);
        } catch (e) {
          console.error('Error parsing response:', e);
          res.json({});
        }
      } else {
        res.json({});
      }
    });
  });
  
  backendReq.on('error', error => {
    console.error('Error with backend request:', error);
    res.status(500).json({ error: 'Failed to retrieve subscription data' });
  });
  
  backendReq.end();
}

// Handler for diagnostics endpoints
function handleDiagnostics(req, res) {
  console.log(`Diagnostics request: ${req.method} ${req.url}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Extract the tool from the URL
  const url = new URL(`http://localhost${req.url}`);
  const pathParts = url.pathname.split('/');
  const toolName = pathParts.length > 2 ? pathParts[2] : '';
  
  // Get the query parameters
  const searchParams = url.searchParams.toString();
  
  // Construct the backend path - looking at main.py, there's no prefix for the router
  // so tool endpoints like /ping are accessed directly
  let backendPath = `/${toolName}`;
  if (searchParams) {
    backendPath += `?${searchParams}`;
  }
  
  console.log(`Forwarding diagnostic request to: ${backendPath}`);
  
  // Forward request to backend
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: backendPath,
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.status(backendRes.statusCode);
      
      if (responseData) {
        try {
          const jsonData = JSON.parse(responseData);
          console.log(`Diagnostic ${toolName} response successful`);
          res.json(jsonData);
        } catch (e) {
          console.error('Error parsing diagnostic response:', e);
          // Return a properly formatted error object
          res.json({
            tool: toolName,
            target: url.searchParams.get('target') || '',
            created_at: new Date().toISOString(),
            execution_time: 0,
            status: 'failure',
            result: 'Error: Unable to parse backend response'
          });
        }
      } else {
        // Return a properly formatted error object
        res.json({
          tool: toolName,
          target: url.searchParams.get('target') || '',
          created_at: new Date().toISOString(),
          execution_time: 0,
          status: 'failure',
          result: 'Error: No data returned from backend'
        });
      }
    });
  });
  
  // Handle request body if present
  if ((req.method === 'POST') && req.body) {
    const bodyData = JSON.stringify(req.body);
    backendReq.write(bodyData);
  }
  
  backendReq.on('error', error => {
    console.error('Error with diagnostic request:', error);
    res.status(500).json({
      tool: toolName,
      target: url.searchParams.get('target') || '',
      created_at: new Date().toISOString(),
      execution_time: 0,
      status: 'failure',
      result: `Error: Backend service unavailable (${error.message})`
    });
  });
  
  backendReq.end();
}

// Handler for scheduled probes endpoints
function handleProbes(req, res) {
  console.log(`Probes request: ${req.method} ${req.url}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Extract path and parameters
  const url = new URL(`http://localhost${req.url}`);
  const pathPart = url.pathname;
  const searchParams = url.searchParams.toString();
  
  // Determine backend path - looking at main.py, there's no prefix for the router
  // Since the frontend expects /probes, we'll map that directly
  let backendPath = pathPart;
  if (backendPath === '/probes') {
    // Make sure collections have trailing slash
    backendPath = '/probes/';
  }
  
  // Add query parameters if any
  if (searchParams) {
    backendPath += `?${searchParams}`;
  }
  
  console.log(`Forwarding probe request to: ${backendPath}`);
  
  // Forward request to backend
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: backendPath,
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.status(backendRes.statusCode);
      
      // If we received a 307 redirect or 404, log it but return an empty array instead
      if (backendRes.statusCode === 307 || backendRes.statusCode === 404) {
        console.log(`Received ${backendRes.statusCode} from backend, returning empty array for probes`);
        
        // For GET requests on collections, return empty array
        if (req.method === 'GET' && (pathPart === '/probes' || pathPart === '/probes/')) {
          return res.json([]);
        }
        
        // For other requests, return success status
        return res.json({ status: 'success' });
      }
      
      if (responseData) {
        try {
          const jsonData = JSON.parse(responseData);
          console.log(`Probe response successful with status ${backendRes.statusCode}`);
          res.json(jsonData);
        } catch (e) {
          console.error('Error parsing probe response:', e);
          
          // For GET requests on collections, return empty array
          if (req.method === 'GET' && (pathPart === '/probes' || pathPart === '/probes/')) {
            return res.json([]);
          }
          
          // For other requests, return error detail
          res.json({
            detail: 'Error processing response',
            status: backendRes.statusCode
          });
        }
      } else {
        // Empty response but success status
        if (backendRes.statusCode >= 200 && backendRes.statusCode < 300) {
          res.json({ status: 'success' });
        } else {
          res.json({
            detail: 'No data returned from backend',
            status: backendRes.statusCode
          });
        }
      }
    });
  });
  
  // Handle request body if present
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    const bodyData = JSON.stringify(req.body);
    console.log(`Sending request body: ${bodyData}`);
    backendReq.write(bodyData);
  }
  
  backendReq.on('error', error => {
    console.error('Error with probe request:', error);
    
    // For GET requests on collections, return empty array on error
    if (req.method === 'GET' && (pathPart === '/probes' || pathPart === '/probes/')) {
      return res.json([]);
    }
    
    // For other requests, return error detail
    res.status(500).json({
      detail: `Backend service unavailable: ${error.message}`,
      status: 'error'
    });
  });
  
  backendReq.end();
}

// Generic API handler for other backend endpoints
function handleGenericApi(req, res) {
  console.log(`Generic API request: ${req.method} ${req.url}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  // Strip /api prefix from path
  const backendPath = req.url.replace(/^\/api/, '');
  
  // Forward request to backend
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: backendPath,
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };
  
  // Add auth header if token is present
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      // Copy status and headers
      res.status(backendRes.statusCode);
      
      // Set content type if present in response
      const contentType = backendRes.headers['content-type'];
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      
      // Try to parse JSON, otherwise send raw response
      if (contentType && contentType.includes('application/json') && responseData) {
        try {
          const jsonData = JSON.parse(responseData);
          res.json(jsonData);
        } catch (e) {
          console.error('Error parsing response:', e);
          res.send(responseData);
        }
      } else {
        res.send(responseData);
      }
    });
  });
  
  // Handle request body if present
  if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && req.body) {
    const bodyData = JSON.stringify(req.body);
    backendReq.write(bodyData);
  }
  
  backendReq.on('error', error => {
    console.error('Error with backend request:', error);
    res.status(500).json({ error: 'Failed to process API request' });
  });
  
  backendReq.end();
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});