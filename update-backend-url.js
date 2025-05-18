/**
 * Backend URL Connection Fix
 * 
 * This script fixes the connectivity issues between the Express server
 * and the FastAPI backend by updating the hostname from 'localhost' to '0.0.0.0'
 * in all HTTP request configurations.
 */

const fs = require('fs');
const path = require('path');

// File to update
const serverFile = path.join(__dirname, 'server.js');

console.log('Reading server.js file...');
let content = fs.readFileSync(serverFile, 'utf8');

// Replace all instances of 'localhost' in HTTP request options
const originalContent = content;
content = content.replace(/hostname: ['"]localhost['"],/g, 'hostname: \'0.0.0.0\',');

// Check if changes were made
if (content === originalContent) {
  console.log('No changes needed. All backend connections already configured correctly.');
} else {
  // Count replacements
  const replacedCount = (originalContent.match(/hostname: ['"]localhost['"],/g) || []).length;
  
  // Backup the original file
  const backupFile = path.join(__dirname, 'server.js.bak');
  fs.writeFileSync(backupFile, originalContent);
  console.log(`Created backup at ${backupFile}`);
  
  // Write the updated content
  fs.writeFileSync(serverFile, content);
  console.log(`Updated ${replacedCount} backend connection configurations in server.js`);
  console.log('Backend connectivity fix applied successfully.');
}

console.log('Script completed. Please restart the server for changes to take effect.');