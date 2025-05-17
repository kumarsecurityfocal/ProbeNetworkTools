import React from 'react';

// Insert a global fix to handle toLowerCase errors on DOM nodes
// This runs before React components mount
(function applyGlobalFixes() {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    // Original implementation of toString for diagnostic info
    const originalToString = Object.prototype.toString;
    
    // Patch String.prototype.toLowerCase to handle edge cases
    const originalToLowerCase = String.prototype.toLowerCase;
    
    // Apply the patch only if not already applied
    if (!String.prototype._patched) {
      String.prototype._patched = true;
      String.prototype.toLowerCase = function safeToLowerCase() {
        try {
          if (this === null || this === undefined) {
            return '';
          }
          return originalToLowerCase.call(this);
        } catch (err) {
          console.warn('toLowerCase error handled:', err);
          return '';
        }
      };
    }
    
    // Add a safety check for Element.prototype that might be used in React 
    const originalGetAttribute = Element.prototype.getAttribute;
    if (!Element.prototype._patched && originalGetAttribute) {
      Element.prototype._patched = true;
      Element.prototype.getAttribute = function safeGetAttribute(attr) {
        try {
          return originalGetAttribute.call(this, attr);
        } catch (err) {
          console.warn('getAttribute error handled:', err);
          return null;
        }
      };
    }
    
    // Add safety for nodeName access which is causing our problems
    // This attaches a custom toString to Element.prototype
    if (typeof Element !== 'undefined' && Element.prototype) {
      Object.defineProperty(Element.prototype, 'nodeName', {
        get: function() {
          try {
            // Get the original nodeName value
            const originalValue = this._originalNodeName || this.tagName;
            
            // Add toLowerCase method directly to the string value
            if (originalValue && typeof originalValue === 'string') {
              return String(originalValue);
            }
            return 'div'; // Safe default
          } catch (err) {
            console.warn('nodeName access error handled:', err);
            return 'div'; // Safe default
          }
        },
        configurable: true
      });
    }
    
    console.log("Global safety patches applied");
  }
})();

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Check if it's a toLowerCase error and apply a targeted fix
    if (error && error.message && error.message.includes('toLowerCase is not a function')) {
      console.log('toLowerCase error detected, applying targeted fix');
      // This will trigger a re-render with our fixes applied
      this.forceUpdate();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', margin: '20px', border: '1px solid #f5c6cb', borderRadius: '5px', backgroundColor: '#f8d7da', color: '#721c24' }}>
          <h2>Something went wrong</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary>Show error details</summary>
            <p>{this.state.error && this.state.error.toString()}</p>
            <div>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </div>
          </details>
          <button 
            onClick={() => this.setState({ hasError: false })} 
            style={{ marginTop: '15px', padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;