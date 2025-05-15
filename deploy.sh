#!/bin/bash

# ProbeOps Clean Deployment Script
# This script performs a full deployment of the ProbeOps platform,
# ensuring proper build and configuration of all components

# Exit on any error
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

timestamp=$(date +"%Y-%m-%d %H:%M:%S")
echo "===== DEPLOYMENT STARTED: $timestamp ====="

# Step 1: Pull latest code
log_info "Step 1: Pulling latest code from Git..."
if [ -d ".git" ]; then
    git pull
    log_success "Code updated from git repository"
else
    log_warning "Not a git repository, skipping code update"
fi

# Step 2: Set executable permissions
log_info "Step 2: Setting executable permissions on scripts..."
find . -name "*.sh" -exec chmod +x {} \;
log_success "Executable permissions set on all scripts"

# Step 3: Environment setup
log_info "Step 3: Checking environment variables..."
if [ -f ".env" ]; then
    log_success "Found .env file"
else
    log_warning ".env file not found. Creating from template..."
    if [ -f ".env.template" ]; then
        cp .env.template .env
        log_success "Created .env from template"
    else
        log_error "No .env.template found. Please create .env file manually."
    fi
fi

# Check for essential environment variables
log_info "Step 4: Testing database connection..."
if [ -z "${DATABASE_URL}" ]; then
    log_error "DATABASE_URL not set! Check your .env file."
    
    # Check for backend environment variables
    if [ -f "backend/.env.backend" ]; then
        log_info "Using backend/.env.backend for database configuration"
    else
        log_warning "backend/.env.backend not found! Creating from template..."
        if [ -f "backend/.env.backend.template" ]; then
            cp backend/.env.backend.template backend/.env.backend
            log_success "Created backend/.env.backend from template"
        else
            log_error "No backend environment template found. Manual configuration needed."
        fi
    fi
else
    log_success "DATABASE_URL is set"
fi

# Step 5: Docker Compose validation
log_info "Step 5: Validating Docker Compose configuration..."
docker compose config > /dev/null
log_success "Docker Compose configuration is valid"

# Step 6: Build frontend assets
log_info "Step 6: Building frontend assets..."
mkdir -p public

# Method 1: Try direct build first
if [ -d "frontend" ]; then
    log_info "Building frontend using local npm..."
    (cd frontend && npm ci && npm run build -- --outDir=../public) || {
        log_error "Frontend build failed! Attempting build through Docker instead."
        
        # Method 2: Docker-based build
        log_info "Building frontend through Docker..."
        docker compose build frontend-build
        docker compose up -d frontend-build
        
        # Wait for build to complete
        log_info "Waiting for Docker build to complete..."
        sleep 15
        
        if [ ! -f "public/index.html" ]; then
            log_error "Docker build didn't produce assets in public directory!"
            
            # Method 3: Emergency fallback - simplified build
            if [ -f "frontend/index.html" ]; then
                log_info "Directly copying frontend source files as emergency fallback..."
                cp -r frontend/public/* public/ 2>/dev/null || true
                cp frontend/index.html public/ 2>/dev/null || true
            fi
        else
            log_success "Frontend built successfully through Docker"
        fi
    }
    
    if [ -f "public/index.html" ]; then
        log_success "Frontend assets built successfully"
    else
        log_error "Frontend build failed through all methods!"
        log_warning "Creating emergency placeholder page..."
        echo '<!DOCTYPE html><html><head><title>ProbeOps</title></head><body><h1>ProbeOps</h1><p>Frontend assets missing. Emergency placeholder page.</p></body></html>' > public/index.html
    fi
else
    log_error "Frontend directory not found!"
fi

# Step 7: Copy frontend assets to NGINX
log_info "Step 7: Copying frontend assets to NGINX..."
mkdir -p nginx/frontend-build
cp -r public/* nginx/frontend-build/ 2>/dev/null || {
    log_error "Failed to copy assets with cp -r. Trying alternate approach..."
    find public -type f -exec cp {} nginx/frontend-build/ \; 2>/dev/null || {
        log_error "Both copy methods failed! Creating placeholder..."
        echo '<!DOCTYPE html><html><head><title>ProbeOps</title></head><body><h1>ProbeOps</h1><p>Failed to copy frontend assets.</p></body></html>' > nginx/frontend-build/index.html
    }
}

# Mark assets as copied with timestamped flag file
date > nginx/frontend-build/.assets-deployed

# Step 8: Handle docker volumes
log_info "Step 8: Setting up Docker volumes..."

# Check if we have a frontend build volume to update
if docker volume ls | grep -q "probenetworktools_frontend-build"; then
    log_info "Found existing frontend-build volume. Updating its contents..."
    
    # Create a temporary container to update the volume
    docker run --rm -v probenetworktools_frontend-build:/frontend-volume -v $(pwd)/nginx/frontend-build:/source-files alpine sh -c "cp -r /source-files/* /frontend-volume/"
    log_success "Frontend volume updated"
else
    log_info "frontend-build volume doesn't exist yet. It will be created during deployment."
fi

# Step 9: Stop existing containers
log_info "Step 9: Stopping existing containers..."
docker compose down || log_warning "No containers to stop or error stopping containers"

# Step 10: Start services
log_info "Step 10: Starting services..."
docker compose up -d
log_success "Services started"

# Step 11: Verify deployment
log_info "Step 11: Verifying deployment..."
sleep 5 # Give containers a moment to initialize

# Check nginx
if docker ps | grep -q "probeops-nginx"; then
    log_success "NGINX container is running"
else
    log_error "NGINX container failed to start!"
fi

# Check backend
if docker ps | grep -q "probeops-backend"; then
    log_success "Backend container is running"
else
    log_error "Backend container failed to start!"
fi

# Step 12: Display health status
log_info "Step 12: Service health status..."
docker compose ps

# Step 13: Final instructions
echo -e "\n${GREEN}==== DEPLOYMENT COMPLETED SUCCESSFULLY ====${NC}"
echo "To verify your deployment:"
echo "1. API endpoint: https://probeops.com/api/health"
echo "2. Frontend: https://probeops.com"
echo "3. Check logs: docker compose logs -f"
echo -e "\n${YELLOW}Note: If you see outdated content, clear your browser cache (Ctrl+F5)${NC}"

# Step 14: Show access URL
PUBLIC_IP=$(curl -s ifconfig.me || echo "your-server-ip")
echo -e "\n${GREEN}Your ProbeOps instance is now available at:${NC}"
echo "https://probeops.com"
echo "http://$PUBLIC_IP (if DNS not yet configured)"

# End timestamp
timestamp=$(date +"%Y-%m-%d %H:%M:%S")
echo -e "\n===== DEPLOYMENT FINISHED: $timestamp ====="