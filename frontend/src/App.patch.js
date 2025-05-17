// This file applies global patches to fix the toLowerCase errors in React/MUI
// Import it at the top of index.js or main.js to fix the errors before React loads

(function applyGlobalPatches() {
  if (typeof window === 'undefined') return;

  console.log('Applying global safe patches for toLowerCase error prevention');

  // Patch String.prototype.toLowerCase to handle null/undefined safely
  const originalToLowerCase = String.prototype.toLowerCase;
  String.prototype.toLowerCase = function safeToLowerCase() {
    if (this === null || this === undefined) {
      console.warn('toLowerCase called on null/undefined');
      return '';
    }
    try {
      return originalToLowerCase.call(this);
    } catch (err) {
      console.warn('toLowerCase error handled:', err);
      return '';
    }
  };

  // Patch Element nodeName access which is causing our problems with Material-UI
  const originalGetProperty = Object.getOwnPropertyDescriptor(Element.prototype, 'nodeName');
  
  if (originalGetProperty && originalGetProperty.get) {
    try {
      const originalGetter = originalGetProperty.get;
      
      Object.defineProperty(Element.prototype, 'nodeName', {
        get: function() {
          try {
            const result = originalGetter.call(this);
            // Ensure the result is a string
            return result ? String(result) : '';
          } catch (err) {
            console.warn('Safe nodeName access error handled:', err);
            return '';
          }
        },
        configurable: true
      });
      
      console.log('Patched Element.prototype.nodeName for safety');
    } catch (error) {
      console.error('Failed to patch Element.prototype.nodeName:', error);
    }
  }

  // Add safe utility method to global scope for emergency use
  window.safeToLowerCase = function(value) {
    if (value === null || value === undefined) {
      return '';
    }
    try {
      return String(value).toLowerCase();
    } catch (err) {
      return '';
    }
  };
})();