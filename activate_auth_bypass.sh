#!/bin/bash
# ProbeOps Auth Bypass Activation Script
# This script activates auth bypass mode for development

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}ProbeOps Development Environment Activation${NC}"
echo -e "${BLUE}===============================================${NC}"

# Create backup directory if it doesn't exist
BACKUP_DIR="./auth_backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Backup current auth.py
if [ -f backend/app/auth.py ]; then
  echo -e "${YELLOW}Creating backup of current auth.py...${NC}"
  cp backend/app/auth.py "$BACKUP_DIR/auth.py.backup-$TIMESTAMP"
  echo "✅ Created backup: $BACKUP_DIR/auth.py.backup-$TIMESTAMP"
else
  echo -e "${RED}Error: auth.py not found at backend/app/auth.py${NC}"
  exit 1
fi

# Backup current server.js
if [ -f server.js ]; then
  echo -e "${YELLOW}Creating backup of current server.js...${NC}"
  cp server.js "$BACKUP_DIR/server.js.backup-$TIMESTAMP"
  echo "✅ Created backup: $BACKUP_DIR/server.js.backup-$TIMESTAMP"
else
  echo -e "${RED}Error: server.js not found${NC}"
  exit 1
fi

# Copy auth_bypass.py to auth.py
if [ -f backend/app/auth_bypass.py ]; then
  echo -e "${YELLOW}Replacing auth.py with auth_bypass.py...${NC}"
  cp backend/app/auth_bypass.py backend/app/auth.py
  echo "✅ Auth bypass enabled in backend"
else
  echo -e "${RED}Error: auth_bypass.py not found${NC}"
  exit 1
fi

# Replace server.js with clean proxy version
if [ -f server.clean.js ]; then
  echo -e "${YELLOW}Replacing server.js with clean proxy version...${NC}"
  cp server.clean.js server.js
  echo "✅ Server.js replaced with clean proxy version"
else
  echo -e "${RED}Error: server.clean.js not found${NC}"
  exit 1
fi

# Update .env file with auth bypass flag
if [ -f .env ]; then
  echo -e "${YELLOW}Updating .env file with AUTH_BYPASS=true...${NC}"
  if grep -q "AUTH_BYPASS=" .env; then
    # Replace existing AUTH_BYPASS line
    sed -i 's/AUTH_BYPASS=.*/AUTH_BYPASS=true/' .env
  else
    # Add AUTH_BYPASS=true to .env
    echo "AUTH_BYPASS=true" >> .env
  fi
  echo "✅ Updated .env file"
else
  echo -e "${YELLOW}Creating .env file with AUTH_BYPASS=true...${NC}"
  echo "AUTH_BYPASS=true" > .env
  echo "✅ Created .env file"
fi

# Display activation complete message
echo -e "\n${GREEN}Auth bypass mode has been activated!${NC}"
echo -e "You can now run your development environment with authentication bypassed."
echo -e "All requests will use the admin user by default."

# Restart instructions
echo -e "\n${YELLOW}To apply these changes, you need to:${NC}"
echo -e "1. Restart the Backend API workflow"
echo -e "2. Restart the Server workflow"
echo -e "3. Refresh your frontend browser window"

# Create a simple restart script
cat > restart_dev_workflows.sh << 'EOF'
#!/bin/bash
# Quick restart script for development workflows

echo "Restarting development workflows..."

# Kill existing processes
pkill -f "node server.js" || true
pkill -f "uvicorn app.main:app" || true

# Start backend
cd backend
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../backend_auth_bypass.log 2>&1 &
cd ..
echo "✅ Backend API restarted (auth bypass enabled)"

# Wait for backend to start
sleep 3

# Start server
nohup node server.js > server_auth_bypass.log 2>&1 &
echo "✅ Server restarted (clean proxy)"

echo "Done! Development environment is now running with auth bypass enabled."
EOF

chmod +x restart_dev_workflows.sh
echo -e "\n${GREEN}Created restart_dev_workflows.sh for quick restart${NC}"
echo -e "Run ${BLUE}./restart_dev_workflows.sh${NC} to restart your development environment"

# Deactivation instructions
echo -e "\n${YELLOW}To deactivate auth bypass mode:${NC}"
echo -e "1. Restore the original files:"
echo -e "   cp $BACKUP_DIR/auth.py.backup-$TIMESTAMP backend/app/auth.py"
echo -e "   cp $BACKUP_DIR/server.js.backup-$TIMESTAMP server.js"
echo -e "2. Update .env to set AUTH_BYPASS=false"
echo -e "3. Restart your workflows"

echo -e "\n${BLUE}Happy development!${NC}"