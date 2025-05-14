import api from './api';

// Get all users (admin only)
export const getAllUsers = async () => {
  try {
    const response = await api.get('/users');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
};

// Create new user (admin only)
export const createUser = async (userData) => {
  try {
    const response = await api.post('/users', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
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