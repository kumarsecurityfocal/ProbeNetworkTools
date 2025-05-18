import { useEffect } from 'react';
import { initAuthDebug, logAuthState } from '../utils/authDebug';

/**
 * Hook to enable authentication debugging features in components
 * 
 * @param {Object} authState - The current authentication state
 * @returns {Object} - Debug utilities
 */
export const useAuthDebug = (authState) => {
  // Check if debug mode is enabled
  const isDebugEnabled = 
    process.env.NODE_ENV === 'development' || 
    import.meta.env.VITE_DEV_MODE === 'true' || 
    import.meta.env.VITE_AUTH_BYPASS === 'true';
  
  useEffect(() => {
    if (!isDebugEnabled) return;
    
    // Log auth state when component mounts or auth state changes
    logAuthState(authState);
    
    // Initialize auth debug panel only once
    if (typeof window !== 'undefined' && !window.__authDebugInitialized) {
      window.__authDebugInitialized = true;
      initAuthDebug(() => authState);
    }
  }, [authState, isDebugEnabled]);
  
  // Return debug utilities
  return {
    isDebugEnabled,
    logAuthState: () => logAuthState(authState),
    toggleDebugPanel: () => {
      if (typeof window !== 'undefined' && window.__authDebug) {
        const panel = document.getElementById('auth-debug-panel');
        if (panel) {
          const content = panel.querySelector('div');
          content.style.display = content.style.display === 'none' ? 'block' : 'none';
        }
      }
    }
  };
};

export default useAuthDebug;