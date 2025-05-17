/**
 * DOM Node Type Safety Utilities
 * 
 * This module provides safety utilities to handle potential issues with
 * DOM node operations, particularly with the toLowerCase method.
 */

/**
 * Safely gets a lowercase value from a DOM node's nodeName property
 * @param {Node} node - The DOM node
 * @returns {string} The lowercase nodeName or a safe fallback
 */
export const getNodeNameSafely = (node) => {
  if (!node) return '';
  
  try {
    // First check if nodeName exists and is a string
    if (node.nodeName && typeof node.nodeName === 'string') {
      return node.nodeName.toLowerCase();
    }
    
    // If nodeName exists but is not a string (shouldn't happen, but just in case)
    if (node.nodeName && node.nodeName.toString) {
      return node.nodeName.toString().toLowerCase();
    }
    
    // If we can't get the nodeName, return a safe default
    return '';
  } catch (error) {
    console.error('Error getting lowercase nodeName:', error);
    return '';
  }
};

/**
 * Applies a global patch to prevent toLowerCase errors on Node.prototype
 * This is used as a global fix for React/MUI components that might access 
 * nodeName.toLowerCase directly
 */
export const applyGlobalNodeNamePatch = () => {
  try {
    console.log("Applying global safe patches for toLowerCase error prevention");
    
    // Only apply the patch if it hasn't been applied yet
    if (typeof Node !== 'undefined' && Node.prototype) {
      // Create a safe version of toLowerCase for the nodeName
      const originalNodeNameGetter = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeName')?.get;
      
      if (originalNodeNameGetter) {
        Object.defineProperty(Node.prototype, 'nodeName', {
          get: function() {
            const name = originalNodeNameGetter.call(this);
            
            // If name is not a string or doesn't have toLowerCase, patch it
            if (name && typeof name !== 'string' && !name.toLowerCase) {
              Object.defineProperty(name, 'toLowerCase', {
                value: function() { return String(this).toLowerCase(); },
                writable: true,
                configurable: true
              });
            }
            
            return name;
          },
          configurable: true
        });
        
        console.log("Patched Node.prototype.nodeName for safety");
      }
    }
  } catch (error) {
    console.error('Failed to apply Node.prototype patch:', error);
  }
};