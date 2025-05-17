import axios from 'axios';
import { getAuthHeader } from './auth';

// Base URL for API calls
// The API URL can come from multiple sources
// 1. From environment variables in production
// 2. Hardcoded to the backend in development
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' // In production, requests go through NGINX proxy
  : 'http://localhost:8000'; // Direct to backend in development
  
// Helper function to load help JSON data
export const getRegistrationHelp = async () => {
  try {
    // This is a workaround for the missing registration-help.json file
    return {
      steps: [
        {
          title: "Generate Token",
          description: "Create a registration token with the 'Create Registration Token' button above."
        },
        {
          title: "Install the ProbeOps Agent",
          description: "Install the probe agent on your server using the package manager."
        },
        {
          title: "Configure the Agent",
          description: "Configure the agent with your token and API endpoint."
        },
        {
          title: "Start the Agent",
          description: "Start the agent service to begin reporting to the ProbeOps backend."
        }
      ],
      tips: [
        "Make sure your firewall allows outbound connections to the ProbeOps API endpoint.",
        "Each token can only be used once to register a new probe node.",
        "Tokens expire after the specified number of hours if unused."
      ]
    };
  } catch (error) {
    console.error('Error fetching registration help:', error);
    return { steps: [], tips: [] };
  }
};

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
    console.log("Attempting to create registration token...");
    const requestData = {
      description: tokenData.description,
      expiry_hours: tokenData.expiryHours,
      region: tokenData.region || null
    };
    
    try {
      // First try the primary endpoint
      const response = await axios.post(
        `${API_URL}/probe-nodes/registration-token`,
        requestData,
        { headers: getAuthHeader() }
      );
      console.log("Successfully created token from primary endpoint");
      return response.data;
    } catch (primaryError) {
      console.error('Primary endpoint failed:', primaryError);
      
      // Try alternative endpoint with /tokens instead of /registration-token
      try {
        const altResponse = await axios.post(
          `${API_URL}/probe-nodes/tokens`,
          requestData,
          { headers: getAuthHeader() }
        );
        console.log("Successfully created token from alternative endpoint");
        return altResponse.data;
      } catch (altError) {
        console.error('Alternative endpoint also failed:', altError);
        
        // Try with direct API path
        const directResponse = await axios.post(
          `/api/probe-nodes/registration-token`,
          requestData,
          { headers: getAuthHeader() }
        );
        console.log("Successfully created token from direct API path");
        return directResponse.data;
      }
    }
  } catch (error) {
    console.error('All attempts to create registration token failed:', error);
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
    console.log("Attempting to fetch registration tokens...");
    try {
      // First try the primary endpoint
      const response = await axios.get(
        `${API_URL}/probe-nodes/registration-token?include_expired=${includeExpired}&include_used=${includeUsed}`,
        { headers: getAuthHeader() }
      );
      console.log("Successfully retrieved tokens from primary endpoint");
      return response.data;
    } catch (primaryError) {
      console.error('Primary endpoint failed:', primaryError);
      
      // Try alternative endpoint with /tokens instead of /registration-token
      try {
        const altResponse = await axios.get(
          `${API_URL}/probe-nodes/tokens?include_expired=${includeExpired}&include_used=${includeUsed}`,
          { headers: getAuthHeader() }
        );
        console.log("Successfully retrieved tokens from alternative endpoint");
        return altResponse.data;
      } catch (altError) {
        console.error('Alternative endpoint also failed:', altError);
        
        // Try with direct API path as seen in the console error
        const directResponse = await axios.get(
          `/api/probe-nodes/registration-token?include_expired=${includeExpired}&include_used=${includeUsed}`,
          { headers: getAuthHeader() }
        );
        console.log("Successfully retrieved tokens from direct API path");
        return directResponse.data;
      }
    }
  } catch (error) {
    console.error('All attempts to fetch registration tokens failed:', error);
    // Return empty array instead of throwing to avoid UI breakage
    return [];
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