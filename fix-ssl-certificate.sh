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
        # First check if certificate file exists in the container
        if docker compose -f ./docker-compose.yml exec nginx test -f /etc/letsencrypt/live/probeops.com/fullchain.pem; then
            execute_and_log "docker compose -f ./docker-compose.yml exec nginx openssl x509 -in /etc/letsencrypt/live/probeops.com/fullchain.pem -text -noout | grep 'Not After'" "Checking certificate expiration"
        else
            log_message "⚠️ No certificate found at /etc/letsencrypt/live/probeops.com/fullchain.pem"
            log_message "ℹ️ You need to issue a new certificate first (option 2)"
            echo "⚠️ No certificate found. Please issue a new certificate first (option 2)."
            return 1
        fi
    else
        log_message "❌ docker-compose.yml not found in current directory"
        exit 1
    fi
}

# Issue new certificate
issue_certificate() {
    log_message "🔄 Issuing new certificate..."
    ensure_directories
    
    # Check if we're running in a production environment
    echo "Are you running this on the production server with public DNS pointing to this IP?"
    echo "This is required for domain validation during certificate issuance."
    read -p "Continue with certificate issuance? (y/n): " confirm
    
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        log_message "⚠️ Certificate issuance cancelled by user"
        echo "Certificate issuance cancelled."
        return 1
    fi
    
    # List running containers before stopping nginx
    execute_and_log "docker compose -f ./docker-compose.yml ps" "Listing running containers before stopping nginx"
    
    # Stop NGINX to free port 80
    execute_and_log "docker compose -f ./docker-compose.yml stop nginx" "Stopping NGINX container"
    
    # Check if port 80 is available
    if nc -z localhost 80 2>/dev/null; then
        log_message "⚠️ Port 80 is still in use by another process - certificate issuance may fail"
        echo "WARNING: Port 80 is still in use by another process. Certificate issuance may fail."
        read -p "Continue anyway? (y/n): " port_confirm
        
        if [[ "$port_confirm" != "y" && "$port_confirm" != "Y" ]]; then
            # Start NGINX again since we're aborting
            execute_and_log "docker compose -f ./docker-compose.yml start nginx" "Restarting NGINX container"
            log_message "⚠️ Certificate issuance cancelled due to port conflict"
            echo "Certificate issuance cancelled."
            return 1
        fi
    fi
    
    # Run certbot in standalone mode with more detailed output
    echo "Starting certificate issuance process..."
    echo "Domain(s): $DOMAINS"
    echo "Email: $EMAIL"
    
    # Use --verbose flag for more detailed output
    execute_and_log "docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt -v $(pwd)/nginx/ssl/webroot:/var/www/certbot -p 80:80 certbot/certbot certonly --standalone --preferred-challenges http --email $EMAIL --agree-tos --no-eff-email --verbose -d $DOMAINS" "Issuing certificate with Certbot"
    
    # Check if certificate issuance was successful
    CERT_SUCCESS=$?
    
    # Start NGINX again regardless of the outcome
    execute_and_log "docker compose -f ./docker-compose.yml start nginx" "Starting NGINX container"
    
    if [ $CERT_SUCCESS -eq 0 ]; then
        log_message "✅ Certificate issuance successful"
        echo "Certificate issuance completed successfully."
        echo "You can now use the certificates in your NGINX configuration."
    else
        log_message "❌ Certificate issuance failed"
        echo "Certificate issuance failed. Please check the log for details."
        echo "Common issues:"
        echo "1. DNS not correctly pointing to this server"
        echo "2. Port 80 blocked by firewall or in use by another service"
        echo "3. Network connectivity issues"
    fi
}

# Renew existing certificate with webroot method
renew_certificate_webroot() {
    log_message "🔄 Renewing certificate with webroot method..."
    ensure_directories
    
    if [ -f "./docker-compose.yml" ]; then
        # First check if certificate exists
        if ! docker compose -f ./docker-compose.yml exec nginx test -f /etc/letsencrypt/live/probeops.com/fullchain.pem; then
            log_message "⚠️ No existing certificate found to renew"
            echo "⚠️ No existing certificate found to renew. Please issue a new certificate first (option 2)."
            return 1
        fi
        
        # Show current certificate info
        echo "Current certificate information:"
        docker compose -f ./docker-compose.yml exec nginx openssl x509 -in /etc/letsencrypt/live/probeops.com/fullchain.pem -text -noout | grep -E 'Not Before|Not After|Subject:'
        
        echo "Proceeding with certificate renewal..."
        execute_and_log "docker compose -f ./docker-compose.yml exec certbot certbot renew --webroot -w /var/www/certbot --force-renewal" "Renewing certificate with webroot method"
        
        # Check if renewal was successful
        if [ $? -eq 0 ]; then
            log_message "✅ Certificate renewal successful"
            echo "Certificate renewal completed successfully."
            
            # Display updated certificate info
            echo "Updated certificate information:"
            docker compose -f ./docker-compose.yml exec nginx openssl x509 -in /etc/letsencrypt/live/probeops.com/fullchain.pem -text -noout | grep -E 'Not Before|Not After|Subject:'
        else
            log_message "❌ Certificate renewal failed"
            echo "Certificate renewal failed. Please check the log for details."
        fi
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