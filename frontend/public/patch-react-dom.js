/**
 * React DOM patch to fix the "(e.nodeName || "").toLowerCase is not a function" error
 * This script should be loaded before React bundle
 */
(function() {
  // Save original String.prototype.toLowerCase
  const originalToLowerCase = String.prototype.toLowerCase;

  // Create a fail-safe version that won't throw on non-string values
  String.prototype.toLowerCase = function() {
    try {
      if (typeof this !== 'string' && !(this instanceof String)) {
        console.warn('toLowerCase called on non-string value:', this);
        return '';
      }
      return originalToLowerCase.call(this);
    } catch (e) {
      console.warn('Protected toLowerCase from error:', e);
      return '';
    }
  };

  // Patch Node.prototype.nodeName to always return a string
  try {
    const originalNodeNameDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeName');
    if (originalNodeNameDescriptor && originalNodeNameDescriptor.get) {
      Object.defineProperty(Node.prototype, 'nodeName', {
        get: function() {
          try {
            const value = originalNodeNameDescriptor.get.call(this);
            return value === null || value === undefined ? '' : String(value);
          } catch (e) {
            console.warn('Protected nodeName access from error:', e);
            return '';
          }
        },
        configurable: true
      });
    }
  } catch (e) {
    console.warn('Could not patch Node.prototype.nodeName:', e);
  }

  // Global error handler specifically for this issue
  window.addEventListener('error', function(event) {
    if (event.error && 
        (event.error.toString().includes('toLowerCase is not a function') ||
         event.error.toString().includes('nodeName'))) {
      console.warn('DOM property error intercepted and prevented');
      event.preventDefault();
      return true; // Prevent error from propagating
    }
  }, true);

  console.log('React DOM patch applied successfully.');

  // Patch to fix React DevTools integration
  if (window.parent !== window) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.parent.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  }
})();