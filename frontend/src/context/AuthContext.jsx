import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  isAuthenticated as checkAuth, 
  getUser,
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  refreshUserProfile
} from '../services/auth';
import axios from 'axios';

// Create context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      console.log("Initializing authentication state");
      
      // Remove any legacy direct authentication flags
      if (localStorage.getItem('isAuthenticated') === 'true') {
        console.log("Removing legacy direct authentication");
        localStorage.removeItem('isAuthenticated');
      }
      
      // Regular token-based authentication flow
      const authenticated = checkAuth();
      console.log("Is authenticated from token check:", authenticated);
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        try {
          console.log("Fetching user profile");
          const userProfile = await refreshUserProfile();
          
          if (userProfile) {
            console.log("User profile fetched successfully");
            setUser(userProfile);
          } else {
            console.warn("Unable to fetch user profile");
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Error refreshing user profile:', error);
          setIsAuthenticated(false);
        }
      } else {
        console.log("Not authenticated, skipping user profile fetch");
      }
      
      setLoading(false);
    };
    
    initAuth();
  }, []);
  
  // Login function
  const login = async (username, password) => {
    try {
      console.log("Login attempt for user:", username);
      
      // Standard API login flow for all users
      const response = await loginApi(username, password);
      
      if (!response || !response.access_token) {
        throw new Error('No valid token received from login');
      }
      
      console.log("Login successful, token received");
      
      // Save token to localStorage and attach it globally
      localStorage.setItem("probeops_token", response.access_token);
      
      // Set token in global axios defaults for all requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.access_token}`;
      
      setIsAuthenticated(true);
      
      // Get user data - either from response or fetch profile
      let userData = null;
      
      if (response.user) {
        // If user data is included in response
        userData = response.user;
        setUser(userData);
      } else {
        // Fetch user profile separately
        try {
          console.log("Fetching user profile after login");
          const userProfile = await refreshUserProfile();
          if (userProfile) {
            userData = userProfile;
            setUser(userData);
          }
        } catch (error) {
          console.error('Error fetching user profile after login:', error);
          // Still consider logged in even if profile fetch fails
        }
      }
      
      return userData;
    } catch (error) {
      console.error('Login error:', error);
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
  };
  
  // Context value
  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    register,
    logout
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
