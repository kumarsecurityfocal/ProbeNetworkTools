#!/bin/bash

# ProbeOps Frontend Deployment Fix Script
# This script specifically fixes frontend asset deployment issues

# Set script to exit on error
set -e

# Output formatting
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
function log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

function log_error() {
    echo -e "${RED}❌ $1${NC}"
}

function log_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

echo "==========================================="
echo "🚀 PROBEOPS FRONTEND DEPLOYMENT FIX SCRIPT"
echo "==========================================="

# Step 1: Check if frontend assets exist in various locations
log_info "Step 1: Checking for frontend assets..."

# Array of possible frontend asset locations
locations=(
    "frontend/dist"
    "frontend/build"
    "public"
    "frontend/public"
)

found_assets=false
asset_location=""

for loc in "${locations[@]}"; do
    if [ -d "$loc" ] && [ -f "$loc/index.html" ]; then
        found_assets=true
        asset_location="$loc"
        log_success "Found frontend assets in $loc"
        break
    elif [ -d "$loc" ]; then
        log_warning "Found $loc directory, but no index.html inside"
    fi
done

if [ "$found_assets" = false ]; then
    log_error "No frontend assets found in any expected location!"
    
    # Prompt user to rebuild
    read -p "Do you want to rebuild the frontend? (y/n): " rebuild_choice
    if [[ $rebuild_choice =~ ^[Yy]$ ]]; then
        log_info "Rebuilding frontend..."
        
        # Check if we should use Docker or direct build
        if command -v npm &> /dev/null && [ -d "frontend" ]; then
            log_info "npm found, building directly..."
            cd frontend
            npm install
            npm run build
            cd ..
            
            if [ -d "frontend/dist" ]; then
                asset_location="frontend/dist"
                found_assets=true
                log_success "Successfully rebuilt frontend assets"
            else
                log_error "Frontend build failed to produce dist directory"
            fi
        else
            log_info "Using Docker to build frontend directly..."
            
            # First, verify the Dockerfile exists
            if [ -f "frontend/Dockerfile" ]; then
                log_info "Building frontend Docker image directly..."
                docker build -t probeops-frontend-build ./frontend
                
                # Create public directory if it doesn't exist
                mkdir -p public
                
                # Run container to build and extract assets
                log_info "Running container to build and extract assets..."
                docker run --rm -v $(pwd)/public:/public probeops-frontend-build sh -c 'cp -r /app/dist/* /public/'
                
                # Check if build was successful
                if [ -f "public/index.html" ]; then
                    asset_location="public"
                    found_assets=true
                    log_success "Docker build successful, assets extracted to public directory"
                else
                    log_error "Docker build failed to produce assets"
                fi
            else
                log_error "Frontend Dockerfile not found!"
            fi
        fi
    else
        log_info "Creating placeholder assets..."
        mkdir -p public
        echo '<html><head><title>ProbeOps</title></head><body><h1>ProbeOps</h1><p>Frontend assets not found. This is a placeholder.</p></body></html>' > public/index.html
        asset_location="public"
        found_assets=true
        log_warning "Created placeholder frontend assets"
    fi
fi

# Step 2: Ensure NGINX frontend directory exists
log_info "Step 2: Ensuring NGINX frontend directory exists..."
mkdir -p nginx/frontend-build
log_success "NGINX frontend directory ready"

# Step 3: Copy frontend assets to NGINX
log_info "Step 3: Copying frontend assets to NGINX..."

# First clear the destination directory
log_info "Clearing existing assets in NGINX directory..."
sudo rm -rf nginx/frontend-build/*

# Then copy new assets
log_info "Copying assets from $asset_location to nginx/frontend-build..."
sudo cp -rv "$asset_location"/* nginx/frontend-build/ || {
    log_error "Failed to copy assets with sudo cp -rv. Trying alternate approach with sudo..."
    find "$asset_location" -type f -exec sudo cp {} nginx/frontend-build/ \;
}

# Check if the copy was successful
if [ -f "nginx/frontend-build/index.html" ]; then
    log_success "Frontend assets successfully copied to NGINX directory"
else
    log_error "Failed to copy frontend assets properly"
    log_info "Creating emergency placeholder..."
    echo '<html><head><title>ProbeOps</title></head><body><h1>ProbeOps Emergency Placeholder</h1><p>Asset copying failed. Please check the deployment logs.</p></body></html>' > nginx/frontend-build/index.html
    log_warning "Created emergency placeholder"
fi

# Step 4: Verify NGINX is using the correct directory
log_info "Step 4: Verifying NGINX configuration..."
if [ -f "nginx/nginx.conf" ]; then
    if grep -q "frontend-build" nginx/nginx.conf; then
        log_success "NGINX configuration refers to frontend-build directory correctly"
    else
        log_warning "NGINX configuration may not reference frontend-build directory"
        log_info "Check nginx/nginx.conf to ensure assets are being served from the correct location"
    fi
else
    log_warning "Unable to locate nginx.conf for verification"
fi

# Step 5: Restart NGINX container if running
log_info "Step 5: Restarting NGINX container..."
if docker ps | grep -q "probeops-nginx"; then
    docker compose restart nginx
    log_success "NGINX container restarted"
else
    log_warning "NGINX container not running, skipping restart"
fi

# Step 6: Clear browser cache suggestion
log_info "Step 6: Final checks..."
echo ""
echo "==========================================="
log_success "FRONTEND DEPLOYMENT FIX COMPLETED!"
echo "==========================================="
echo "To ensure you see the latest version:"
echo "1. Clear your browser cache (Ctrl+F5 or Cmd+Shift+R)"
echo "2. Make sure you're accessing the correct URL"
echo "3. If issues persist, check docker logs with: docker compose logs nginx"
echo "==========================================="

# Display final NGINX status
docker compose ps nginx || log_warning "Unable to display NGINX container status"