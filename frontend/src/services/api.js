import axios from 'axios';
import { getToken, clearToken } from './auth';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  timeout: 60000 // 60 second timeout for slower network conditions
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
    const response = await api.get('/api/me');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const response = await api.put('/api/me', profileData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await api.post('/api/me/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const resendVerificationEmail = async () => {
  try {
    const response = await api.post('/api/me/resend-verification');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const logoutAllDevices = async () => {
  try {
    const response = await api.post('/api/me/logout-all');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Diagnostic APIs
export const runDiagnostic = async (tool, params = {}, data = null) => {
  try {
    // The API endpoint must include the /api prefix
    const endpoint = `/api/${tool}`;
    
    // For HTTP requests, we need to use POST with a body
    if (tool === 'http') {
      const response = await api.post(endpoint, data, { params });
      return response.data;
    } else {
      const response = await api.get(endpoint, { params });
      return response.data;
    }
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

// Dashboard metrics
export const getDashboardMetrics = async () => {
  try {
    const response = await api.get('/api/metrics/dashboard');
    return response.data;
  } catch (error) {
    // For now, if the endpoint doesn't exist, return mock data structure that will be
    // replaced when the backend endpoint is implemented
    if (error.response && error.response.status === 404) {
      return {
        diagnostic_count: 0,
        api_key_count: 0,
        scheduled_probe_count: 0,
        success_rate: 0,
        avg_response_time: 0
      };
    }
    return handleApiError(error);
  }
};

// API Key APIs
export const getApiKeys = async () => {
  try {
    const response = await api.get('/api/keys');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createApiKey = async (data) => {
  try {
    const response = await api.post('/api/keys', {
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
    const response = await api.delete(`/api/keys/${keyId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deactivateApiKey = async (keyId) => {
  try {
    const response = await api.put(`/api/keys/${keyId}/deactivate`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Scheduled Probes APIs
export const getScheduledProbes = async (params = {}) => {
  try {
    const response = await api.get('/api/probes', { params });
    return response.data;
  } catch (error) {
    // If we get a 404, the endpoint might not exist yet, return empty array
    if (error.response && error.response.status === 404) {
      return [];
    }
    return handleApiError(error);
  }
};

export const getScheduledProbeById = async (probeId) => {
  try {
    const response = await api.get(`/api/probes/${probeId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createScheduledProbe = async (probeData) => {
  try {
    const response = await api.post('/api/probes', probeData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateScheduledProbe = async (probeId, probeData) => {
  try {
    const response = await api.put(`/api/probes/${probeId}`, probeData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteScheduledProbe = async (probeId) => {
  try {
    const response = await api.delete(`/api/probes/${probeId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const pauseScheduledProbe = async (probeId) => {
  try {
    const response = await api.put(`/api/probes/${probeId}/pause`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const resumeScheduledProbe = async (probeId) => {
  try {
    const response = await api.put(`/api/probes/${probeId}/resume`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getProbeResults = async (probeId, params = {}) => {
  try {
    const response = await api.get(`/api/probes/${probeId}/results`, { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const bulkPauseProbes = async (probeIds) => {
  try {
    const response = await api.post('/api/probes/bulk-pause', probeIds);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const bulkResumeProbes = async (probeIds) => {
  try {
    const response = await api.post('/api/probes/bulk-resume', probeIds);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const bulkDeleteProbes = async (probeIds) => {
  try {
    const response = await api.post('/api/probes/bulk-delete', probeIds);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export default api;
