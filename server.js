const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// API proxy middleware configuration
const apiProxyOptions = {
  target: 'http://localhost:8000', // FastAPI backend URL
  changeOrigin: true,
  secure: false,
  ws: true,
  xfwd: true,
  logLevel: 'debug',
  timeout: 60000, // Increase timeout to 60 seconds
  proxyTimeout: 60000, // Increase proxy timeout as well
  // Preserve the authorization header
  preserveHeaderKeyCase: true,
  // No prefix rewrite - we'll handle this manually in our middleware
  onProxyReq: (proxyReq, req, res) => {
    // Log proxy request for debugging
    console.log(`Proxying to: ${req.method} ${proxyReq.path}`);
    console.log(`Original URL: ${req.originalUrl}, URL: ${req.url}`);
    console.log(`Target URL: ${apiProxyOptions.target}${proxyReq.path}`);
    
    // Make sure the Authorization header is preserved
    if (req.headers.authorization) {
      console.log('Authorization header present, forwarding to backend');
      proxyReq.setHeader('Authorization', req.headers.authorization);
    } else {
      console.log('No Authorization header present in request');
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log proxy response for debugging
    console.log(`Proxy response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    console.error('Failed URL:', req.method, req.originalUrl);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'API Proxy Error', 
        message: err.message,
        path: req.originalUrl 
      });
    }
  }
};

// Create API proxy middleware
const apiProxy = createProxyMiddleware(apiProxyOptions);

// Define special routes before static file handling

// No need for separate routes to add /api prefix since we're using it consistently now

// Subscription endpoints
app.use('/subscription', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Subscription endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Create a dedicated proxy for subscription requests
  const subscriptionProxy = createProxyMiddleware({
    ...apiProxyOptions,
    pathRewrite: {
      '^/subscription': '/subscription' // Rewrite path to match backend endpoint
    }
  });
  
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/subscription${req.url}`);
  console.log(`============================================`);
  
  return subscriptionProxy(req, res, next);
});

app.use('/subscription-tiers', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Subscription tiers endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Create a dedicated proxy for subscription tiers requests
  const tiersProxy = createProxyMiddleware({
    ...apiProxyOptions,
    pathRewrite: {
      '^/subscription-tiers': '/subscription-tiers' // Rewrite path to match backend endpoint
    }
  });
  
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/subscription-tiers${req.url}`);
  console.log(`============================================`);
  
  return tiersProxy(req, res, next);
});

app.use('/subscriptions', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Subscriptions admin endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Create a dedicated proxy for subscriptions admin requests
  const subscriptionsProxy = createProxyMiddleware({
    ...apiProxyOptions,
    pathRewrite: {
      '^/subscriptions': '/subscriptions' // Rewrite path to match backend endpoint
    }
  });
  
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/subscriptions${req.url}`);
  console.log(`============================================`);
  
  return subscriptionsProxy(req, res, next);
});

// Legacy route for /me (redirects to /users/me for backward compatibility)
app.use('/me', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Legacy /me endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/users/me`);
  console.log(`============================================`);
  
  // Override the URL to point to the new endpoint
  req.url = '/users/me';
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
});

// Analytics and diagnostics endpoints
app.use('/diagnostics/history', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Diagnostics history endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Create a dedicated proxy for diagnostics history requests
  const historyProxy = createProxyMiddleware({
    ...apiProxyOptions,
    pathRewrite: {
      '^/diagnostics/history': '/history' // Rewrite to match the correct backend endpoint
    },
    onProxyReq: (proxyReq, req, res) => {
      // Pass through authorization header
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
        console.log('Authorization header forwarded to backend');
      }
    }
  });
  
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/history${req.url}`);
  console.log(`============================================`);
  
  return historyProxy(req, res, next);
});

// Diagnostic tools direct endpoints
app.use('/ping', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Ping diagnostic request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Create a dedicated proxy for ping requests
  const pingProxy = createProxyMiddleware({
    ...apiProxyOptions,
    pathRewrite: {
      '^/ping': '/ping' // Rewrite path to ensure proper forwarding
    }
  });
  
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/ping${req.url}`);
  console.log(`============================================`);
  
  // Use the dedicated proxy
  return pingProxy(req, res, next);
});

app.use('/traceroute', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Traceroute diagnostic request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Create a dedicated proxy for traceroute requests
  const tracerouteProxy = createProxyMiddleware({
    ...apiProxyOptions,
    pathRewrite: {
      '^/traceroute': '/traceroute' // Rewrite path to ensure proper forwarding
    }
  });
  
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/traceroute${req.url}`);
  console.log(`============================================`);
  
  // Use the dedicated proxy
  return tracerouteProxy(req, res, next);
});

