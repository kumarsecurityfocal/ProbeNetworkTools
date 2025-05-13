#!/bin/bash

# ProbeOps SSL Certificate Renewal Script
# This script handles the renewal of SSL certificates using Certbot in Docker

# Set script to exit on error
set -e

# Variables
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
LOG_FILE="ssl-renewal.log"
DOMAINS="probeops.com www.probeops.com"
EMAIL="your-email@example.com"  # Replace with your actual email

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

# Determine if this is first-time setup or renewal
if [ ! -f "./nginx/ssl/live/probeops.com/fullchain.pem" ]; then
    # First-time certificate issuance
    log_message "🔄 First-time certificate issuance detected"
    
    # Stop nginx to free up port 80
    execute_and_log "docker compose stop nginx" "Stopping NGINX container"
    
    # Issue new certificates
    execute_and_log "docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt -v $(pwd)/nginx/ssl/webroot:/var/www/certbot -p 80:80 certbot/certbot certonly --standalone --preferred-challenges http --email $EMAIL --agree-tos --no-eff-email -d $DOMAINS" "Issuing new SSL certificates"
    
    # Start nginx again
    execute_and_log "docker compose start nginx" "Starting NGINX container"
    
    log_message "✅ SSL certificates have been issued successfully"
    log_message "⚠️ Remember to update nginx/nginx.conf to use the SSL certificates"
else
    # Certificate renewal
    log_message "🔄 Certificate renewal process"
    
    # Stop nginx to free up port 80
    execute_and_log "docker compose stop nginx" "Stopping NGINX container"
    
    # Renew certificates
    execute_and_log "docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt -v $(pwd)/nginx/ssl/webroot:/var/www/certbot -p 80:80 certbot/certbot renew" "Renewing SSL certificates"
    
    # Start nginx again
    execute_and_log "docker compose start nginx" "Starting NGINX container"
    
    log_message "✅ SSL certificate renewal process completed"
fi

# Final status
log_message "===== SSL RENEWAL COMPLETED: $(date +"%Y-%m-%d %H:%M:%S") ====="

echo ""
echo "SSL Certificate renewal completed. Check ssl-renewal.log for details."
echo ""