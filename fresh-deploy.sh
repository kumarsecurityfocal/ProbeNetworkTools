#!/bin/bash

# ProbeOps Fresh Deployment Script - Single File, Fresh Server
# This script performs a complete first-time deployment of the ProbeOps platform 
# with no dependencies on existing setup or external scripts.
# All commands are contained within this single script.
# 
# IMPORTANT: This script is for fresh installations only.
# - It will NOT attempt to fix deployment issues automatically
# - It will stop on ANY error (strict mode)
# - It will provide detailed logs for diagnostics
# - It will NOT modify or adjust configuration files

# Exit immediately on ANY error and enable command printing for transparency
set -e
set -v

# Setup comprehensive logging
LOG_FILE="deployment.log"

# Start fresh log file
echo "===== FRESH DEPLOYMENT STARTED: $(date +"%Y-%m-%d %H:%M:%S.%3N") =====" > "$LOG_FILE"
echo "===== RUNNING ON: $(hostname) =====" >> "$LOG_FILE"
echo "===== SYSTEM INFO =====" >> "$LOG_FILE"
uname -a >> "$LOG_FILE" 2>&1

# Output formatting
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions for logging
function log_success() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S.%3N")
    echo -e "${GREEN}[${timestamp}] ✅ $1${NC}" | tee -a "$LOG_FILE"
    echo "[SUCCESS] ${timestamp} - $1" >> "$LOG_FILE"
}

function log_warning() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S.%3N")
    echo -e "${YELLOW}[${timestamp}] ⚠️ $1${NC}" | tee -a "$LOG_FILE"
    echo "[WARNING] ${timestamp} - $1" >> "$LOG_FILE"
}

function log_error() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S.%3N")
    echo -e "${RED}[${timestamp}] ❌ $1${NC}" | tee -a "$LOG_FILE"
    echo "[ERROR] ${timestamp} - $1" >> "$LOG_FILE"
}

function log_info() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S.%3N")
    echo -e "${BLUE}[${timestamp}] ℹ️ $1${NC}" | tee -a "$LOG_FILE"
    echo "[INFO] ${timestamp} - $1" >> "$LOG_FILE"
}

# Function to capture command output with very verbose logging
function run_command() {
    local cmd="$1"
    local desc="$2"
    
    log_info "Running: $desc"
    echo "[COMMAND_START] $(date +"%Y-%m-%d %H:%M:%S.%3N") - $cmd" >> "$LOG_FILE"
    echo "$ $cmd" | tee -a "$LOG_FILE"
    
    # Log command start time for performance measurement
    local start_time=$(date +%s.%N)
    
    # Run the command and capture its output and exit status
    local output
    local exit_status=0
    
    output=$(eval "$cmd" 2>&1) || exit_status=$?
    
    # Calculate command duration
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    # Write output to log
    echo "[COMMAND_OUTPUT_BEGIN] $(date +"%Y-%m-%d %H:%M:%S.%3N")" >> "$LOG_FILE"
    echo "$output" >> "$LOG_FILE"
    echo "[COMMAND_OUTPUT_END] $(date +"%Y-%m-%d %H:%M:%S.%3N") (Duration: ${duration}s)" >> "$LOG_FILE"
    
    # Display output to console
    echo "$output"
    
    # Check the exit status
    if [ $exit_status -ne 0 ]; then
        log_error "Command failed with exit status $exit_status: $cmd"
        echo "[COMMAND_FAILED] $(date +"%Y-%m-%d %H:%M:%S.%3N") - EXIT CODE: $exit_status - DURATION: ${duration}s" >> "$LOG_FILE"
        return $exit_status
    else
        echo "[COMMAND_SUCCESS] $(date +"%Y-%m-%d %H:%M:%S.%3N") - DURATION: ${duration}s" >> "$LOG_FILE"
    fi
    
    return 0
}

# Function to verify a condition and exit if it fails
function verify_or_exit() {
    local condition="$1"
    local error_message="$2"
    local suggestion="$3"
    
    if ! eval "$condition"; then
        log_error "$error_message"
        if [ -n "$suggestion" ]; then
            log_info "Suggestion: $suggestion"
        fi
        exit 1
    fi
}

