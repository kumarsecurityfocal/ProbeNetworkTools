/**
 * Utility functions to safely handle DOM node operations
 * and prevent errors like "Ce.nodeName.toLowerCase is not a function"
 */

/**
 * Apply global patch to safely handle toLowerCase on node names
 * This helps prevent the "Ce.nodeName.toLowerCase is not a function" error
 */
export function applyGlobalNodeNamePatch() {
  console.log("Applying global safe patches for toLowerCase error prevention");
  
  // Only run in browser environment
  if (typeof window !== 'undefined' && typeof Node !== 'undefined') {
    try {
      // Add a failsafe for Node.prototype.nodeName
      const originalNodeNameDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeName');
      
      if (originalNodeNameDescriptor && originalNodeNameDescriptor.get) {
        // Create a safer version that ensures nodeName is always a string
        Object.defineProperty(Node.prototype, 'nodeName', {
          get: function() {
            try {
              const name = originalNodeNameDescriptor.get.call(this);
              return typeof name === 'string' ? name : String(name);
            } catch (err) {
              console.warn('Error accessing nodeName:', err);
              return '';
            }
          },
          configurable: true
        });
        
        console.log("Patched Node.prototype.nodeName for safety");
      }
    } catch (err) {
      console.error("Failed to apply global DOM safety patches:", err);
    }
  }
}

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