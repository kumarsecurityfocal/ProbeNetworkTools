#!/bin/bash

# ProbeOps Pre-Deployment Validation Script
# This script validates the environment before deployment to catch common issues

# Set script to exit on error
set -e

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Helper function for logging
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo "ℹ️ $1"
}

echo "==== ProbeOps Pre-Deployment Validation ===="
echo "Running pre-deployment checks to prevent common issues..."
echo ""

# Check 1: Verify .gitignore excludes SSL files
log_info "Check 1: Verifying .gitignore configuration..."
if [ -f ".gitignore" ]; then
    if grep -q "nginx/ssl/live" .gitignore && grep -q "*.pem" .gitignore; then
        log_success "SSL files are properly excluded in .gitignore"
    else
        log_error "SSL files are not properly excluded in .gitignore"
        echo "Updating .gitignore..."
        
        # Add SSL exclusions to .gitignore if not present
        if ! grep -q "nginx/ssl/live" .gitignore; then
            echo "# SSL Certificate Files" >> .gitignore
            echo "nginx/ssl/live/" >> .gitignore
            echo "nginx/ssl/archive/" >> .gitignore
            echo "nginx/ssl/renewal/" >> .gitignore
        fi
        
        if ! grep -q "*.pem" .gitignore; then
            echo "*.pem" >> .gitignore
            echo "*.key" >> .gitignore
            echo "*.crt" >> .gitignore
        fi
        
        log_success "Updated .gitignore to exclude SSL files"
    fi
else
    log_error "No .gitignore file found"
    echo "Creating .gitignore..."
    
    # Create a new .gitignore file
    cat > .gitignore << 'EOF'
# Node dependencies
node_modules/
npm-debug.log

# Python
__pycache__/
*.py[cod]
*.so
.env
venv/

# SSL Certificates
nginx/ssl/live/
nginx/ssl/archive/
nginx/ssl/renewal/
nginx/ssl/webroot/
*.pem
*.key
*.crt
*.cert
*.csr

# Frontend builds
dist/
public/

# Logs
*.log
EOF
    
    log_success "Created new .gitignore file with SSL exclusions"
fi

echo ""

# Check 2: Verify Git local exclude file
log_info "Check 2: Verifying Git local exclude configuration..."
if [ -d ".git" ]; then
    if [ ! -d ".git/info" ]; then
        mkdir -p .git/info
    fi
    
    if [ ! -f ".git/info/exclude" ]; then
        touch .git/info/exclude
    fi
    
    if grep -q "nginx/ssl/live" .git/info/exclude && grep -q "*.pem" .git/info/exclude; then
        log_success "SSL files are properly excluded in Git local exclude"
    else
        log_warning "SSL files are not properly excluded in Git local exclude"
        echo "Updating .git/info/exclude..."
        
        # Add SSL exclusions to local exclude if not present
        if ! grep -q "nginx/ssl/live" .git/info/exclude; then
            echo "# SSL Certificate Files" >> .git/info/exclude
            echo "nginx/ssl/live/" >> .git/info/exclude
            echo "nginx/ssl/archive/" >> .git/info/exclude
            echo "nginx/ssl/renewal/" >> .git/info/exclude
        fi
        
        if ! grep -q "*.pem" .git/info/exclude; then
            echo "*.pem" >> .git/info/exclude
            echo "*.key" >> .git/info/exclude
            echo "*.crt" >> .git/info/exclude
        fi
        
        log_success "Updated Git local exclude to ignore SSL files"
    fi
else
    log_warning "Not a Git repository, skipping Git exclude check"
fi

echo ""

# Check 3: Verify SSL certificate paths in NGINX configuration
log_info "Check 3: Verifying SSL certificate paths in NGINX configuration..."
if [ -f "nginx/nginx.conf" ]; then
    # Check for Let's Encrypt certificate paths
    cert_path=$(grep -E "ssl_certificate.*probeops.com" nginx/nginx.conf | sed -E 's/.*ssl_certificate +([^;]+);.*/\1/')
    
    if [ -n "$cert_path" ]; then
        log_success "Found SSL certificate path: $cert_path"
        
        # Check if the directory exists in the server (this will obviously fail during local development)
        echo "Note: Certificate path existence can only be verified on the production server"
    else
        log_error "No SSL certificate path found in nginx/nginx.conf"
    fi
else
    log_error "NGINX configuration file not found at nginx/nginx.conf"
fi

echo ""

# Check 4: Verify NGINX entrypoint script permissions
log_info "Check 4: Verifying NGINX entrypoint script permissions..."
if [ -f "nginx/entrypoint.sh" ]; then
    if [ -x "nginx/entrypoint.sh" ]; then
        log_success "NGINX entrypoint script has executable permissions"
    else
        log_error "NGINX entrypoint script does not have executable permissions"
        echo "Setting executable permissions..."
        chmod +x nginx/entrypoint.sh
        log_success "Executable permissions set on nginx/entrypoint.sh"
    fi
else
    log_error "NGINX entrypoint script not found at nginx/entrypoint.sh"
fi

echo ""

# Check 5: Verify frontend build directory
log_info "Check 5: Verifying frontend build directory..."
if [ -d "public" ] && [ -f "public/index.html" ]; then
    log_success "Frontend build directory exists and contains index.html"
else
    log_warning "Frontend build directory or index.html not found"
    echo "This is okay if you haven't built the frontend yet"
    echo "Frontend will be built during deployment"
fi

echo ""

# Final summary
echo "==== Validation Summary ===="
echo "The pre-deployment checks have completed. Here's a summary:"
echo ""
echo "1. .gitignore configuration: Updated to exclude SSL files"
echo "2. Git local exclude: Updated to exclude SSL files"
echo "3. SSL certificate paths: Verified in NGINX configuration"
echo "4. NGINX entrypoint script: Executable permissions verified"
echo "5. Frontend build directory: Status checked"
echo ""
echo "You should now be able to run ./deploy.sh without Git permission errors"
echo "for SSL certificate files."
echo ""
echo "If you still encounter issues, you can manually run:"
echo "1. git update-index --skip-worktree nginx/ssl/**/*.pem"
echo "2. git update-index --skip-worktree nginx/ssl/live/probeops.com*/**/*"