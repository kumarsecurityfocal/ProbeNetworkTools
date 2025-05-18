#!/bin/bash
# Toggle auth bypass mode for ProbeOps development
# This script provides an easy way to enable/disable auth bypass

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}ProbeOps Auth Bypass Toggle${NC}"
echo -e "${BLUE}=========================${NC}"

# Determine current state
if grep -q "get_current_user.*BYPASSED AUTHENTICATION" backend/app/auth.py; then
  current_state="enabled"
else
  current_state="disabled"
fi

# Create backup directory if it doesn't exist
BACKUP_DIR="./auth_backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Display current state and prompt for action
if [ "$current_state" = "enabled" ]; then
  echo -e "${YELLOW}Auth bypass is currently ENABLED${NC}"
  
  read -p "Do you want to disable auth bypass? (y/n): " choice
  if [[ "$choice" == "y" ]]; then
    # Create backup of current auth.py
    cp backend/app/auth.py "$BACKUP_DIR/auth_bypass.py.backup-$TIMESTAMP"
    echo "✅ Created backup of auth bypass version"
    
    # Restore original auth.py
    if [ -f "$BACKUP_DIR/auth.py.backup" ]; then
      cp "$BACKUP_DIR/auth.py.backup" backend/app/auth.py
      echo "✅ Restored original auth.py from backup"
    else
      echo -e "${RED}No backup of original auth.py found.${NC}"
      echo -e "${YELLOW}Please manually restore auth.py from source control.${NC}"
      exit 1
    fi
    
    # Update server.js if needed
    if [ -f "$BACKUP_DIR/server.js.backup" ]; then
      cp "$BACKUP_DIR/server.js.backup" server.js
      echo "✅ Restored original server.js from backup"
    else
      echo -e "${YELLOW}No backup of original server.js found.${NC}"
      echo -e "${YELLOW}You may need to manually restore server.js.${NC}"
    fi
    
    echo -e "${GREEN}Auth bypass has been disabled.${NC}"
    echo -e "${YELLOW}Remember to restart your workflows for changes to take effect.${NC}"
  else
    echo "Operation cancelled. Auth bypass remains enabled."
  fi
else
  echo -e "${YELLOW}Auth bypass is currently DISABLED${NC}"
  
  read -p "Do you want to enable auth bypass? (y/n): " choice
  if [[ "$choice" == "y" ]]; then
    # Backup current auth.py if it doesn't already exist
    if [ ! -f "$BACKUP_DIR/auth.py.backup" ]; then
      cp backend/app/auth.py "$BACKUP_DIR/auth.py.backup"
      echo "✅ Created backup of original auth.py"
    fi
    
    # Backup current server.js if it doesn't already exist
    if [ ! -f "$BACKUP_DIR/server.js.backup" ]; then
      cp server.js "$BACKUP_DIR/server.js.backup"
      echo "✅ Created backup of original server.js"
    fi
    
    # Copy auth_bypass.py to auth.py
    if [ -f backend/app/auth_bypass.py ]; then
      cp backend/app/auth_bypass.py backend/app/auth.py
      echo "✅ Applied auth bypass to backend"
    else
      echo -e "${RED}auth_bypass.py not found.${NC}"
      echo -e "${YELLOW}Creating auth_bypass.py from template...${NC}"
      
      # Create auth_bypass.py from scratch if it doesn't exist
      cp backend/app/auth.py backend/app/auth_bypass.py
      
      # Modify the file to include bypass logic
      sed -i 's/async def get_current_user(/# MODIFIED: Always returns the admin user regardless of token\nasync def get_current_user(/g' backend/app/auth_bypass.py
      
      # Replace the get_current_user function with the bypass version
      sed -i '/async def get_current_user/,/return user/{/return user/d;}' backend/app/auth_bypass.py
      sed -i '/async def get_current_user/a\    print("🔍 BYPASSED AUTHENTICATION - Using admin account")\n    logger.debug("BYPASSED AUTHENTICATION - Using admin account")\n    \n    # Get the admin user\n    admin = get_user_by_email(db, "admin@probeops.com")\n    if not admin:\n        # Create admin if doesn\'t exist\n        print("⚠️ Admin user not found, creating default admin")\n        initialize_default_users(db)\n        admin = get_user_by_email(db, "admin@probeops.com")\n    \n    if not admin:\n        print("⚠️ Failed to create admin user, this should not happen")\n        raise HTTPException(status_code=500, detail="Failed to create admin user")\n    \n    print(f"✅ Using admin user: {admin.username}")\n    return admin' backend/app/auth_bypass.py
      
      # Replace get_current_active_user with the bypass version
      sed -i 's/async def get_current_active_user(/# MODIFIED: Always returns the current user as active\nasync def get_current_active_user(/g' backend/app/auth_bypass.py
      sed -i '/async def get_current_active_user/,/return current_user/{/if current_user.is_active is False/d;}' backend/app/auth_bypass.py
      sed -i '/async def get_current_active_user/,/return current_user/{/raise HTTPException/d;}' backend/app/auth_bypass.py
      
      # Replace get_admin_user with the bypass version
      sed -i 's/async def get_admin_user(/# MODIFIED: Always returns the current user as admin\nasync def get_admin_user(/g' backend/app/auth_bypass.py
      sed -i '/async def get_admin_user/,/return current_user/{/if current_user.is_admin is False/d;}' backend/app/auth_bypass.py
      sed -i '/async def get_admin_user/,/return current_user/{/raise HTTPException/d;}' backend/app/auth_bypass.py
      sed -i '/async def get_admin_user/,/return current_user/{/}/s/}/    """Bypass dependency for admin-only endpoints."""\n    return current_user/}' backend/app/auth_bypass.py
      
      # Modify validate_api_key function
      sed -i 's/def validate_api_key(/def validate_api_key(api_key: str, db: Session):\n    """MODIFIED: Always returns admin user regardless of API key."""\n    admin = get_user_by_email(db, "admin@probeops.com")\n    if not admin:\n        # Create admin if doesn\'t exist\n        initialize_default_users(db)\n        admin = get_user_by_email(db, "admin@probeops.com")\n        \n    if not admin:\n        print("⚠️ Failed to create admin user for API key validation")\n        return None\n        \n    return admin\n\n# Original validate_api_key function - not used in bypass mode\ndef _original_validate_api_key(/g' backend/app/auth_bypass.py
      
      # Now copy auth_bypass.py to auth.py
      cp backend/app/auth_bypass.py backend/app/auth.py
      
      echo "✅ Created and applied auth_bypass.py"
    fi
    
    # Replace server.js with clean proxy version
    if [ -f server.clean.js ]; then
      cp server.clean.js server.js
      echo "✅ Applied clean proxy server"
    else
      echo -e "${YELLOW}server.clean.js not found. Creating a minimal proxy server...${NC}"
      
      # Create a minimal clean server.js
      cat > server.clean.js << 'EOF'
