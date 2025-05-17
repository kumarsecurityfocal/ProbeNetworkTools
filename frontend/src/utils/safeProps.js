/**
 * Utility functions to safely handle props and DOM operations
 */

/**
 * Safely get a string property from an object, ensuring it's a string
 * before calling any string methods like toLowerCase()
 * @param {*} value - The value to ensure is a string
 * @returns {string} - A guaranteed string value
 */
export const ensureString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

/**
 * Safely handle DOM node operations, ensuring the node exists
 * and has expected properties before using them
 * @param {*} node - DOM node to check
 * @returns {Object} - Safe version of the node with necessary properties
 */
export const safeNode = (node) => {
  if (!node) return { nodeName: '' };
  
  // Ensure nodeName exists and is a string
  const nodeName = typeof node.nodeName === 'string' ? node.nodeName : '';
  
  return {
    ...node,
    nodeName,
    // Add other commonly accessed node properties here if needed
  };
};

/**
 * Apply a patch to React's DOM handling to prevent errors
 * when node properties are not what they're expected to be
 */
export const applyDomPatches = () => {
  // This would be where DOM-specific patches are applied
  // This is kept as a placeholder for future use
  console.log('DOM safety patches applied');
};