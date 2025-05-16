#!/bin/bash

# Fix SSL Certificate Commands - Helper Script
# This script simplifies common SSL certificate operations with proper context

# Set script to exit on error
set -e

# Variables
DOMAINS="probeops.com www.probeops.com"
EMAIL="kumar@securityfocal.com"  # Using the email from your command
LOG_FILE="ssl-verification.log"

# Initialize log file
echo "===== SSL VERIFICATION STARTED: $(date +"%Y-%m-%d %H:%M:%S") =====" > $LOG_FILE

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

# Create the required directories if they don't exist
ensure_directories() {
    log_message "🔄 Ensuring SSL directories exist..."
    execute_and_log "mkdir -p ./nginx/ssl/live/probeops.com" "Creating SSL live directory"
    execute_and_log "mkdir -p ./nginx/ssl/archive/probeops.com" "Creating SSL archive directory"
    execute_and_log "mkdir -p ./nginx/ssl/renewal" "Creating SSL renewal directory"
    execute_and_log "mkdir -p ./nginx/ssl/webroot/.well-known/acme-challenge" "Creating webroot challenge directory"
}

# Check certificate details
check_certificate() {
    log_message "🔄 Checking certificate details..."
    
    # Use docker compose with -f to specifically point to the configuration file
    if [ -f "./docker-compose.yml" ]; then
        execute_and_log "docker compose -f ./docker-compose.yml exec nginx openssl x509 -in /etc/letsencrypt/live/probeops.com/fullchain.pem -text -noout | grep 'Not After'" "Checking certificate expiration"
    else
        log_message "❌ docker-compose.yml not found in current directory"
        exit 1
    fi
}

# Issue new certificate
issue_certificate() {
    log_message "🔄 Issuing new certificate..."
    ensure_directories
    
    # Stop NGINX to free port 80
    execute_and_log "docker compose -f ./docker-compose.yml stop nginx" "Stopping NGINX container"
    
    # Run certbot in standalone mode
    execute_and_log "docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt -v $(pwd)/nginx/ssl/webroot:/var/www/certbot -p 80:80 certbot/certbot certonly --standalone --preferred-challenges http --email $EMAIL --agree-tos --no-eff-email -d $DOMAINS" "Issuing certificate with Certbot"
    
    # Start NGINX again
    execute_and_log "docker compose -f ./docker-compose.yml start nginx" "Starting NGINX container"
}

# Renew existing certificate with webroot method
renew_certificate_webroot() {
    log_message "🔄 Renewing certificate with webroot method..."
    ensure_directories
    
    if [ -f "./docker-compose.yml" ]; then
        execute_and_log "docker compose -f ./docker-compose.yml exec certbot certbot renew --webroot -w /var/www/certbot --force-renewal" "Renewing certificate with webroot method"
    else
        log_message "❌ docker-compose.yml not found in current directory"
        exit 1
    fi
}

# Show menu and get user choice
echo "SSL Certificate Helper"
echo "======================"
echo "1) Check certificate details"
echo "2) Issue new certificate"
echo "3) Renew certificate (webroot method)"
echo "q) Quit"
echo
read -p "Select an option: " choice

case "$choice" in
    1)
        check_certificate
        ;;
    2)
        issue_certificate
        ;;
    3)
        renew_certificate_webroot
        ;;
    q|Q)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid option."
        exit 1
        ;;
esac

log_message "===== SSL VERIFICATION COMPLETED: $(date +"%Y-%m-%d %H:%M:%S") ====="
echo
echo "Operation completed. Check $LOG_FILE for details."
echo