app.use('/dns', (req, res, next) => {
  console.log(`============================================`);
  console.log(`DNS diagnostic request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Create a dedicated proxy for DNS requests
  const dnsProxy = createProxyMiddleware({
    ...apiProxyOptions,
    pathRewrite: {
      '^/dns': '/dns' // Rewrite path to ensure proper forwarding
    }
  });
  
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/dns${req.url}`);
  console.log(`============================================`);
  
  // Use the dedicated proxy
  return dnsProxy(req, res, next);
});

app.use('/whois', (req, res, next) => {
  console.log(`============================================`);
  console.log(`WHOIS diagnostic request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Create a dedicated proxy for WHOIS requests
  const whoisProxy = createProxyMiddleware({
    ...apiProxyOptions,
    pathRewrite: {
      '^/whois': '/whois' // Rewrite path to ensure proper forwarding
    }
  });
  
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/whois${req.url}`);
  console.log(`============================================`);
  
  // Use the dedicated proxy
  return whoisProxy(req, res, next);
});

app.use('/port', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Port check diagnostic request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Create a dedicated proxy for PORT requests
  const portProxy = createProxyMiddleware({
    ...apiProxyOptions,
    pathRewrite: {
      '^/port': '/port' // Rewrite path to ensure proper forwarding
    }
  });
  
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/port${req.url}`);
  console.log(`============================================`);
  
  // Use the dedicated proxy
  return portProxy(req, res, next);
});

app.use('/http', (req, res, next) => {
  console.log(`============================================`);
  console.log(`HTTP diagnostic request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Create a dedicated proxy for HTTP requests
  const httpProxy = createProxyMiddleware({
    ...apiProxyOptions,
    pathRewrite: {
      '^/http': '/http' // Rewrite path to ensure proper forwarding
    }
  });
  
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/http${req.url}`);
  console.log(`============================================`);
  
  // Use the dedicated proxy
  return httpProxy(req, res, next);
});

// Handle diagnostics endpoint
app.use('/diagnostics/:tool', (req, res, next) => {
  const tool = req.params.tool;
  const target = req.query.target;
  const count = req.query.count || 4;
  const timeout = req.query.timeout || 5;
  
  console.log(`============================================`);
  console.log(`Diagnostics endpoint request received: ${req.method} ${req.originalUrl}`);
  console.log(`Tool: ${tool}, Target: ${target}, Count: ${count}, Timeout: ${timeout}`);
  
  // Validate basic parameters
  if (!tool) {
    return res.status(400).json({ error: 'Missing tool parameter' });
  }
  
  if (!target && ['ping', 'traceroute', 'dns', 'http'].includes(tool)) {
    return res.status(400).json({ error: 'Missing target parameter' });
  }
  
  // Create the correct target URL with query parameters
  let backendUrl = `http://localhost:8000/${tool}`;
  let queryParams = [];
  
  // Add all query parameters
  Object.keys(req.query).forEach(key => {
    queryParams.push(`${key}=${encodeURIComponent(req.query[key])}`);
  });
  
  if (queryParams.length > 0) {
    backendUrl += `?${queryParams.join('&')}`;
  }
  
  console.log(`Forwarding to backend: ${backendUrl}`);
  
  // Get authentication token
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log(`No authorization header found in request!`);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'No authorization token provided'
    });
  }
  
  console.log(`Authorization header found: ${authHeader.substring(0, 15)}...`);
  
  // Create completely custom proxy for this specific request
  const diagnosticProxy = createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    secure: false,
    ws: true,
    xfwd: true,
    logLevel: 'debug',
    timeout: 60000,
    proxyTimeout: 60000,
    preserveHeaderKeyCase: true,
    pathRewrite: (path) => {
      // Return the exact backend path we want
      const newPath = `/${tool}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
      console.log(`Rewriting path: ${path} -> ${newPath}`);
      return newPath;
    },
    onProxyReq: (proxyReq, req, res) => {
      // Manually set all important headers
      proxyReq.setHeader('Authorization', authHeader);
      
      // Log the final proxy request details
      console.log(`Final proxy request: ${proxyReq.method} ${proxyReq.path}`);
      console.log(`Headers: Authorization=${authHeader.substring(0, 15)}...`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`Proxy response status: ${proxyRes.statusCode}`);
      
      // Log response body for debugging
      let responseBody = '';
      const originalWrite = res.write;
      const originalEnd = res.end;
      
      res.write = function(chunk) {
        responseBody += chunk.toString('utf8');
        return originalWrite.apply(res, arguments);
      };
      
      res.end = function(chunk) {
        if (chunk) {
          responseBody += chunk.toString('utf8');
        }
        console.log(`Response body (first 100 chars): ${responseBody.substring(0, 100)}...`);
        return originalEnd.apply(res, arguments);
      };
    },
    onError: (err, req, res) => {
      console.error(`Diagnostic proxy error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Proxy Error',
          message: err.message,
          tool: tool,
          target: target
        });
      }
    }
  });
  
  console.log(`============================================`);
  
  return diagnosticProxy(req, res, next);
});

