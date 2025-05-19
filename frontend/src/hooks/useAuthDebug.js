import { useState, useEffect, useCallback } from 'react';

/**
 * Auth Debug Hook for Development
 * 
 * This hook provides authentication debugging utilities for development.
 * It can display token information, authentication state, and provide 
 * helper functions for testing auth flows.
 */
const useAuthDebug = () => {
  // Authentication debug state
  const [debugState, setDebugState] = useState({
    isEnabled: false,
    authToken: null,
    user: null,
    authErrors: [],
    authBypassEnabled: false,
    lastAuthAttempt: null,
    authHistory: []
  });

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       window.location.hostname === 'localhost';

  // Initialize debugging on mount
  useEffect(() => {
    if (!isDevelopment) {
      return;
    }

    console.log('DEBUG AUTH: Initializing auth debugging tools');
    
    // Check for auth token in localStorage
    const storedToken = localStorage.getItem('auth_token');
    
    // Get auth bypass status from localStorage or environment
    const authBypassEnabled = localStorage.getItem('auth_bypass') === 'true';
    
    setDebugState(prev => ({
      ...prev,
      isEnabled: true,
      authToken: storedToken,
      authBypassEnabled
    }));
    
    // Add auth debugging event listeners
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      
      // Only intercept auth-related requests
      if (typeof url === 'string' && 
          (url.includes('/api/login') || 
           url.includes('/api/logout') || 
           url.includes('/api/users/me'))) {
        
        console.log(`DEBUG AUTH: Intercepted fetch to ${url}`, options);
        
        // Add to auth history
        setDebugState(prev => ({
          ...prev,
          lastAuthAttempt: {
            timestamp: new Date().toISOString(),
            url,
            method: options.method || 'GET',
            headers: options.headers
          },
          authHistory: [
            {
              timestamp: new Date().toISOString(),
              url,
              method: options.method || 'GET'
            },
            ...prev.authHistory.slice(0, 9) // Keep last 10 items
          ]
        }));
      }
      
      return originalFetch(...args);
    };
    
    // Cleanup function to restore original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, [isDevelopment]);
  
  // Fetch user debug info
  const fetchUserDebugInfo = useCallback(async () => {
    if (!isDevelopment || !debugState.isEnabled) {
      return;
    }
    
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const userData = await response.json();
        setDebugState(prev => ({
          ...prev,
          user: userData,
          authErrors: []
        }));
      } else {
        const errorData = await response.text();
        setDebugState(prev => ({
          ...prev,
          authErrors: [...prev.authErrors, {
            timestamp: new Date().toISOString(),
            message: `Failed to fetch user: ${response.status} ${errorData}`
          }]
        }));
      }
    } catch (error) {
      console.error('DEBUG AUTH: Error fetching user debug info', error);
      setDebugState(prev => ({
        ...prev,
        authErrors: [...prev.authErrors, {
          timestamp: new Date().toISOString(),
          message: `Exception: ${error.message}`
        }]
      }));
    }
  }, [isDevelopment, debugState.isEnabled]);
  
  // Toggle auth bypass for testing
  const toggleAuthBypass = useCallback(() => {
    if (!isDevelopment || !debugState.isEnabled) {
      return;
    }
    
    const newStatus = !debugState.authBypassEnabled;
    localStorage.setItem('auth_bypass', newStatus.toString());
    
    setDebugState(prev => ({
      ...prev,
      authBypassEnabled: newStatus
    }));
    
    console.log(`DEBUG AUTH: Auth bypass ${newStatus ? 'enabled' : 'disabled'}`);
    
    // In a real implementation, this would communicate with the backend
    // For now, just show a message about reloading
    if (window.confirm(`Auth bypass ${newStatus ? 'enabled' : 'disabled'}. Reload page to apply changes?`)) {
      window.location.reload();
    }
  }, [isDevelopment, debugState.isEnabled, debugState.authBypassEnabled]);
  
  // Get token info (decode JWT)
  const getTokenInfo = useCallback(() => {
    if (!debugState.authToken) {
      return null;
    }
    
    try {
      // Simple JWT parsing (not validation)
      const parts = debugState.authToken.split('.');
      if (parts.length !== 3) {
        return { error: 'Invalid token format' };
      }
      
      const payload = JSON.parse(atob(parts[1]));
      return {
        header: JSON.parse(atob(parts[0])),
        payload,
        isExpired: payload.exp ? payload.exp * 1000 < Date.now() : false,
        expiresIn: payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'unknown'
      };
    } catch (error) {
      console.error('DEBUG AUTH: Error parsing JWT token', error);
      return { error: error.message };
    }
  }, [debugState.authToken]);
  
  // Add a test login function
  const testLogin = useCallback(async (email = 'admin@probeops.com', password = 'admin') => {
    if (!isDevelopment || !debugState.isEnabled) {
      return;
    }
    
    console.log(`DEBUG AUTH: Testing login with ${email}`);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token || 'test-token');
        setDebugState(prev => ({
          ...prev,
          authToken: data.token || 'test-token',
          user: data.user || { email, is_admin: email.includes('admin') },
          lastAuthAttempt: {
            timestamp: new Date().toISOString(),
            success: true,
            message: 'Login successful'
          }
        }));
        return true;
      } else {
        const errorText = await response.text();
        setDebugState(prev => ({
          ...prev,
          authErrors: [...prev.authErrors, {
            timestamp: new Date().toISOString(),
            message: `Login failed: ${response.status} ${errorText}`
          }],
          lastAuthAttempt: {
            timestamp: new Date().toISOString(),
            success: false,
            message: `Login failed: ${response.status}`
          }
        }));
        return false;
      }
    } catch (error) {
      console.error('DEBUG AUTH: Login test error', error);
      setDebugState(prev => ({
        ...prev,
        authErrors: [...prev.authErrors, {
          timestamp: new Date().toISOString(),
          message: `Login exception: ${error.message}`
        }],
        lastAuthAttempt: {
          timestamp: new Date().toISOString(),
          success: false,
          message: `Exception: ${error.message}`
        }
      }));
      
      // In development with auth bypass, simulate successful login
      if (debugState.authBypassEnabled) {
        console.log('DEBUG AUTH: Auto-login with auth bypass');
        const mockToken = 'auth-bypass-mock-token';
        localStorage.setItem('auth_token', mockToken);
        setDebugState(prev => ({
          ...prev,
          authToken: mockToken,
          user: { 
            email: 'admin@probeops.com', 
            username: 'admin',
            is_admin: true 
          },
          lastAuthAttempt: {
            timestamp: new Date().toISOString(),
            success: true,
            message: 'Auto-login with auth bypass'
          }
        }));
        return true;
      }
      
      return false;
    }
  }, [isDevelopment, debugState.isEnabled, debugState.authBypassEnabled]);
  
  // Don't expose debugging features in production
  if (!isDevelopment) {
    return {
      isDebugEnabled: false
    };
  }
  
  return {
    isDebugEnabled: debugState.isEnabled,
    debugState,
    fetchUserDebugInfo,
    toggleAuthBypass,
    getTokenInfo,
    testLogin,
    isDevelopment
  };
};

// Named export
export { useAuthDebug };

// Default export
export default useAuthDebug;