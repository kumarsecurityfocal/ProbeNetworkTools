#!/bin/bash

# ProbeOps SSL Certificate Initial Setup Script
# This script performs the initial setup for SSL certificates

# Set script to exit on error
set -e

# Variables
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
LOG_FILE="ssl-setup.log"
DOMAINS="probeops.com www.probeops.com"
EMAIL="admin@probeops.com"  # Update this with the domain administrator's email

# Initialize log file
echo "===== SSL SETUP STARTED: $TIMESTAMP =====" > $LOG_FILE

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

# Step 1: Create required directories
log_message "🔄 Creating SSL directories..."
execute_and_log "mkdir -p ./nginx/ssl/live/probeops.com" "Creating SSL directories"
execute_and_log "mkdir -p ./nginx/ssl/archive/probeops.com" "Creating SSL archive directories"
execute_and_log "mkdir -p ./nginx/ssl/renewal" "Creating SSL renewal directories"
execute_and_log "mkdir -p ./nginx/ssl/webroot/.well-known/acme-challenge" "Creating webroot challenge directories"

# Step 2: Generate DH parameters for SSL security
log_message "🔄 Generating DH parameters (this may take a while)..."
if [ ! -f "./nginx/dhparam.pem" ]; then
    execute_and_log "openssl dhparam -out ./nginx/dhparam.pem 2048" "Generating DH parameters"
else
    log_message "ℹ️ DH parameters already exist, skipping generation"
fi

# Step 3: Stop NGINX if it's running to free port 80
log_message "🔄 Checking if NGINX is running..."
if docker compose ps | grep -q nginx; then
    execute_and_log "docker compose stop nginx" "Stopping NGINX container"
fi

# Step 4: Run Certbot to generate certificates
log_message "🔄 Generating SSL certificates..."
execute_and_log "docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt -v $(pwd)/nginx/ssl/webroot:/var/www/certbot -p 80:80 certbot/certbot certonly --standalone --preferred-challenges http --email $EMAIL --agree-tos --no-eff-email -d $DOMAINS" "Generating SSL certificates with Certbot"

# Step 5: Restart NGINX with the new certificates
log_message "🔄 Starting NGINX with SSL certificates..."
execute_and_log "docker compose start nginx" "Starting NGINX container"

# Step 6: Set up renewal cron job
log_message "🔄 Setting up certificate renewal cron job..."
CRON_CMD="0 3,15 * * * $(pwd)/cert-renewal.sh >> $(pwd)/ssl-renewal.log 2>&1"
EXISTING_CRON=$(crontab -l 2>/dev/null || echo "")

if ! echo "$EXISTING_CRON" | grep -q "cert-renewal.sh"; then
    execute_and_log "(echo \"$EXISTING_CRON\"; echo \"$CRON_CMD\") | crontab -" "Setting up cron job for certificate renewal"
else
    log_message "ℹ️ Cron job for certificate renewal already exists"
fi

# Final instructions
log_message "===== SSL SETUP COMPLETED: $(date +"%Y-%m-%d %H:%M:%S") ====="
log_message "📝 Next steps:"
log_message "1. Update nginx/nginx.conf to use the SSL certificates"
log_message "2. Restart NGINX with: docker compose restart nginx"
log_message "3. Use https://probeops.com to access your site securely"

echo ""
echo "SSL setup completed. Check ssl-setup.log for details."
echo ""
echo "IMPORTANT: Make sure to update your nginx/nginx.conf to use the SSL certificates."
echo "See the documentation in DEPLOYMENT.md for details."
echo ""