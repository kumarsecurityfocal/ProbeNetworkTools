/**
 * This script adds an Admin Panel link to the sidebar navigation
 * for users with admin privileges (admin@probeops.com)
 * 
 * To use:
 * 1. Copy this file to your production server
 * 2. Run it in the frontend directory: node add-admin-link.js
 * 3. Rebuild the frontend: npm run build
 * 4. Copy the built files: cp -r dist/* ../public/
 */

const fs = require('fs');
const path = require('path');

// Path to the Navbar component
const navbarPath = path.join(__dirname, 'src', 'components', 'Navbar.jsx');

// Check if the file exists
if (!fs.existsSync(navbarPath)) {
  console.error(`Error: Navbar component not found at ${navbarPath}`);
  process.exit(1);
}

// Read the file content
let content = fs.readFileSync(navbarPath, 'utf8');

// First, make sure we import AdminIcon
if (!content.includes('AdminPanelSettings as AdminIcon')) {
  console.log('Adding AdminIcon import...');
  const importRegex = /import {[^}]+} from '@mui\/icons-material';/;
  if (importRegex.test(content)) {
    content = content.replace(
      importRegex,
      (match) => {
        if (match.includes('AdminPanelSettings as AdminIcon')) {
          return match;
        }
        return match.replace(
          /} from '@mui\/icons-material';/,
          ',\n  AdminPanelSettings as AdminIcon\n} from \'@mui/icons-material\';'
        );
      }
    );
  }
}

// Check if admin nav items are already defined
const adminNavItemsRegex = /const adminNavItems = \[[^\]]+\];/;
if (!adminNavItemsRegex.test(content)) {
  console.log('Adding adminNavItems array...');
  // Add admin nav items after base nav items
  const baseNavItemsRegex = /const baseNavItems = \[[^\]]+\];/;
  if (baseNavItemsRegex.test(content)) {
    content = content.replace(
      baseNavItemsRegex,
      (match) => `${match}\n  
  // Admin-only navigation items
  const adminNavItems = [
    { name: 'Admin Panel', path: '/admin', icon: <AdminIcon fontSize="small" /> },
  ];`
    );
  }
}

// Check if navItems combines base and admin items
const navItemsRegex = /const navItems = user.*\? \[\.\.\.baseNavItems, \.\.\.adminNavItems\] : baseNavItems;/;
if (!navItemsRegex.test(content)) {
  console.log('Updating navItems definition...');
  // Find any navItems definition
  const anyNavItemsRegex = /const navItems = [^;]+;/;
  if (anyNavItemsRegex.test(content)) {
    content = content.replace(
      anyNavItemsRegex,
      `const navItems = user && user.is_admin
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;`
    );
  } else {
    // Add navItems definition after adminNavItems
    const adminNavItemsEndRegex = /const adminNavItems = \[[^\]]+\];/;
    if (adminNavItemsEndRegex.test(content)) {
      content = content.replace(
        adminNavItemsEndRegex,
        (match) => `${match}\n  
  // Combine navigation items based on user role
  const navItems = user && user.is_admin
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;`
      );
    }
  }
}

// Add debug logging to track admin status
if (!content.includes('DEBUG NAV:')) {
  console.log('Adding debug logging for admin status...');
  // Find useEffect import
  if (!content.includes('useEffect')) {
    const reactImportRegex = /import React, { useState } from 'react';/;
    if (reactImportRegex.test(content)) {
      content = content.replace(
        reactImportRegex,
        'import React, { useState, useEffect } from \'react\';'
      );
    }
  }
  
  // Add debug effect after auth hook
  const authHookRegex = /const { isAuthenticated, user, logout } = useAuth\(\);/;
  if (authHookRegex.test(content)) {
    content = content.replace(
      authHookRegex,
      (match) => `${match}
  
  // Debug admin status
  useEffect(() => {
    if (user) {
      console.log("DEBUG NAV: User object in Navbar:", user);
      console.log("DEBUG NAV: Admin status:", user.is_admin);
    }
  }, [user]);`
    );
  }
}

// Check if user dropdown menu has admin panel option
if (!content.includes('MenuItem') || !content.includes('to="/admin"')) {
  console.log('Adding Admin Panel link to user dropdown menu...');
  // Find profile menu item
  const profileMenuItemRegex = /<MenuItem\s+component={RouterLink}\s+to="\/profile"\s+[^>]+>[^<]+<\/MenuItem>/s;
  const profileMenuItem = content.match(profileMenuItemRegex);
  
  if (profileMenuItem) {
    // Add admin panel menu item after profile menu item
    const adminMenuItem = `
                  {user?.is_admin && (
                    <MenuItem 
                      component={RouterLink} 
                      to="/admin" 
                      onClick={handleMenuClose}
                      sx={{ 
                        py: 1.5, 
                        '&:hover': { bgcolor: 'rgba(219, 68, 55, 0.04)' } 
                      }}
                    >
                      <ListItemIcon>
                        <AdminIcon fontSize="small" sx={{ color: "#DB4437" }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Admin Panel" 
                        primaryTypographyProps={{ fontSize: '0.95rem' }}
                      />
                    </MenuItem>
                  )}`;
    
    content = content.replace(
      profileMenuItemRegex,
      (match) => `${match}${adminMenuItem}`
    );
  }
}

// Write the modified content back to the file
fs.writeFileSync(navbarPath, content, 'utf8');
console.log('Successfully added Admin Panel link to Navbar component');
console.log('Please rebuild the frontend with: npm run build');