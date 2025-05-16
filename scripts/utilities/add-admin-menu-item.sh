#!/bin/bash
# Script to add admin panel link to user menu in Navbar component

set -e
echo "Adding Admin Panel Link to User Menu"
echo "===================================="

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Path to Navbar component
NAVBAR_PATH="/home/ubuntu/ProbeNetworkTools/frontend/src/components/Navbar.jsx"

# Check if the file exists
if [ ! -f "$NAVBAR_PATH" ]; then
  echo -e "${RED}Error: Navbar component not found at $NAVBAR_PATH${NC}"
  exit 1
fi

# Create backup
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/home/ubuntu/debug-backups"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Creating backup directory at $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
fi

echo "Creating backup of Navbar component..."
cp "$NAVBAR_PATH" "$BACKUP_DIR/Navbar.jsx.backup-$TIMESTAMP"
echo -e "${GREEN}Backup created at $BACKUP_DIR/Navbar.jsx.backup-$TIMESTAMP${NC}"

# Check if the user dropdown menu already has an admin panel link
ADMIN_MENU_EXISTS=$(grep -c "Admin Panel" "$NAVBAR_PATH" || true)

if [ "$ADMIN_MENU_EXISTS" -gt 0 ]; then
  echo -e "${YELLOW}Admin panel link might already exist in the user menu.${NC}"
  echo "Checking if it's conditional based on admin status..."
  
  # Find the user menu section (starts around line 400)
  USER_MENU_START=$(grep -n "Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #DADCE0' }}" "$NAVBAR_PATH" | cut -d':' -f1)
  
  if [ -n "$USER_MENU_START" ]; then
    echo "Found user menu section at line $USER_MENU_START"
    
    # Add an admin panel link to the user menu with conditional rendering
    PROFILE_MENU_ITEM=$(grep -n "component={RouterLink}" "$NAVBAR_PATH" | grep "to=\"/profile\"" | head -1 | cut -d':' -f1)
    
    if [ -n "$PROFILE_MENU_ITEM" ]; then
      echo "Found profile menu item at line $PROFILE_MENU_ITEM"
      
      # Create a temporary file for the modified content
      TMP_FILE=$(mktemp)
      
      # Insert admin panel menu item after profile menu item
      ADMIN_MENU_ITEM='                  {user?.is_admin && (
                    <MenuItem 
                      component={RouterLink} 
                      to="/admin" 
                      onClick={handleMenuClose}
                      sx={{ 
                        py: 1.5, 
                        "\\&:hover": { bgcolor: "rgba(219, 68, 55, 0.04)" } 
                      }}
                    >
                      <ListItemIcon>
                        <AdminIcon fontSize="small" sx={{ color: "#DB4437" }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Admin Panel" 
                        primaryTypographyProps={{ fontSize: "0.95rem" }}
                      />
                    </MenuItem>
                  )}'
      
      # Find the line after the profile menu item's closing tag
      NEXT_MENU_LINE=$((PROFILE_MENU_ITEM + 16))
      
      # Insert the admin menu item
      awk -v line="$NEXT_MENU_LINE" -v text="$ADMIN_MENU_ITEM" 'NR==line{print text}1' "$NAVBAR_PATH" > "$TMP_FILE"
      
      # Update the original file
      cp "$TMP_FILE" "$NAVBAR_PATH"
      rm "$TMP_FILE"
      
      echo -e "${GREEN}Added admin panel link to user menu.${NC}"
    else
      echo -e "${RED}Could not find profile menu item.${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Could not find user menu section.${NC}"
    exit 1
  fi
