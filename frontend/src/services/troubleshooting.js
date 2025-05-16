import api from './api';

/**
 * Execute safe system commands
 * @param {string} command - The command to execute
 * @returns {Promise<string>} - Promise with command output
 */
export const executeSystemCommand = async (command) => {
  try {
    const response = await api.post('/admin/system/command', { command });
    return response.data.output;
  } catch (error) {
    console.error('Error executing system command:', error);
    throw error;
  }
};

/**
 * Get configuration settings
 * @returns {Promise<Object>} - Promise with configuration settings
 */
export const getConfigurationSettings = async () => {
  try {
    const response = await api.get('/admin/configuration');
    return response.data;
  } catch (error) {
    console.error('Error fetching configuration settings:', error);
    throw error;
  }
};

/**
 * Update configuration settings
 * @param {Object} settings - The configuration settings to update
 * @returns {Promise<Object>} - Promise with updated configuration
 */
export const updateConfigurationSettings = async (settings) => {
  try {
    const response = await api.put('/admin/configuration', settings);
    return response.data;
  } catch (error) {
    console.error('Error updating configuration settings:', error);
    throw error;
  }
};

/**
 * Get logs by type
 * @param {string} logType - The type of logs to fetch (backend, frontend, nginx, probe)
 * @param {number} limit - Maximum number of log entries to fetch
 * @returns {Promise<Array>} - Promise with log entries
 */
export const getLogs = async (logType, limit = 100) => {
  try {
    // First try the primary endpoint
    try {
      const response = await api.get(`/admin/logs/${logType}?limit=${limit}`);
      return response.data;
    } catch (primaryError) {
      // Try alternative endpoint
      console.error('Primary logs endpoint failed:', primaryError);
      const altResponse = await api.get(`/api/admin/logs/${logType}?limit=${limit}`);
      return altResponse.data;
    }
  } catch (error) {
    console.error(`Error fetching ${logType} logs:`, error);
    throw error;
  }
};

/**
 * Clear logs by type
 * @param {string} logType - The type of logs to clear
 * @returns {Promise<Object>} - Promise with result
 */
export const clearLogs = async (logType) => {
  try {
    const response = await api.delete(`/admin/logs/${logType}`);
    return response.data;
  } catch (error) {
    console.error(`Error clearing ${logType} logs:`, error);
    throw error;
  }
};

/**
 * Get system status information
 * @returns {Promise<Object>} - Promise with system status
 */
export const getSystemStatus = async () => {
  try {
    // Try primary endpoint
    try {
      const response = await api.get('/admin/system/status');
      return response.data;
    } catch (primaryError) {
      console.error('Primary status endpoint failed:', primaryError);
      
      // Try alternative endpoint
      const altResponse = await api.get('/api/admin/system/status');
      return altResponse.data;
    }
  } catch (error) {
    console.error('Error fetching system status:', error);
    
    // Return default values to keep UI working
    return {
      backend: 'unknown',
      frontend: 'unknown',
      database: 'unknown',
      nginx: 'unknown'
    };
  }
};

/**
 * Get API endpoint status
 * @returns {Promise<Array>} - Promise with API endpoints status
 */
export const getApiEndpointStatus = async () => {
  try {
    const response = await api.get('/admin/api/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching API endpoint status:', error);
    throw error;
  }
};

/**
 * Run a diagnostic test
 * @param {string} testType - The type of diagnostic test to run
 * @returns {Promise<Object>} - Promise with test results
 */
export const runDiagnosticTest = async (testType) => {
  try {
    const response = await api.post('/admin/diagnostics/test', { type: testType });
    return response.data;
  } catch (error) {
    console.error(`Error running ${testType} diagnostic test:`, error);
    throw error;
  }
};

/**
 * Restart a system service
 * @param {string} service - The service to restart
 * @returns {Promise<Object>} - Promise with restart result
 */
export const restartService = async (service) => {
  try {
    const response = await api.post('/admin/system/service', { 
      action: 'restart',
      service
    });
    return response.data;
  } catch (error) {
    console.error(`Error restarting ${service}:`, error);
    throw error;
  }
};

/**
 * Stop a system service
 * @param {string} service - The service to stop
 * @returns {Promise<Object>} - Promise with stop result
 */
export const stopService = async (service) => {
  try {
    const response = await api.post('/admin/system/service', { 
      action: 'stop',
      service
    });
    return response.data;
  } catch (error) {
    console.error(`Error stopping ${service}:`, error);
    throw error;
  }
};

/**
 * Start a system service
 * @param {string} service - The service to start
 * @returns {Promise<Object>} - Promise with start result
 */
export const startService = async (service) => {
  try {
    const response = await api.post('/admin/system/service', { 
      action: 'start',
      service
    });
    return response.data;
  } catch (error) {
    console.error(`Error starting ${service}:`, error);
    throw error;
  }
};

/**
 * Test connection to a URL
 * @param {string} url - The URL to test
 * @returns {Promise<Object>} - Promise with connection test result
 */
export const testConnection = async (url) => {
  try {
    const response = await api.post('/admin/test/connection', { url });
    return response.data;
  } catch (error) {
    console.error(`Error testing connection to ${url}:`, error);
    throw error;
  }
};

/**
 * Fetch system health checks
 * @returns {Promise<Object>} - Promise with health check results
 */
export const getSystemHealth = async () => {
  try {
    const response = await api.get('/admin/health');
    return response.data;
  } catch (error) {
    console.error('Error fetching system health:', error);
    throw error;
  }
};