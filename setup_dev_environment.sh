#!/bin/bash
# Master script to set up the ProbeOps development environment
# This script sets up a direct development environment without authentication restrictions

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}ProbeOps Development Environment Setup${NC}"
echo -e "${BLUE}==============================================${NC}"

# Step 1: Apply the authentication bypass to FastAPI backend
echo -e "\n${YELLOW}Step 1: Applying authentication bypass to backend...${NC}"
bash scripts/enable_auth_bypass.sh

# Step 2: Rebuild the frontend
echo -e "\n${YELLOW}Step 2: Building the frontend...${NC}"
cd frontend
npm run build
cd ..
echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Step 3: Set up configurations for new workflows
echo -e "\n${YELLOW}Step 3: Setting up workflow configurations...${NC}"

# Set up a new workflow for the direct frontend server
echo -e "Setting up Direct Frontend Server workflow..."
cat > direct_frontend_workflow.json << EOL
{
  "name": "Direct Frontend Server",
  "command": "node scripts/direct_frontend_server.js"
}
EOL
echo -e "${GREEN}✓ Direct Frontend Server workflow configuration created${NC}"

# Step 4: Start the services
echo -e "\n${YELLOW}Step 4: Starting services...${NC}"
echo -e "1. Make sure to restart the Backend API workflow"
echo -e "2. Start the Direct Frontend Server workflow"

echo -e "\n${GREEN}Development environment setup complete!${NC}"
echo -e "You can now access the application at: http://localhost:3000"
echo -e "\nThe following workflows should be running:"
echo -e "1. Backend API (with auth bypass)"
echo -e "2. Direct Frontend Server"
echo -e "\n${YELLOW}Important Notes:${NC}"
echo -e "• All authentication is bypassed - the system uses the admin account for all requests"
echo -e "• The frontend is served directly without NGINX"
echo -e "• API requests are automatically proxied to the backend"
echo -e "• This is a DEVELOPMENT setup only and should not be used in production"