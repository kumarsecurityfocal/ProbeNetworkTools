/**
 * This file can be pasted into your browser's developer console 
 * when logged in to ProbeOps to diagnose authentication issues
 */

(function() {
  console.clear();
  console.log('========== PROBEOPS AUTHENTICATION DIAGNOSIS ==========');
  
  // Check if we're on the right site
  if (!window.location.hostname.includes('probeops.com')) {
    console.warn('Not running on probeops.com - diagnostics may not be accurate');
  }
  
  // Check for auth token in local storage
  const token = localStorage.getItem('authToken');
  console.log('Auth token exists:', !!token);
  if (token) {
    console.log('Token starts with:', token.substring(0, 15) + '...');
    
    // Parse JWT token
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('Token payload:', payload);
        console.log('Token expiration:', new Date(payload.exp * 1000));
        console.log('Token is expired:', payload.exp * 1000 < Date.now());
      }
    } catch(e) {
      console.error('Error parsing token:', e);
    }
  }
  
  // Find React components in the page
  console.log('\nLooking for React components...');
  const reactInstances = [];
  
  // Try to find the AuthContext provider
  let authContextComponent = null;
  let authContextState = null;
  
  // Function to recursively search for components
  function findReactComponents(elem) {
    const keys = Object.keys(elem);
    
    // Look for React fiber nodes
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
        let fiber = elem[key];
        
        // Walk up the fiber tree
        while (fiber) {
          if (fiber.memoizedProps && fiber.memoizedState) {
            // Check if this might be the AuthContext provider
            if (fiber.memoizedProps.value && 
                typeof fiber.memoizedProps.value === 'object' && 
                'isAuthenticated' in fiber.memoizedProps.value) {
              authContextComponent = fiber;
              authContextState = fiber.memoizedProps.value;
              break;
            }
          }
          fiber = fiber.return;
        }
      }
    }
    
    // Recursively search children
    if (elem.childNodes && elem.childNodes.length) {
      for (let i = 0; i < elem.childNodes.length; i++) {
        findReactComponents(elem.childNodes[i]);
      }
    }
  }
  
  try {
    findReactComponents(document.body);
    
    if (authContextState) {
      console.log('AuthContext found!');
      console.log('isAuthenticated:', authContextState.isAuthenticated);
      console.log('isAdmin:', authContextState.isAdmin);
      console.log('user:', authContextState.user);
    } else {
      console.log('AuthContext not found. The app might not be fully initialized.');
    }
  } catch(e) {
    console.error('Error searching for React components:', e);
  }
  
  // Check if the AdminPanel component is rendered
  console.log('\nChecking for AdminPanel component...');
  const adminPanelEl = document.querySelector('[data-testid="admin-panel"]');
  if (adminPanelEl) {
    console.log('AdminPanel component found in the DOM');
  } else {
    console.log('AdminPanel component NOT found in the DOM');
    
    // Check if there's a reference to AdminPanel in the code
    const adminPanelImportRegex = /import\s+.*AdminPanel.*from/;
    const adminPanelUsageRegex = /<AdminPanel/;
    
    let adminPanelReferenceFound = false;
    
    // Check for script tags with AdminPanel references
    document.querySelectorAll('script').forEach(script => {
      if (script.textContent) {
        if (adminPanelImportRegex.test(script.textContent) || 
            adminPanelUsageRegex.test(script.textContent)) {
          adminPanelReferenceFound = true;
        }
      }
    });
    
    console.log('AdminPanel references found in code:', adminPanelReferenceFound);
  }
  
  console.log('\nTrying a direct API call to /users/me...');
  
  // Make a direct API call to test /users/me
  fetch('/users/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    console.log('Status:', response.status);
    return response.text();
  })
  .then(text => {
    try {
      // Try to parse as JSON
      const data = JSON.parse(text);
      console.log('Response is valid JSON:', data);
      console.log('is_admin flag present:', 'is_admin' in data);
      console.log('is_admin value:', data.is_admin);
    } catch (e) {
      // If not JSON, show as text
      console.log('Response is not JSON:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      
      // Check if it's HTML (indicating routing issue)
      if (text.includes('<!DOCTYPE html>')) {
        console.error('CRITICAL: API call returning HTML instead of JSON - routing issue detected');
      }
    }
  })
  .catch(error => {
    console.error('Error making API call:', error);
  });
  
  console.log('=======================================================');
})();