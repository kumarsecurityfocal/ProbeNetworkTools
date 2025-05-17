/**
 * Utility functions to safely handle DOM node operations
 * and prevent errors like "Ce.nodeName.toLowerCase is not a function"
 */

/**
 * Safely check if a value is a valid DOM node
 * @param {any} node - The value to check
 * @returns {boolean} - True if the value is a valid DOM node
 */
export const isValidDomNode = (node) => {
  return (
    node !== null &&
    typeof node === 'object' &&
    typeof node.nodeName === 'string'
  );
};

/**
 * Safely get node name in lowercase
 * @param {any} node - DOM node or object
 * @returns {string|null} - Lowercase node name or null if invalid
 */
export const safeNodeName = (node) => {
  if (!isValidDomNode(node)) {
    return null;
  }
  
  try {
    return typeof node.nodeName === 'string' 
      ? node.nodeName.toLowerCase() 
      : null;
  } catch (err) {
    console.error('Error getting node name:', err);
    return null;
  }
};

/**
 * Safely check if a node has a specific tag name
 * @param {any} node - DOM node to check
 * @param {string} tagName - Tag name to compare with (case insensitive)
 * @returns {boolean} - True if node has the specified tag
 */
export const isNodeOfType = (node, tagName) => {
  if (!isValidDomNode(node) || !tagName) {
    return false;
  }
  
  const nodeName = safeNodeName(node);
  return nodeName === tagName.toLowerCase();
};

/**
 * Get safe DOM attributes as an object
 * @param {any} node - DOM node
 * @returns {Object|null} - Node attributes as object or null if invalid
 */
export const getSafeNodeAttributes = (node) => {
  if (!isValidDomNode(node) || !node.attributes) {
    return null;
  }
  
  try {
    const attrs = {};
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      if (attr && attr.name && typeof attr.value !== 'undefined') {
        attrs[attr.name] = attr.value;
      }
    }
    return attrs;
  } catch (err) {
    console.error('Error getting node attributes:', err);
    return null;
  }
};

export default {
  isValidDomNode,
  safeNodeName,
  isNodeOfType,
  getSafeNodeAttributes
};