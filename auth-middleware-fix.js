/**
 * ProbeOps Authentication Middleware Fix
 * 
 * This module provides middleware that can be added to your Express server
 * to ensure proper handling of authentication requests. It specifically addresses
 * the form-urlencoded vs JSON issue that causes authentication failures in AWS.
 * 
 * How to use:
 * 1. Include this file in your project
 * 2. Add the middleware to your Express app before other routes
 * 
 * Example:
 *   const { authMiddlewareFix } = require('./auth-middleware-fix');
 *   app.use(authMiddlewareFix);
 */

const { URLSearchParams } = require('url');

/**
 * Authentication middleware that ensures proper request format for login endpoints
 */
function authMiddlewareFix(req, res, next) {
  // Only process login requests
  if (req.path === '/login' || req.path === '/api/login') {
    console.log(`[Auth Fix] Processing ${req.method} request to ${req.path}`);
    
    // If the request is using JSON but should be form-urlencoded
    if (req.method === 'POST' && 
        req.headers['content-type']?.includes('application/json')) {
      
      console.log('[Auth Fix] Converting JSON request to form-urlencoded format');
      
      const formData = new URLSearchParams();
      
      // Add username and password from JSON body to form data
      if (req.body.username) {
        formData.append('username', req.body.username);
      }
      
      if (req.body.password) {
        formData.append('password', req.body.password);
      }
      
      // Replace the request body and content type
      req.body = formData;
      req.headers['content-type'] = 'application/x-www-form-urlencoded';
      
      console.log('[Auth Fix] Request converted to form-urlencoded format');
    }
  }
  
  // Continue processing the request
  next();
}

/**
 * This proxy middleware can be used to automatically fix authentication issues
 * with the backend API.
 */
function createAuthProxyMiddleware(proxyOptions) {
  const originalOnProxyReq = proxyOptions.onProxyReq || ((proxyReq, req, res) => {});
  
  // Override the onProxyReq function to handle authentication
  proxyOptions.onProxyReq = (proxyReq, req, res) => {
    // Call the original onProxyReq function first
    originalOnProxyReq(proxyReq, req, res);
    
    // Only process login requests
    if (req.path === '/login' || req.path === '/api/login') {
      console.log(`[Auth Proxy] Processing ${req.method} request to ${req.path}`);
      
      // If the request is using JSON but should be form-urlencoded
      if (req.method === 'POST' && 
          req.headers['content-type']?.includes('application/json')) {
        
        console.log('[Auth Proxy] Converting JSON request to form-urlencoded format');
        
        // Get the original request body
        const body = req.body;
        
        // Create form data
        const formData = new URLSearchParams();
        
        // Add username and password to form data
        if (body.username) {
          formData.append('username', body.username);
        }
        
        if (body.password) {
          formData.append('password', body.password);
        }
        
        // Replace the request headers and body
        proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        
        // Write the new request body
        const formString = formData.toString();
        proxyReq.setHeader('Content-Length', Buffer.byteLength(formString));
        
        // Only end the request if it hasn't been ended already
        if (!proxyReq.finished) {
          proxyReq.write(formString);
        }
        
        console.log('[Auth Proxy] Request converted to form-urlencoded format');
      }
    }
  };
  
  return proxyOptions;
}

module.exports = {
  authMiddlewareFix,
  createAuthProxyMiddleware
};