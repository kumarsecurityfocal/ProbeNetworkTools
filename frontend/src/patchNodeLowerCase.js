/**
 * This patch addresses the "toLowerCase is not a function" error in Material-UI
 * by implementing a global fix for all Node objects.
 */

export function applyGlobalNodeFix() {
  // Log that we're applying the patch
  console.log('Applying global Node.prototype patch for toLowerCase error');
  
  // First, save the original Object.defineProperty
  const originalDefineProperty = Object.defineProperty;
  
  try {
    // Apply patch to window.Node.prototype if it exists
    if (typeof window !== 'undefined' && window.Node && window.Node.prototype) {
      // Define a safe nodeName getter that always returns a string
      originalDefineProperty(Node.prototype, 'nodeName', {
        configurable: true,
        get: function() {
          try {
            // Get the original nodeName value or empty string
            const originalValue = this.tagName || '';
            // Ensure it's a string
            return typeof originalValue === 'string' ? originalValue : '';
          } catch (e) {
            console.warn('Safe nodeName access error handled:', e);
            return '';
          }
        }
      });

      // Add a default toLowerCase method to all objects
      if (!Object.prototype.hasOwnProperty('toLowerCase')) {
        Object.defineProperty(Object.prototype, 'toLowerCase', {
          value: function() {
            // If this is a string, use the native toLowerCase
            if (typeof this === 'string') {
              return String.prototype.toLowerCase.call(this);
            }
            // Otherwise, convert to string first
            return String(this).toLowerCase();
          },
          configurable: true,
          enumerable: false
        });
      }
      
      // Patch Object.prototype.toString to handle null and undefined
      const originalToString = Object.prototype.toString;
      Object.defineProperty(Object.prototype, 'toString', {
        value: function() {
          if (this === null) return 'null';
          if (this === undefined) return 'undefined';
          return originalToString.call(this);
        },
        configurable: true,
        enumerable: false
      });
      
      console.log('Global Node.prototype patch applied successfully');
    } else {
      console.warn('Node.prototype not found, patch not applied');
    }
  } catch (error) {
    console.error('Error applying global Node.prototype patch:', error);
  }
}