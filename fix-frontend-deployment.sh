#!/bin/bash

# ProbeOps Fix Frontend Deployment Script
# This script focuses on fixing the issue where default NGINX page is shown instead of frontend

# Set script to exit on error
set -e

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Helper function for logging
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "ℹ️ $1"
}

echo "==== ProbeOps Frontend Deployment Fix ===="
echo "This script will fix the issue with default NGINX page showing instead of the React frontend."
echo ""

# Make sure we're in the project root
if [ ! -f "docker-compose.yml" ]; then
    log_error "This script must be run from the project root directory."
    exit 1
fi

# Step 1: Check if frontend assets directory exists
log_info "Step 1: Checking frontend build assets..."
if [ ! -d "./public" ] || [ ! -f "./public/index.html" ]; then
    log_warning "Missing frontend build files. Building the frontend..."
    cd frontend && npm run build
    cd ..
    log_success "Frontend built successfully"
else
    log_success "Frontend build assets found in ./public"
fi

# Step 2: Prepare NGINX frontend-build directory
log_info "Step 2: Preparing NGINX frontend-build directory..."
mkdir -p ./nginx/frontend-build
# Make sure the copy script is executable
chmod +x ./copy-frontend-assets.sh
./copy-frontend-assets.sh
log_success "Frontend assets copied to nginx/frontend-build"

# Step 3: Create a marker file in the NGINX build directory
log_info "Step 3: Creating marker files for troubleshooting..."
echo "<!DOCTYPE html>
<html>
<head>
    <title>ProbeOps Deployment Verification</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1 { color: #333; }
        .success { color: green; }
        .code { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .note { background: #fffde7; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>ProbeOps Frontend Deployment Test</h1>
    <p class=\"success\">If you're seeing this page, it means the NGINX container is correctly serving static content from /usr/share/nginx/html.</p>
    <p>This is a <strong>temporary test page</strong> and should be replaced by the actual React app.</p>
    <p>Deployment timestamp: $(date)</p>
    <div class=\"note\">
        <p><strong>Note:</strong> This file was created by the fix-frontend-deployment.sh script.</p>
    </div>
</body>
</html>" > ./nginx/frontend-build/test-page.html

log_success "Created test page at ./nginx/frontend-build/test-page.html"

# Step 4: Stop existing containers
log_info "Step 4: Stopping existing containers..."
docker compose down
log_success "Containers stopped"

# Step 5: Rebuild and start containers
log_info "Step 5: Rebuilding and starting containers..."
docker compose up -d --build
log_success "Containers rebuilt and started"

# Step 6: Provide next steps
echo ""
echo "==== Next Steps ===="
echo "1. Check if the frontend is now working by visiting https://probeops.com"
echo "2. If still seeing default NGINX page, try accessing the test page: https://probeops.com/test-page.html"
echo "3. Check container logs with: docker compose logs nginx"
echo ""
echo "For troubleshooting, you can:"
echo "- Inspect the NGINX container: docker compose exec nginx /bin/sh"
echo "- View the content in /usr/share/nginx/html: docker compose exec nginx ls -la /usr/share/nginx/html"
echo "- Check NGINX configuration: docker compose exec nginx cat /etc/nginx/nginx.conf"
echo ""
echo "If all else fails, try:"
echo "1. docker compose down"
echo "2. docker system prune -a --volumes"
echo "3. ./fix-frontend-deployment.sh"
echo ""
echo "==== Deployment Complete ===="