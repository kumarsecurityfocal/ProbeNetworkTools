#!/bin/bash

# ProbeOps Clean Deployment Script
# This script performs a full deployment of the ProbeOps platform,
# ensuring proper build and configuration of all components
# With comprehensive logging to deployment.log

# Exit on any error
set -e

# Setup logging
DEPLOYMENT_DATE=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="deployment.log"
# No LATEST_LOG_FILE defined anymore, we'll remove that reference
cp -f "$LOG_FILE" "${LOG_FILE}.bak" 2>/dev/null || true

# Add header to log file
echo "===== DEPLOYMENT STARTED: $(date +"%Y-%m-%d %H:%M:%S") =====" > "$LOG_FILE"

# Output formatting
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions for logging
function log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
    echo "[SUCCESS] $(date +"%Y-%m-%d %H:%M:%S") - $1" >> "$LOG_FILE"
}

function log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}" | tee -a "$LOG_FILE"
    echo "[WARNING] $(date +"%Y-%m-%d %H:%M:%S") - $1" >> "$LOG_FILE"
}

function log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    echo "[ERROR] $(date +"%Y-%m-%d %H:%M:%S") - $1" >> "$LOG_FILE"
}

function log_info() {
    echo -e "${BLUE}ℹ️ $1${NC}" | tee -a "$LOG_FILE"
    echo "[INFO] $(date +"%Y-%m-%d %H:%M:%S") - $1" >> "$LOG_FILE"
}

# Function to capture command output with logging
function run_command() {
    local cmd="$1"
    local desc="$2"
    
    echo "$ $cmd" >> "$LOG_FILE"
    echo "[COMMAND] $(date +"%Y-%m-%d %H:%M:%S") - Running: $cmd" >> "$LOG_FILE"
    echo "[COMMAND] $desc" >> "$LOG_FILE"
    
    # Run the command and capture output
    output=$(eval "$cmd" 2>&1)
    exit_code=$?
    
    # Log the output
    echo "$output" >> "$LOG_FILE"
    echo "[COMMAND OUTPUT] Exit code: $exit_code" >> "$LOG_FILE"
    
    # Output to console if requested
    if [ "${3:-}" == "verbose" ]; then
        echo "$output"
    fi
    
    # Return the exit code
    return $exit_code
}

# Initialize log file
timestamp=$(date +"%Y-%m-%d %H:%M:%S")
echo "===== DEPLOYMENT STARTED: $timestamp =====" | tee -a "$LOG_FILE"
echo "Deployment script version: 1.0.0" >> "$LOG_FILE"
echo "System information:" >> "$LOG_FILE"
uname -a >> "$LOG_FILE"
echo "Docker version:" >> "$LOG_FILE"
docker --version >> "$LOG_FILE" 2>&1 || echo "Docker not found" >> "$LOG_FILE"
echo "Node version:" >> "$LOG_FILE"
node --version >> "$LOG_FILE" 2>&1 || echo "Node.js not found" >> "$LOG_FILE"
echo "npm version:" >> "$LOG_FILE"
npm --version >> "$LOG_FILE" 2>&1 || echo "npm not found" >> "$LOG_FILE"
echo "Python version:" >> "$LOG_FILE"
python3 --version >> "$LOG_FILE" 2>&1 || echo "Python3 not found" >> "$LOG_FILE"
echo "===== ENVIRONMENT INFORMATION LOGGED =====" >> "$LOG_FILE"

# No symlink needed anymore as we're using a fixed log file path

log_info "Deployment started. Logging to $LOG_FILE"

# Step 1: Pull latest code
log_info "Step 1: Pulling latest code from Git..."
if [ -d ".git" ]; then
    run_command "git status" "Checking git repository status"
    run_command "git pull" "Pulling latest code from repository"
    log_success "Code updated from git repository"
else
    log_warning "Not a git repository, skipping code update"
fi

# Step 2: Set executable permissions
log_info "Step 2: Setting executable permissions on scripts..."
run_command "find . -name \"*.sh\" -type f | sort" "Listing shell scripts"
run_command "find . -name \"*.sh\" -exec chmod +x {} \;" "Setting executable permissions"
log_success "Executable permissions set on all scripts"

# Step 3: Environment setup
log_info "Step 3: Checking environment variables..."
run_command "ls -la .env* 2>/dev/null || echo 'No .env files found'" "Listing environment files"

