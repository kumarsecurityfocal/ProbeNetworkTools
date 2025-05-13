import axios from 'axios';
import { getAuthHeader } from './auth';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Get user's subscription
export const getUserSubscription = async () => {
  try {
    const headers = getAuthHeader();
    const response = await axios.get(`${API_URL}/subscription`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    throw error;
  }
};

// Get all subscription tiers
export const getSubscriptionTiers = async () => {
  try {
    const response = await axios.get(`${API_URL}/subscription/tiers`);
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription tiers:', error);
    throw error;
  }
};

// Admin: Create subscription for a user
export const createSubscription = async (userId, tierId, paymentDetails = {}) => {
  try {
    const headers = getAuthHeader();
    const data = {
      user_id: userId,
      tier_id: tierId,
      ...paymentDetails,
    };
    const response = await axios.post(`${API_URL}/subscriptions`, data, { headers });
    return response.data;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

// Admin: List all subscriptions
export const getAllSubscriptions = async () => {
  try {
    const headers = getAuthHeader();
    const response = await axios.get(`${API_URL}/subscriptions`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching all subscriptions:', error);
    throw error;
  }
};

// Admin: Update a subscription
export const updateSubscription = async (subscriptionId, data) => {
  try {
    const headers = getAuthHeader();
    const response = await axios.put(`${API_URL}/subscriptions/${subscriptionId}`, data, { headers });
    return response.data;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

// Admin: Cancel a subscription
export const cancelSubscription = async (subscriptionId) => {
  try {
    const headers = getAuthHeader();
    const response = await axios.post(`${API_URL}/subscriptions/${subscriptionId}/cancel`, {}, { headers });
    return response.data;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

// Admin: Renew a subscription
export const renewSubscription = async (subscriptionId, months = 1) => {
  try {
    const headers = getAuthHeader();
    const response = await axios.post(
      `${API_URL}/subscriptions/${subscriptionId}/renew`, 
      { months }, 
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error('Error renewing subscription:', error);
    throw error;
  }
};