// Clean Express server with simple API proxying to backend
const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Create express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);
  next();
});

// Handle direct access to frontend routes by returning the main app
app.get(['/login', '/admin', '/dashboard', '/troubleshooting', '/database', '/profile', '/settings'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API proxy to forward all backend requests
const apiProxy = createProxyMiddleware('/api', {
  target: 'http://127.0.0.1:8000',
  pathRewrite: {
    '^/api': '' // Remove /api prefix when forwarding to backend
  },
  changeOrigin: true,
  logLevel: 'debug'
});

// Use the proxy middleware for all /api routes
app.use('/api', apiProxy);

// Generic API handler function
function handleGenericApi(req, res) {
  console.log('Generic API request:', req.method, req.originalUrl);
  const backendPath = req.originalUrl.replace(/^\/api/, '');
  console.log('Generic API backendPath:', backendPath);
  
  // Forward the request to the proxy middleware
  req.url = req.url.replace(/^\/api/, '');
  apiProxy(req, res);
}

// Catch all other /api routes
app.use('/api/*', handleGenericApi);

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
EOF
      
      # Apply the clean server
      cp server.clean.js server.js
      echo "✅ Created and applied clean server.js"
    fi
    
    echo -e "${GREEN}Auth bypass has been enabled.${NC}"
    echo -e "${YELLOW}Remember to restart your workflows for changes to take effect.${NC}"
  else
    echo "Operation cancelled. Auth bypass remains disabled."
  fi
fi

# Update .env file to match current state
if [ "$current_state" = "enabled" ] && [[ "$choice" == "y" ]]; then
  # Remove AUTH_BYPASS=true from .env
  sed -i '/AUTH_BYPASS=true/d' .env
  echo "✅ Updated .env file: AUTH_BYPASS=false"
elif [ "$current_state" = "disabled" ] && [[ "$choice" == "y" ]]; then
  # Add AUTH_BYPASS=true to .env if not already present
  if ! grep -q "AUTH_BYPASS=true" .env; then
    echo "AUTH_BYPASS=true" >> .env
    echo "✅ Updated .env file: AUTH_BYPASS=true"
  fi
fi

# Output restart instructions
if [[ "$choice" == "y" ]]; then
  echo -e "\n${YELLOW}Next steps:${NC}"
  echo -e "1. Restart the Backend API workflow"
  echo -e "2. Restart the Server workflow"
  
  # Create a quick restart script
  cat > restart_workflows.sh << 'EOF'
#!/bin/bash
# Quick workflow restart

echo "Restarting workflows..."

# Kill server processes
pkill -f "node server.js" || true
pkill -f "uvicorn app.main:app" || true

# Restart backend
cd backend
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../backend_log.txt 2>&1 &
cd ..
echo "✅ Backend restarted"

# Restart server
nohup node server.js > server_log.txt 2>&1 &
echo "✅ Server restarted"

echo "Done! Check backend_log.txt and server_log.txt for any issues."
EOF

  chmod +x restart_workflows.sh
  echo -e "3. Or simply run ${BLUE}./restart_workflows.sh${NC} to restart both"
fi