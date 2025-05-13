#!/bin/bash

# ProbeOps Deployment Script for AWS EC2
# This script pulls the latest code, rebuilds containers, and applies database migrations.

# Set script to exit on error
set -e

# Variables
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
REPO_URL="https://github.com/yourusername/ProbeNetworkTools.git"  # Replace with your actual repo URL
BRANCH="main"
LOG_FILE="deployment.log"

# Initialize log file
echo "===== DEPLOYMENT STARTED: $TIMESTAMP =====" > $LOG_FILE

# Helper function for logging
log_message() {
    echo "$1"
    echo "$(date +"%Y-%m-%d %H:%M:%S") - $1" >> $LOG_FILE
}

# Function to execute command and log output
execute_and_log() {
    local cmd="$1"
    local message="$2"
    local continue_on_error="${3:-false}"
    
    log_message "🔄 $message"
    echo "$ $cmd" >> $LOG_FILE
    
    # Execute command and capture output along with exit code
    local temp_log=$(mktemp)
    eval "$cmd" > >(tee -a "$temp_log" "$LOG_FILE") 2> >(tee -a "$temp_log" "$LOG_FILE" >&2)
    local exit_code=$?
    
    # Check for errors or warnings in the output
    if grep -q "ERROR" "$temp_log"; then
        log_message "⚠️ Errors detected during '$message'"
        grep "ERROR" "$temp_log" | while read -r line; do
            log_message "  ❌ $line"
        done
    fi
    
    if grep -q "WARNING\|WARN" "$temp_log"; then
        log_message "⚠️ Warnings detected during '$message'"
        grep -E "WARNING|WARN" "$temp_log" | while read -r line; do
            log_message "  ⚠️ $line"
        done
    fi
    
    # Remove temporary log file
    rm -f "$temp_log"
    
    # Handle exit code
    if [ $exit_code -eq 0 ]; then
        log_message "✅ $message completed successfully"
        return 0
    else
        log_message "❌ $message failed with exit code $exit_code"
        if [ "$continue_on_error" = "true" ]; then
            log_message "⚠️ Continuing despite error (as requested)"
            return 0
        else
            return 1
        fi
    fi
}

# Step 1: Check for uncommitted changes before git pull
log_message "🔄 Checking for uncommitted changes..."
echo "$ git status --porcelain" >> $LOG_FILE
uncommitted_changes=$(git status --porcelain)

if [[ -n "$uncommitted_changes" ]]; then
    log_message "⚠️ Uncommitted changes detected. This could cause merge conflicts during deployment."
    echo "$uncommitted_changes" >> $LOG_FILE
    
    # Display list of uncommitted files
    echo "Uncommitted files:" >> $LOG_FILE
    echo "$uncommitted_changes" | awk '{print $2}' >> $LOG_FILE
    
    log_message "❓ You have three options:"
    log_message "  1. Abort the deployment (default)"
    log_message "  2. Stash changes and continue"
    log_message "  3. Force pull (may overwrite local changes)"
    
    # Ask for user input with 30 second timeout
    log_message "⏱️ Waiting 30 seconds for input (default: abort)..."
    echo "$ read -t 30 -p 'Enter choice [1-3]: ' choice" >> $LOG_FILE
    
    # Prompt for input with timeout
    read -t 30 -p "Enter choice [1-3]: " choice || choice=1
    echo "User choice: $choice" >> $LOG_FILE
    
    case $choice in
        2)
            log_message "🔄 Stashing local changes..."
            if execute_and_log "git stash --include-untracked" "Stashing local changes"; then
                log_message "✅ Changes stashed. Proceeding with git pull."
            else
                log_message "❌ Failed to stash changes. Aborting deployment."
                exit 1
            fi
            ;;
        3)
            log_message "⚠️ Force pull selected. Local changes may be lost."
            if execute_and_log "git reset --hard" "Resetting local changes"; then
                log_message "✅ Local changes reset. Proceeding with git pull."
            else
                log_message "❌ Failed to reset local changes. Aborting deployment."
                exit 1
            fi
            ;;
        *)
            log_message "❌ Deployment aborted to prevent merge conflicts."
            exit 1
            ;;
    esac