// Diagnostics history endpoint is already defined above (line 73)

// Metrics endpoints
app.use('/metrics', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Metrics endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // The backend expects /metrics/dashboard, so we need to keep the original URL structure
  // Express server strips the /metrics prefix and adds it to req.url
  console.log(`Forwarding to backend: ${apiProxyOptions.target}${req.originalUrl}`);
  console.log(`============================================`);
  
  // Override the URL with the original URL to preserve the full path
  req.url = req.originalUrl;
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
});

// API keys endpoints - Completely rewritten with simpler approach
app.use('/keys', (req, res, next) => {
  console.log(`============================================`);
  console.log(`API keys endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);

  // For direct CURL debugging
  console.log(`Request path: ${req.path}`);
  console.log(`Authorization header present: ${req.headers.authorization ? 'YES' : 'NO'}`);
  
  // Capture and log request body for POST requests
  if (req.method === 'POST') {
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      let bodyData = '';
      req.on('data', chunk => {
        bodyData += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          console.log(`API Key request body: ${bodyData}`);
        } catch (e) {
          console.log(`Unable to parse request body: ${e.message}`);
        }
      });
    }

    // Log headers for debugging
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  }

  // Use a simpler approach - always ensure we have a trailing slash for keys endpoint
  // This is critical for FastAPI to correctly recognize the endpoint
  let url = req.url;
  
  // For all requests, ensure the URL starts with a slash
  if (!url.startsWith('/')) {
    url = '/' + url;
  }
  
  // If it's just the root path or no path, enforce a trailing slash
  if (url === '' || url === '/') {
    url = '/';
  }
  
  // Save the modified URL
  req.url = url;
  
  console.log(`Modified URL: ${req.url}`);
  console.log(`Target: ${apiProxyOptions.target}/keys${url}`);
  console.log(`============================================`);
  
  // Override the proxy target path completely to ensure the right endpoint
  const proxyReq = req.method === 'POST' ? 
    `${apiProxyOptions.target}/keys/` :  // Always use /keys/ for POST requests
    `${apiProxyOptions.target}/keys${url}`;  // Use the modified url for others
  
  console.log(`Final proxy target: ${proxyReq}`);
  
  // Create a new request directly to the backend to bypass any middleware issues
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    
    // Extract query parameters
    const queryParams = new URLSearchParams();
    if (req.url.includes('?')) {
      const queryString = req.url.split('?')[1];
      new URLSearchParams(queryString).forEach((value, key) => {
        queryParams.append(key, value);
      });
    }
    
    // Append query parameters to the URL
    const finalUrl = queryParams.toString() ? 
      `${apiProxyOptions.target}/keys/?${queryParams.toString()}` : 
      `${apiProxyOptions.target}/keys/`;
    
    console.log(`Direct target URL: ${finalUrl}`);
    
    // For POST, PUT and DELETE requests, manually forward to the backend
    const http = require('http');
    
    // Collect the body data
    let bodyData = '';
    req.on('data', chunk => {
      bodyData += chunk;
    });
    
    req.on('end', () => {
      // Build the path based on the method and URL
      let path;
      
      if (req.method === 'PUT' || req.method === 'DELETE') {
        // For PUT and DELETE, we need to preserve the original path
        path = `/keys${req.url}`;
        
        // Log what we're doing to help with debugging
        console.log(`Making direct backend request to: ${path}`);
      } else {
        // For POST, use the same finalUrl logic we had before
        path = finalUrl.replace('http://localhost:8000', '');
      }
      
      // Create the options for the request to the backend
      const options = {
        hostname: 'localhost',
        port: 8000,
        path: path,
        method: req.method, // Use the original request method
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      
      console.log(`Making direct backend request to: ${options.path}`);
      
      // Create the request to the backend
      const backendReq = http.request(options, (backendRes) => {
        console.log(`Backend status: ${backendRes.statusCode}`);
        
        // Forward the status code and headers
        res.status(backendRes.statusCode);
        Object.keys(backendRes.headers).forEach(key => {
          res.setHeader(key, backendRes.headers[key]);
        });
        
        // Forward the response data
        let responseData = '';
        backendRes.on('data', (chunk) => {
          responseData += chunk;
        });
        
        backendRes.on('end', () => {
          console.log(`Backend response: ${responseData}`);
          res.end(responseData);
        });
      });
      
      backendReq.on('error', (error) => {
        console.error(`Backend request error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
      });
      
      // Send the body data to the backend
      if (bodyData) {
        backendReq.write(bodyData);
      }
      
      backendReq.end();
    });
  } else {
    // For all other methods, use the proxy middleware
    return apiProxy(req, res, next);
  }
});

