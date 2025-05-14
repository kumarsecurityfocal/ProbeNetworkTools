import api from './api';

// Get user's subscription
export const getUserSubscription = async () => {
  try {
    const response = await api.get('/subscription');
    return response.data;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    throw error;
  }
};

// Get all subscription tiers
export const getSubscriptionTiers = async () => {
  try {
    console.log("Fetching subscription tiers...");
    const response = await api.get('/subscription-tiers');
    console.log("Subscription tiers response:", response);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching subscription tiers:', error);
    return []; // Return empty array instead of throwing
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
    const response = await api.post('/subscriptions', data);
    return response.data;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

// Admin: List all subscriptions
export const getAllSubscriptions = async () => {
  try {
    console.log("Fetching all subscriptions...");
    const response = await api.get('/subscriptions');
    console.log("Subscriptions response:", response);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching all subscriptions:', error);
    return []; // Return empty array instead of throwing
  }
};

// Admin: Update a subscription
export const updateSubscription = async (subscriptionId, data) => {
  try {
    const response = await api.put(`/subscriptions/${subscriptionId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

// Admin: Cancel a subscription
export const cancelSubscription = async (subscriptionId) => {
  try {
    const response = await api.post(`/subscriptions/${subscriptionId}/cancel`, {});
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
      `/subscriptions/${subscriptionId}/renew`, 
      { months }
    );
    return response.data;
  } catch (error) {
    console.error('Error renewing subscription:', error);
    throw error;
  }
};