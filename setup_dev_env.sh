#!/bin/bash
# Master setup script for ProbeOps development environment
# This script sets up a clean development environment with auth bypass

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}ProbeOps Development Environment Setup${NC}"
echo -e "${BLUE}==============================================${NC}"

echo -e "\n${YELLOW}This script will:${NC}"
echo -e "1. Remove all legacy auth/token overrides from server.js"
echo -e "2. Enable auth bypass in the backend FastAPI server"
echo -e "3. Set up a clean proxy server without authentication logic"
echo -e "4. Configure workflows for the direct frontend and backend servers"

read -p "Continue with setup? (y/n): " confirm
if [[ "$confirm" != "y" ]]; then
  echo "Setup cancelled."
  exit 0
fi

# Create backup directory
BACKUP_DIR="./dev_setup_backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Step 1: Backup important files
echo -e "\n${YELLOW}Step 1: Creating backups of important files...${NC}"

# Backup server.js
if [ -f server.js ]; then
  cp server.js "$BACKUP_DIR/server.js.backup-$TIMESTAMP"
  echo "✅ Backed up server.js"
fi

# Backup auth.py
if [ -f backend/app/auth.py ]; then
  cp backend/app/auth.py "$BACKUP_DIR/auth.py.backup-$TIMESTAMP"
  echo "✅ Backed up auth.py"
fi

# Step 2: Apply auth bypass to backend
echo -e "\n${YELLOW}Step 2: Applying auth bypass to backend...${NC}"
cp backend/app/auth_bypass.py backend/app/auth.py
echo "✅ Auth bypass applied to backend"

# Step 3: Replace server.js with clean proxy version
echo -e "\n${YELLOW}Step 3: Replacing server.js with clean proxy version...${NC}"
cp server.clean.js server.js
echo "✅ Server.js replaced with clean proxy version"

# Step 4: Build frontend
echo -e "\n${YELLOW}Step 4: Building frontend...${NC}"
cd frontend
npm run build
cd ..
echo "✅ Frontend built successfully"

# Print setup complete message
echo -e "\n${GREEN}Development environment setup complete!${NC}"
echo -e "You now have a clean development environment with auth bypass."
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Restart the Backend API workflow"
echo -e "2. Restart the Server workflow" 
echo -e "3. Run the Direct Frontend workflow"
echo -e "\n${YELLOW}To revert these changes:${NC}"
echo -e "1. cp $BACKUP_DIR/auth.py.backup-$TIMESTAMP backend/app/auth.py"
echo -e "2. cp $BACKUP_DIR/server.js.backup-$TIMESTAMP server.js"
echo -e "3. Restart the workflows"
echo -e "\n${BLUE}Happy development!${NC}"