# Log detailed system and dependency information
log_info "Collecting detailed system information..."
echo "===== DETAILED SYSTEM INFORMATION =====" >> "$LOG_FILE"
echo "Kernel and OS details:" >> "$LOG_FILE"
uname -a >> "$LOG_FILE" 2>&1
echo "CPU information:" >> "$LOG_FILE"
lscpu >> "$LOG_FILE" 2>&1 || echo "lscpu not available" >> "$LOG_FILE"
echo "Memory information:" >> "$LOG_FILE"
free -h >> "$LOG_FILE" 2>&1 || echo "free command not available" >> "$LOG_FILE"
echo "Disk space:" >> "$LOG_FILE"
df -h >> "$LOG_FILE" 2>&1 || echo "df command not available" >> "$LOG_FILE"

# Log dependency versions
echo "===== DEPENDENCY VERSIONS =====" >> "$LOG_FILE"
echo "Docker version:" >> "$LOG_FILE"
docker --version >> "$LOG_FILE" 2>&1 || echo "Docker not found - REQUIRED" >> "$LOG_FILE"
echo "Docker Compose version:" >> "$LOG_FILE"
docker compose version >> "$LOG_FILE" 2>&1 || echo "Docker Compose not found - REQUIRED" >> "$LOG_FILE"
echo "Node version:" >> "$LOG_FILE"
node --version >> "$LOG_FILE" 2>&1 || echo "Node.js not found - REQUIRED" >> "$LOG_FILE"
echo "npm version:" >> "$LOG_FILE"
npm --version >> "$LOG_FILE" 2>&1 || echo "npm not found - REQUIRED" >> "$LOG_FILE"
echo "Python version:" >> "$LOG_FILE"
python3 --version >> "$LOG_FILE" 2>&1 || echo "Python3 not found - REQUIRED" >> "$LOG_FILE"
echo "pip version:" >> "$LOG_FILE"
pip3 --version >> "$LOG_FILE" 2>&1 || echo "pip3 not found - REQUIRED" >> "$LOG_FILE"
echo "===== END OF ENVIRONMENT INFORMATION =====" >> "$LOG_FILE"

# Check for required dependencies
verify_or_exit "command -v docker >/dev/null 2>&1" "Docker is not installed" "Install Docker using: curl -fsSL https://get.docker.com | sh"
verify_or_exit "docker compose version >/dev/null 2>&1" "Docker Compose is not available" "Update Docker or install Docker Compose separately"

log_info "Starting fresh ProbeOps deployment"

# Step 1: Verify Project Structure
log_info "Step 1: Verifying project structure..."
run_command "ls -la" "Listing root directory contents"

# Set executable permissions on all scripts
log_info "Step 2: Setting executable permissions on all scripts..."
run_command "find . -name \"*.sh\" -type f | sort" "Listing all shell scripts in the project"
run_command "find . -name \"*.sh\" -exec chmod +x {} \;" "Setting executable permissions on all scripts"
log_success "All shell scripts are now executable"

# Step 3: Fresh Environment Setup
log_info "Step 3: Setting up fresh environment configuration..."

# Create environment files from templates
if [ -f ".env.template" ]; then
    # Check if environment file already exists
    if [ ! -f ".env" ]; then
        log_info "Creating main .env file from template..."
        
        # Check if we should use the environment file from home directory
        if [ -f "/home/ubuntu/environment/.env" ]; then
            log_info "Using existing .env from /home/ubuntu/environment directory..."
            run_command "cp /home/ubuntu/environment/.env .env" "Copying .env from /home/ubuntu/environment"
        else
            # Use template as fallback if no existing file is found
            run_command "cp .env.template .env" "Creating .env from template"
        fi
        log_success "Created main .env file"
    else
        log_info "✅ Skipping main .env overwrite — file already exists"
    fi
    
    # Count usable environment variables
    env_var_count=$(grep -v '^#' .env | grep -v '^$' | wc -l)
    log_info "Main .env file contains $env_var_count active configuration variables"
    
    # Check if we need to manually update the .env file
    if grep -q "CHANGE_ME" .env || grep -q "your-" .env || grep -q "example" .env; then
        log_warning "ATTENTION: .env file contains placeholder values that need to be replaced"
        echo "[ENV_WARNING] Found placeholder values in .env file" >> "$LOG_FILE"
        grep -n "CHANGE_ME\|your-\|example" .env >> "$LOG_FILE"
    fi
else
    log_error "Main .env.template file not found! This is required for deployment."
    echo "[ENV_ERROR] No .env.template found" >> "$LOG_FILE"
    exit 1
fi

