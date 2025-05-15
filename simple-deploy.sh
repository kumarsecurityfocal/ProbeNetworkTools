#!/bin/bash

# Simplified Deployment Script for ProbeOps
# This script focuses on proper frontend asset deployment

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
echo "🚀 PROBEOPS SIMPLIFIED DEPLOYMENT SCRIPT"
echo "==========================================="

# Step 1: Pull latest code
log_info "Step 1: Pulling latest code..."
git pull origin main || {
    log_warning "Git pull failed. Continuing with existing code."
}

# Step 2: Make scripts executable
log_info "Step 2: Making scripts executable..."
chmod +x *.sh || {
    log_warning "Failed to make scripts executable. This might cause issues."
}

# Step 3: Check and set environment variables
log_info "Step 3: Checking environment variables..."
if [ -f ".env" ]; then
    log_success "Found .env file"
else
    if [ -f ".env.template" ]; then
        log_warning "Creating .env from template. Please update with actual values!"
        cp .env.template .env
    else
        log_error "No .env or .env.template file found. Deployment might fail!"
    fi
fi

# Step 4: Check database connection
log_info "Step 4: Testing database connection..."
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL not set! Check your .env file."
    log_info "Using default value from .env.backend if available."
    if [ -f "backend/.env.backend" ]; then
        export DATABASE_URL=$(grep DATABASE_URL backend/.env.backend | cut -d= -f2)
        log_info "Using DATABASE_URL from backend/.env.backend"
    fi
fi

# Step 5: Stop existing containers
log_info "Step 5: Stopping existing containers..."
docker compose down || {
    log_warning "Failed to stop containers. They might not exist yet, continuing..."
}

# Step 6: Rebuild frontend
log_info "Step 6: Building frontend assets..."
cd frontend
log_info "Running npm install to ensure dependencies are up to date..."
npm install
log_info "Building frontend with npm run build..."
npm run build || {
    log_error "Frontend build failed! Attempting build through Docker instead."
    cd ..
    docker compose build frontend-build
    docker compose up -d frontend-build
    # Wait for build to complete
    sleep 15
    docker compose logs frontend-build
}

# Return to root directory if we're in frontend/
cd "$(dirname "$0")" || {
    log_info "Returning to project root directory..."
}

# Step 7: Ensure built assets exist
log_info "Step 7: Checking built frontend assets..."
if [ -d "frontend/dist" ]; then
    log_success "Frontend assets found in frontend/dist"
    # Copy them to public folder
    mkdir -p public
    sudo cp -r frontend/dist/* public/
    log_success "Copied frontend assets to public folder"
elif [ -d "public" ]; then
    log_success "Frontend assets found in public folder"
else
    log_error "No frontend assets found in frontend/dist or public! Using fallback."
    mkdir -p public
    echo '<html><head><title>ProbeOps</title></head><body><h1>ProbeOps</h1><p>Frontend assets not found. This is a placeholder.</p></body></html>' > public/index.html
    log_warning "Created placeholder frontend assets"
fi

# Step 8: Copy frontend assets to NGINX directory
log_info "Step 8: Copying frontend assets to NGINX..."
if [ -f "copy-frontend-assets.sh" ]; then
    log_info "Running copy-frontend-assets.sh..."
    ./copy-frontend-assets.sh
else
    log_warning "copy-frontend-assets.sh not found, performing manual copy..."
    # Ensure NGINX frontend directory exists
    mkdir -p nginx/frontend-build
    # Copy frontend assets
    sudo cp -rv public/* nginx/frontend-build/ || {
        log_error "Failed to copy assets with sudo cp -rv. Trying alternate approach with sudo..."
        find public -type f -exec sudo cp {} nginx/frontend-build/ \;
    }
    log_success "Frontend assets copied to nginx/frontend-build"
fi

# Step 9: Start or restart services
log_info "Step 9: Starting services..."
docker compose up -d --build || {
    log_error "Docker Compose failed! Checking for errors..."
    docker compose logs
    exit 1
}

# Step 10: Check service status
log_info "Step 10: Checking service status..."
docker compose ps

# Step 11: Test endpoints
log_info "Step 11: Testing endpoints..."
log_info "Testing backend API endpoint..."
curl -s http://localhost:8000/ | grep -q "Welcome to ProbeOps API" && log_success "Backend API is responding correctly" || log_warning "Backend API check failed"

log_info "Testing frontend endpoint..."
curl -s -I http://localhost:80 | grep -q "200 OK" && log_success "Frontend is accessible" || log_warning "Frontend check failed"

echo "==========================================="
log_success "DEPLOYMENT COMPLETED!"
echo "==========================================="
echo "If you're still seeing old content:"
echo "1. Try clearing your browser cache"
echo "2. Run './fix-frontend-deployment.sh'"
echo "3. Check the NGINX configuration"
echo "4. Verify the backend API is responding correctly"
echo "==========================================="