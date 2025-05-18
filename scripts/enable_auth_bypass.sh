#!/bin/bash
# Script to enable authentication bypass in the FastAPI backend

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "ProbeOps Authentication Bypass Script"
echo "===================================="

# Creating backup directory
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="./auth_backups"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Creating backups of authentication files...${NC}"

# Backup original auth.py
cp backend/app/auth.py "$BACKUP_DIR/auth.py.backup-$TIMESTAMP"
echo "✅ Backed up auth.py to $BACKUP_DIR/auth.py.backup-$TIMESTAMP"

# Replace auth.py with auth_bypass.py
echo -e "${YELLOW}Applying authentication bypass...${NC}"
cp backend/app/auth_bypass.py backend/app/auth.py
echo "✅ Replaced auth.py with auth_bypass.py"

# Success message and next steps
echo -e "\n${GREEN}Authentication bypass successfully applied!${NC}"
echo -e "The backend will now use the admin account for all authenticated requests."
echo -e "To revert changes, run: cp $BACKUP_DIR/auth.py.backup-$TIMESTAMP backend/app/auth.py"
echo -e "\nNext steps:"
echo -e "1. Restart the backend API server (in the Backend API workflow)"
echo -e "2. Try accessing protected endpoints directly"