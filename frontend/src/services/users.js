import api from './api';

// Get all users (admin only)
export const getAllUsers = async () => {
  try {
    console.log('Attempting to fetch all users from /users endpoint');
    const token = localStorage.getItem('auth_token');
    console.log('Using auth token (first 10 chars):', token ? token.substring(0, 10) + '...' : 'no token');
    
    const response = await api.get('/users');
    console.log('getAllUsers response:', response);
    
    if (Array.isArray(response.data)) {
      console.log(`Successfully fetched ${response.data.length} users`);
      return response.data;
    } else {
      console.warn('Response data is not an array:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching all users:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};

// Create new user (admin only)
export const createUser = async (userData) => {
  try {
    console.log('Creating new user with data:', userData);
    // Make sure all required fields are present
    if (!userData.username || !userData.email || !userData.password) {
      console.error('Missing required user creation fields!', userData);
      throw new Error('User creation requires username, email, and password fields');
    }
    
    const response = await api.post('/users', userData);
    console.log('User creation success response:', response);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    console.error('Error response data:', error.response?.data);
    console.error('Request that failed:', { 
      url: '/users', 
      method: 'POST',
      data: userData
    });
    throw error;
  }
};

// Update user (admin only)
export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Delete user (admin only)
export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Change user status (activate/deactivate) (admin only)
export const changeUserStatus = async (userId, isActive) => {
  try {
    const response = await api.put(`/users/${userId}/status`, { is_active: isActive });
    return response.data;
  } catch (error) {
    console.error('Error changing user status:', error);
    throw error;
  }
};

// Verify user email (admin only)
export const verifyUserEmail = async (userId) => {
  try {
    const response = await api.put(`/users/${userId}/verify-email`);
    return response.data;
  } catch (error) {
    console.error('Error verifying user email:', error);
    throw error;
  }
};

// Reset user password (admin only)
export const resetUserPassword = async (userId, newPassword) => {
  try {
    const response = await api.put(`/users/${userId}/reset-password`, { password: newPassword });
    return response.data;
  } catch (error) {
    console.error('Error resetting user password:', error);
    throw error;
  }
};

export default {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  changeUserStatus,
  verifyUserEmail,
  resetUserPassword
};