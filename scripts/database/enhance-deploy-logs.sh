#!/bin/bash

# ProbeOps Enhanced Deployment Logging Script
# This script helps capture detailed logs during deployment

# Set script to exit on error
set -e

# Log file path
LOG_FILE="detailed-deployment-$(date +%Y%m%d-%H%M%S).log"

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions for logging
log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}🔄 $1${NC}" | tee -a "$LOG_FILE"
}

log_debug() {
    echo -e "🔍 $1" | tee -a "$LOG_FILE"
}

# Run a command with logging
run_cmd() {
    local cmd="$1"
    local desc="$2"
    
    log_info "$desc"
    echo "$ $cmd" | tee -a "$LOG_FILE"
    
    # Run the command and capture both stdout and stderr to log
    if OUTPUT=$(eval "$cmd" 2>&1); then
        echo "$OUTPUT" | tee -a "$LOG_FILE"
        log_success "$desc completed successfully"
        return 0
    else
        local exit_code=$?
        echo "$OUTPUT" | tee -a "$LOG_FILE"
        log_error "$desc failed with exit code $exit_code"
        return $exit_code
    fi
}

echo "===== ENHANCED DEPLOYMENT LOGGING STARTED: $(date) =====" | tee -a "$LOG_FILE"
log_info "Detailed logs will be saved to $LOG_FILE"

# Start logging system info
log_info "Collecting system information"
run_cmd "uname -a" "System information"
run_cmd "free -h" "Memory information"
run_cmd "df -h" "Disk space information"
run_cmd "docker --version" "Docker version"
run_cmd "docker compose version" "Docker Compose version"
run_cmd "node --version" "Node.js version" || log_warning "Node.js not installed or not in PATH"
run_cmd "npm --version" "npm version" || log_warning "npm not installed or not in PATH"
run_cmd "python3 --version" "Python version" || log_warning "Python not installed or not in PATH"

# Log Git status
log_info "Checking Git status"
run_cmd "git status --porcelain" "Git status"

# Check if frontend/postcss.config.js exists and log its contents
if [ -f "frontend/postcss.config.js" ]; then
    log_info "Examining frontend/postcss.config.js"
    run_cmd "cat frontend/postcss.config.js" "PostCSS config content"
    
    # Check for common issues
    if grep -q "@tailwindcss/postcss" frontend/postcss.config.js; then
        log_warning "Found invalid reference to @tailwindcss/postcss in postcss.config.js"
    else
        log_success "PostCSS config looks good"
    fi
else
    log_warning "frontend/postcss.config.js not found"
fi

# Check package.json for dependencies
if [ -f "frontend/package.json" ]; then
    log_info "Examining frontend/package.json"
    run_cmd "cat frontend/package.json" "package.json content"
    
    # Extract and log only the dependencies section
    log_info "Frontend dependencies:"
    run_cmd "node -e \"const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('./frontend/package.json')); console.log(JSON.stringify(pkg.dependencies, null, 2))\"" "Dependencies section"
else
    log_warning "frontend/package.json not found"
fi

# Check Docker configuration
log_info "Validating Docker configuration"
run_cmd "docker compose config" "Docker Compose configuration validation"

# Check if any frontend build exists
log_info "Checking for existing frontend build"
if [ -d "public" ]; then
    run_cmd "ls -la public" "Public directory contents"
    
    if [ -f "public/index.html" ]; then
        log_success "Found frontend build in public directory"
    else
        log_warning "public directory exists but no index.html found"
    fi
else
    log_warning "No public directory found, frontend may not be built"
fi

# Log NGINX configuration
if [ -d "nginx" ]; then
    log_info "Examining NGINX configuration"
    run_cmd "ls -la nginx" "NGINX directory contents"
    
    if [ -f "nginx/nginx.conf" ]; then
        run_cmd "cat nginx/nginx.conf" "NGINX configuration"
    else
        log_warning "nginx.conf not found"
    fi
    
    # Check for SSL certificates
    if [ -d "nginx/ssl" ]; then
        run_cmd "ls -la nginx/ssl" "SSL directory structure"
    else
        log_warning "No SSL directory found"
    fi
else
    log_warning "No nginx directory found"
fi

# Check running containers
log_info "Checking running containers"
run_cmd "docker ps" "Running containers"

# Log end of script
echo "" | tee -a "$LOG_FILE"
log_info "Enhanced logging completed"
echo "===== ENHANCED DEPLOYMENT LOGGING COMPLETED: $(date) =====" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
log_success "Detailed logs have been saved to $LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "To view the logs: cat $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"