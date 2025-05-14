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
  // No prefix rewrite - we'll handle this manually in our middleware
  onProxyReq: (proxyReq, req, res) => {
    // Log proxy request for debugging
    console.log(`Proxying to: ${req.method} ${proxyReq.path}`);
    console.log(`Original URL: ${req.originalUrl}, URL: ${req.url}`);
    console.log(`Target URL: ${apiProxyOptions.target}${proxyReq.path}`);
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
app.use('/history', (req, res, next) => {
  console.log(`============================================`);
  console.log(`History endpoint request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/history`);
  console.log(`============================================`);
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
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

// Add a new consolidated diagnostics endpoint
app.use('/diagnostics/:tool', (req, res, next) => {
  const tool = req.params.tool;
  console.log(`============================================`);
  console.log(`Diagnostics endpoint request received: ${req.method} ${req.path}`);
  console.log(`Tool requested: ${tool}`);
  console.log(`Original URL: ${req.originalUrl}`);

  // Forward to the correct backend endpoint based on the tool parameter
  const backendPath = `/${tool}`;
  console.log(`Forwarding to backend: ${apiProxyOptions.target}${backendPath}`);
  console.log(`============================================`);

  // Rewrite the URL to point directly to the tool endpoint on the backend
  req.url = req.url.replace(`/diagnostics/${tool}`, backendPath);
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
});

// Diagnostics history endpoint
app.use('/history', (req, res, next) => {
  console.log(`============================================`);
  console.log(`Diagnostics history request received: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}`);
  
  // Create a dedicated proxy for history requests
  const historyProxy = createProxyMiddleware({
    ...apiProxyOptions,
    pathRewrite: {
      '^/history': '/history' // Rewrite path to ensure proper forwarding
    }
  });
  
  console.log(`Forwarding to backend: ${apiProxyOptions.target}/history${req.url}`);
  console.log(`============================================`);
  
  // Use the dedicated proxy
  return historyProxy(req, res, next);
});

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
  console.log(`============================================`);
  
  // Let the proxy middleware handle the request
  return apiProxy(req, res, next);
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