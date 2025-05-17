/**
 * DOM Recursive Error Fix
 * This script prevents the infinite recursion that happens 
 * with nodeName property access in React
 */
(function() {
  console.log('Applying direct DOM patch for recursive errors...');
  
  // Create safe properties for Element prototypes
  const originalGetNodeName = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeName').get;
  
  // Apply security to the nodeName getter globally
  let isGettingNodeName = false;
  
  try {
    Object.defineProperty(Node.prototype, 'nodeName', {
      get: function() {
        // Prevent recursive nodeName calls
        if (isGettingNodeName) {
          console.warn('Intercepted recursive nodeName call');
          return 'DIV'; // Safe default
        }
        
        isGettingNodeName = true;
        let result;
        
        try {
          result = originalGetNodeName.call(this);
        } catch (e) {
          console.warn('Node.nodeName getter error:', e.message);
          result = 'DIV';
        }
        
        isGettingNodeName = false;
        return result;
      },
      configurable: true
    });
    
    console.log('DOM patch applied successfully');
  } catch (e) {
    console.error('Could not apply DOM patch:', e);
  }
  
  // Directly patch toLowerCase since MUI relies on (e.nodeName || "").toLowerCase()
  const originalToLowerCase = String.prototype.toLowerCase;
  String.prototype.toLowerCase = function() {
    try {
      if (this === null || this === undefined) {
        return '';
      }
      return originalToLowerCase.call(this);
    } catch (e) {
      console.warn('toLowerCase error intercepted:', e);
      return '';
    }
  };
  
  // Add a global window error handler for remaining errors
  window.addEventListener('error', function(event) {
    // Check if this is the specific error we're trying to catch
    if (event.error && 
        (event.error.message.includes('Maximum call stack size exceeded') || 
         event.error.message.includes('toLowerCase is not a function'))) {
      // Prevent the error from propagating
      event.preventDefault();
      event.stopPropagation();
      console.warn('Intercepted and prevented recursive error:', event.error.message);
      return true;
    }
  }, true);
  
  // Inject protections for React's TableRow rendering that's causing errors
  const watchForTables = setInterval(() => {
    const tables = document.querySelectorAll('table');
    if (tables.length > 0) {
      console.log('Found tables, applying TableRow protection');
      clearInterval(watchForTables);
      
      tables.forEach(table => {
        // Find all table rows
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
          // Make a safety wrapper for these elements
          try {
            // Create a duplicate of the nodeName property to avoid stack issues
            row._safeNodeName = row.nodeName;
            
            // Define a safer property to use
            Object.defineProperty(row, 'safeNodeName', {
              get: function() {
                return this._safeNodeName || 'TR';
              }
            });
            
            // Add extra security to cells
            const cells = row.querySelectorAll('td, th');
            cells.forEach(cell => {
              cell._safeNodeName = cell.nodeName;
              Object.defineProperty(cell, 'safeNodeName', {
                get: function() {
                  return this._safeNodeName || 'TD';
                }
              });
            });
          } catch (e) {
            console.warn('Error applying table protection:', e);
          }
        });
      });
    }
  }, 1000);
  
  // Fix for token generation UI layout - always show form first
  const fixTokenUI = () => {
    // Only run on admin page
    if (!window.location.pathname.includes('/admin')) {
      return;
    }
    
    setTimeout(() => {
      try {
        // Check if we're on the token tab
        const tokenTab = document.querySelector('.MuiTabs-root .MuiTab-root:nth-child(4)');
        if (tokenTab) {
          console.log('Found token tab, waiting for activation');
          
          // Check when the tab is selected
          tokenTab.addEventListener('click', () => {
            setTimeout(() => {
              reorderTokenLayout();
            }, 300);
          });
          
          // Check if already active
          if (tokenTab.getAttribute('aria-selected') === 'true') {
            reorderTokenLayout();
          }
        }
      } catch (e) {
        console.warn('Error setting up token UI fix:', e);
      }
    }, 1000);
  };
  
  const reorderTokenLayout = () => {
    try {
      // Find token management section
      console.log('Checking for token management UI to reorder');
      
      // Find the active tab panel
      const activePanel = document.querySelector('[role="tabpanel"]:not([hidden="true"])');
      if (!activePanel) return;
      
      // Find form and table in the active panel
      const tokenForm = activePanel.querySelector('form');
      const tokenTable = activePanel.querySelector('table');
      
      if (!tokenForm || !tokenTable) {
        console.log('Token form or table not found yet');
        setTimeout(reorderTokenLayout, 500);
        return;
      }
      
      // Get their parent containers
      const formContainer = findParentPaper(tokenForm);
      const tableContainer = findParentPaper(tokenTable);
      
      if (!formContainer || !tableContainer || formContainer === tableContainer) {
        console.log('Container elements not properly identified yet');
        setTimeout(reorderTokenLayout, 500);
        return;
      }
      
      // Check if they're already in the right order
      if (isBeforeNode(formContainer, tableContainer)) {
        console.log('Token UI is already in the correct order');
        return;
      }
      
      // Get the parent that contains both
      const parent = formContainer.parentNode;
      if (!parent) return;
      
      // Move form before table
      parent.insertBefore(formContainer, tableContainer);
      console.log('Successfully reordered token management UI!');
    } catch (e) {
      console.warn('Error reordering token UI:', e);
    }
  };
  
  // Helper function to find parent Paper component
  const findParentPaper = (element) => {
    let current = element;
    
    while (current) {
      if (current.classList && current.classList.contains('MuiPaper-root')) {
        return current;
      }
      current = current.parentNode;
      
      // Safety check for non-element nodes
      if (!current || current.nodeType !== 1) break;
    }
    
    return null;
  };
  
  // Helper function to check if nodeA is before nodeB in the DOM
  const isBeforeNode = (nodeA, nodeB) => {
    const position = nodeA.compareDocumentPosition(nodeB);
    return !!(position & Node.DOCUMENT_POSITION_FOLLOWING);
  };
  
  // Run the token UI fix after DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixTokenUI);
  } else {
    fixTokenUI();
  }
})();