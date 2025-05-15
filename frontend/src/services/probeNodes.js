import axios from 'axios';
import { getAuthHeader } from './auth';

// Base URL for API calls
const API_URL = '/api';

/**
 * Get all probe nodes
 * @param {Object} filters - Optional filters like region, status, activeOnly
 * @param {number} page - Page number for pagination
 * @param {number} limit - Number of items per page
 * @returns {Promise} - Promise with probe nodes data
 */
export const getProbeNodes = async (filters = {}, page = 0, limit = 10) => {
  try {
    const { region, status, activeOnly } = filters;
    let url = `${API_URL}/probe-nodes?skip=${page * limit}&limit=${limit}`;
    
    if (region) url += `&region=${region}`;
    if (status) url += `&status=${status}`;
    if (activeOnly !== undefined) url += `&active_only=${activeOnly}`;
    
    const response = await axios.get(url, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error fetching probe nodes:', error);
    throw error;
  }
};

/**
 * Get details for a specific probe node
 * @param {string} nodeUuid - UUID of the probe node
 * @returns {Promise} - Promise with probe node details
 */
export const getProbeNodeDetails = async (nodeUuid) => {
  try {
    const response = await axios.get(`${API_URL}/probe-nodes/${nodeUuid}`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching probe node ${nodeUuid}:`, error);
    throw error;
  }
};

/**
 * Update a probe node
 * @param {string} nodeUuid - UUID of the probe node
 * @param {Object} updateData - Data to update
 * @returns {Promise} - Promise with updated probe node
 */
export const updateProbeNode = async (nodeUuid, updateData) => {
  try {
    const response = await axios.put(
      `${API_URL}/probe-nodes/${nodeUuid}`,
      updateData,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating probe node ${nodeUuid}:`, error);
    throw error;
  }
};

/**
 * Deactivate a probe node
 * @param {string} nodeUuid - UUID of the probe node
 * @returns {Promise} - Promise with operation result
 */
export const deactivateProbeNode = async (nodeUuid) => {
  try {
    await axios.delete(`${API_URL}/probe-nodes/${nodeUuid}`, {
      headers: getAuthHeader()
    });
    return { success: true };
  } catch (error) {
    console.error(`Error deactivating probe node ${nodeUuid}:`, error);
    throw error;
  }
};

/**
 * Create a new registration token for probe nodes
 * @param {Object} tokenData - Token data with description, expiryHours, and optional region
 * @returns {Promise} - Promise with the new token
 */
export const createRegistrationToken = async (tokenData) => {
  try {
    const response = await axios.post(
      `${API_URL}/probe-nodes/registration-token`,
      {
        description: tokenData.description,
        expiry_hours: tokenData.expiryHours,
        region: tokenData.region || null
      },
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating registration token:', error);
    throw error;
  }
};

/**
 * Get all registration tokens
 * @param {Boolean} includeExpired - Whether to include expired tokens
 * @param {Boolean} includeUsed - Whether to include used tokens
 * @returns {Promise} - Promise with registration tokens
 */
export const getRegistrationTokens = async (includeExpired = false, includeUsed = false) => {
  try {
    // This endpoint should match the backend's actual route which is:
    // @router.get("/registration-token", response_model=List[schemas.NodeRegistrationTokenResponse])
    const response = await axios.get(
      `${API_URL}/probe-nodes/registration-token?include_expired=${includeExpired}&include_used=${includeUsed}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching registration tokens:', error);
    throw error;
  }
};

/**
 * Get details for a specific registration token
 * @param {string} tokenId - ID of the registration token
 * @returns {Promise} - Promise with token details
 */
export const getRegistrationTokenDetails = async (tokenId) => {
  try {
    const response = await axios.get(
      `${API_URL}/probe-nodes/registration-token/${tokenId}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching registration token ${tokenId}:`, error);
    throw error;
  }
};

/**
 * Revoke a registration token
 * @param {string} tokenId - ID of the registration token
 * @returns {Promise} - Promise with operation result
 */
export const revokeRegistrationToken = async (tokenId) => {
  try {
    await axios.delete(
      `${API_URL}/probe-nodes/registration-token/${tokenId}`,
      { headers: getAuthHeader() }
    );
    return { success: true };
  } catch (error) {
    console.error(`Error revoking registration token ${tokenId}:`, error);
    throw error;
  }
};