else
  echo "Admin panel link not found in user menu. Adding it now..."
  
  # Find the user menu section (starts around line 400)
  USER_MENU_START=$(grep -n "Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #DADCE0' }}" "$NAVBAR_PATH" | cut -d':' -f1)
  
  if [ -n "$USER_MENU_START" ]; then
    echo "Found user menu section at line $USER_MENU_START"
    
    # Add an admin panel link to the user menu with conditional rendering
    PROFILE_MENU_ITEM=$(grep -n "component={RouterLink}" "$NAVBAR_PATH" | grep "to=\"/profile\"" | head -1 | cut -d':' -f1)
    
    if [ -n "$PROFILE_MENU_ITEM" ]; then
      echo "Found profile menu item at line $PROFILE_MENU_ITEM"
      
      # Create a temporary file for the modified content
      TMP_FILE=$(mktemp)
      
      # Insert admin panel menu item after profile menu item
      ADMIN_MENU_ITEM='                  {user?.is_admin && (
                    <MenuItem 
                      component={RouterLink} 
                      to="/admin" 
                      onClick={handleMenuClose}
                      sx={{ 
                        py: 1.5, 
                        "\\&:hover": { bgcolor: "rgba(219, 68, 55, 0.04)" } 
                      }}
                    >
                      <ListItemIcon>
                        <AdminIcon fontSize="small" sx={{ color: "#DB4437" }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Admin Panel" 
                        primaryTypographyProps={{ fontSize: "0.95rem" }}
                      />
                    </MenuItem>
                  )}'
      
      # Find the line after the profile menu item's closing tag
      NEXT_MENU_LINE=$((PROFILE_MENU_ITEM + 16))
      
      # Insert the admin menu item
      awk -v line="$NEXT_MENU_LINE" -v text="$ADMIN_MENU_ITEM" 'NR==line{print text}1' "$NAVBAR_PATH" > "$TMP_FILE"
      
      # Update the original file
      cp "$TMP_FILE" "$NAVBAR_PATH"
      rm "$TMP_FILE"
      
      echo -e "${GREEN}Added admin panel link to user menu.${NC}"
    else
      echo -e "${RED}Could not find profile menu item.${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Could not find user menu section.${NC}"
    exit 1
  fi
fi

# Now let's fix the navItems code to make sure the admin items are always shown for admins
NAV_ITEMS_LINE=$(grep -n "const navItems = user?.is_admin" "$NAVBAR_PATH" | cut -d':' -f1)

if [ -n "$NAV_ITEMS_LINE" ]; then
  echo "Found navItems conditional at line $NAV_ITEMS_LINE"
  
  # Make sure the line is checking for admin status correctly
  sed -i "$NAV_ITEMS_LINE s/const navItems = user?.is_admin/const navItems = user \&\& user.is_admin/g" "$NAVBAR_PATH"
  
  echo -e "${GREEN}Updated navItems conditional for more robust admin check.${NC}"
fi

# Find the user state assignment in case we need to add console logging
AUTH_HOOK_LINE=$(grep -n "const { isAuthenticated, user, logout } = useAuth();" "$NAVBAR_PATH" | cut -d':' -f1)

if [ -n "$AUTH_HOOK_LINE" ]; then
  echo "Found auth hook at line $AUTH_HOOK_LINE"
  
  # Add debugging code after the auth hook
  DEBUG_LINE=$((AUTH_HOOK_LINE + 1))
  
  # Create a temporary file for the modified content
  TMP_FILE=$(mktemp)
  
  # Insert debugging code
  DEBUG_CODE='  
  // Debugging admin status
  useEffect(() => {
    if (user) {
      console.log("DEBUG NAV: User object in Navbar:", user);
      console.log("DEBUG NAV: Admin status:", user.is_admin);
    }
  }, [user]);'
  
  # Insert the debugging code
  awk -v line="$DEBUG_LINE" -v text="$DEBUG_CODE" 'NR==line{print text}1' "$NAVBAR_PATH" > "$TMP_FILE"
  
  # Update the original file
  cp "$TMP_FILE" "$NAVBAR_PATH"
  rm "$TMP_FILE"
  
  echo -e "${GREEN}Added debugging code to track admin status in Navbar.${NC}"
  
  # Make sure we import useEffect
  IMPORT_LINE=$(grep -n "import React" "$NAVBAR_PATH" | cut -d':' -f1)
  sed -i "$IMPORT_LINE s/import React, { useState/import React, { useState, useEffect/g" "$NAVBAR_PATH"
fi

echo -e "${GREEN}Modified Navbar component successfully.${NC}"
echo "Now rebuild the frontend and deploy the changes:"
echo "1. cd /home/ubuntu/ProbeNetworkTools/frontend"
echo "2. npm run build"
echo "3. cp -r dist/* /home/ubuntu/ProbeNetworkTools/public/"