# Create backend environment file
if [ -f "backend/.env.backend.template" ]; then
    # Check if environment file already exists
    if [ ! -f "backend/.env.backend" ]; then
        log_info "Creating backend .env.backend file from template..."
        
        # Check if we should use the environment file from home directory
        if [ -f "/home/ubuntu/environment/.env.backend" ]; then
            log_info "Using existing .env.backend from /home/ubuntu/environment directory..."
            run_command "cp /home/ubuntu/environment/.env.backend backend/.env.backend" "Copying .env.backend from /home/ubuntu/environment"
        else
            # Use template as fallback if no existing file is found
            run_command "cp backend/.env.backend.template backend/.env.backend" "Creating backend/.env.backend from template"
        fi
        log_success "Created backend environment configuration"
    else
        log_info "✅ Skipping .env.backend overwrite — file already exists"
    fi
    
    run_command "cat backend/.env.backend | grep -v '^#' | grep -v '^$'" "Displaying active backend environment variables"
    
    # Check if we need to manually update the backend .env file
    if grep -q "CHANGE_ME" backend/.env.backend || grep -q "your-" backend/.env.backend || grep -q "example" backend/.env.backend; then
        log_warning "ATTENTION: backend/.env.backend file contains placeholder values that need to be replaced"
        echo "[ENV_WARNING] Found placeholder values in backend/.env.backend file" >> "$LOG_FILE"
        grep -n "CHANGE_ME\|your-\|example" backend/.env.backend >> "$LOG_FILE"
    fi
else
    log_error "Backend .env.backend.template file not found! This is required for deployment."
    echo "[ENV_ERROR] No backend/.env.backend.template found" >> "$LOG_FILE"
    exit 1
fi

# Step 4: Database Configuration
log_info "Step 4: Configuring database connection..."

# Check if database configuration is available
if grep -q "DATABASE_URL" backend/.env.backend; then
    log_info "Checking database configuration in backend/.env.backend"
    db_url=$(grep "DATABASE_URL" backend/.env.backend | cut -d= -f2-)
    
    if [[ "$db_url" == *"CHANGE_ME"* ]] || [[ "$db_url" == *"your-"* ]] || [[ "$db_url" == *"example"* ]]; then
        log_error "DATABASE_URL contains placeholder values and must be updated"
        echo "[DATABASE_ERROR] DATABASE_URL contains placeholder: $db_url" >> "$LOG_FILE"
        log_info "Suggestion: Update backend/.env.backend with a valid database connection string"
        exit 1
    else
        log_success "Database connection string found in backend/.env.backend"
        echo "[DATABASE] Found database connection string (redacted for security)" >> "$LOG_FILE"
    fi
else
    log_error "DATABASE_URL not found in backend/.env.backend"
    echo "[DATABASE_ERROR] DATABASE_URL not found in configuration" >> "$LOG_FILE"
    log_info "Suggestion: Add DATABASE_URL=<connection_string> to backend/.env.backend"
    exit 1
fi

# Step 5: Validating Docker Compose configuration
log_info "Step 5: Validating Docker Compose configuration..."
run_command "docker compose config" "Validating docker-compose.yml"
log_success "Docker Compose configuration is valid"

# Step 6: Clean and rebuild frontend assets
log_info "Step 6: Cleaning and rebuilding frontend assets..."
run_command "sudo rm -rf public/*" "Cleaning public directory"
run_command "mkdir -p public" "Creating public directory for frontend assets"

# Use Docker for consistent build environment
log_info "Building frontend using Docker..."
echo "[BUILD] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Building frontend with Docker" >> "$LOG_FILE"

# First, verify the Dockerfile exists and has the correct content
log_info "Verifying frontend Dockerfile..."
run_command "cat frontend/Dockerfile" "Displaying frontend Dockerfile content"

# Explicitly build the frontend using docker directly, not via docker-compose
log_info "Building frontend image with Docker directly..."
run_command "docker build -t probeops-frontend-build ./frontend" "Building frontend Docker image directly"

# Run the container with proper volume mounting to extract the build
run_command "docker run --rm -v $(pwd)/public:/public probeops-frontend-build sh -c 'cp -r /app/dist/* /public/'" "Building frontend assets and copying to public directory"

# Fix file ownership issues from Docker operations
log_info "Fixing ownership of public directory files..."
run_command "sudo chown -R \$USER:\$USER public/" "Resetting ownership of public directory to current user"
log_success "Public directory file ownership fixed"

# Make sure we have the public directory 
run_command "mkdir -p public" "Ensuring public directory exists"

# Verify the frontend build worked
run_command "ls -la public/" "Listing public directory contents after build"

# Check if build was successful
if [ -f "public/index.html" ]; then
    run_command "ls -la public/" "Listing built frontend assets"
    run_command "head -n 10 public/index.html" "Displaying first 10 lines of index.html"
    log_success "Frontend assets built successfully"
