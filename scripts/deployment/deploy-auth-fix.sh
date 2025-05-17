#!/bin/bash

# Deploy the authentication fix server
# This script installs the necessary dependencies for the auth fix script
# and ensures it is running as a background service on deployment

# Define colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== ProbeOps Authentication Fix Deployment =====${NC}"

# Ensure we're in the project root directory
if [ ! -f "auth-fix.js" ]; then
  echo -e "${RED}Error: auth-fix.js not found in current directory${NC}"
  echo -e "${YELLOW}Make sure you're running this script from the project root directory${NC}"
  exit 1
fi

# Check for essential dependencies
echo -e "${GREEN}Checking for required dependencies...${NC}"
if ! command -v npm &> /dev/null; then
  echo -e "${RED}Error: npm is not installed${NC}"
  exit 1
fi

# Install required dependencies if not already installed
echo -e "${GREEN}Installing dependencies for auth-fix.js...${NC}"
if ! npm list jsonwebtoken &> /dev/null; then
  npm install --save jsonwebtoken express
  echo -e "${GREEN}Dependencies installed${NC}"
else
  echo -e "${GREEN}Dependencies already installed${NC}"
fi

# Create PM2 ecosystem file if it doesn't exist
ECOSYSTEM_FILE="/home/ubuntu/ecosystem.config.js"
if [ ! -f "$ECOSYSTEM_FILE" ]; then
  echo -e "${GREEN}Creating PM2 ecosystem file...${NC}"
  cat > "$ECOSYSTEM_FILE" << 'EOF'
module.exports = {
  apps : [
    {
      name: "probeops-auth-fix",
      script: "/home/ubuntu/ProbeNetworkTools/auth-fix.js",
      env: {
        NODE_ENV: "production",
        AUTH_FIX_PORT: 5000
      },
      time: true,
      watch: false,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    }
  ]
}
EOF
  echo -e "${GREEN}PM2 ecosystem file created${NC}"
else
  # Check if our auth-fix service is in the ecosystem file
  if ! grep -q "probeops-auth-fix" "$ECOSYSTEM_FILE"; then
    echo -e "${YELLOW}Adding auth-fix service to existing PM2 ecosystem file...${NC}"
    # Backup existing file
    cp "$ECOSYSTEM_FILE" "${ECOSYSTEM_FILE}.bak"
    
    # Extract apps array and add our service
    sed -i '/apps\s*:\s*\[/a\    {\n      name: "probeops-auth-fix",\n      script: "/home/ubuntu/ProbeNetworkTools/auth-fix.js",\n      env: {\n        NODE_ENV: "production",\n        AUTH_FIX_PORT: 5000\n      },\n      time: true,\n      watch: false,\n      instances: 1,\n      autorestart: true,\n      max_restarts: 10,\n      restart_delay: 3000\n    },' "$ECOSYSTEM_FILE"
    
    echo -e "${GREEN}Auth-fix service added to PM2 ecosystem file${NC}"
  else
    echo -e "${GREEN}Auth-fix service already in PM2 ecosystem file${NC}"
  fi
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}Installing PM2 globally...${NC}"
  npm install -g pm2
  echo -e "${GREEN}PM2 installed${NC}"
else
  echo -e "${GREEN}PM2 already installed${NC}"
fi

# Start or restart the auth-fix service using PM2
echo -e "${GREEN}Starting auth-fix service with PM2...${NC}"
if pm2 list | grep -q "probeops-auth-fix"; then
  pm2 restart probeops-auth-fix
  echo -e "${GREEN}Auth-fix service restarted${NC}"
else
  pm2 start "$ECOSYSTEM_FILE"
  echo -e "${GREEN}Auth-fix service started${NC}"
fi

# Ensure PM2 starts on system boot
echo -e "${GREEN}Setting up PM2 to start on system boot...${NC}"
pm2 save
if ! grep -q "PM2_HOME" /home/ubuntu/.bashrc; then
  echo "export PM2_HOME=/home/ubuntu/.pm2" >> /home/ubuntu/.bashrc
fi

echo -e "${GREEN}Auth-fix server deployment complete!${NC}"
echo -e "${YELLOW}The authentication fix is now running as a service and will start automatically on system boot.${NC}"