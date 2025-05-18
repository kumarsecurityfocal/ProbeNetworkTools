import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  isAuthenticated as checkAuth, 
  getUser,
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  refreshUserProfile
} from '../services/auth';
import { useAuthDebug } from '../hooks/useAuthDebug';

// Create context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState(localStorage.getItem('probeops_token') || null);
  
  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      console.log("DEBUG AUTH CONTEXT: Initializing authentication state");
      
      // Regular token-based authentication flow - no more direct auth
      const authenticated = checkAuth();
      console.log("DEBUG AUTH CONTEXT: Is authenticated from token check:", authenticated);
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        // Try to get user from local storage first
        const storedUser = getUser();
        if (storedUser) {
          console.log("DEBUG AUTH CONTEXT: User from local storage:", storedUser);
          console.log("DEBUG AUTH CONTEXT: Is admin from storage:", storedUser.is_admin);
          setUser(storedUser);
        } else {
          console.log("DEBUG AUTH CONTEXT: No user found in local storage");
        }
        
        // Then refresh from API
        try {
          console.log("DEBUG AUTH CONTEXT: Attempting to refresh user profile from API");
          const freshUser = await refreshUserProfile();
          if (freshUser) {
            console.log("DEBUG AUTH CONTEXT: Fresh user profile from API:", freshUser);
            console.log("DEBUG AUTH CONTEXT: Is admin from API:", freshUser.is_admin);
            
            // Check if admin status is explicitly set
            if (freshUser.is_admin === undefined) {
              console.warn("DEBUG AUTH CONTEXT: Warning - is_admin flag is undefined in user profile!");
            }
            
            setUser(freshUser);
          } else {
            console.warn("DEBUG AUTH CONTEXT: API refresh returned no user data");
          }
        } catch (error) {
          console.error('DEBUG AUTH CONTEXT: Error refreshing user profile:', error);
          
          // If API refresh fails but we have stored user, keep using that
          if (storedUser) {
            console.log("DEBUG AUTH CONTEXT: Falling back to stored user data due to API error");
          } else {
            console.error("DEBUG AUTH CONTEXT: No fallback user data available - user might appear logged out");
          }
        }
      } else {
        console.log("DEBUG AUTH CONTEXT: Not authenticated, skipping user profile fetch");
      }
      
      setLoading(false);
    };
    
    initAuth();
  }, []);
  
  // Login function
  const login = async (username, password) => {
    try {
      console.log("DEBUG AUTH CONTEXT: Login attempt for user:", username);
      
      // We no longer use direct admin login
      // All users, including admin, must go through proper JWT authentication
      
      // Regular API login flow
      const response = await loginApi(username, password);
      console.log("DEBUG AUTH CONTEXT: Login API response:", response);
      
      // Extract the user from the response
      let user = response;
      
      // If the response includes both token and user object
      if (response && response.access_token) {
        console.log("DEBUG AUTH CONTEXT: Token received:", response.access_token.substring(0, 10) + "...");
        
        // Ensure the token is properly saved
        localStorage.setItem('probeops_token', response.access_token);
        setTokenState(response.access_token);
        
        // If the user object is nested in the response
        if (response.user) {
          user = response.user;
        }
      }
      
      console.log("DEBUG AUTH CONTEXT: Login successful, user data:", user);
      
      // Explicitly check for admin status
      if (user) {
        console.log("DEBUG AUTH CONTEXT: User admin status:", user.is_admin);
        
        if (user.is_admin === undefined) {
          console.warn("DEBUG AUTH CONTEXT: Warning - is_admin flag is missing from user data!");
          
          // If the admin flag is missing, let's ensure it doesn't break the admin panel
          // This helps if the backend is omitting the field but the user is an admin
          if (username === 'admin' || username === 'admin@probeops.com') {
            console.log("DEBUG AUTH CONTEXT: Username is admin account, assuming admin privileges");
            user.is_admin = true;
          }
        }
      }
      
      setIsAuthenticated(true);
      setUser(user);
      return user;
    } catch (error) {
      console.error('DEBUG AUTH CONTEXT: Login error:', error);
      throw error;
    }
  };
  
  // Register function
  const register = async (username, email, password) => {
    try {
      const newUser = await registerApi(username, email, password);
      return newUser;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };
  
  // Logout function
  const logout = () => {
    logoutApi();
    setIsAuthenticated(false);
    setUser(null);
    setTokenState(null);
  };
  
  // Add auth debugging in development mode
  const isAdmin = user && user.is_admin === true;
  
  // Initialize auth debugging tools
  const authState = {
    isAuthenticated,
    user,
    token,
    isAdmin
  };
  
  // Use the auth debug hook
  const { isDebugEnabled } = useAuthDebug(authState);
  
  // Context value
  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    register,
    logout,
    isAdmin,
    token,
    debug: isDebugEnabled
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