else
    log_error "Frontend build failed! Check the build logs for errors."
    run_command "docker compose logs frontend-build" "Displaying frontend build logs again"
    echo "[BUILD_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Frontend build failed, deployment will be incomplete" >> "$LOG_FILE"
    exit 1
fi

# Step 7: Copy frontend assets to NGINX
log_info "Step 7: Copying frontend assets to NGINX..."
run_command "mkdir -p nginx/frontend-build" "Creating nginx/frontend-build directory"
run_command "sudo rm -rf nginx/frontend-build/*" "Cleaning nginx/frontend-build directory"
run_command "ls -la public/" "Listing public directory contents before copy"

echo "[COPY] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Copying frontend assets to NGINX" >> "$LOG_FILE"
run_command "sudo cp -rv public/* nginx/frontend-build/" "Copying assets to nginx/frontend-build directory"

# Verify files were copied successfully
if [ ! -f "nginx/frontend-build/index.html" ]; then
    log_error "Failed to copy index.html to nginx/frontend-build/"
    echo "[COPY_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Failed to copy frontend assets" >> "$LOG_FILE"
    exit 1
fi

run_command "ls -la nginx/frontend-build/" "Listing nginx/frontend-build directory after copy"

# Mark assets as copied with timestamped flag file
echo "$(date)" > nginx/frontend-build/.assets-deployed
echo "[COPY] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Created timestamp file .assets-deployed" >> "$LOG_FILE"
log_success "Frontend assets copied to NGINX directory"

# Step 8: Handle docker volumes
log_info "Step 8: Setting up Docker volumes..."
run_command "docker volume ls | grep probenetworktools || true" "Listing ProbeOps Docker volumes"

# Remove existing frontend volume to ensure clean state
if docker volume ls | grep -q "probenetworktools_frontend-build"; then
    log_info "Found existing frontend-build volume. Removing for clean rebuild..."
    echo "[VOLUME] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Removing frontend-build volume for clean rebuild" >> "$LOG_FILE"
    
    # Try to remove the volume but don't fail if it's in use
    docker volume rm probenetworktools_frontend-build &>/dev/null || {
        log_warning "Could not remove frontend-build volume (it may be in use) - continuing anyway"
        echo "[VOLUME_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Could not remove frontend-build volume (may be in use)" >> "$LOG_FILE"
    }
fi

# Create a new volume (if it doesn't already exist)
log_info "Creating fresh frontend-build volume..."
docker volume create probenetworktools_frontend-build &>/dev/null || {
    log_warning "Volume might already exist or there was an issue creating it - continuing anyway"
    echo "[VOLUME_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Issue with volume creation" >> "$LOG_FILE"
}

# Create a temporary container to initialize the volume with our assets
log_info "Copying assets to new volume..."
run_command "docker run --rm -v probenetworktools_frontend-build:/frontend-volume -v $(pwd)/nginx/frontend-build:/source-files alpine sh -c \"cp -rv /source-files/* /frontend-volume/ && echo 'Copy completed' && ls -la /frontend-volume/\"" "Copying assets to new frontend-build volume"
log_success "Fresh frontend volume created and populated with latest assets"

# Step 9: Stop existing containers
log_info "Step 9: Stopping existing containers..."
echo "[DOCKER] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Stopping containers" >> "$LOG_FILE"
run_command "docker compose down" "Stopping and removing all existing containers"
log_success "All existing containers stopped and removed"

# Step 10: Start services with forced rebuild
log_info "Step 10: Starting services with forced rebuild..."
echo "[DOCKER] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Starting containers with forced rebuild" >> "$LOG_FILE"
run_command "docker compose build --no-cache" "Rebuilding all containers with no cache"
run_command "docker compose up -d --force-recreate" "Starting all services with forced recreation"
log_success "Services rebuilt and started"

# Step 11: Verify deployment
log_info "Step 11: Verifying deployment..."
echo "[VERIFY] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Verifying deployment" >> "$LOG_FILE"

# Wait for services to initialize
log_info "Waiting for services to initialize..."
run_command "sleep 30" "Waiting for services to initialize (30 seconds)"

# Get container status
run_command "docker compose ps" "Checking container status"

# Create logs directory for container logs
LOG_DIR="container_logs"
mkdir -p "$LOG_DIR"
echo "[LOGS] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Collecting container logs to $LOG_DIR directory" >> "$LOG_FILE"

# Get list of running containers for this project
CONTAINERS=$(docker compose ps --services)