if [ -f ".env" ]; then
    run_command "grep -v '^#' .env | grep -v '^$' | wc -l" "Counting active environment variables (excluding comments and empty lines)"
    log_success "Found .env file"
else
    log_warning ".env file not found. Creating from template..."
    if [ -f ".env.template" ]; then
        run_command "cp .env.template .env" "Creating .env from template"
        log_success "Created .env from template"
    else
        log_error "No .env.template found. Please create .env file manually."
    fi
fi

# Check for essential environment variables
log_info "Step 4: Testing database connection..."

# Check for external backend environment file in production location
if [ -d "../environment" ] && [ -f "../environment/.env.backend" ]; then
    log_info "Found production environment file at ../environment/.env.backend"
    run_command "cp ../environment/.env.backend ./backend/.env.backend" "Copying production environment file"
    log_success "Copied production environment file to ./backend/.env.backend"
elif [ -f "../.env.backend" ]; then
    log_info "Found external backend environment file at ../.env.backend"
    run_command "cp ../.env.backend ./backend/.env.backend" "Copying external backend environment file"
    log_success "Copied external backend environment file to ./backend/.env.backend"
fi

if [ -z "${DATABASE_URL}" ]; then
    log_error "DATABASE_URL not set! Check your .env file."
    
    # Check for backend environment variables
    if [ -f "backend/.env.backend" ]; then
        run_command "grep -v '^#' backend/.env.backend | grep -v '^$' | wc -l" "Counting active backend environment variables"
        log_info "Using backend/.env.backend for database configuration"
    else
        log_warning "backend/.env.backend not found! Creating from template..."
        if [ -f "backend/.env.backend.template" ]; then
            run_command "cp backend/.env.backend.template backend/.env.backend" "Creating backend/.env.backend from template"
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
run_command "docker compose config" "Validating docker-compose.yml"
log_success "Docker Compose configuration is valid"

# Step 6: Clean and rebuild frontend assets
log_info "Step 6: Cleaning and rebuilding frontend assets..."
run_command "rm -rf public/*" "Cleaning public directory"
run_command "mkdir -p public" "Creating public directory for frontend assets"

if [ -d "frontend" ]; then
    # Use Docker for consistent build environment
    log_info "Building frontend using Docker..."
    echo "[BUILD] $(date +"%Y-%m-%d %H:%M:%S") - Building frontend with Docker" >> "$LOG_FILE"
    
    # Force rebuild of frontend container
    run_command "docker compose build --no-cache frontend-build" "Rebuilding frontend container with no cache"
    
    # Start the frontend build container and wait for it to complete
    run_command "docker compose up -d frontend-build" "Starting frontend build container"
    
    # Wait for build to complete
    log_info "Waiting for frontend build to complete..."
    run_command "sleep 20" "Waiting for build to complete"
    
    # Display build logs
    run_command "docker compose logs frontend-build" "Displaying frontend build logs"
    
    # Check if build was successful
    if [ -f "public/index.html" ]; then
        run_command "ls -la public/" "Listing built frontend assets"
        run_command "head -n 10 public/index.html" "Displaying first 10 lines of index.html"
        log_success "Frontend assets built successfully"
    else
        log_error "Frontend build failed! Check the build logs for errors."
        run_command "docker compose logs frontend-build" "Displaying frontend build logs again"
        echo "[BUILD_ERROR] $(date +"%Y-%m-%d %H:%M:%S") - Frontend build failed, deployment will be incomplete" >> "$LOG_FILE"
        exit 1
    fi
else
    log_error "Frontend directory not found!"
    run_command "ls -la" "Listing root directory to find frontend folder"
    echo "[BUILD_ERROR] $(date +"%Y-%m-%d %H:%M:%S") - Frontend directory missing, deployment will be incomplete" >> "$LOG_FILE"
    exit 1
fi

# Step 7: Copy frontend assets to NGINX
log_info "Step 7: Copying frontend assets to NGINX..."
run_command "mkdir -p nginx/frontend-build" "Creating nginx/frontend-build directory"
run_command "rm -rf nginx/frontend-build/*" "Cleaning nginx/frontend-build directory"
run_command "ls -la public/" "Listing public directory contents before copy"

echo "[COPY] $(date +"%Y-%m-%d %H:%M:%S") - Copying frontend assets to NGINX" >> "$LOG_FILE"
run_command "cp -rv public/* nginx/frontend-build/" "Copying assets to nginx/frontend-build directory"

