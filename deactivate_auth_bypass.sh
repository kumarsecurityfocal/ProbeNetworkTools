#!/bin/bash
# ProbeOps Auth Bypass Deactivation Script
# This script restores the original authentication system

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}ProbeOps Development Environment Deactivation${NC}"
echo -e "${BLUE}==================================================${NC}"

# Check for backup directory
BACKUP_DIR="./auth_backups"
if [ ! -d "$BACKUP_DIR" ]; then
  echo -e "${RED}Error: Backup directory not found at $BACKUP_DIR${NC}"
  echo -e "Cannot restore original files without backups."
  exit 1
fi

# Find the most recent auth.py backup
AUTH_BACKUP=$(ls -t "$BACKUP_DIR"/auth.py.backup-* 2>/dev/null | head -1)
if [ -z "$AUTH_BACKUP" ]; then
  echo -e "${RED}Error: No auth.py backup found in $BACKUP_DIR${NC}"
  echo -e "Cannot restore original auth.py without backup."
  exit 1
fi

# Find the most recent server.js backup
SERVER_BACKUP=$(ls -t "$BACKUP_DIR"/server.js.backup-* 2>/dev/null | head -1)
if [ -z "$SERVER_BACKUP" ]; then
  echo -e "${RED}Error: No server.js backup found in $BACKUP_DIR${NC}"
  echo -e "Cannot restore original server.js without backup."
  exit 1
fi

# Restore auth.py
echo -e "${YELLOW}Restoring auth.py from backup...${NC}"
cp "$AUTH_BACKUP" backend/app/auth.py
echo "✅ Original auth.py restored from $AUTH_BACKUP"

# Restore server.js
echo -e "${YELLOW}Restoring server.js from backup...${NC}"
cp "$SERVER_BACKUP" server.js
echo "✅ Original server.js restored from $SERVER_BACKUP"

# Update .env file to disable auth bypass
if [ -f .env ]; then
  echo -e "${YELLOW}Updating .env file to disable AUTH_BYPASS...${NC}"
  if grep -q "AUTH_BYPASS=" .env; then
    # Replace existing AUTH_BYPASS line
    sed -i 's/AUTH_BYPASS=.*/AUTH_BYPASS=false/' .env
  else
    # Add AUTH_BYPASS=false to .env
    echo "AUTH_BYPASS=false" >> .env
  fi
  echo "✅ Updated .env file"
fi

# Display deactivation complete message
echo -e "\n${GREEN}Auth bypass mode has been deactivated!${NC}"
echo -e "Original authentication system has been restored."

# Restart instructions
echo -e "\n${YELLOW}To apply these changes, you need to:${NC}"
echo -e "1. Restart the Backend API workflow"
echo -e "2. Restart the Server workflow"
echo -e "3. Refresh your frontend browser window"

# Create a simple restart script
cat > restart_production_workflows.sh << 'EOF'
#!/bin/bash
# Quick restart script for production workflows

echo "Restarting production workflows..."

# Kill existing processes
pkill -f "node server.js" || true
pkill -f "uvicorn app.main:app" || true

# Start backend
cd backend
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../backend_production.log 2>&1 &
cd ..
echo "✅ Backend API restarted (production mode)"

# Wait for backend to start
sleep 3

# Start server
nohup node server.js > server_production.log 2>&1 &
echo "✅ Server restarted (production mode)"

echo "Done! Production environment is now running with standard authentication."
EOF

chmod +x restart_production_workflows.sh
echo -e "\n${GREEN}Created restart_production_workflows.sh for quick restart${NC}"
echo -e "Run ${BLUE}./restart_production_workflows.sh${NC} to restart your production environment"