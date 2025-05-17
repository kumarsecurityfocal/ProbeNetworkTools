// Token management DOM fix and layout reordering
(function() {
  // Only run on admin page
  if (!window.location.pathname.includes('/admin')) {
    return;
  }
  
  console.log('Applying token management fixes...');
  
  // Wait for DOM to be ready
  function checkForTokenTab() {
    // Look for the token management tab
    const tokenTab = document.querySelector('button[role="tab"]:nth-child(4)');
    
    if (tokenTab) {
      console.log('Found token management tab, adding click handler');
      
      // Add click handler to the tab
      tokenTab.addEventListener('click', fixTokenManagementLayout);
      
      // If we're already on the token tab, apply fixes immediately
      setTimeout(checkIfTokenTabActive, 500);
    } else {
      // Try again in a bit
      setTimeout(checkForTokenTab, 500);
    }
  }
  
  // Check if token tab is active
  function checkIfTokenTabActive() {
    const activeTab = document.querySelector('button[role="tab"][aria-selected="true"]');
    if (activeTab && activeTab === document.querySelector('button[role="tab"]:nth-child(4)')) {
      console.log('Token tab is active, applying fixes now');
      fixTokenManagementLayout();
    }
  }
  
  // Fix token management layout
  function fixTokenManagementLayout() {
    console.log('Fixing token management layout');
    
    // Find the token management container
    const tokenTabPanel = document.querySelector('[role="tabpanel"][hidden="false"]');
    if (!tokenTabPanel) {
      console.log('Token tab panel not found, will try again later');
      setTimeout(fixTokenManagementLayout, 500);
      return;
    }
    
    try {
      // Find the container boxes
      const boxes = tokenTabPanel.querySelectorAll('.MuiBox-root');
      if (boxes.length < 2) {
        console.log('Token management boxes not found yet, will try again');
        setTimeout(fixTokenManagementLayout, 500);
        return;
      }
      
      // Find the token generator form
      const generatorForm = tokenTabPanel.querySelector('form');
      if (!generatorForm) {
        console.log('Token generator form not found yet, will try again');
        setTimeout(fixTokenManagementLayout, 500);
        return;
      }
      
      // Find the token list table
      const tokenTable = tokenTabPanel.querySelector('table');
      if (!tokenTable) {
        console.log('Token table not found yet, will try again');
        setTimeout(fixTokenManagementLayout, 500);
        return;
      }
      
      // Get the first Paper component (should contain token generation)
      const papers = tokenTabPanel.querySelectorAll('.MuiPaper-root');
      if (papers.length < 2) {
        console.log('Paper components not found yet, will try again');
        setTimeout(fixTokenManagementLayout, 500);
        return;
      }
      
      // Get the parent containers
      const generatorPaper = generatorForm.closest('.MuiPaper-root');
      const tokenListPaper = tokenTable.closest('.MuiPaper-root');
      
      if (!generatorPaper || !tokenListPaper) {
        console.log('Paper containers not properly identified, will try again');
        setTimeout(fixTokenManagementLayout, 500);
        return;
      }
      
      // Now we know which is which, let's reorder them
      const parentBox = generatorPaper.parentNode;
      
      // Check if they're already in the right order
      if (parentBox.firstChild === generatorPaper) {
        console.log('Token management layout already fixed!');
        
        // Still apply the DOM protection to the token table
        protectTokenTableDOM();
        return;
      }
      
      // Remove both papers from the DOM temporarily
      parentBox.removeChild(generatorPaper);
      parentBox.removeChild(tokenListPaper);
      
      // Add them back in the correct order
      parentBox.appendChild(generatorPaper);
      parentBox.appendChild(tokenListPaper);
      
      console.log('Token management layout successfully reordered!');
      
      // Now apply DOM protection to the token table
      protectTokenTableDOM();
    } catch (error) {
      console.error('Error fixing token management layout:', error);
    }
  }
  
  // Apply DOM protection to the token table
  function protectTokenTableDOM() {
    try {
      console.log('Applying DOM protection to token table');
      
      // Find all table rows
      const rows = document.querySelectorAll('table tr');
      
      // Apply protection to each row
      rows.forEach(row => {
        // Use a safer approach for getting cell data
        const cells = row.querySelectorAll('td');
        
        cells.forEach(cell => {
          // Add a data attribute with the content for safer access
          if (cell.textContent) {
            cell.setAttribute('data-content', cell.textContent);
          }
          
          // Override the className property to avoid DOM errors
          Object.defineProperty(cell, 'className', {
            get: function() {
              return this.getAttribute('class') || '';
            },
            set: function(value) {
              if (value) this.setAttribute('class', value);
            }
          });
          
          // Create a safer version of the node properties
          if (cell.nodeName) {
            cell.safeNodeName = cell.nodeName;
          }
        });
      });
      
      // Replace problematic DOM methods
      const tableBody = document.querySelector('table tbody');
      if (tableBody) {
        // Create a safer version of appendChild
        const originalAppendChild = tableBody.appendChild;
        tableBody.appendChild = function(node) {
          try {
            return originalAppendChild.call(this, node);
          } catch (e) {
            console.warn('Protected appendChild failed:', e);
            return node;
          }
        };
        
        // Create a safer version of removeChild
        const originalRemoveChild = tableBody.removeChild;
        tableBody.removeChild = function(node) {
          try {
            return originalRemoveChild.call(this, node);
          } catch (e) {
            console.warn('Protected removeChild failed:', e);
            return node;
          }
        };
        
        console.log('DOM protection applied to token table');
      }
    } catch (error) {
      console.error('Error applying DOM protection:', error);
    }
  }
  
  // Initialize the fix
  checkForTokenTab();
})();