# Verify files were copied successfully
if [ ! -f "nginx/frontend-build/index.html" ]; then
    log_error "Failed to copy index.html to nginx/frontend-build/"
    echo "[COPY_ERROR] $(date +"%Y-%m-%d %H:%M:%S") - Failed to copy frontend assets" >> "$LOG_FILE"
    exit 1
fi

run_command "ls -la nginx/frontend-build/" "Listing nginx/frontend-build directory after copy"

# Mark assets as copied with timestamped flag file
echo "$(date)" > nginx/frontend-build/.assets-deployed
echo "[COPY] $(date +"%Y-%m-%d %H:%M:%S") - Created timestamp file .assets-deployed" >> "$LOG_FILE"
log_success "Frontend assets copied to NGINX directory"

# Step 8: Handle docker volumes
log_info "Step 8: Setting up Docker volumes..."
run_command "docker volume ls | grep probenetworktools" "Listing ProbeOps Docker volumes"

# Remove existing frontend volume to ensure clean state
if docker volume ls | grep -q "probenetworktools_frontend-build"; then
    log_info "Found existing frontend-build volume. Removing for clean rebuild..."
    echo "[VOLUME] $(date +"%Y-%m-%d %H:%M:%S") - Removing frontend-build volume for clean rebuild" >> "$LOG_FILE"
    run_command "docker volume rm probenetworktools_frontend-build" "Removing frontend-build volume"
fi

# Create a new volume
log_info "Creating fresh frontend-build volume..."
run_command "docker volume create probenetworktools_frontend-build" "Creating new frontend-build volume"

# Create a temporary container to initialize the volume with our assets
log_info "Copying assets to new volume..."
run_command "docker run --rm -v probenetworktools_frontend-build:/frontend-volume -v $(pwd)/nginx/frontend-build:/source-files alpine sh -c \"cp -rv /source-files/* /frontend-volume/ && echo 'Copy completed' && ls -la /frontend-volume/\"" "Copying assets to new frontend-build volume"
log_success "Fresh frontend volume created and populated with latest assets"

# Step 9: Stop existing containers
log_info "Step 9: Stopping existing containers..."
echo "[DOCKER] $(date +"%Y-%m-%d %H:%M:%S") - Stopping containers" >> "$LOG_FILE"
run_command "docker compose ps" "Listing currently running containers"
run_command "docker compose down" "Stopping and removing containers" || {
    log_warning "No containers to stop or error stopping containers"
    echo "[DOCKER] $(date +"%Y-%m-%d %H:%M:%S") - Error stopping containers or none running" >> "$LOG_FILE"
}

# Step 10: Start services with forced rebuild
log_info "Step 10: Starting services with forced rebuild..."
echo "[DOCKER] $(date +"%Y-%m-%d %H:%M:%S") - Starting containers with forced rebuild" >> "$LOG_FILE"
run_command "docker compose build --no-cache" "Rebuilding all containers with no cache"
run_command "docker compose up -d --force-recreate" "Starting all services with forced recreation"
log_success "Services rebuilt and started"

# Step 11: Verify deployment
log_info "Step 11: Verifying deployment..."
echo "[VERIFY] $(date +"%Y-%m-%d %H:%M:%S") - Verifying deployment" >> "$LOG_FILE"
run_command "sleep 5" "Waiting for containers to initialize"

# Check nginx
if docker ps | grep -q "probeops-nginx"; then
    run_command "docker logs probeops-nginx --tail 20" "Last 20 lines of NGINX logs"
    log_success "NGINX container is running"
else
    log_error "NGINX container failed to start!"
    echo "[VERIFY] $(date +"%Y-%m-%d %H:%M:%S") - NGINX container not running" >> "$LOG_FILE"
fi

# Check backend
if docker ps | grep -q "probeops-backend"; then
    run_command "docker logs probeops-backend --tail 20" "Last 20 lines of backend logs"
    log_success "Backend container is running"
else
    log_error "Backend container failed to start!"
    echo "[VERIFY] $(date +"%Y-%m-%d %H:%M:%S") - Backend container not running" >> "$LOG_FILE"
fi

# Step 12: Display health status
log_info "Step 12: Service health status..."
run_command "docker compose ps" "Listing container status"

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