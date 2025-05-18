/**
 * Authentication Middleware Fix for ProbeOps
 * 
 * This middleware ensures proper content-type headers and error handling
 * for authentication endpoints, preventing HTML responses when JSON is expected.
 */

// Simple middleware to ensure JSON responses for auth endpoints
app.use((req, res, next) => {
  // Store original methods
  const originalJson = res.json;
  const originalSend = res.send;
  
  // Override json method to add proper Content-Type headers
  res.json = function(obj) {
    res.setHeader('Content-Type', 'application/json');
    return originalJson.call(this, obj);
  };
  
  // Override send method to check for HTML responses on auth endpoints
  res.send = function(body) {
    const url = req.url.toLowerCase();
    const isAuthEndpoint = url.includes('/login') || 
                           url.includes('/auth') || 
                           url.includes('/token') ||
                           url.includes('/users/me');
    
    // Check if this is an auth endpoint and response is HTML
    if (isAuthEndpoint && typeof body === 'string' && 
        (body.includes('<!DOCTYPE') || body.includes('<html'))) {
      console.error('HTML response detected for auth endpoint:', req.url);
      // Convert HTML error to JSON error
      return res.status(res.statusCode || 500)
        .json({ 
          error: 'Authentication error', 
          status: res.statusCode, 
          message: 'Authentication API returned HTML instead of JSON. Configure proper Content-Type headers.'
        });
    }
    
    return originalSend.call(this, body);
  };
  
  next();
});