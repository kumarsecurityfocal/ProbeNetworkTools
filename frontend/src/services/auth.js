import { loginUser as apiLoginUser, registerUser as apiRegisterUser, getUserProfile } from './api';

// Storage keys
const TOKEN_KEY = 'probeops_token';
const USER_KEY = 'probeops_user';

// Token functions
export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  
  // Filter out invalid hardcoded tokens
  if (token === 'admin-direct-access-token' || token === 'admin-direct-access') {
    console.warn('Found invalid hardcoded token, removing it');
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  
  return token;
};

export const getAuthHeader = () => {
  const token = getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// User functions
export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = () => {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    console.error('Error parsing user from storage', e);
    return null;
  }
};

// Auth functions
export const isAuthenticated = () => {
  return !!getToken();
};

export const login = async (username, password) => {
  const response = await apiLoginUser(username, password);
  
  if (response && response.access_token) {
    // Store the token
    setToken(response.access_token);
    console.log('Token saved to localStorage');
    
    // If the login response includes user data, use it directly
    if (response.user) {
      setUser(response.user);
      return response.user;
    }
    
    // Otherwise try to fetch user profile
    try {
      const userProfile = await getUserProfile();
      if (userProfile) {
        setUser(userProfile);
        return userProfile;
      } else {
        throw new Error('No user profile returned');
      }
    } catch (error) {
      console.error("Error fetching user profile after login:", error);
      throw new Error('Login successful but profile fetch failed');
    }
  }
  
  throw new Error('Login failed - no valid token received');
};

export const register = async (username, email, password) => {
  const response = await apiRegisterUser(username, email, password);
  return response;
};

export const logout = () => {
  clearToken();
  // Use the app login path consistently
  window.location.href = '/app';
};

export const refreshUserProfile = async () => {
  if (!isAuthenticated()) return null;
  
  try {
    console.log('Refreshing user profile with token');
    const userProfile = await getUserProfile();
    
    if (userProfile) {
      console.log('Successfully retrieved user profile');
      
      // Save updated user profile
      setUser(userProfile);
      return userProfile;
    } else {
      console.error('User profile response was empty');
      return null;
    }
  } catch (error) {
    console.error('Error refreshing user profile:', error);
    
    // Only clear token on actual 401 responses, not network errors
    if (error.response && error.response.status === 401) {
      console.error('Unauthorized response, clearing token');
      clearToken();
    }
    
    return null;
  }
};
