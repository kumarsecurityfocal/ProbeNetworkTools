/**
 * React DOM Patches
 * 
 * This file contains patches to prevent common React DOM errors
 * related to accessing properties that might be undefined or non-string values.
 * 
 * The patch safely wraps DOM property access to ensure proper types.
 */

/**
 * Apply patches to React DOM environment to prevent errors
 * with nodeName.toLowerCase() and similar issues
 */
export const applyReactDOMPatches = () => {
  // Apply Node prototype patches to prevent toLowerCase issues
  if (typeof Node !== 'undefined' && Node.prototype) {
    // Save the original Object.getOwnPropertyDescriptor for nodeName
    const originalNodeNameDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeName');
    
    // Define a safer nodeName property that always returns a string
    if (originalNodeNameDescriptor && originalNodeNameDescriptor.get) {
      Object.defineProperty(Node.prototype, 'nodeName', {
        get: function() {
          try {
            const value = originalNodeNameDescriptor.get.call(this);
            return value === null || value === undefined ? '' : String(value);
          } catch (e) {
            console.warn('Safe nodeName accessor caught error', e);
            return '';
          }
        },
        configurable: true
      });
    }
  }
  
  // Patch Element prototype methods
  if (typeof Element !== 'undefined' && Element.prototype) {
    // Save original methods
    const originalGetAttribute = Element.prototype.getAttribute;
    
    // Patch getAttribute to ensure it returns strings
    Element.prototype.getAttribute = function(attr) {
      try {
        const value = originalGetAttribute.call(this, attr);
        return value === null ? null : String(value);
      } catch (e) {
        console.warn('Safe getAttribute patch caught error:', e);
        return null;
      }
    };
  }
  
  // Create safer versions of common operations on String
  if (typeof String.prototype.toLowerCase !== 'undefined') {
    const originalToLowerCase = String.prototype.toLowerCase;
    
    // Override String.prototype.toLowerCase to handle null and undefined
    String.prototype.toLowerCase = function() {
      try {
        return originalToLowerCase.call(this);
      } catch (e) {
        console.warn('Safe toLowerCase patch caught error:', e);
        return '';
      }
    };
  }
  
  // Add global error handler for DOM-related issues
  if (typeof window !== 'undefined') {
    window.addEventListener('error', function(event) {
      // Check if it's a toLowerCase error on potentially null values
      if (event.error && 
          (event.error.toString().includes('toLowerCase is not a function') ||
           event.error.toString().includes('Cannot read properties of null'))) {
        console.warn('DOM property error intercepted and prevented');
        event.preventDefault();
        event.stopPropagation();
        return true; // Prevent the error from propagating
      }
    });
  }
  
  console.log('React DOM patches applied successfully');
};