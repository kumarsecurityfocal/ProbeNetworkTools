#!/bin/bash
# Script to fix admin panel access issues by checking and updating NGINX configuration

echo "ProbeOps Admin Panel Access Fix"
echo "==============================="

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're running as root (required to modify files)
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}This script should be run as root. Attempting to use sudo for necessary commands.${NC}"
fi

# Paths
NGINX_CONFIG_PATH="/home/ubuntu/ProbeNetworkTools/nginx/nginx.conf"
BACKUP_DIR="/home/ubuntu/config-backups"

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
  echo "Creating backup directory at $BACKUP_DIR"
  sudo mkdir -p "$BACKUP_DIR"
fi

# Backup current NGINX config
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
if [ -f "$NGINX_CONFIG_PATH" ]; then
  echo "Creating backup of current NGINX configuration..."
  sudo cp "$NGINX_CONFIG_PATH" "$BACKUP_DIR/nginx.conf.backup-$TIMESTAMP"
  echo -e "${GREEN}Backup created at $BACKUP_DIR/nginx.conf.backup-$TIMESTAMP${NC}"
else
  echo -e "${RED}Error: NGINX configuration file not found at $NGINX_CONFIG_PATH${NC}"
  exit 1
fi

echo "Checking NGINX configuration for API routing issues..."

# Check if required API endpoints are properly configured
USERS_ENDPOINT_CONFIGURED=$(grep -c "location /users/" "$NGINX_CONFIG_PATH" || true)
LOGIN_ENDPOINT_CONFIGURED=$(grep -c "location /login" "$NGINX_CONFIG_PATH" || true)
AUTH_ENDPOINT_CONFIGURED=$(grep -c "location /auth/" "$NGINX_CONFIG_PATH" || true)

