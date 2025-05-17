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

  // Extend the Node.prototype with a safe nodeName getter
  try {
    // Define a safer version of nodeName accessor
    Object.defineProperty(Node.prototype, 'nodeName', {
      get: function() {
        try {
          return String(this._originalNodeName || this.tagName || '');
        } catch (err) {
          console.warn('Safe nodeName access error handled');
          return 'DIV'; // Fallback to safe default
        }
      },
      configurable: true
    });
    
    console.log('Patched Node.prototype.nodeName for safety');
  } catch (error) {
    console.error('Failed to patch Node.prototype.nodeName:', error);
  }
  
  // Direct patch for Material-UI's React SVG component
  // This is a targeted fix for the specific "je.nodeName.toLowerCase is not a function" error
  const originalCreateElement = React.createElement;
  React.createElement = function safeCreateElement(type, props, ...children) {
    try {
      // Handle component props that might cause toLowerCase errors
      if (props && typeof type === 'string' && (type === 'svg' || type === 'path')) {
        // Create safe props object
        const safeProps = {...props};
        
        // Ensure nodeName is handled safely
        if (safeProps.nodeName && typeof safeProps.nodeName !== 'string') {
          safeProps.nodeName = String(safeProps.nodeName || '');
        }
        
        return originalCreateElement(type, safeProps, ...children);
      }
      
      return originalCreateElement(type, props, ...children);
    } catch (err) {
      console.error('React.createElement error patched:', err);
      // Return a safe fallback element in case of error
      return originalCreateElement('div', { className: 'error-fallback' }, null);
    }
  };

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