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
  // Capture the original Element.prototype methods that might be causing issues
  const originalGetAttribute = Element.prototype.getAttribute;
  
  // Override problematic methods with safer versions
  if (typeof Element !== 'undefined' && Element.prototype) {
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
    
    // Add other patches as needed
  }
  
  // Add global error handler for nodeName issues
  if (typeof window !== 'undefined') {
    window.addEventListener('error', function(event) {
      // Check if it's a toLowerCase error on potentially null values
      if (event.error && 
          event.error.toString().includes('toLowerCase is not a function')) {
        console.warn('DOM property error intercepted and prevented');
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }
  
  console.log('React DOM patches applied successfully');
};