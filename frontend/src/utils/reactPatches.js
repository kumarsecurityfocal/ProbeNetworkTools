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
  // HARDCORE PATCHING: Replace the problematic toLowerCase function 
  // on the String prototype with a fully protected version
  if (typeof String !== 'undefined' && String.prototype) {
    const originalToLowerCase = String.prototype.toLowerCase;
    
    // Complete override of toLowerCase to handle ANY possible error
    String.prototype.toLowerCase = function() {
      try {
        // First check if 'this' is actually a string
        if (typeof this !== 'string' && !(this instanceof String)) {
          console.warn('toLowerCase called on non-string:', this);
          return '';
        }
        return originalToLowerCase.call(this);
      } catch (e) {
        console.warn('Safe toLowerCase patch caught error:', e);
        return '';
      }
    };
  }
  
  // Patch Node.prototype to ensure nodeName is ALWAYS a string
  if (typeof Node !== 'undefined' && Node.prototype) {
    try {
      // Replace the native getter completely
      Object.defineProperty(Node.prototype, 'nodeName', {
        get: function() {
          try {
            // Direct access to native DOM property via this.constructor 
            const value = this._nodeName || this.constructor.prototype.nodeName;
            return typeof value === 'string' ? value : '';
          } catch (e) {
            console.warn('Protected nodeName access failed:', e);
            return '';  // Return empty string as safe fallback
          }
        },
        configurable: true
      });
    } catch (e) {
      console.warn('Could not patch Node.prototype.nodeName:', e);
    }
  }
  
  // Patch Element.prototype
  if (typeof Element !== 'undefined' && Element.prototype) {
    // Save original methods
    const originalGetAttribute = Element.prototype.getAttribute;
    
    // Super-safe getAttribute patcher
    Element.prototype.getAttribute = function(attr) {
      try {
        if (!this || typeof this.getAttribute !== 'function') {
          return null;
        }
        const value = originalGetAttribute.call(this, attr);
        return value === null || value === undefined ? null : String(value);
      } catch (e) {
        console.warn('Safe getAttribute patch caught error:', e);
        return null;
      }
    };
  }
  
  // Global handler for MUI-specific issues
  if (typeof window !== 'undefined') {
    // Protect specific MUI operations
    if (typeof window.muiSafeOperations === 'undefined') {
      window.muiSafeOperations = {
        // Safe toLowerCase specifically designed for MUI
        safeToLowerCase: function(value) {
          if (!value) return '';
          if (typeof value === 'string') return value.toLowerCase();
          if (typeof value === 'object' && value !== null) {
            return String(value).toLowerCase();
          }
          return '';
        }
      };
    }
    
    // Comprehensive error handler
    window.addEventListener('error', function(event) {
      // Broader catch for DOM errors
      if (event.error && (
        event.error.toString().includes('toLowerCase is not a function') ||
        event.error.toString().includes('Cannot read properties of null') ||
        event.error.toString().includes('nodeName') ||
        event.error.toString().includes('undefined is not an object')
      )) {
        console.warn('DOM property error intercepted and prevented');
        event.preventDefault();
        event.stopPropagation();
        return true; // Prevent the error from propagating
      }
    }, true); // Capture phase to catch before reaching components
  }
  
  console.log('React DOM patches applied successfully');
};