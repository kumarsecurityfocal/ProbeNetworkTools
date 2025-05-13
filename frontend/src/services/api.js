import axios from 'axios';
import { getToken, clearToken } from './auth';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  timeout: 10000 // 10 second timeout
});

// Request interceptor to add auth header
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if unauthorized
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper to handle API errors
const handleApiError = (error) => {
  console.error('API Error:', error);
  
  let errorMessage = 'An unexpected error occurred';
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const data = error.response.data;
    errorMessage = data.detail || data.message || `Error: ${error.response.status}`;
  } else if (error.request) {
    // The request was made but no response was received
    errorMessage = 'No response from server. Please check your connection.';
  }
  
  throw new Error(errorMessage);
};

// Auth APIs
export const loginUser = async (username, password) => {
  try {
    // Use URLSearchParams for form-urlencoded format required by FastAPI OAuth2
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post('/api/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const registerUser = async (username, email, password) => {
  try {
    const response = await api.post('/api/register', {
      username,
      email,
      password
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getUserProfile = async () => {
  try {
    const response = await api.get('/me');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Diagnostic APIs
export const runDiagnostic = async (tool, params = {}) => {
  try {
    // The API endpoint must include the /api prefix
    const endpoint = `/api/${tool}`;
    const response = await api.get(endpoint, { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getDiagnosticHistory = async (params = {}) => {
  try {
    const response = await api.get('/api/history', { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// API Key APIs
export const getApiKeys = async () => {
  try {
    const response = await api.get('/keys');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createApiKey = async (data) => {
  try {
    const response = await api.post('/keys', {
      name: data.name
    }, {
      params: {
        expires_days: data.expires_days === 0 ? null : data.expires_days
      }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteApiKey = async (keyId) => {
  try {
    const response = await api.delete(`/keys/${keyId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deactivateApiKey = async (keyId) => {
  try {
    const response = await api.put(`/keys/${keyId}/deactivate`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export default api;
