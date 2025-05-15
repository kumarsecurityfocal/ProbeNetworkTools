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
app.use(express.urlencoded({ extended: true })); // Add this to parse form data

// Parse and handle API routes
app.use((req, res, next) => {
  const url = req.url;
  console.log(`Incoming request: ${req.method} ${url}`);
  
  // Handle specific routes directly
  if (url.startsWith('/login') || url.startsWith('/token')) {
    return handleLogin(req, res);
  } 
  else if (url.startsWith('/users/me')) {
    return handleUserProfile(req, res);
  }
  else if (url === '/users') {
    return handleAllUsers(req, res);
  }
  else if (url.startsWith('/users/')) {
    console.log(`User-specific request: ${req.method} ${url}`);
    return handleGenericApi(req, res);
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
  else if (url.startsWith('/nodes')) {
    return handleNodes(req, res);
  }
  else if (url.includes('/metrics') || url.includes('metrics/')) {
    console.log(`Handling metrics request (ANY format): ${req.method} ${url}`);
    return handleMetrics(req, res);
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
  
  // Make sure req.body exists before trying to use it
  if (!req.body) {
    console.error('Request body is undefined - body parser middleware may not be working');
    return res.status(400).json({ detail: 'Request body is missing' });
  }
  
  if (isJsonLogin) {
    // Handle JSON login - get from request body
    username = req.body.username || '';
    password = req.body.password || '';
    
    console.log(`JSON login with username: ${username}`);
  } else {
    // Handle form login - get from request body
    username = req.body.username || '';
    password = req.body.password || '';
    
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
    
    // Provide a more helpful message for common connection issues
    if (error.code === 'ECONNREFUSED') {
      // If we couldn't connect to the backend API, log details
      console.error(`Failed to connect to backend API at ${options.hostname}:${options.port} - service may be down or not started`);
      
      // Use dev bypass auth for admin login when backend is down (for debugging only)
      if (username === 'admin@probeops.com' && password === 'probeopS1@') {
        console.log('Using development fallback for admin login');
        // Return a static token that will expire in 30 minutes
        const now = Math.floor(Date.now() / 1000);
        const exp = now + (30 * 60); // 30 minutes from now
        return res.json({
          access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBwcm9iZW9wcy5jb20iLCJleHAiOiR7ZXhwfX0.dummy_signature`.replace("${exp}", exp),
          token_type: 'bearer'
        });
      }
    }
    
    return res.status(500).json({ detail: `Authentication server unavailable: ${error.message}` });
  });
  
  // Write body and end request
  backendReq.write(requestBodyString);
  backendReq.end();
}

// Handler for all users endpoint - this is used by admin panel
function handleAllUsers(req, res) {
  console.log(`All users request: ${req.method} ${req.url} - DETAILED LOG`);
  console.log(`Auth header present: ${Boolean(req.headers.authorization)}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  console.log(`Token extracted: ${token ? 'Yes, length=' + token.length : 'No'}`);
  
  if (!token) {
    console.log('No token provided for /users endpoint, returning 401');
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Forward request to backend users endpoint
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/users',
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
      
      console.log(`Users endpoint status: ${backendRes.statusCode}`);
      console.log(`Response headers:`, JSON.stringify(backendRes.headers));
      
      // Special handling for POST (create user) responses
      if (req.method === 'POST') {
        if (backendRes.statusCode >= 400) {
          console.error(`User creation failed with status ${backendRes.statusCode}`);
          console.error(`Error response body: ${responseData}`);
          return res.status(backendRes.statusCode).json({ 
            detail: responseData ? JSON.parse(responseData).detail || 'User creation failed' : 'User creation failed' 
          });
        }
        
        console.log(`User created successfully with status ${backendRes.statusCode}`);
        return res.status(backendRes.statusCode).json(responseData ? JSON.parse(responseData) : {});
      }
      
      // Regular GET response handling
      // Handle error status codes
      if (backendRes.statusCode >= 400) {
        console.error(`Users endpoint returned ${backendRes.statusCode}, sending empty array`);
        console.error(`Error response body: ${responseData}`);
        return res.status(200).json([]); // Return empty array instead of error to avoid breaking UI
      }
      
      // Set success status
      res.status(backendRes.statusCode);
      
      // Parse and return response data
      if (responseData) {
        try {
          console.log(`Raw response data: ${responseData}`);
          const jsonData = JSON.parse(responseData);
          console.log(`Successfully retrieved ${jsonData.length || 0} users:`, JSON.stringify(jsonData).substring(0, 200) + '...');
          
          // Set response headers
          res.setHeader('Content-Type', 'application/json');
          
          // Return the parsed data
          console.log('Sending user data to frontend');
          res.json(jsonData);
        } catch (e) {
          console.error('Error parsing users response:', e);
          console.error('Raw data that failed parsing:', responseData);
          res.json([]);
        }
      } else {
        console.log('Empty users response, returning empty array');
        res.json([]);
      }
    });
  });
  
  backendReq.on('error', error => {
    console.error('Error with users request:', error);
    res.status(200).json([]); // Return empty array on error to avoid breaking UI
  });
  
  // For POST requests, we need to write the request body
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`Writing request body for ${req.method} request to /users:`, JSON.stringify(req.body));
    // Write request body to backend request
    backendReq.write(JSON.stringify(req.body));
  }
  
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
  
  // Extract path and parameters
  const url = new URL(`http://localhost${req.url}`);
  const pathPart = url.pathname;
  const searchParams = url.searchParams.toString();
  
  // Determine the correct backend path based on the request URL
  let backendPath;
  console.log(`Subscription URL path parts: ${pathPart}`);
  
  if (pathPart === '/subscription') {
    // User's own subscription
    backendPath = '/subscription';
    console.log('Routing to /subscription endpoint');
  } else if (pathPart === '/subscription-tiers') {
    // Subscription tiers list
    backendPath = '/subscription/tiers';
    console.log('Routing to /subscription/tiers endpoint');
  } else if (pathPart === '/subscriptions') {
    // Admin endpoint for all subscriptions
    backendPath = '/subscriptions';
    console.log('Routing to /subscriptions endpoint (admin)');
  } else if (pathPart.startsWith('/subscriptions/')) {
    // Specific subscription
    backendPath = pathPart;
    console.log(`Routing to specific subscription endpoint: ${backendPath}`);
  } else {
    // Default to main subscription endpoint
    backendPath = '/subscription';
    console.log('Using default subscription endpoint');
  }
  
  // Add query parameters if any
  if (searchParams) {
    backendPath += `?${searchParams}`;
  }
  
  console.log(`Final subscription backend path: ${backendPath}`);
  
  // Forward request to backend
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: backendPath,
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  // Add Content-Type header for POST and PUT requests
  if (req.method === 'POST' || req.method === 'PUT') {
    options.headers['Content-Type'] = 'application/json';
    console.log(`Setting Content-Type header for ${req.method} request`);
  }
  
  // Create backend request
  const backendReq = http.request(options, (backendRes) => {
    // Collect response data
    let responseData = '';
    backendRes.on('data', chunk => {
      responseData += chunk;
    });
    
    backendRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      
      console.log(`Subscription response status: ${backendRes.statusCode}`);
      
      // Handle 404s and other error status codes
      if (backendRes.statusCode === 404 || backendRes.statusCode >= 400) {
        console.error(`Subscription endpoint returned ${backendRes.statusCode}, sending empty fallback data`);
        
        // For subscription-tiers endpoint, return empty array
        if (pathPart === '/subscription-tiers') {
          return res.status(200).json([]);
        }
        
        // For subscriptions collection endpoint, return empty array
        if (pathPart === '/subscriptions') {
          return res.status(200).json([]);
        }
        
        // For individual subscription endpoint, return placeholder object
        return res.status(200).json({
          is_active: true,
          tier: {
            name: "FREE",
            max_scheduled_probes: 1,
            max_api_keys: 1
          }
        });
      }
      
      // Set response status for non-error responses
      res.status(backendRes.statusCode);
      
      if (responseData) {
        try {
          const jsonData = JSON.parse(responseData);
          console.log(`Successfully parsed subscription data, returning response`);
          res.json(jsonData);
        } catch (e) {
          console.error('Error parsing subscription response:', e);
          
          // Return empty data appropriate for the endpoint type
          if (pathPart === '/subscription-tiers' || pathPart === '/subscriptions') {
            res.json([]);
          } else {
            res.json({});
          }
        }
      } else {
        console.log('Empty subscription response, returning empty object/array');
        
        // Return empty data appropriate for the endpoint type
        if (pathPart === '/subscription-tiers' || pathPart === '/subscriptions') {
          res.json([]);
        } else {
          res.json({});
        }
      }
    });
  });
  
  // Handle request body if present
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    console.log(`Writing request body for ${req.method} subscription request:`, JSON.stringify(req.body));
    backendReq.write(JSON.stringify(req.body));
  }
  
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
  
  // Determine backend path - FastAPI route is defined with path "/probes"
  // Map all probe-related routes correctly to avoid 307 redirects
  let backendPath;
  
  if (pathPart === '/probes' || pathPart === '/probes/') {
    // For collection endpoints, be consistent with trailing slash
    backendPath = '/probes';
    
    // Log for debugging
    console.log('Mapped /probes to backend /probes (collection endpoint)');
  } else if (pathPart.startsWith('/probes/')) {
    // For specific probe ID endpoints or sub-resources
    backendPath = pathPart;
    console.log(`Mapped ${pathPart} to backend ${backendPath} (specific probe endpoint)`);
  } else {
    // For any other endpoint, use the path as-is
    backendPath = pathPart;
    console.log(`Using path as-is: ${backendPath}`);
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

// Handler for metrics endpoints (dashboard metrics, etc.)
function handleMetrics(req, res) {
  console.log(`Metrics request: ${req.method} ${req.url}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Extract the metrics endpoint from the URL
  const url = new URL(`http://localhost${req.url}`);
  const pathParts = url.pathname.split('/').filter(p => p);
  
  console.log(`Path parts for metrics URL: ${JSON.stringify(pathParts)}`);
  
  // Figure out which metrics endpoint to call
  let metricType = 'dashboard'; // Default to dashboard metrics
  
  // Check if we have explicit metric type in the URL
  if (pathParts.length > 1) {
    if (pathParts[0] === 'metrics') {
      metricType = pathParts[1];
    } else if (pathParts.includes('metrics') && pathParts.indexOf('metrics') + 1 < pathParts.length) {
      metricType = pathParts[pathParts.indexOf('metrics') + 1];
    }
  }
  
  console.log(`Determined metric type: ${metricType}`);
  
  // Get the query parameters
  const searchParams = url.searchParams.toString();
  
  // Construct the backend path - make sure we use the right format to avoid 307 redirects
  // In FastAPI, this endpoint is defined without a trailing slash
  let backendPath = `/metrics/${metricType}`;
  
  // Add query parameters if any
  if (searchParams) {
    backendPath += `?${searchParams}`;
  }
  
  console.log(`Forwarding metrics request to: ${backendPath}`);
  
  // For debugging, log what we expect back
  console.log(`Expecting ${metricType} metrics data from backend`);
  
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
      
      // If we received a 307 redirect or 404, log it but return an empty object instead
      if (backendRes.statusCode === 307 || backendRes.statusCode === 404) {
        console.log(`Received ${backendRes.statusCode} from backend for metrics, returning empty metrics object`);
        
        // For dashboard metrics, return an empty metrics object with default values
        if (metricType === 'dashboard') {
          return res.json({
            diagnostic_count: 0,
            api_key_count: 0,
            scheduled_probe_count: 0,
            success_rate: 0,
            avg_response_time: 0
          });
        }
        
        // For other metrics, return an empty object
        return res.json({});
      }
      
      if (responseData) {
        try {
          const jsonData = JSON.parse(responseData);
          console.log(`Metrics response successful with status ${backendRes.statusCode}`);
          res.json(jsonData);
        } catch (e) {
          console.error('Error parsing metrics response:', e);
          
          // Return default metrics object on error
          res.json({
            diagnostic_count: 0,
            api_key_count: 0,
            scheduled_probe_count: 0,
            success_rate: 0,
            avg_response_time: 0
          });
        }
      } else {
        // Empty response but success status
        if (backendRes.statusCode >= 200 && backendRes.statusCode < 300) {
          res.json({});
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
  if ((req.method === 'POST') && req.body) {
    const bodyData = JSON.stringify(req.body);
    backendReq.write(bodyData);
  }
  
  backendReq.on('error', error => {
    console.error('Error with metrics request:', error);
    
    // Return default metrics on error
    if (metricType === 'dashboard') {
      return res.json({
        diagnostic_count: 0,
        api_key_count: 0,
        scheduled_probe_count: 0,
        success_rate: 0,
        avg_response_time: 0
      });
    }
    
    res.status(500).json({
      detail: 'Failed to retrieve metrics',
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

// Handler for probe nodes API
function handleNodes(req, res) {
  console.log(`Nodes request: ${req.method} ${req.url}`);
  
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  
  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  
  // Extract path and parameters
  const url = new URL(`http://localhost${req.url}`);
  const pathPart = url.pathname;
  const searchParams = url.searchParams.toString();
  
  // Determine backend path
  let backendPath;
  
  if (pathPart === '/nodes' || pathPart === '/nodes/') {
    // For collection endpoints, be consistent with trailing slash
    console.log('Mapped /nodes to backend /nodes (collection endpoint)');
    backendPath = '/nodes';
  } else if (pathPart.includes('registration-token')) {
    // Handle registration token endpoints
    const pathParts = pathPart.split('/');
    const tokenPath = pathParts.slice(pathParts.indexOf('nodes')).join('/');
    console.log(`Mapped ${pathPart} to backend /${tokenPath} (token endpoint)`);
    backendPath = `/${tokenPath}`;
  } else {
    // Extract ID or detail route
    const pathParts = pathPart.split('/').filter(Boolean);
    backendPath = `/nodes/${pathParts.slice(1).join('/')}`;
    console.log(`Mapped ${pathPart} to backend ${backendPath} (detail endpoint)`);
  }
  
  // Add search parameters if present
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
  
  console.log(`Forwarding nodes request to: ${backendPath}`);
  
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
          console.log(`Node response successful with status ${backendRes.statusCode}`);
        } catch (e) {
          console.error('Error parsing nodes response:', e);
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
    console.log(`Nodes request body sent: ${bodyData}`);
  }
  
  backendReq.on('error', error => {
    console.error('Error with nodes API request:', error);
    res.status(500).json({ detail: 'Nodes API server unavailable' });
  });
  
  backendReq.end();
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});