else
    log_message "✅ No uncommitted changes detected. Proceeding with git pull."
fi

# Now proceed with git pull
if execute_and_log "git pull origin $BRANCH" "Pulling latest code from GitHub ($BRANCH branch)"; then
    log_message "✅ Code successfully updated from $BRANCH branch"
else
    log_message "❌ Deployment failed at git pull step"
    exit 1
fi

# Step 1.5: Check environment variables safety
log_message "🛡️ Checking if backend/.env.backend.template has changed..."
echo "$ Comparing template with environment variables" >> $LOG_FILE

# Check if the environment directory exists
if [ -d "../environment" ] && [ -f "../environment/.env.backend" ]; then
    # Extract keys from template and actual env files
    TEMPLATE_KEYS=$(grep -v '^#' ./backend/.env.backend.template | cut -d= -f1 | sort)
    ACTUAL_KEYS=$(grep -v '^#' ../environment/.env.backend | cut -d= -f1 | sort)
    
    # Use process substitution with comm to find missing keys
    MISSING_KEYS=$(comm -23 <(echo "$TEMPLATE_KEYS") <(echo "$ACTUAL_KEYS"))
    
    if [[ -n "$MISSING_KEYS" ]]; then
        log_message "❌ ERROR: Your production .env.backend is missing required keys:"
        echo "$MISSING_KEYS" >> $LOG_FILE
        log_message "$(echo "$MISSING_KEYS" | while read -r key; do echo "  - $key"; done)"
        log_message "🛑 Please update ../environment/.env.backend manually before continuing."
        exit 1
    else
        log_message "✅ .env.backend structure matches template. Proceeding with env file copy..."
        if execute_and_log "cp ../environment/.env.backend ./backend/.env.backend" "Copying production environment file"; then
            log_message "✅ Environment variables properly set"
        else
            log_message "⚠️ Warning: Failed to copy environment file, deployment may use default values"
        fi
    fi
else
    log_message "⚠️ No production environment directory found at ../environment"
    log_message "⚠️ Deployment will continue using existing or default environment variables"
fi

# Step 2: Stop and remove existing containers
if execute_and_log "docker compose down" "Stopping existing containers"; then
    :  # Success case handled in function
else
    log_message "⚠️ Warning: Issues stopping containers (they may not exist yet)"
    # Continue anyway as this may be first deployment
fi

# Step 3: Rebuild and start containers
log_message "🔄 Rebuilding and starting containers..."
echo "$ docker compose up -d --build" >> $LOG_FILE

# Special handling for build step to catch specific Docker errors
build_output=$(mktemp)
if docker compose up -d --build > >(tee -a "$build_output" "$LOG_FILE") 2> >(tee -a "$build_output" "$LOG_FILE" >&2); then
    log_message "✅ Docker containers built and started successfully"
else
    build_exit_code=$?
    log_message "❌ Docker build failed with exit code $build_exit_code"
    
    # Look for specific error patterns
    if grep -q "load metadata for docker.io/library/frontend" "$build_output"; then
        log_message "❌ Error detected: Unable to find frontend image. This was likely caused by an invalid 'FROM' statement in Dockerfile"
    fi
    
    if grep -q "ERROR" "$build_output"; then
        log_message "⚠️ Build errors detected:"
        grep "ERROR" "$build_output" | while read -r line; do
            log_message "  ❌ $line"
        done
    fi
    
    rm -f "$build_output"
    log_message "Deployment failed at container build step"
    exit 1
fi

rm -f "$build_output"

# Step 4: Wait for backend service to be ready
log_message "🔄 Waiting for backend service to be ready..."
echo "$ sleep 15  # Waiting for services to initialize" >> $LOG_FILE
sleep 15  # Give the backend container time to start

