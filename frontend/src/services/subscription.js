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
    console.log("Fetching subscription tiers from primary endpoint...");
    const response = await api.get('/subscription-tiers');
    console.log("Subscription tiers response:", response);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching subscription tiers from primary endpoint:', error);
    
    // Try alternative endpoints
    try {
      console.log("Trying alternative endpoint for subscription tiers...");
      const altResponse = await api.get('/tiers');
      console.log("Alternative subscription tiers response:", altResponse);
      return Array.isArray(altResponse.data) ? altResponse.data : [];
    } catch (altError) {
      console.error('Alternative endpoint also failed:', altError);
      
      // One more attempt with api prefix
      try {
        console.log("Trying API-prefixed endpoint for subscription tiers...");
        const apiResponse = await api.get('/api/subscription-tiers');
        console.log("API-prefixed subscription tiers response:", apiResponse);
        return Array.isArray(apiResponse.data) ? apiResponse.data : [];
      } catch (apiError) {
        console.error('All endpoints failed:', apiError);
        // Return a default set of tiers for UI development/testing
        return []; 
      }
    }
  }
};

// Get a specific subscription tier by ID
export const getSubscriptionTier = async (tierId) => {
  try {
    const response = await api.get(`/subscription-tiers/${tierId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching subscription tier ${tierId}:`, error);
    throw error;
  }
};

// Admin: Create a new subscription tier
export const createSubscriptionTier = async (tierData) => {
  try {
    const response = await api.post('/subscription-tiers', tierData);
    return response.data;
  } catch (error) {
    console.error('Error creating subscription tier:', error);
    throw error;
  }
};

// Admin: Update an existing subscription tier
export const updateSubscriptionTier = async (tierId, tierData) => {
  try {
    const response = await api.put(`/subscription-tiers/${tierId}`, tierData);
    return response.data;
  } catch (error) {
    console.error(`Error updating subscription tier ${tierId}:`, error);
    throw error;
  }
};

// Admin: Delete a subscription tier
export const deleteSubscriptionTier = async (tierId) => {
  try {
    const response = await api.delete(`/subscription-tiers/${tierId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting subscription tier ${tierId}:`, error);
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
    // Try alternative endpoint
    try {
      console.log("Trying alternative endpoint for subscriptions...");
      const altResponse = await api.get('/api/subscriptions');
      console.log("Alternative subscriptions response:", altResponse);
      return Array.isArray(altResponse.data) ? altResponse.data : [];
    } catch (altError) {
      console.error('Alternative endpoint also failed:', altError);
      return []; // Return empty array instead of throwing
    }
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