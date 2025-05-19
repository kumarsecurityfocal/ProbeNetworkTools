#!/bin/bash
# ProbeOps Auth Bypass Toggle Script
# This script toggles between auth bypass and standard authentication modes

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}ProbeOps Auth Bypass Mode Toggle${NC}"
echo -e "${BLUE}==========================================${NC}"

# Check the current auth bypass setting
if [ -f .env ]; then
    if grep -q "AUTH_BYPASS=true" .env; then
        current_mode="enabled"
    else
        current_mode="disabled"
    fi
    
    echo -e "${YELLOW}Current auth bypass mode: ${current_mode}${NC}"
else
    echo -e "${RED}Error: .env file not found${NC}"
    echo -e "Creating default .env file with auth bypass disabled..."
    echo "AUTH_BYPASS=false" > .env
    current_mode="disabled"
fi

# Ask if the user wants to toggle the mode
echo -e "${YELLOW}Do you want to toggle the auth bypass mode? (yes/no)${NC}"
read -p "> " toggle_mode

if [[ "$toggle_mode" == "yes" ]]; then
    # Create backup directory if it doesn't exist
    BACKUP_DIR="./auth_backups"
    mkdir -p $BACKUP_DIR
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    
    # Backup current files
    if [ -f backend/app/auth.py ]; then
        echo -e "${YELLOW}Creating backup of current auth.py...${NC}"
        cp backend/app/auth.py "$BACKUP_DIR/auth.py.backup-$TIMESTAMP"
        echo "✅ Created backup: $BACKUP_DIR/auth.py.backup-$TIMESTAMP"
    else
        echo -e "${RED}Warning: auth.py not found at backend/app/auth.py${NC}"
    fi
    
    if [ -f server.js ]; then
        echo -e "${YELLOW}Creating backup of current server.js...${NC}"
        cp server.js "$BACKUP_DIR/server.js.backup-$TIMESTAMP"
        echo "✅ Created backup: $BACKUP_DIR/server.js.backup-$TIMESTAMP"
    else
        echo -e "${RED}Warning: server.js not found${NC}"
    fi
    
    if [[ "$current_mode" == "enabled" ]]; then
        # Disable auth bypass
        echo -e "${YELLOW}Disabling auth bypass mode...${NC}"
        
        # Update .env file
        sed -i 's/AUTH_BYPASS=true/AUTH_BYPASS=false/' .env
        
        # Restore original files if available
        if [ -f "$BACKUP_DIR/auth.py.original" ]; then
            echo -e "${YELLOW}Restoring original auth.py...${NC}"
            cp "$BACKUP_DIR/auth.py.original" backend/app/auth.py
            echo "✅ Original auth.py restored"
        else
            echo -e "${RED}Warning: original auth.py not found, cannot restore${NC}"
            echo -e "${RED}You may need to manually restore the authentication system${NC}"
        fi
        
        if [ -f "$BACKUP_DIR/server.js.original" ]; then
            echo -e "${YELLOW}Restoring original server.js...${NC}"
            cp "$BACKUP_DIR/server.js.original" server.js
            echo "✅ Original server.js restored"
        else
            echo -e "${RED}Warning: original server.js not found, cannot restore${NC}"
            echo -e "${RED}You may need to manually restore the server proxy${NC}"
        fi
        
        echo -e "${GREEN}Auth bypass mode has been disabled!${NC}"
    else
        # Enable auth bypass
        echo -e "${YELLOW}Enabling auth bypass mode...${NC}"
        
        # Update .env file
        sed -i 's/AUTH_BYPASS=false/AUTH_BYPASS=true/' .env
        
        # Backup original files if this is the first time enabling
        if [ ! -f "$BACKUP_DIR/auth.py.original" ] && [ -f backend/app/auth.py ]; then
            echo -e "${YELLOW}Creating original backup of auth.py...${NC}"
            cp backend/app/auth.py "$BACKUP_DIR/auth.py.original"
            echo "✅ Created original backup: $BACKUP_DIR/auth.py.original"
        fi
        
        if [ ! -f "$BACKUP_DIR/server.js.original" ] && [ -f server.js ]; then
            echo -e "${YELLOW}Creating original backup of server.js...${NC}"
            cp server.js "$BACKUP_DIR/server.js.original"
            echo "✅ Created original backup: $BACKUP_DIR/server.js.original"
        fi
        
        # Replace with auth bypass files
        if [ -f backend/app/auth_bypass.py ]; then
            echo -e "${YELLOW}Replacing auth.py with auth_bypass.py...${NC}"
            cp backend/app/auth_bypass.py backend/app/auth.py
            echo "✅ Auth bypass enabled in backend"
        else
            echo -e "${RED}Error: auth_bypass.py not found${NC}"
            echo -e "${RED}Please create the auth_bypass.py file first${NC}"
        fi
        
        if [ -f server.clean.js ]; then
            echo -e "${YELLOW}Replacing server.js with clean proxy version...${NC}"
            cp server.clean.js server.js
            echo "✅ Server.js replaced with clean proxy version"
        else
            echo -e "${RED}Error: server.clean.js not found${NC}"
            echo -e "${RED}Please create the server.clean.js file first${NC}"
        fi
        
        echo -e "${GREEN}Auth bypass mode has been enabled!${NC}"
    fi
    
    # Restart instructions
    echo -e "\n${YELLOW}To apply these changes, you need to:${NC}"
    echo -e "1. Restart the Backend API workflow"
    echo -e "2. Restart the Server workflow"
    echo -e "3. Refresh your frontend browser window"
    
    # Ask if the user wants to restart workflows
    echo -e "\n${YELLOW}Do you want to restart the workflows now? (yes/no)${NC}"
    read -p "> " restart_workflows
    
    if [[ "$restart_workflows" == "yes" ]]; then
        echo -e "${YELLOW}Restarting workflows...${NC}"
        
        # Kill existing processes
        pkill -f "node server.js" || true
        pkill -f "uvicorn app.main:app" || true
        
        # Start backend
        echo -e "${YELLOW}Starting backend API...${NC}"
        cd backend
        nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../backend_log.log 2>&1 &
        cd ..
        echo "✅ Backend API restarted"
        
        # Wait for backend to start
        sleep 3
        
        # Start server
        echo -e "${YELLOW}Starting server...${NC}"
        nohup node server.js > server_log.log 2>&1 &
        echo "✅ Server restarted"
        
        echo -e "${GREEN}Workflows restarted successfully!${NC}"
    fi
else
    echo -e "${YELLOW}No changes made. Current auth bypass mode remains ${current_mode}.${NC}"
fi

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Toggle operation completed!${NC}"
echo -e "${BLUE}==========================================${NC}"