# Step 5: Apply database migrations
# Pass "true" as the third parameter to continue_on_error
execute_and_log "docker compose exec -T backend alembic upgrade head" "Applying database migrations to AWS RDS" "true"
# Migration failure is now handled in the function with detailed error logging

# Step 6: Verify services are running
log_message "🔄 Verifying services..."
echo "$ docker compose ps" >> $LOG_FILE
docker_ps_output=$(docker compose ps)
echo "$docker_ps_output" >> $LOG_FILE

RUNNING_CONTAINERS=$(echo "$docker_ps_output" | grep "Up" | wc -l)
EXPECTED_CONTAINERS=4  # backend, frontend, nginx, probe

if [ "$RUNNING_CONTAINERS" -ge "$EXPECTED_CONTAINERS" ]; then
    log_message "✅ All services are running ($RUNNING_CONTAINERS containers)"
else
    log_message "⚠️ Warning: Only $RUNNING_CONTAINERS of $EXPECTED_CONTAINERS services are running"
fi

# Check if the backend API is accessible
log_message "🔄 Testing backend API..."
echo "$ curl -s http://localhost:8000/" >> $LOG_FILE
backend_response=$(curl -s http://localhost:8000/)
echo "$backend_response" >> $LOG_FILE

if echo "$backend_response" | grep -q "Welcome to ProbeOps API"; then
    log_message "✅ Backend API is responding correctly"
else
    log_message "⚠️ Warning: Backend API check failed"
fi

# Check if the frontend is accessible via nginx
log_message "🔄 Testing frontend..."
echo "$ curl -s -I http://localhost:80" >> $LOG_FILE
frontend_response=$(curl -s -I http://localhost:80)
echo "$frontend_response" >> $LOG_FILE

if echo "$frontend_response" | grep -q "200 OK"; then
    log_message "✅ Frontend is accessible"
else
    log_message "⚠️ Warning: Frontend check failed"
fi

# Step 7: SSL Certificate Management
log_message "🔄 Checking SSL certificates status..."

# Check if this is running in a production environment with a domain
if [[ -f "./nginx/ssl/live/probeops.com/fullchain.pem" ]]; then
    # Check certificate expiration
    CERT_FILE="./nginx/ssl/live/probeops.com/fullchain.pem"
    echo "$ openssl x509 -dates -noout -in $CERT_FILE" >> $LOG_FILE
    
    if cert_info=$(openssl x509 -dates -noout -in "$CERT_FILE" 2>&1); then
        echo "$cert_info" >> $LOG_FILE
        expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
        log_message "✅ SSL certificate is valid until $expiry_date"
        
        # Calculate days until expiry
        expiry_epoch=$(date -d "$expiry_date" +%s)
        current_epoch=$(date +%s)
        days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [[ $days_left -lt 30 ]]; then
            log_message "⚠️ Warning: SSL certificate will expire in $days_left days"
            log_message "🔄 Running certificate renewal..."
            
            if execute_and_log "./cert-renewal.sh" "Renewing SSL certificates"; then
                log_message "✅ SSL certificate renewal initiated"
            else
                log_message "⚠️ Warning: SSL certificate renewal may have issues"
            fi
        fi
    else
        log_message "⚠️ Warning: Unable to read SSL certificate information"
    fi
else
    # Check if we have a domain name set and should set up SSL
    log_message "ℹ️ SSL certificates not found. Run cert-renewal.sh manually if SSL is needed."
fi

# Final status
log_message "===== DEPLOYMENT COMPLETED: $(date +"%Y-%m-%d %H:%M:%S") ====="
log_message "📊 Deployment Status: ✅ SUCCESS"
log_message "📝 See $LOG_FILE for detailed logs"

echo ""
echo "Deployment completed. Check deployment.log for details."
echo "To view logs: tail -f deployment.log"
echo "To view running containers: docker compose ps"
echo ""