if [ "$USERS_ENDPOINT_CONFIGURED" -eq 0 ] || [ "$LOGIN_ENDPOINT_CONFIGURED" -eq 0 ] || [ "$AUTH_ENDPOINT_CONFIGURED" -eq 0 ]; then
  echo -e "${YELLOW}API routing issue detected in NGINX configuration.${NC}"
  echo "Adding required API endpoint routes..."
  
  # Create a temporary file for the updated configuration
  TMP_CONFIG=$(mktemp)
  
  # Create the updated configuration with API routes
  cat > "$TMP_CONFIG" << 'EOF'
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 50M;

    server {
        listen 80;
        server_name probeops.com www.probeops.com;

        # SSL configuration (left commented for development)
        # listen 443 ssl;
        # ssl_certificate /etc/letsencrypt/live/probeops.com/fullchain.pem;
        # ssl_certificate_key /etc/letsencrypt/live/probeops.com/privkey.pem;
        # ssl_protocols TLSv1.2 TLSv1.3;
        # ssl_prefer_server_ciphers on;

        # Redirect HTTP to HTTPS (uncomment for production)
        # if ($scheme != "https") {
        #     return 301 https://$host$request_uri;
        # }

        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # Authentication endpoints
        location /auth/ {
            proxy_pass http://backend:8000/auth/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Login endpoint (redirects to auth/login)
        location /login {
            proxy_pass http://backend:8000/auth/login;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # User endpoints
        location /users/ {
            proxy_pass http://backend:8000/users/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Subscription endpoints
        location /subscriptions/ {
            proxy_pass http://backend:8000/subscriptions/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API key endpoints
        location /keys/ {
            proxy_pass http://backend:8000/keys/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Diagnostic endpoints
        location /diagnostics/ {
            proxy_pass http://backend:8000/diagnostics/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Probe endpoints
        location /probes/ {
            proxy_pass http://backend:8000/probes/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Node endpoints
        location /nodes/ {
            proxy_pass http://backend:8000/nodes/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Metrics endpoints
        location /metrics/ {
            proxy_pass http://backend:8000/metrics/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check endpoint
        location /health {
            proxy_pass http://backend:8000/health;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket support for probe node connections
        location /ws/ {
            proxy_pass http://backend:8000/ws/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 86400; # For long-lived connections
        }
    }
}
EOF

  # Install the updated configuration
  sudo cp "$TMP_CONFIG" "$NGINX_CONFIG_PATH"
  sudo rm "$TMP_CONFIG"
  
  echo -e "${GREEN}Updated NGINX configuration with proper API routing.${NC}"
else
  echo -e "${GREEN}NGINX configuration already has the required API routes.${NC}"
fi

# Restart NGINX to apply changes
echo "Restarting NGINX..."
if command -v docker &> /dev/null; then
  sudo docker restart probeops-nginx
  sleep 2
  if [ "$(docker ps | grep probeops-nginx)" ]; then
    echo -e "${GREEN}NGINX restarted successfully.${NC}"
  else
    echo -e "${RED}Error: NGINX container failed to restart.${NC}"
  fi
else
  sudo systemctl restart nginx
  sleep 2
  if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}NGINX restarted successfully.${NC}"
  else
    echo -e "${RED}Error: NGINX service failed to restart.${NC}"
  fi
fi

echo
echo "Now checking frontend code for authentication issues..."

# Check frontend environment variables
FRONTEND_ENV_FILE="/home/ubuntu/ProbeNetworkTools/frontend/.env"
if [ -f "$FRONTEND_ENV_FILE" ]; then
  echo "Checking frontend environment configuration..."
  
  # Look for API_URL variable
  API_URL=$(grep -E "^VITE_API_URL" "$FRONTEND_ENV_FILE" | cut -d '=' -f2 || true)
  if [ -z "$API_URL" ]; then
    echo -e "${YELLOW}Frontend environment missing API URL configuration.${NC}"
    echo "Adding API URL configuration..."
    echo "VITE_API_URL=http://localhost:8000" | sudo tee -a "$FRONTEND_ENV_FILE" > /dev/null
    echo -e "${GREEN}Added API URL to frontend environment.${NC}"
  else
    echo "Frontend API URL configured: $API_URL"
  fi
else
  echo -e "${YELLOW}Frontend environment file not found. Creating one...${NC}"
  echo "VITE_API_URL=http://localhost:8000" | sudo tee "$FRONTEND_ENV_FILE" > /dev/null
  echo -e "${GREEN}Created frontend environment file with API URL.${NC}"
fi

# Check AuthContext component
AUTH_CONTEXT_FILE="/home/ubuntu/ProbeNetworkTools/frontend/src/context/AuthContext.jsx"
if [ -f "$AUTH_CONTEXT_FILE" ]; then
  echo "Checking AuthContext component..."
  
  # Check if isAdmin is properly defined
  IS_ADMIN_DEFINED=$(grep -c "const isAdmin = user && user.is_admin;" "$AUTH_CONTEXT_FILE" || true)
  if [ "$IS_ADMIN_DEFINED" -eq 0 ]; then
    echo -e "${YELLOW}AuthContext component doesn't properly define isAdmin flag.${NC}"
    sudo sed -i 's/const isAdmin = .*;/const isAdmin = user && user.is_admin;/' "$AUTH_CONTEXT_FILE"
    echo -e "${GREEN}Updated AuthContext component with proper isAdmin definition.${NC}"
  else
    echo "AuthContext component has proper isAdmin definition."
  fi
  
  # Check if user profile is being fetched after login
  FETCH_PROFILE_AFTER_LOGIN=$(grep -A 5 "setToken(" "$AUTH_CONTEXT_FILE" | grep -c "fetchUserProfile" || true)
  if [ "$FETCH_PROFILE_AFTER_LOGIN" -eq 0 ]; then
    echo -e "${YELLOW}AuthContext component doesn't fetch user profile after login.${NC}"
    sudo sed -i 's/setToken(data.access_token);/setToken(data.access_token);\n    fetchUserProfile();/' "$AUTH_CONTEXT_FILE"
    echo -e "${GREEN}Updated AuthContext component to fetch user profile after login.${NC}"
  else
    echo "AuthContext component fetches user profile after login."
  fi
else
  echo -e "${RED}Error: AuthContext component not found at $AUTH_CONTEXT_FILE${NC}"
fi

# Check API service
API_SERVICE_FILE="/home/ubuntu/ProbeNetworkTools/frontend/src/services/api.js"
if [ -f "$API_SERVICE_FILE" ]; then
  echo "Checking API service..."
  
  # Check user profile endpoint
  USER_PROFILE_ENDPOINT=$(grep -c "'/users/me'" "$API_SERVICE_FILE" || true)
  if [ "$USER_PROFILE_ENDPOINT" -eq 0 ]; then
    echo -e "${YELLOW}API service may not use the correct user profile endpoint.${NC}"
    # Determine the current endpoint pattern to replace
    CURRENT_ENDPOINT=$(grep -E "getUserProfile|/users/" "$API_SERVICE_FILE" | grep -o "'[^']*'" | head -1 || echo "'/api/users/me'")
    sudo sed -i "s|$CURRENT_ENDPOINT|'/users/me'|g" "$API_SERVICE_FILE"
    echo -e "${GREEN}Updated API service to use correct user profile endpoint.${NC}"
  else
    echo "API service uses correct user profile endpoint."
  fi
else
  echo -e "${RED}Error: API service not found at $API_SERVICE_FILE${NC}"
fi

echo
echo -e "${GREEN}Admin panel access fix completed!${NC}"
echo "Please try the following steps:"
echo "1. Open a browser and navigate to your ProbeOps site"
echo "2. Log in with admin@probeops.com credentials"
echo "3. Check if the admin panel is now visible"
echo
echo "If the issue persists, please check the browser console for errors"
echo "(Press F12 to open developer tools, then select the Console tab)"