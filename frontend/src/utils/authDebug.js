/**
 * Authentication Debugging Utilities
 * 
 * This module provides tools for debugging authentication during development.
 * It should only be imported and used in development environments.
 */

/**
 * Logs the current authentication state to the console
 * @param {Object} authState - The current authentication state
 */
export const logAuthState = (authState) => {
  const { token, user, isAuthenticated, isAdmin } = authState;
  
  console.log('DEBUG AUTH CONTEXT: Current Authentication State', {
    isAuthenticated,
    isAdmin,
    user: user ? {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
    } : null,
    tokenSnippet: token ? `${token.substring(0, 10)}...` : null,
  });
};

/**
 * Creates a debug panel element that displays authentication information
 * @param {Object} authState - The current authentication state
 * @returns {HTMLElement} - The debug panel element
 */
export const createAuthDebugPanel = (authState) => {
  const { token, user, isAuthenticated, isAdmin } = authState;
  
  // Only create the debug panel in development mode
  if (process.env.NODE_ENV !== 'development' && !import.meta.env.VITE_DEV_MODE) {
    return null;
  }
  
  // Create the debug panel element
  const debugPanel = document.createElement('div');
  debugPanel.style.position = 'fixed';
  debugPanel.style.bottom = '10px';
  debugPanel.style.right = '10px';
  debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  debugPanel.style.color = '#00ff00';
  debugPanel.style.padding = '10px';
  debugPanel.style.borderRadius = '5px';
  debugPanel.style.fontFamily = 'monospace';
  debugPanel.style.fontSize = '12px';
  debugPanel.style.zIndex = '9999';
  debugPanel.style.maxWidth = '300px';
  debugPanel.style.maxHeight = '200px';
  debugPanel.style.overflow = 'auto';
  
  // Create the panel content
  const content = document.createElement('div');
  content.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">Auth Debug</div>
    <div>Auth: ${isAuthenticated ? '✅' : '❌'}</div>
    <div>Admin: ${isAdmin ? '✅' : '❌'}</div>
    <div>User: ${user ? user.username : 'Not logged in'}</div>
    <div>Email: ${user ? user.email : 'N/A'}</div>
    <div>Token: ${token ? `${token.substring(0, 10)}...` : 'None'}</div>
  `;
  
  // Add a button to toggle the panel
  const toggleButton = document.createElement('button');
  toggleButton.innerText = 'Toggle';
  toggleButton.style.backgroundColor = '#333';
  toggleButton.style.color = 'white';
  toggleButton.style.border = 'none';
  toggleButton.style.padding = '3px 8px';
  toggleButton.style.borderRadius = '3px';
  toggleButton.style.marginTop = '5px';
  toggleButton.style.cursor = 'pointer';
  
  toggleButton.addEventListener('click', () => {
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
  });
  
  debugPanel.appendChild(content);
  debugPanel.appendChild(toggleButton);
  
  return debugPanel;
};

/**
 * Adds the auth debug panel to the DOM
 * @param {Object} authState - The current authentication state
 */
export const mountAuthDebugPanel = (authState) => {
  // Only mount in development mode
  if (process.env.NODE_ENV !== 'development' && !import.meta.env.VITE_DEV_MODE) {
    return;
  }
  
  const existingPanel = document.getElementById('auth-debug-panel');
  if (existingPanel) {
    document.body.removeChild(existingPanel);
  }
  
  const panel = createAuthDebugPanel(authState);
  if (panel) {
    panel.id = 'auth-debug-panel';
    document.body.appendChild(panel);
  }
};

/**
 * Initialize authentication debugging features
 * @param {Function} getAuthState - Function that returns the current auth state
 */
export const initAuthDebug = (getAuthState) => {
  // Only initialize in development mode
  if (process.env.NODE_ENV !== 'development' && !import.meta.env.VITE_DEV_MODE) {
    return;
  }
  
  console.log('DEBUG AUTH: Initializing authentication debugging tools');
  
  // Add global access to auth state for debugging in console
  window.__authDebug = {
    getAuthState,
    logAuthState: () => logAuthState(getAuthState()),
  };
  
  // Mount the debug panel
  mountAuthDebugPanel(getAuthState());
  
  // Update the panel every 5 seconds
  setInterval(() => {
    mountAuthDebugPanel(getAuthState());
  }, 5000);
  
  console.log('DEBUG AUTH: Authentication debugging initialized. Access window.__authDebug in console');
};