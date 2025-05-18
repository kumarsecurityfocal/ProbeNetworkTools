#!/bin/bash
# Script to enable auth bypass in the backend

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "ProbeOps Auth Bypass Setup"
echo "=========================="

# Create backup directory
BACKUP_DIR="./auth_backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Backup current auth.py
echo -e "${YELLOW}Creating backup of current auth.py...${NC}"
cp backend/app/auth.py "$BACKUP_DIR/auth.py.backup-$TIMESTAMP"
echo "✅ Created backup: $BACKUP_DIR/auth.py.backup-$TIMESTAMP"

# Copy auth_bypass.py to auth.py
echo -e "${YELLOW}Replacing auth.py with auth_bypass.py...${NC}"
cp backend/app/auth_bypass.py backend/app/auth.py
echo "✅ Auth bypass enabled in backend"

# Replace server.js with clean version
echo -e "${YELLOW}Creating backup of current server.js...${NC}"
cp server.js "$BACKUP_DIR/server.js.backup-$TIMESTAMP"
echo "✅ Created backup: $BACKUP_DIR/server.js.backup-$TIMESTAMP"

echo -e "${YELLOW}Replacing server.js with clean proxy version...${NC}"
cp server.clean.js server.js
echo "✅ Server.js replaced with clean version"

echo -e "\n${GREEN}Auth bypass setup complete!${NC}"
echo "Backend will now bypass authentication checks and use admin account"
echo "Server.js now uses a clean proxy implementation"
echo ""
echo "To revert these changes:"
echo "1. cp $BACKUP_DIR/auth.py.backup-$TIMESTAMP backend/app/auth.py"
echo "2. cp $BACKUP_DIR/server.js.backup-$TIMESTAMP server.js"
echo ""
echo "Next steps:"
echo "1. Restart the Backend API: restart_workflow for 'Backend API'"
echo "2. Restart the Server: restart_workflow for 'Server'"
echo "3. Test authentication bypass"