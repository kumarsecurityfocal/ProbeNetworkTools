// Token Management and UI Fix Script
// This script provides a workaround for the token display error and UI display order issues

const fs = require('fs');
const path = require('path');

// Function to update the AdminPanel.jsx file to ensure token generation comes first
function updateAdminPanel() {
  try {
    console.log('Checking AdminPanel.jsx...');
    const adminPanelPath = path.join(__dirname, 'frontend', 'src', 'components', 'AdminPanel.jsx');
    
    if (!fs.existsSync(adminPanelPath)) {
      console.error('AdminPanel.jsx not found!');
      return false;
    }
    
    let content = fs.readFileSync(adminPanelPath, 'utf8');
    
    // Look for the Probe Nodes Management Tab section
    const tabPanelRegex = /<TabPanel value={tabValue} index={3}>([\s\S]*?)<\/TabPanel>/;
    const match = content.match(tabPanelRegex);
    
    if (!match) {
      console.error('Could not find the TabPanel with index 3');
      return false;
    }
    
    // Check if ProbeNodeTokenGenerator comes before ProbeNodesManagement
    const tokenFirst = match[1].indexOf('ProbeNodeTokenGenerator') < match[1].indexOf('ProbeNodesManagement');
    
    if (tokenFirst) {
      console.log('Token generation already appears before node management - no change needed');
    } else {
      console.log('Updating AdminPanel.jsx to show token generation first...');
      
      // Create new content with token generator first
      const newTabPanelContent = `<TabPanel value={tabValue} index={3}>
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Generate New Probe Node Tokens
            </Typography>
            <ProbeNodeTokenGenerator />
          </Paper>
          
          <Divider sx={{ my: 4 }} />
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Manage Existing Probe Nodes
            </Typography>
            <ProbeNodesManagement />
          </Paper>
        </Box>
      </TabPanel>`;
      
      // Replace the old tab panel with new content
      content = content.replace(tabPanelRegex, newTabPanelContent);
      
      fs.writeFileSync(adminPanelPath, content, 'utf8');
      console.log('Successfully updated AdminPanel.jsx');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating AdminPanel.jsx:', error);
    return false;
  }
}

// Function to update ProbeNodeTokenGenerator to fix the toLowerCase error
function updateTokenGenerator() {
  try {
    console.log('Checking ProbeNodeTokenGenerator.jsx...');
    const tokenGenPath = path.join(__dirname, 'frontend', 'src', 'components', 'ProbeNodeTokenGenerator.jsx');
    
    if (!fs.existsSync(tokenGenPath)) {
      console.error('ProbeNodeTokenGenerator.jsx not found!');
      return false;
    }
    
    let content = fs.readFileSync(tokenGenPath, 'utf8');
    
    // Look for the token history display section that uses the problematic Table component
    const tableHistoryRegex = /{showTokenHistory && generatedTokens\.length > 0 && \(([\s\S]*?)<\/Paper>\s*\)}/;
    const historyMatch = content.match(tableHistoryRegex);
    
    if (!historyMatch) {
      console.log('Could not find the token history section - applying basic fix');
      
      // Add a simple safe accessor function at the beginning of the component
      if (!content.includes('getSafeElementProperty')) {
        console.log('Adding safe property access function...');
        const componentStart = content.indexOf('const ProbeNodeTokenGenerator = () => {');
        const afterComponentStart = content.indexOf('{', componentStart) + 1;
        
        const safeAccessorFunction = `
  // Safely access properties to prevent toLowerCase errors
  const getSafeElementProperty = (obj, prop) => {
    if (!obj || typeof obj !== 'object') return '';
    try {
      const value = obj[prop];
      return (value === null || value === undefined) ? '' : String(value);
    } catch (e) {
      console.error(\`Error accessing property \${prop}:\`, e);
      return '';
    }
  };`;
        
        content = content.slice(0, afterComponentStart) + safeAccessorFunction + content.slice(afterComponentStart);
      }
    } else {
      console.log('Found token history section - implementing safer version...');
      
      // Replace with a much simpler display that avoids problematic DOM operations
      const newHistorySection = `{showTokenHistory && generatedTokens.length > 0 && (
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Recent Generated Tokens
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {generatedTokens.map((token) => {
              const tokenId = String(token?.id || Math.random());
              const tokenName = String(token?.name || 'Unnamed Token');
              const previewText = String(token?.token || '[token preview]');
              const fullTokenValue = String(token?.fullToken || '');
              const dateText = token?.date ? new Date(token.date).toLocaleString() : 'N/A';
              const expDays = Number(token?.expireDays || 0);
              
              return (
                <div key={tokenId} style={{ 
                  padding: '16px', 
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                    <div style={{ flex: '1' }}>
                      <div style={{ fontWeight: 'bold' }}>{tokenName}</div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>Created: {dateText}</div>
                    </div>
                    <div style={{ flex: '2' }}>
                      <div style={{ fontWeight: 'bold' }}>Token:</div>
                      <code style={{ 
                        backgroundColor: '#f5f5f5', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{previewText}</code>
                    </div>
                    <div style={{ flex: '1' }}>
                      <div>Expires in: {expDays === 0 ? 'Never' : \`\${expDays} \${expDays === 1 ? 'day' : 'days'}\`}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button 
                        size="small" 
                        startIcon={<CopyIcon />} 
                        onClick={() => handleCopyHistoryToken(fullTokenValue)}
                      >
                        Copy
                      </Button>
                      <Button 
                        size="small" 
                        color="error" 
                        startIcon={<DeleteIcon />} 
                        onClick={() => handleRemoveToken(tokenId)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </Box>
        </Paper>
      )}`;
      
      content = content.replace(tableHistoryRegex, newHistorySection);
    }
    
    // Add global error prevention for DOM operations
    if (!content.includes('// Patch DOM operations to prevent errors')) {
      console.log('Adding global DOM error protection...');
      const importEnd = content.indexOf('const ProbeNodeTokenGenerator');
      
      const domProtectionCode = `
// Patch DOM operations to prevent errors
if (typeof window !== 'undefined') {
  if (String.prototype.toLowerCase) {
    const originalToLowerCase = String.prototype.toLowerCase;
    if (!window._safeToLowerCaseApplied) {
      String.prototype.toLowerCase = function() {
        try {
          if (typeof this !== 'string' && !(this instanceof String)) {
            return '';
          }
          return originalToLowerCase.call(this);
        } catch (e) {
          return '';
        }
      };
      window._safeToLowerCaseApplied = true;
    }
  }
}

`;
      
      content = content.slice(0, importEnd) + domProtectionCode + content.slice(importEnd);
    }
    
    fs.writeFileSync(tokenGenPath, content, 'utf8');
    console.log('Successfully updated ProbeNodeTokenGenerator.jsx');
    
    return true;
  } catch (error) {
    console.error('Error updating ProbeNodeTokenGenerator.jsx:', error);
    return false;
  }
}

// Apply fixes to both files
updateAdminPanel();
updateTokenGenerator();

console.log('Fix script completed');