import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  isAuthenticated as checkAuth, 
  getUser,
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  refreshUserProfile
} from '../services/auth';

// Create context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const authenticated = checkAuth();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        // Try to get user from local storage first
        const storedUser = getUser();
        if (storedUser) {
          console.log("User from local storage:", storedUser);
          setUser(storedUser);
        }
        
        // Then refresh from API
        try {
          const freshUser = await refreshUserProfile();
          if (freshUser) {
            console.log("Fresh user profile from API:", freshUser);
            setUser(freshUser);
          }
        } catch (error) {
          console.error('Error refreshing user profile:', error);
        }
      }
      
      setLoading(false);
    };
    
    initAuth();
  }, []);
  
  // Login function
  const login = async (username, password) => {
    try {
      const user = await loginApi(username, password);
      console.log("User after login:", user);
      setIsAuthenticated(true);
      setUser(user);
      return user;
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
