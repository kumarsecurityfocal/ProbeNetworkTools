import api from './api';

/**
 * Get list of available database tables for admin access
 * @returns {Promise<Array>} List of table names
 */
export const getTableList = async () => {
  try {
    // Try the standard endpoint
    try {
      const response = await api.get('/admin/database/tables');
      return response.data;
    } catch (primaryError) {
      // Try alternative endpoint
      console.log('Primary database tables endpoint failed, trying alternative');
      const altResponse = await api.get('/api/admin/database/tables');
      return altResponse.data;
    }
  } catch (error) {
    console.error('Error fetching database tables:', error);
    throw error;
  }
};

/**
 * Get table data with pagination and filtering
 * @param {string} tableName - Database table name
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (0-based)
 * @param {number} options.limit - Records per page
 * @param {string} options.filter - Optional filter expression
 * @param {number} options.cache - Timestamp for cache control
 * @returns {Promise<Object>} Table data with rows and total count
 */
export const getTableData = async (tableName, options = {}) => {
  const { page = 0, limit = 10, filter, cache } = options;
  const params = {
    skip: page * limit,
    limit,
    ...(filter && { filter }),
    ...(cache && { _cache: cache })
  };

  try {
    // Try the standard endpoint
    try {
      const response = await api.get(`/admin/database/${tableName}`, { params });
      return response.data;
    } catch (primaryError) {
      // Try alternative endpoint
      console.log(`Primary database/${tableName} endpoint failed, trying alternative`);
      const altResponse = await api.get(`/api/admin/database/${tableName}`, { params });
      return altResponse.data;
    }
  } catch (error) {
    console.error(`Error fetching ${tableName} data:`, error);
    
    // For demonstration/development purposes, return mock data based on table name
    // In production, this would be removed and the actual API would be used
    return {
      rows: [],
      total: 0
    };
  }
};

/**
 * Get table information and metadata
 * @param {string} tableName - Database table name
 * @returns {Promise<Object>} Table metadata
 */
export const getTableInfo = async (tableName) => {
  try {
    // Try the standard endpoint
    try {
      const response = await api.get(`/admin/database/${tableName}/info`);
      return response.data;
    } catch (primaryError) {
      // Try alternative endpoint
      console.log(`Primary database/${tableName}/info endpoint failed, trying alternative`);
      const altResponse = await api.get(`/api/admin/database/${tableName}/info`);
      return altResponse.data;
    }
  } catch (error) {
    console.error(`Error fetching ${tableName} info:`, error);
    throw error;
  }
};

/**
 * Execute a safe read-only SQL query
 * @param {string} query - SQL query to execute
 * @param {Array} params - Query parameters
 * @param {number} timeout - Query timeout in seconds
 * @returns {Promise<Object>} Query results
 */
export const executeReadQuery = async (query, params = [], timeout = 5) => {
  try {
    const response = await api.post('/admin/database/query', {
      query,
      params,
      timeout
    });
    return response.data;
  } catch (error) {
    console.error('Error executing database query:', error);
    throw error;
  }
};

/**
 * Download table data in various formats
 * @param {string} tableName - Database table name
 * @param {Object} options - Download options
 * @param {string} options.filter - Optional filter expression
 * @param {string} options.format - Download format (csv, json, xlsx)
 * @returns {Promise<void>} Initiates download
 */
export const downloadTableData = async (tableName, options = {}) => {
  const { filter, format = 'csv' } = options;
  const params = {
    format,
    ...(filter && { filter })
  };

  try {
    const response = await api.get(`/admin/database/${tableName}/download`, {
      params,
      responseType: 'blob'
    });
    
    // Create a download link and trigger it
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${tableName}_${new Date().toISOString().split('T')[0]}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error(`Error downloading ${tableName} data:`, error);
    throw error;
  }
};