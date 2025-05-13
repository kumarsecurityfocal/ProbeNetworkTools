import api from './api';

// Get user's subscription
export const getUserSubscription = async () => {
  try {
    const response = await api.get('/api/subscription');
    return response.data;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    throw error;
  }
};

// Get all subscription tiers
export const getSubscriptionTiers = async () => {
  try {
    const response = await api.get('/api/subscription/tiers');
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription tiers:', error);
    throw error;
  }
};

// Admin: Create subscription for a user
export const createSubscription = async (userId, tierId, paymentDetails = {}) => {
  try {
    const data = {
      user_id: userId,
      tier_id: tierId,
      ...paymentDetails,
    };
    const response = await api.post('/api/subscriptions', data);
    return response.data;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

// Admin: List all subscriptions
export const getAllSubscriptions = async () => {
  try {
    const response = await api.get('/api/subscriptions');
    return response.data;
  } catch (error) {
    console.error('Error fetching all subscriptions:', error);
    throw error;
  }
};

// Admin: Update a subscription
export const updateSubscription = async (subscriptionId, data) => {
  try {
    const response = await api.put(`/api/subscriptions/${subscriptionId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

// Admin: Cancel a subscription
export const cancelSubscription = async (subscriptionId) => {
  try {
    const response = await api.post(`/api/subscriptions/${subscriptionId}/cancel`, {});
    return response.data;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

// Admin: Renew a subscription
export const renewSubscription = async (subscriptionId, months = 1) => {
  try {
    const response = await api.post(
      `/api/subscriptions/${subscriptionId}/renew`, 
      { months }
    );
    return response.data;
  } catch (error) {
    console.error('Error renewing subscription:', error);
    throw error;
  }
};