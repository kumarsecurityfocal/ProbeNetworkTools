#!/bin/bash

# ProbeOps SSL Verification Script
# This script helps verify SSL certificates are correctly configured

# Set script to exit on error
set -e

# Variables
DOMAIN="probeops.com"
LOG_FILE="ssl-verification.log"

# Initialize log file
echo "===== SSL VERIFICATION STARTED: $(date +"%Y-%m-%d %H:%M:%S") =====" > $LOG_FILE

# Helper function for logging
log_message() {
    echo "$1"
    echo "$(date +"%Y-%m-%d %H:%M:%S") - $1" >> $LOG_FILE
}

# Check for certificate files
log_message "🔄 Checking for SSL certificate files..."

CERT_PATH="./nginx/ssl/live/$DOMAIN"
if [ -f "$CERT_PATH/fullchain.pem" ] && [ -f "$CERT_PATH/privkey.pem" ]; then
    log_message "✅ SSL certificate files found"
    
    # Check certificate validity
    log_message "🔄 Checking certificate information..."
    CERT_INFO=$(openssl x509 -in "$CERT_PATH/fullchain.pem" -text -noout)
    
    # Extract certificate subject
    SUBJECT=$(echo "$CERT_INFO" | grep "Subject:" | sed 's/^.*CN = //g')
    log_message "📜 Certificate subject: $SUBJECT"
    
    # Extract certificate dates
    DATES=$(openssl x509 -in "$CERT_PATH/fullchain.pem" -dates -noout)
    NOT_BEFORE=$(echo "$DATES" | grep "notBefore" | cut -d= -f2)
    NOT_AFTER=$(echo "$DATES" | grep "notAfter" | cut -d= -f2)
    
    log_message "📅 Certificate valid from: $NOT_BEFORE"
    log_message "📅 Certificate valid until: $NOT_AFTER"
    
    # Calculate days until expiry
    EXPIRY_EPOCH=$(date -d "$NOT_AFTER" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
    
    log_message "⏱️ Certificate expires in $DAYS_LEFT days"
    
    # Check issuer to determine if Let's Encrypt or self-signed
    ISSUER=$(echo "$CERT_INFO" | grep "Issuer:" | head -1)
    
    if echo "$ISSUER" | grep -q "Let's Encrypt"; then
        log_message "✅ Certificate issued by Let's Encrypt"
    elif echo "$SUBJECT" | grep -q "$ISSUER"; then
        log_message "⚠️ Self-signed certificate detected (OK for development)"
    else
        log_message "ℹ️ Certificate issued by: $ISSUER"
    fi
    
    # Check for domain match
    if echo "$CERT_INFO" | grep -q "$DOMAIN"; then
        log_message "✅ Certificate matches domain $DOMAIN"
    else
        log_message "❌ WARNING: Certificate does not match domain $DOMAIN"
    fi
    
    # Check NGINX configuration
    log_message "🔄 Verifying NGINX SSL configuration..."
    
    if grep -q "ssl_certificate.*$DOMAIN" ./nginx/nginx.conf; then
        log_message "✅ NGINX configuration references the correct certificate"
    else
        log_message "❌ WARNING: NGINX configuration may not reference the correct certificate"
    fi
    
    # Simulate HTTPS connection (on production servers)
    log_message "🔄 Simulating HTTPS connection test..."
    log_message "$ curl -v https://$DOMAIN"
    log_message "✓ In production environment, this would connect to $DOMAIN over HTTPS"
    
    # Report final status
    log_message "✅ SSL certificate verification completed"
    log_message "📝 In production with Let's Encrypt certificates, run: curl -v https://$DOMAIN"
else
    log_message "❌ SSL certificate files not found at $CERT_PATH"
    log_message "ℹ️ To generate certificates:"
    log_message "  1. For development: ./init-ssl.sh (creates self-signed certificates)"
    log_message "  2. For production: Run Let's Encrypt certbot and follow SSL-DEPLOYMENT.md"
fi

# Final status
log_message "===== SSL VERIFICATION COMPLETED: $(date +"%Y-%m-%d %H:%M:%S") ====="

echo ""
echo "SSL verification completed. Check $LOG_FILE for detailed information."
echo ""