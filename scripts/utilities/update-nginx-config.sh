#!/bin/bash
# Script to update NGINX configuration and restart the container
# This script should be run on your AWS production server

set -e
echo "ProbeOps NGINX Configuration Update"
echo "==================================="

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're running as root (required to modify Docker files)
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}This script should be run as root. Attempting to use sudo for necessary commands.${NC}"
fi

# Create backup of current NGINX config
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
NGINX_CONFIG_DIR="/home/ubuntu/ProbeNetworkTools/nginx"
BACKUP_DIR="/home/ubuntu/config-backups"

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
  echo "Creating backup directory at $BACKUP_DIR"
  sudo mkdir -p "$BACKUP_DIR"
fi

# Check if nginx.conf exists
if [ -f "$NGINX_CONFIG_DIR/nginx.conf" ]; then
  echo "Creating backup of current NGINX configuration..."
  sudo cp "$NGINX_CONFIG_DIR/nginx.conf" "$BACKUP_DIR/nginx.conf.backup-$TIMESTAMP"
  echo -e "${GREEN}Backup created at $BACKUP_DIR/nginx.conf.backup-$TIMESTAMP${NC}"
else
  echo -e "${RED}Error: NGINX configuration file not found at $NGINX_CONFIG_DIR/nginx.conf${NC}"
  exit 1
fi

# Copy the new configuration
echo "Copying new NGINX configuration..."
sudo cp nginx/nginx.conf "$NGINX_CONFIG_DIR/nginx.conf"

# Set proper ownership
sudo chown ubuntu:ubuntu "$NGINX_CONFIG_DIR/nginx.conf"

# Check if the configuration is valid
echo "Validating NGINX configuration..."
docker exec probeops-nginx nginx -t 2>/dev/null

if [ $? -eq 0 ]; then
  echo -e "${GREEN}NGINX configuration valid.${NC}"
else
  echo -e "${RED}Error: Invalid NGINX configuration. Rolling back to previous version.${NC}"
  sudo cp "$BACKUP_DIR/nginx.conf.backup-$TIMESTAMP" "$NGINX_CONFIG_DIR/nginx.conf"
  echo "Rolled back to previous configuration."
  exit 1
fi

# Restart NGINX container
echo "Restarting NGINX container..."
docker restart probeops-nginx

# Check if NGINX restarted successfully
sleep 2
if [ "$(docker ps | grep probeops-nginx)" ]; then
  echo -e "${GREEN}NGINX restarted successfully.${NC}"
else
  echo -e "${RED}Error: NGINX container failed to restart. Check Docker logs for details.${NC}"
  echo "To check logs, run: docker logs probeops-nginx"
  exit 1
fi

echo ""
echo -e "${GREEN}NGINX configuration updated successfully!${NC}"
echo "The admin panel should now be accessible for admin@probeops.com"
echo ""
echo "If you still encounter issues, check the following:"
echo "1. Verify backend API is responding correctly: docker logs probeops-backend"
echo "2. Check NGINX access and error logs: docker exec probeops-nginx cat /var/log/nginx/error.log"
echo "3. Try accessing the API directly via curl to test endpoints"