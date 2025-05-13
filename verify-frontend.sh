#!/bin/bash

# ProbeOps Frontend Verification Script
# This script checks frontend build status and NGINX configuration

# Set script to exit on error
set -e

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Helper function for logging
log_success() {
    echo -e "${GREEN}✓ $1${NC}"
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

echo "==== ProbeOps Frontend Verification ===="
echo "Running diagnostics to identify why the default NGINX page is showing..."
echo ""

# Step 1: Check frontend build directory
log_info "Step 1: Checking frontend build directory..."
if [ -d "./public" ]; then
    log_success "Frontend build directory exists"
    
    if [ -f "./public/index.html" ]; then
        log_success "Frontend index.html found"
        echo "Content of index.html (first 10 lines):"
        head -n 10 ./public/index.html
    else
        log_error "No index.html found in public"
    fi
    
    if [ -d "./public/assets" ]; then
        log_success "Frontend assets directory found"
        echo "List of assets:"
        ls -la ./public/assets | tail -n 10
    else
        log_error "No assets directory found in public"
    fi
else
    log_error "Frontend build directory doesn't exist"
    echo "You need to build the frontend with: cd frontend && npx vite build --outDir=../public"
    exit 1
fi

echo ""

# Step 2: Check NGINX build copy directory
log_info "Step 2: Checking if frontend assets are copied to NGINX build directory..."
if [ -d "./nginx/frontend-build" ]; then
    log_success "NGINX frontend-build directory exists"
    
    if [ -f "./nginx/frontend-build/index.html" ]; then
        log_success "Frontend index.html copied to NGINX build directory"
    else
        log_error "No index.html found in nginx/frontend-build"
        echo "Running copy script to fix this..."
        ./copy-frontend-assets.sh
    fi
else
    log_warning "NGINX frontend-build directory doesn't exist"
    echo "Creating directory and copying assets..."
    mkdir -p ./nginx/frontend-build
    ./copy-frontend-assets.sh
fi

echo ""

# Step 3: Check NGINX configuration
log_info "Step 3: Checking NGINX configuration..."
if [ -f "./nginx/nginx.conf" ]; then
    log_success "NGINX configuration file exists"
    
    if grep -q "/usr/share/nginx/html" ./nginx/nginx.conf; then
        log_success "NGINX is configured to serve from /usr/share/nginx/html"
    else
        log_error "NGINX configuration doesn't use /usr/share/nginx/html as root"
    fi
else
    log_error "NGINX configuration file not found"
fi

echo ""

# Step 4: Check Docker configuration for volume mounts
log_info "Step 4: Checking Docker configuration for proper asset handling..."
if grep -q "COPY frontend-build/ /usr/share/nginx/html/" ./nginx/Dockerfile; then
    log_success "NGINX Dockerfile correctly copies frontend assets"
else
    log_error "NGINX Dockerfile doesn't copy frontend assets correctly"
    echo "Please update nginx/Dockerfile to include: COPY frontend-build/ /usr/share/nginx/html/"
fi

if grep -q "./frontend/dist:/usr/share/nginx/html" ./docker-compose.yml; then
    log_warning "WARNING: docker-compose.yml mounts frontend/dist as a volume"
    echo "This will override any assets built into the container"
    echo "Consider removing this volume mount for production"
else
    log_success "No problematic volume mounts in main docker-compose.yml"
fi

echo ""

# Step 5: Summary and recommendations
echo "==== Verification Summary ===="
echo "Based on the checks performed, here's the diagnosis:"
echo ""
echo "1. Ensure frontend is built with: cd frontend && npm run build"
echo "2. Make sure assets are copied with: ./copy-frontend-assets.sh"
echo "3. Check your docker-compose.yml file doesn't override assets with volume mounts"
echo "4. Rebuild NGINX container with: docker compose build nginx"
echo "5. Restart containers with: docker compose up -d"
echo ""
echo "For a complete solution, run the deploy script: ./deploy.sh"
echo "============================"