// Probes endpoints
app.use('/probes', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Probes endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/probes${req.url}`);
  
  // Check for authentication header
  if (!req.headers.authorization) {
    console.log(`No authorization header found. Authentication required.`);
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Handle POST, PUT, DELETE with special care
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    console.log(`Special handling for ${req.method} request`);
    
    // Get query parameters
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const targetPath = `/probes${queryString}`;
    
    // Create options for the backend request
    const options = {
      hostname: 'localhost',
      port: 8000, // Backend port
      path: targetPath,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      }
    };
    
    console.log(`Forwarding ${req.method} request to: http://${options.hostname}:${options.port}${options.path}`);
    
    // Create the request to the backend
    const http = require('http');
    const backendReq = http.request(options, (backendRes) => {
      console.log(`Backend response status: ${backendRes.statusCode}`);
      
      // Set status code and headers
      res.status(backendRes.statusCode);
      Object.keys(backendRes.headers).forEach(key => {
        res.setHeader(key, backendRes.headers[key]);
      });
      
      // Pipe the backend response to our response
      backendRes.pipe(res);
    });
    
    // Handle errors
    backendReq.on('error', (error) => {
      console.error(`Error forwarding ${req.method} request:`, error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    });
    
    // Get the request body
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      if (body) {
        console.log(`Request body: ${body.length > 200 ? body.substring(0, 200) + '...' : body}`);
        backendReq.write(body);
      }
      backendReq.end();
    });
  } else {
    // For GET requests, use the standard proxy
    console.log(`Using standard proxy for ${req.method} request`);
    console.log(`============================================`);
    return apiProxy(req, res, next);
  }
});

// Explicitly proxy all /users/* endpoints to the backend
app.use('/users', (req, res, next) => {
  console.log(`============================================`);
  console.log(`User endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/users${req.url}`);
  console.log(`============================================`);
  
  // Let the proxy middleware handle the request - keep the original URL intact
  return apiProxy(req, res, next);
});

// Handle routes with /api prefix and prevent duplicate prefixes
app.use('/api', (req, res, next) => {
  // Create a custom path to avoid double /api prefixes
  // The path that FastAPI expects is already /api/[endpoint]
  const backendPath = req.url; // This is already '/endpoint' without the '/api' prefix
  
  console.log(`============================================`);
  console.log(`API request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Path without duplicate prefix: ${backendPath}`);
  console.log(`Forwarding to backend: ${apiProxyOptions.target}${backendPath}`);
  console.log(`============================================`);
  
  // Manually modify the URL to avoid proxy middleware's automatic handling
  req.url = backendPath;
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
});

// Explicitly proxy the /login endpoint to the backend
app.post('/login', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Login request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Content-Type: ${req.headers['content-type']}`);
  
  // Check if this is a JSON request
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    console.log(`Forwarding JSON login to backend: ${apiProxyOptions.target}/login/json`);
    req.url = '/login/json';
  } else {
    console.log(`Forwarding form login to backend: ${apiProxyOptions.target}/login`);
    req.url = '/login';
  }
  console.log(`============================================`);
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
});

// Explicitly proxy the /login/json endpoint to the backend
app.post('/login/json', (req, res, next) => {
  console.log(`============================================`);
  console.log(`JSON Login request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Content-Type: ${req.headers['content-type']}`);
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/login/json`);
  console.log(`============================================`);
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
});

// Explicitly proxy the /register endpoint to the backend
app.use('/register', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Register request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/register`);
  console.log(`============================================`);
  
  // Override the URL to ensure it points to exactly /register
  req.url = '/register';
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
});

// Serve static files from the public directory (built frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Also serve files from the frontend directory for development
app.use('/src', express.static(path.join(__dirname, 'frontend', 'src')));

// For any request that doesn't match a static file
// serve the index.html - use explicit routes instead of wildcard to avoid path-to-regexp issues
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Explicit route for server test (not proxied)
app.get('/server/test', (req, res) => {
  res.json({ message: 'Express server is working!' });
});

// Fallback route for SPA support - handle specified routes explicitly 
// These are the main routes in our React app
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/diagnostics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/scheduled-probes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For GET requests to /app, serve the React app for authentication
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For GET requests to /app/login or /app/register, serve the React app
app.get('/app/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/app/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For GET requests to /login, serve the React app
// POST requests are already handled by the proxy middleware above
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For GET requests to /register, serve the React app
// POST requests are already handled by the proxy middleware above
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/reports', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});