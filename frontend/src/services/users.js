import api from './api';

// Get all users (admin only)
export const getAllUsers = async () => {
  try {
    console.log('Fetching all users from /api/users');
    const response = await api.get('/api/users');
    console.log('Users data received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    } else if (error.request) {
      console.error('No response received from server');
    }
    throw error;
  }
};

// Create a new user (admin only)
export const createUser = async (userData) => {
  try {
    const response = await api.post('/api/users', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Update a user (admin only)
export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/api/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Delete a user (admin only)
export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Reset user password (admin only)
export const resetUserPassword = async (userId, newPassword) => {
  try {
    const response = await api.post(`/api/users/${userId}/reset-password`, { password: newPassword });
    return response.data;
  } catch (error) {
    console.error('Error resetting user password:', error);
    throw error;
  }
};

// Get user details (admin only)
export const getUserDetails = async (userId) => {
  try {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw error;
  }
};

// Verify user email (admin only)
export const verifyUserEmail = async (userId) => {
  try {
    const response = await api.post(`/api/users/${userId}/verify-email`);
    return response.data;
  } catch (error) {
    console.error('Error verifying user email:', error);
    throw error;
  }
};

// Change user status (activate/deactivate) (admin only)
export const changeUserStatus = async (userId, isActive) => {
  try {
    const response = await api.post(`/api/users/${userId}/status`, { is_active: isActive });
    return response.data;
  } catch (error) {
    console.error('Error changing user status:', error);
    throw error;
  }
};