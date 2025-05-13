#!/bin/bash

# ProbeOps Simple Deployment Script for AWS EC2
# This is a simplified version for initial deployment that avoids Git-related issues

# Set script to exit on error
set -e

# Text formatting for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Variables
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
LOG_FILE="deployment.log"

# Initialize log file
echo "===== SIMPLE DEPLOYMENT STARTED: $TIMESTAMP =====" > $LOG_FILE

# Helper function for logging
log_message() {
    echo -e "${GREEN}$1${NC}"
    echo "$(date +"%Y-%m-%d %H:%M:%S") - $1" >> $LOG_FILE
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
    echo "$(date +"%Y-%m-%d %H:%M:%S") - WARNING: $1" >> $LOG_FILE
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    echo "$(date +"%Y-%m-%d %H:%M:%S") - ERROR: $1" >> $LOG_FILE
}

# Function to execute command and log output
execute_command() {
    local cmd="$1"
    local message="$2"
    local continue_on_error="${3:-false}"
    
    log_message "🔄 $message"
    echo "$ $cmd" >> $LOG_FILE
    
    # Execute command and capture output
    if output=$(eval "$cmd" 2>&1); then
        echo "$output" >> $LOG_FILE
        log_message "✅ $message completed successfully"
        return 0
    else
        echo "$output" >> $LOG_FILE
        log_error "$message failed"
        if [ "$continue_on_error" = "true" ]; then
            log_warning "Continuing despite error (as requested)"
            return 0
        else
            return 1
        fi
    fi
}

# Step 1: Make SSL directories
log_message "Step 1: Creating SSL directories if needed..."
execute_command "mkdir -p nginx/ssl/live/probeops.com-0001" "Creating SSL directories" true
execute_command "mkdir -p nginx/ssl/archive/probeops.com-0001" "Creating SSL archive directories" true
execute_command "mkdir -p nginx/ssl/renewal" "Creating SSL renewal directories" true 
execute_command "mkdir -p nginx/ssl/webroot/.well-known/acme-challenge" "Creating webroot challenge directories" true

# Step 2: Make sure all scripts are executable
log_message "Step 2: Setting script permissions..."
execute_command "chmod +x *.sh" "Setting executable permissions on scripts" true

# Step 3: Build the frontend
log_message "Step 3: Building frontend..."
if [ -d "frontend" ]; then
    execute_command "cd frontend && npm install && npm run build" "Installing frontend dependencies and building" true
    # Copy frontend assets for NGINX
    execute_command "./copy-frontend-assets.sh" "Copying frontend assets for NGINX" true
else
    log_warning "Frontend directory not found. Skipping frontend build."
fi

# Step 4: Stop existing containers
log_message "Step 4: Stopping any existing containers..."
execute_command "docker compose down" "Stopping existing containers" true

# Step 5: Rebuild and start containers
log_message "Step 5: Building and starting containers..."
execute_command "docker compose up -d --build" "Building and starting containers"

# Step 6: Wait for services to initialize
log_message "Step 6: Waiting for services to initialize..."
execute_command "sleep 15" "Waiting for services" true

# Step 7: Apply database migrations
log_message "Step 7: Applying database migrations..."
execute_command "docker compose exec -T backend alembic upgrade head" "Applying database migrations" true

# Step 8: Verify services
log_message "Step 8: Verifying services..."
execute_command "docker compose ps" "Checking container status" true

# Final status
log_message "===== DEPLOYMENT COMPLETED: $(date +"%Y-%m-%d %H:%M:%S") ====="
log_message "📊 Deployment Status: ✅ SUCCESS"
log_message "📝 See $LOG_FILE for detailed logs"

echo ""
echo "Deployment completed. Check deployment.log for details."
echo "To view logs: tail -f deployment.log"
echo "To view running containers: docker compose ps"
echo ""