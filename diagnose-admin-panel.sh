#!/bin/bash
# Script to add debugging to the frontend AuthContext component

echo "ProbeOps Frontend Authentication Debugging Script"
echo "================================================="

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're running as root (required to modify files)
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}This script should be run as root. Attempting to use sudo for necessary commands.${NC}"
fi

FRONTEND_DIR="/home/ubuntu/ProbeNetworkTools/frontend"
AUTH_CONTEXT_PATH="$FRONTEND_DIR/src/context/AuthContext.jsx"
API_SERVICE_PATH="$FRONTEND_DIR/src/services/api.js"

# Create backups
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/home/ubuntu/debug-backups"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Creating backup directory at $BACKUP_DIR"
  sudo mkdir -p "$BACKUP_DIR"
fi

# Backup AuthContext
if [ -f "$AUTH_CONTEXT_PATH" ]; then
  echo "Backing up AuthContext.jsx..."
  sudo cp "$AUTH_CONTEXT_PATH" "$BACKUP_DIR/AuthContext.jsx.backup-$TIMESTAMP"
  echo -e "${GREEN}Backup created at $BACKUP_DIR/AuthContext.jsx.backup-$TIMESTAMP${NC}"
else
  echo -e "${RED}Error: AuthContext.jsx not found at $AUTH_CONTEXT_PATH${NC}"
  exit 1
fi

# Backup API service
if [ -f "$API_SERVICE_PATH" ]; then
  echo "Backing up api.js..."
  sudo cp "$API_SERVICE_PATH" "$BACKUP_DIR/api.js.backup-$TIMESTAMP"
  echo -e "${GREEN}Backup created at $BACKUP_DIR/api.js.backup-$TIMESTAMP${NC}"
else
  echo -e "${RED}Error: api.js not found at $API_SERVICE_PATH${NC}"
  exit 1
fi

# Add debug logs to AuthContext
echo "Adding debug logging to AuthContext.jsx..."
sudo sed -i 's/const login = async (credentials) => {/const login = async (credentials) => {\n    console.log("DEBUG AUTH CONTEXT: Login attempt for user", credentials.username);/g' "$AUTH_CONTEXT_PATH"
sudo sed -i 's/setUser(userData);/console.log("DEBUG AUTH CONTEXT: User data received:", userData);\n    setUser(userData);/g' "$AUTH_CONTEXT_PATH"
sudo sed -i 's/setToken(data.access_token);/console.log("DEBUG AUTH CONTEXT: Token received:", data.access_token.substring(0, 10) + "...");\n    setToken(data.access_token);/g' "$AUTH_CONTEXT_PATH"
sudo sed -i 's/fetchUserProfile();/console.log("DEBUG AUTH CONTEXT: Fetching user profile...");\n    fetchUserProfile();/g' "$AUTH_CONTEXT_PATH"
sudo sed -i 's/const isAdmin = user && user.is_admin;/const isAdmin = user && user.is_admin;\n  console.log("DEBUG AUTH CONTEXT: User admin status:", isAdmin, "User object:", user);/g' "$AUTH_CONTEXT_PATH"

# Add debug logs to API service
echo "Adding debug logging to api.js..."
sudo sed -i 's/export const getUserProfile = async () => {/export const getUserProfile = async () => {\n  console.log("DEBUG API: Fetching user profile...");/g' "$API_SERVICE_PATH"
sudo sed -i 's/return response.data;/console.log("DEBUG API: User profile response:", response.data);\n  return response.data;/g' "$API_SERVICE_PATH"

# Rebuild the frontend
echo "Rebuilding frontend with debug logs..."
cd "$FRONTEND_DIR"
npm run build

# Copy the built files to the NGINX directory
NGINX_PUBLIC_DIR="/home/ubuntu/ProbeNetworkTools/public"
echo "Copying built files to NGINX public directory..."
cp -r dist/* "$NGINX_PUBLIC_DIR/"

echo -e "${GREEN}Debug logging has been added to the frontend.${NC}"
echo "Please log in to the application and check the browser console for detailed logs."
echo "After reviewing logs, you can restore the original files with:"
echo "sudo cp $BACKUP_DIR/AuthContext.jsx.backup-$TIMESTAMP $AUTH_CONTEXT_PATH"
echo "sudo cp $BACKUP_DIR/api.js.backup-$TIMESTAMP $API_SERVICE_PATH"
echo "Then rebuild the frontend with: cd $FRONTEND_DIR && npm run build"