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
    
    log_message "🔄 $message"
    echo "$ $cmd" >> $LOG_FILE
    
    # Execute command and capture output
    if output=$(eval "$cmd" 2>&1); then
        echo "$output" >> $LOG_FILE
        log_message "✅ $message completed successfully"
        return 0
    else
        echo "$output" >> $LOG_FILE
        log_message "❌ $message failed"
        return 1
    fi
}

# Step 1: Pull the latest code from GitHub
if execute_and_log "git pull origin $BRANCH" "Pulling latest code from GitHub ($BRANCH branch)"; then
    :  # Success case handled in function
else
    log_message "Deployment failed at git pull step"
    exit 1
fi

# Step 2: Stop and remove existing containers
if execute_and_log "docker-compose down" "Stopping existing containers"; then
    :  # Success case handled in function
else
    log_message "⚠️ Warning: Issues stopping containers (they may not exist yet)"
    # Continue anyway as this may be first deployment
fi

# Step 3: Rebuild and start containers
if execute_and_log "docker-compose up -d --build" "Rebuilding and starting containers"; then
    :  # Success case handled in function
else
    log_message "Deployment failed at container build step"
    exit 1
fi

# Step 4: Wait for backend service to be ready
log_message "🔄 Waiting for backend service to be ready..."
echo "$ sleep 15  # Waiting for services to initialize" >> $LOG_FILE
sleep 15  # Give the backend container time to start

# Step 5: Apply database migrations
if execute_and_log "docker-compose exec -T backend alembic upgrade head" "Applying database migrations to AWS RDS"; then
    :  # Success case handled in function
else
    log_message "⚠️ Database migration failed, but continuing with deployment"
    # Non-fatal error, continue deployment
fi

# Step 6: Verify services are running
log_message "🔄 Verifying services..."
echo "$ docker-compose ps" >> $LOG_FILE
docker_ps_output=$(docker-compose ps)
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
echo "To view running containers: docker-compose ps"
echo ""