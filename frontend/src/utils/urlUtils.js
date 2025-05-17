/**
 * URL utility functions to fix common issues with path formatting
 */

/**
 * Normalizes URL paths by removing duplicate slashes and ensuring proper format
 * @param {string} url - The URL to normalize
 * @returns {string} - Normalized URL
 */
export function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  // Remove duplicate forward slashes except after protocol
  let normalized = url.replace(/([^:]\/)\/+/g, '$1');
  
  // Handle relative URLs
  if (!normalized.startsWith('http') && !normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  
  return normalized;
}

/**
 * Creates a safe link href value that avoids navigation errors
 * @param {string} to - The destination URL
 * @returns {string} - Safe URL for navigation
 */
export function createSafeHref(to) {
  if (!to || typeof to !== 'string') {
    return '#';
  }
  
  return normalizeUrl(to);
}