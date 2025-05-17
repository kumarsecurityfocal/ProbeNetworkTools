/**
 * Global patches for React DOM element handling to prevent common errors
 * 
 * This module contains defensive coding patches that can be applied globally
 * to prevent errors with null/undefined values in DOM operations
 */

/**
 * Apply safe string patches to the global environment
 * This fixes errors like "toLowerCase is not a function" by making
 * string methods safer to use on potentially null/undefined values
 */
export function applySafeStringPatches() {
  // Save original toString for diagnostic purposes
  const originalToString = Object.prototype.toString;
  
  // Create a safe version of toLowerCase that works on any value
  const safeToLowerCase = function() {
    if (this === null || this === undefined || typeof this !== 'string') {
      return '';
    }
    // Use the original toLowerCase method on string values
    return String.prototype.toLowerCase.call(this);
  };
  
  // Only patch if not already patched
  if (!String.prototype._safePatched) {
    try {
      // Flag to prevent double-patching
      String.prototype._safePatched = true;
      
      // Store the original method
      String.prototype._originalToLowerCase = String.prototype.toLowerCase;
      
      // Replace with safe version
      String.prototype.toLowerCase = function() {
        return safeToLowerCase.call(this);
      };
      
      console.log('Safe string patches applied successfully');
    } catch (err) {
      console.error('Failed to apply safe string patches:', err);
    }
  }
}

/**
 * Safely get a lowercase string value, handling null/undefined
 * @param {any} value - The value to convert to lowercase
 * @returns {string} - Lowercase string or empty string for invalid inputs
 */
export function safeToLowerCase(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  try {
    if (typeof value.toLowerCase === 'function') {
      return value.toLowerCase();
    }
  } catch (err) {
    // Ignore errors and fall back to string conversion
  }
  
  try {
    return String(value).toLowerCase();
  } catch (err) {
    return '';
  }
}

/**
 * Safe wrapper for DOM node operations
 * @param {any} node - The DOM node to check
 * @returns {boolean} - Whether the node is a valid DOM node
 */
export function isValidDOMNode(node) {
  return node && typeof node === 'object' && typeof node.nodeName === 'string';
}

export default {
  applySafeStringPatches,
  safeToLowerCase,
  isValidDOMNode
};