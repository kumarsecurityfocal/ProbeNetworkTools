#!/bin/bash

# ProbeOps SSL Certificate Renewal Script
# This script handles the renewal of SSL certificates using Certbot in Docker

# Set script to exit on error
set -e

# Variables
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
LOG_FILE="ssl-renewal.log"
DOMAINS="probeops.com www.probeops.com"
EMAIL="admin@probeops.com"  # Domain administrator's email

# Initialize log file for this run
echo "===== SSL RENEWAL STARTED: $TIMESTAMP =====" >> $LOG_FILE

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

# Check if we need to create SSL directories
if [ ! -d "./nginx/ssl/live" ]; then
    execute_and_log "mkdir -p ./nginx/ssl/live/probeops.com" "Creating SSL directories"
    execute_and_log "mkdir -p ./nginx/ssl/archive/probeops.com" "Creating SSL archive directories"
    execute_and_log "mkdir -p ./nginx/ssl/renewal" "Creating SSL renewal directories"
    execute_and_log "mkdir -p ./nginx/ssl/webroot/.well-known/acme-challenge" "Creating webroot challenge directories"
fi

# Function to find the current certificate directory
find_cert_dir() {
    # Check for directories matching probeops.com or probeops.com-NNNN
    local cert_dirs=$(find ./nginx/ssl/live -maxdepth 1 -name "probeops.com*" -type d 2>/dev/null | sort)
    
    if [ -n "$cert_dirs" ]; then
        # Use the most recent one (usually the one with the highest suffix)
        echo "$cert_dirs" | tail -n 1
    else
        echo "./nginx/ssl/live/probeops.com"  # Default path
    fi
}

# Determine if this is first-time setup or renewal
CERT_DIR=$(find_cert_dir)
CERT_PATH="$CERT_DIR/fullchain.pem"

log_message "Checking for certificates at $CERT_PATH"

if [ ! -f "$CERT_PATH" ]; then
    # First-time certificate issuance
    log_message "🔄 First-time certificate issuance detected"
    
    # Stop nginx to free up port 80
    execute_and_log "docker compose stop nginx" "Stopping NGINX container"
    
    # Issue new certificates
    execute_and_log "docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt -v $(pwd)/nginx/ssl/webroot:/var/www/certbot -p 80:80 certbot/certbot certonly --standalone --preferred-challenges http --email $EMAIL --agree-tos --no-eff-email -d $DOMAINS" "Issuing new SSL certificates"
    
    # Start nginx again
    execute_and_log "docker compose start nginx" "Starting NGINX container"
    
    log_message "✅ SSL certificates have been issued successfully"
    
    # Find the actual certificate directory (may include a suffix)
    NEW_CERT_DIR=$(find_cert_dir)
    NEW_CERT_NAME=$(basename "$NEW_CERT_DIR")
    
    log_message "⚠️ Certificates created at: $NEW_CERT_DIR"
    log_message "⚠️ Remember to update nginx/nginx.conf to use the certificate path: /etc/letsencrypt/live/$NEW_CERT_NAME/fullchain.pem"
    
    # Check if we need to update nginx.conf
    if grep -q "/etc/letsencrypt/live/probeops.com/fullchain.pem" ./nginx/nginx.conf && [ "$NEW_CERT_NAME" != "probeops.com" ]; then
        log_message "⚠️ Certificate path in nginx.conf needs to be updated to: $NEW_CERT_NAME"
    fi
else
    # Certificate renewal
    log_message "🔄 Certificate renewal process for existing certificates"
    
    # Stop nginx to free up port 80
    execute_and_log "docker compose stop nginx" "Stopping NGINX container"
    
    # Renew certificates
    execute_and_log "docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt -v $(pwd)/nginx/ssl/webroot:/var/www/certbot -p 80:80 certbot/certbot renew" "Renewing SSL certificates"
    
    # Start nginx again
    execute_and_log "docker compose start nginx" "Starting NGINX container"
    
    # Check if the certificate directory has changed
    NEW_CERT_DIR=$(find_cert_dir)
    NEW_CERT_NAME=$(basename "$NEW_CERT_DIR")
    
    log_message "✅ SSL certificate renewal process completed"
    
    # Check if we need to update nginx.conf due to a new certificate path
    if [ "$NEW_CERT_DIR" != "$CERT_DIR" ]; then
        log_message "⚠️ Certificate path has changed from $(basename "$CERT_DIR") to $NEW_CERT_NAME"
        log_message "⚠️ Update nginx/nginx.conf to use: /etc/letsencrypt/live/$NEW_CERT_NAME/fullchain.pem"
    fi
fi

# Final status
log_message "===== SSL RENEWAL COMPLETED: $(date +"%Y-%m-%d %H:%M:%S") ====="

echo ""
echo "SSL Certificate renewal completed. Check ssl-renewal.log for details."
echo ""