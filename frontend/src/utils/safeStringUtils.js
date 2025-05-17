/**
 * Safe string utility functions to prevent errors with null/undefined values
 */

/**
 * Safely converts a string to lowercase, handling null/undefined values
 * @param {any} value - The value to convert to lowercase
 * @returns {string} - The lowercase string or empty string if input is invalid
 */
export const safeToLowerCase = (value) => {
  // Check if the value exists and has a toLowerCase method
  if (value && typeof value.toLowerCase === 'function') {
    return value.toLowerCase();
  }
  // Return empty string for null, undefined, or non-string values
  return '';
};

/**
 * Safely gets a string representation, handling null/undefined values
 * @param {any} value - The value to convert to string
 * @returns {string} - The string value or empty string if input is invalid
 */
export const safeString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};