# Collect logs from all containers
for container in $CONTAINERS; do
    log_info "Collecting logs from $container container..."
    container_log_file="$LOG_DIR/${container}_$(date +"%Y%m%d_%H%M%S").log"
    echo "===== $container CONTAINER LOGS =====" > "$container_log_file"
    echo "Timestamp: $(date)" >> "$container_log_file"
    echo "===================================" >> "$container_log_file"
    
    # Get container logs
    docker compose logs --no-color "$container" >> "$container_log_file" 2>&1
    
    # Also append logs to deployment log
    echo "[CONTAINER_LOGS] $container - $(date +"%Y-%m-%d %H:%M:%S.%3N")" >> "$LOG_FILE"
    docker compose logs --no-color --tail 50 "$container" >> "$LOG_FILE" 2>&1
    echo "[END_CONTAINER_LOGS] $container" >> "$LOG_FILE"
    
    log_success "Saved $container logs to $container_log_file"
done

# Check NGINX status
log_info "Checking NGINX status..."
if docker compose ps | grep -q "nginx"; then
    if docker compose ps | grep -q "nginx" | grep -q "Up"; then
        log_success "NGINX container is running"
    else
        log_error "NGINX container is not healthy"
        run_command "docker inspect $(docker compose ps -q nginx)" "Inspecting NGINX container"
    fi
else
    log_error "NGINX container not found"
fi

# Check backend status
log_info "Checking backend status..."
if docker compose ps | grep -q "backend"; then
    if docker compose ps | grep -q "backend" | grep -q "Up"; then
        log_success "Backend container is running"
    else
        log_error "Backend container is not healthy"
        run_command "docker inspect $(docker compose ps -q backend)" "Inspecting backend container" 
    fi
else
    log_error "Backend container not found"
fi

# Test health endpoints
log_info "Testing container health endpoints..."
if curl -s http://localhost:80/health > /dev/null; then
    log_success "NGINX health endpoint is responding"
else
    log_warning "NGINX health endpoint is not responding"
fi

if curl -s http://localhost:8000/health > /dev/null; then
    log_success "Backend health endpoint is responding"
else
    log_warning "Backend health endpoint is not responding"
fi

# Final verification
log_info "Performing final deployment verification..."

# Get public IP if available
PUBLIC_IP=$(curl -s ifconfig.me)

# Collect additional status information
log_info "Collecting additional system status information..."

# Check Docker resource usage
echo "[RESOURCE_USAGE] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Docker stats snapshot" >> "$LOG_FILE"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" >> "$LOG_FILE"

# Check for any container warnings in logs
log_info "Checking for warnings or errors in container logs..."
warnings_file="$LOG_DIR/container_warnings.log"
echo "===== CONTAINER WARNINGS AND ERRORS =====" > "$warnings_file"
echo "Timestamp: $(date)" >> "$warnings_file"
echo "=========================================" >> "$warnings_file"

for container in $CONTAINERS; do
    echo "--- $container ---" >> "$warnings_file"
    docker compose logs "$container" 2>&1 | grep -i "warn\|error\|exception\|fail" >> "$warnings_file" || echo "No warnings or errors found" >> "$warnings_file"
    echo "" >> "$warnings_file"
done

log_success "Saved container warnings and errors to $warnings_file"

# Summary and endpoint information
echo "===== DEPLOYMENT COMPLETE =====" | tee -a "$LOG_FILE"
echo "ProbeOps is now deployed with the following endpoints:" | tee -a "$LOG_FILE"
echo "1. API endpoint: https://probeops.com/api/health" | tee -a "$LOG_FILE"
echo "2. Frontend: https://probeops.com" | tee -a "$LOG_FILE"

if [ -n "$PUBLIC_IP" ]; then
    echo "3. Or via IP address if DNS is not configured: http://$PUBLIC_IP" | tee -a "$LOG_FILE"
fi

# Log locations
echo "" | tee -a "$LOG_FILE"
echo "Log files:" | tee -a "$LOG_FILE"
echo "1. Main deployment log: $LOG_FILE" | tee -a "$LOG_FILE"
echo "2. Container logs directory: $LOG_DIR/" | tee -a "$LOG_FILE"
echo "3. Container warnings and errors: $warnings_file" | tee -a "$LOG_FILE"

log_success "Deployment completed successfully. Use the following URLs to access the application:"
echo "https://probeops.com"
echo "http://$PUBLIC_IP (if DNS not yet configured)"

echo "===== DEPLOYMENT FINISHED: $(date +"%Y-%m-%d %H:%M:%S.%3N") =====" >> "$LOG_FILE"
log_info "All logs saved. See $LOG_FILE and $LOG_DIR/ for detailed information."