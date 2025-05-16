import { useContext } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for API calls that handles authentication tokens
 * and provides consistent error handling across the application
 */
export const useApi = () => {
  const { user } = useAuth();
  // For this application, we don't use a separate token variable
  // Instead, we'll use the admin authentication for API calls
  
  // Create a configured axios instance
  const api = axios.create({
    baseURL: '/',
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Request interceptor to add auth token to every request
  api.interceptors.request.use(
    (config) => {
      // We don't use tokens explicitly for auth in this app
      // Our Express server proxy handles the authentication
      // No need to add auth headers as the server.js takes care of it
      return config;
    },
    (error) => {
      // Handle request errors
      console.error('API Request Error:', error);
      return Promise.reject(error);
    }
  );
  
  // Response interceptor for error handling
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle response errors
      console.error('API Error:', error);
      
      // Special handling for 401 Unauthorized errors
      if (error.response && error.response.status === 401) {
        // Let the auth context handle 401 errors
        // This is handled in AuthContext.jsx
      }
      
      return Promise.reject(error);
    }
  );
  
  // Wrapper for direct API calls
  const makeRequest = async (method, url, data = null, config = {}) => {
    try {
      const response = await api({
        method,
        url,
        data,
        ...config,
      });
      return response.data;
    } catch (error) {
      console.error(`Error making ${method} request to ${url}:`, error);
      throw error;
    }
  };
  
  return {
    api,
    // Convenience methods for common HTTP verbs
    get: (url, config = {}) => makeRequest('get', url, null, config),
    post: (url, data, config = {}) => makeRequest('post', url, data, config),
    put: (url, data, config = {}) => makeRequest('put', url, data, config),
    delete: (url, config = {}) => makeRequest('delete', url, null, config),
    patch: (url, data, config = {}) => makeRequest('patch', url, data, config)
  };
};