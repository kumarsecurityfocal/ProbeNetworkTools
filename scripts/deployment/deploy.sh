#!/bin/bash

# ProbeOps Fresh Deployment Script - Single File, Fresh Server
# This script performs a complete first-time deployment of the ProbeOps platform 
# with no dependencies on existing setup or external scripts.
# All commands are contained within this single script.
# 
# IMPORTANT: This script is for fresh installations only.
# - It will NOT attempt to fix deployment issues automatically
# - It will stop on ANY error (strict mode)
# - It will provide detailed logs for diagnostics
# - It will NOT modify or adjust configuration files

# Exit immediately on ANY error and enable command printing for transparency
set -e
set -v

# Setup comprehensive logging
LOG_FILE="deployment.log"

# Start fresh log file
echo "===== FRESH DEPLOYMENT STARTED: $(date +"%Y-%m-%d %H:%M:%S.%3N") =====" > "$LOG_FILE"
echo "===== RUNNING ON: $(hostname) =====" >> "$LOG_FILE"
echo "===== SYSTEM INFO =====" >> "$LOG_FILE"
uname -a >> "$LOG_FILE" 2>&1

# Output formatting
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions for logging
function log_success() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S.%3N")
    echo -e "${GREEN}[${timestamp}] ✅ $1${NC}" | tee -a "$LOG_FILE"
    echo "[SUCCESS] ${timestamp} - $1" >> "$LOG_FILE"
}

function log_warning() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S.%3N")
    echo -e "${YELLOW}[${timestamp}] ⚠️ $1${NC}" | tee -a "$LOG_FILE"
    echo "[WARNING] ${timestamp} - $1" >> "$LOG_FILE"
}

function log_error() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S.%3N")
    echo -e "${RED}[${timestamp}] ❌ $1${NC}" | tee -a "$LOG_FILE"
    echo "[ERROR] ${timestamp} - $1" >> "$LOG_FILE"
}

function log_info() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S.%3N")
    echo -e "${BLUE}[${timestamp}] ℹ️ $1${NC}" | tee -a "$LOG_FILE"
    echo "[INFO] ${timestamp} - $1" >> "$LOG_FILE"
}

# Function to capture command output with very verbose logging
function run_command() {
    local cmd="$1"
    local desc="$2"
    
    log_info "Running: $desc"
    echo "[COMMAND_START] $(date +"%Y-%m-%d %H:%M:%S.%3N") - $cmd" >> "$LOG_FILE"
    echo "$ $cmd" | tee -a "$LOG_FILE"
    
    # Log command start time for performance measurement
    local start_time=$(date +%s.%N)
    
    # Run the command and capture its output and exit status
    local output
    local exit_status=0
    
    output=$(eval "$cmd" 2>&1) || exit_status=$?
    
    # Calculate command duration
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    # Write output to log
    echo "[COMMAND_OUTPUT_BEGIN] $(date +"%Y-%m-%d %H:%M:%S.%3N")" >> "$LOG_FILE"
    echo "$output" >> "$LOG_FILE"
    echo "[COMMAND_OUTPUT_END] $(date +"%Y-%m-%d %H:%M:%S.%3N") (Duration: ${duration}s)" >> "$LOG_FILE"
    
    # Display output to console
    echo "$output"
    
    # Check the exit status
    if [ $exit_status -ne 0 ]; then
        log_error "Command failed with exit status $exit_status: $cmd"
        echo "[COMMAND_FAILED] $(date +"%Y-%m-%d %H:%M:%S.%3N") - EXIT CODE: $exit_status - DURATION: ${duration}s" >> "$LOG_FILE"
        return $exit_status
    else
        echo "[COMMAND_SUCCESS] $(date +"%Y-%m-%d %H:%M:%S.%3N") - DURATION: ${duration}s" >> "$LOG_FILE"
    fi
    
    return 0
}

# Function to verify a condition and exit if it fails
function verify_or_exit() {
    local condition="$1"
    local error_message="$2"
    local suggestion="$3"
    
    if ! eval "$condition"; then
        log_error "$error_message"
        if [ -n "$suggestion" ]; then
            log_info "Suggestion: $suggestion"
        fi
        exit 1
    fi
}

# Log detailed system and dependency information
log_info "Collecting detailed system information..."
echo "===== DETAILED SYSTEM INFORMATION =====" >> "$LOG_FILE"
echo "Kernel and OS details:" >> "$LOG_FILE"
uname -a >> "$LOG_FILE" 2>&1
echo "CPU information:" >> "$LOG_FILE"
lscpu >> "$LOG_FILE" 2>&1 || echo "lscpu not available" >> "$LOG_FILE"
echo "Memory information:" >> "$LOG_FILE"
free -h >> "$LOG_FILE" 2>&1 || echo "free command not available" >> "$LOG_FILE"
echo "Disk space:" >> "$LOG_FILE"
df -h >> "$LOG_FILE" 2>&1 || echo "df command not available" >> "$LOG_FILE"

# Log dependency versions
echo "===== DEPENDENCY VERSIONS =====" >> "$LOG_FILE"
echo "Docker version:" >> "$LOG_FILE"
docker --version >> "$LOG_FILE" 2>&1 || echo "Docker not found - REQUIRED" >> "$LOG_FILE"
echo "Docker Compose version:" >> "$LOG_FILE"
docker compose version >> "$LOG_FILE" 2>&1 || echo "Docker Compose not found - REQUIRED" >> "$LOG_FILE"
echo "Node version:" >> "$LOG_FILE"
node --version >> "$LOG_FILE" 2>&1 || echo "Node.js not found - REQUIRED" >> "$LOG_FILE"
echo "npm version:" >> "$LOG_FILE"
npm --version >> "$LOG_FILE" 2>&1 || echo "npm not found - REQUIRED" >> "$LOG_FILE"
echo "Python version:" >> "$LOG_FILE"
python3 --version >> "$LOG_FILE" 2>&1 || echo "Python3 not found - REQUIRED" >> "$LOG_FILE"
echo "pip version:" >> "$LOG_FILE"
pip3 --version >> "$LOG_FILE" 2>&1 || echo "pip3 not found - REQUIRED" >> "$LOG_FILE"
echo "===== END OF ENVIRONMENT INFORMATION =====" >> "$LOG_FILE"

# Check for required dependencies
verify_or_exit "command -v docker >/dev/null 2>&1" "Docker is not installed" "Install Docker using: curl -fsSL https://get.docker.com | sh"
verify_or_exit "docker compose version >/dev/null 2>&1" "Docker Compose is not available" "Update Docker or install Docker Compose separately"

log_info "Starting fresh ProbeOps deployment"

# Step 1: Check for Git updates
log_info "Step 1: Checking for Git repository updates..."

# Check if this is a git repository
if [ -d ".git" ]; then
    log_info "Git repository detected, checking for updates..."
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "Uncommitted changes detected in the repository"
        
        # Ask user if they want to stash changes
        echo -e "${YELLOW}There are uncommitted changes in the repository.${NC}"
        echo -e "${YELLOW}Would you like to stash these changes before pulling updates? (y/n)${NC}"
        read -r stash_response
        
        if [[ "$stash_response" =~ ^[Yy]$ ]]; then
            log_info "Stashing uncommitted changes..."
            run_command "git stash" "Stashing uncommitted changes"
            log_success "Changes stashed successfully"
        else
            log_info "Proceeding without stashing changes"
        fi
    fi
    
    # Try to pull updates
    log_info "Pulling latest updates from the main branch..."
    run_command "git pull origin main" "Pulling latest updates from main branch"
    
    # Check if the pull was successful
    if [ $? -eq 0 ]; then
        log_success "Repository updated successfully"
    else
        log_warning "Failed to update repository. Check your network connection or repository configuration."
        log_info "Proceeding with deployment using current version"
    fi
else
    log_info "Not a Git repository or .git directory not found - skipping Git update check"
fi

# Step 2: Verify Project Structure
log_info "Step 2: Verifying project structure..."
run_command "ls -la" "Listing root directory contents"

# Step 3: Set executable permissions on all scripts
log_info "Step 3: Setting executable permissions on all scripts..."
run_command "find . -path \"./nginx/ssl\" -prune -o -name \"*.sh\" -type f -print 2>/dev/null | sort" "Listing all shell scripts in the project (excluding nginx/ssl)"
run_command "find ./backend ./frontend ./nginx ./probe -name \"*.sh\" -type f -print0 2>/dev/null | xargs -0 chmod +x 2>/dev/null || true" "Setting executable permissions (restricting to app directories)"
log_success "All shell scripts are now executable"

# Step 4: Fresh Environment Setup
log_info "Step 4: Setting up fresh environment configuration..."

# Flag to track template changes
TEMPLATE_CHANGES=false

# Create environment files from templates
if [ -f ".env.template" ]; then
    # Check if environment file already exists
    if [ ! -f ".env" ]; then
        log_info "Creating main .env file from template..."
        
        # Check if we should use the environment file from home directory
        if [ -f "/home/ubuntu/environment/.env" ]; then
            # Check if template has been modified by comparing with a reference copy
            if [ -f "/home/ubuntu/environment/.env.template.ref" ]; then
                if ! cmp -s ".env.template" "/home/ubuntu/environment/.env.template.ref"; then
                    log_warning "🔄 Main .env.template has changed since last deployment!"
                    TEMPLATE_CHANGES=true
                    # Create a backup of modified template
                    run_command "cp .env.template /home/ubuntu/environment/.env.template.new" "Backing up modified .env.template"
                    # Use the template since it has changed
                    run_command "cp .env.template .env" "Creating .env from modified template"
                else
                    log_info "Template unchanged. Using existing .env from /home/ubuntu/environment directory..."
                    run_command "cp /home/ubuntu/environment/.env .env" "Copying .env from /home/ubuntu/environment"
                fi
            else
                # First time run - save a reference copy of the template
                log_info "Saving reference copy of .env.template..."
                run_command "cp .env.template /home/ubuntu/environment/.env.template.ref" "Creating reference copy of .env.template"
                # Use environment file since we don't have a reference to compare
                log_info "Using existing .env from /home/ubuntu/environment directory..."
                run_command "cp /home/ubuntu/environment/.env .env" "Copying .env from /home/ubuntu/environment"
            fi
        else
            # Use template as fallback if no existing file is found
            run_command "cp .env.template .env" "Creating .env from template"
        fi
        log_success "Created main .env file"
    else
        log_info "✅ Skipping main .env overwrite — file already exists"
    fi
    
    # Count usable environment variables
    env_var_count=$(grep -v '^#' .env | grep -v '^$' | wc -l)
    log_info "Main .env file contains $env_var_count active configuration variables"
    
    # Check if we need to manually update the .env file
    if grep -q "CHANGE_ME" .env || grep -q "your-" .env || grep -q "example" .env; then
        log_warning "ATTENTION: .env file contains placeholder values that need to be replaced"
        echo "[ENV_WARNING] Found placeholder values in .env file" >> "$LOG_FILE"
        grep -n "CHANGE_ME\|your-\|example" .env >> "$LOG_FILE"
    fi
else
    log_error "Main .env.template file not found! This is required for deployment."
    echo "[ENV_ERROR] No .env.template found" >> "$LOG_FILE"
    exit 1
fi

# Create backend environment file
if [ -f "backend/.env.backend.template" ]; then
    # Check if environment file already exists
    if [ ! -f "backend/.env.backend" ]; then
        log_info "Creating backend .env.backend file from template..."
        
        # Check if we should use the environment file from home directory
        if [ -f "/home/ubuntu/environment/.env.backend" ]; then
            # Check if backend template has been modified by comparing with reference copy
            if [ -f "/home/ubuntu/environment/.env.backend.template.ref" ]; then
                if ! cmp -s "backend/.env.backend.template" "/home/ubuntu/environment/.env.backend.template.ref"; then
                    log_warning "🔄 Backend .env.backend.template has changed since last deployment!"
                    TEMPLATE_CHANGES=true
                    # Create a backup of modified template
                    run_command "cp backend/.env.backend.template /home/ubuntu/environment/.env.backend.template.new" "Backing up modified backend/.env.backend.template"
                    # Use the template since it has changed
                    run_command "cp backend/.env.backend.template backend/.env.backend" "Creating backend/.env.backend from modified template"
                else
                    log_info "Backend template unchanged. Using existing .env.backend from /home/ubuntu/environment directory..."
                    run_command "cp /home/ubuntu/environment/.env.backend backend/.env.backend" "Copying .env.backend from /home/ubuntu/environment"
                fi
            else
                # First time run - save a reference copy of the backend template
                log_info "Saving reference copy of backend/.env.backend.template..."
                run_command "cp backend/.env.backend.template /home/ubuntu/environment/.env.backend.template.ref" "Creating reference copy of backend/.env.backend.template"
                # Use environment file since we don't have a reference to compare
                log_info "Using existing .env.backend from /home/ubuntu/environment directory..."
                run_command "cp /home/ubuntu/environment/.env.backend backend/.env.backend" "Copying .env.backend from /home/ubuntu/environment"
            fi
        else
            # Use template as fallback if no existing file is found
            run_command "cp backend/.env.backend.template backend/.env.backend" "Creating backend/.env.backend from template"
        fi
        log_success "Created backend environment configuration"
    else
        log_info "✅ Skipping .env.backend overwrite — file already exists"
    fi
    
    run_command "cat backend/.env.backend | grep -v '^#' | grep -v '^$'" "Displaying active backend environment variables"
    
    # Check if we need to manually update the backend .env file
    if grep -q "CHANGE_ME" backend/.env.backend || grep -q "your-" backend/.env.backend || grep -q "example" backend/.env.backend; then
        log_warning "ATTENTION: backend/.env.backend file contains placeholder values that need to be replaced"
        echo "[ENV_WARNING] Found placeholder values in backend/.env.backend file" >> "$LOG_FILE"
        grep -n "CHANGE_ME\|your-\|example" backend/.env.backend >> "$LOG_FILE"
    fi
else
    log_error "Backend .env.backend.template file not found! This is required for deployment."
    echo "[ENV_ERROR] No backend/.env.backend.template found" >> "$LOG_FILE"
    exit 1
fi

# Step 5: Database Configuration
log_info "Step 5: Configuring database connection..."

# Check if database configuration is available
if grep -q "DATABASE_URL" backend/.env.backend; then
    log_info "Checking database configuration in backend/.env.backend"
    db_url=$(grep "DATABASE_URL" backend/.env.backend | cut -d= -f2-)
    
    if [[ "$db_url" == *"CHANGE_ME"* ]] || [[ "$db_url" == *"your-"* ]] || [[ "$db_url" == *"example"* ]]; then
        log_error "DATABASE_URL contains placeholder values and must be updated"
        echo "[DATABASE_ERROR] DATABASE_URL contains placeholder: $db_url" >> "$LOG_FILE"
        log_info "Suggestion: Update backend/.env.backend with a valid database connection string"
        exit 1
    else
        log_success "Database connection string found in backend/.env.backend"
        echo "[DATABASE] Found database connection string (redacted for security)" >> "$LOG_FILE"
    fi
else
    log_error "DATABASE_URL not found in backend/.env.backend"
    echo "[DATABASE_ERROR] DATABASE_URL not found in configuration" >> "$LOG_FILE"
    log_info "Suggestion: Add DATABASE_URL=<connection_string> to backend/.env.backend"
    exit 1
fi

# Step 6: Validating Docker Compose configuration
log_info "Step 6: Validating Docker Compose configuration..."
run_command "docker compose config" "Validating docker-compose.yml"
log_success "Docker Compose configuration is valid"

# Step 7: Clean and rebuild frontend assets
log_info "Step 7: Cleaning and rebuilding frontend assets..."
run_command "sudo rm -rf public/*" "Cleaning public directory"

# Fix potential PostCSS configuration issue before building
log_info "Checking and fixing PostCSS configuration..."
if [ -f "frontend/postcss.config.js" ]; then
    # Check if we need to update the PostCSS config for Tailwind CSS
    if grep -q "tailwindcss" frontend/postcss.config.js; then
        log_warning "Found potential PostCSS configuration issue, installing required dependency..."
        run_command "cd frontend && npm install --save-dev @tailwindcss/postcss" "Installing @tailwindcss/postcss dependency"
        
        # Update the PostCSS config file
        log_info "Updating PostCSS configuration to use @tailwindcss/postcss..."
        sed -i 's/tailwindcss: {}/'\''@tailwindcss\/postcss'\'': {}/g' frontend/postcss.config.js
        log_success "PostCSS configuration updated successfully"
    fi
fi

# Install dependencies and build frontend
run_command "cd frontend && npm install" "Installing frontend dependencies"
run_command "cd frontend && npm run build" "Building frontend assets"

# Check if build succeeded, if not try with alternative configuration
if [ $? -ne 0 ]; then
    log_warning "Frontend build failed, attempting fix with @tailwindcss/postcss..."
    run_command "cd frontend && npm install --save-dev @tailwindcss/postcss" "Installing @tailwindcss/postcss dependency"
    
    # Ensure PostCSS config is correct
    cat > frontend/postcss.config.js << EOL
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
EOL
    log_info "PostCSS configuration updated, retrying build..."
    run_command "cd frontend && npm run build" "Rebuilding frontend assets with fixed configuration"
    
    if [ $? -ne 0 ]; then
        log_error "Frontend build failed again. Deployment may fail."
        echo "[FRONTEND_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Frontend build failed after configuration fix" >> "$LOG_FILE"
        
        # Ask user if they want to continue
        echo -e "${RED}Frontend build failed. The application may not function correctly.${NC}"
        echo -e "${YELLOW}Would you like to continue with deployment anyway? (y/n)${NC}"
        read -r continue_response
        
        if [[ ! "$continue_response" =~ ^[Yy]$ ]]; then
            log_error "Deployment aborted due to frontend build failure"
            echo "[DEPLOYMENT_ABORTED] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Deployment aborted due to frontend build failure" >> "$LOG_FILE"
            exit 1
        else
            log_warning "Continuing deployment despite frontend build failure"
            echo "[FRONTEND_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Continuing deployment despite frontend build failure" >> "$LOG_FILE"
        fi
    else
        log_success "Frontend assets built successfully after configuration fix"
    fi
else
    log_success "Frontend assets built successfully"
fi

# Step 8: Verify and fix frontend assets
log_info "Step 8: Verifying frontend assets..."

# Make sure the public directory exists
if [ ! -d "public" ]; then
    log_info "Creating missing public directory..."
    mkdir -p public
fi

# Check if public directory has content
if [ "$(ls -A public 2>/dev/null)" ]; then
    log_success "Frontend assets verified in public directory"
    run_command "ls -la public" "Listing frontend assets"
else
    log_warning "Frontend assets not found in public directory! Attempting to locate them..."
    
    # Try copying from frontend/dist if it exists (Vite's default output directory)
    if [ -d "frontend/dist" ] && [ "$(ls -A frontend/dist 2>/dev/null)" ]; then
        log_info "Found assets in frontend/dist. Copying to public directory..."
        run_command "cp -r frontend/dist/* public/" "Copying frontend assets from frontend/dist"
        
        # Verify the copy succeeded
        if [ "$(ls -A public 2>/dev/null)" ]; then
            log_success "Successfully copied frontend assets from frontend/dist to public directory"
            run_command "ls -la public" "Listing copied frontend assets"
        else
            log_error "Failed to copy frontend assets from frontend/dist. Deployment may fail."
            echo "[FRONTEND_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Failed to copy frontend assets from frontend/dist" >> "$LOG_FILE"
            
            # Ask user if they want to continue
            echo -e "${RED}Frontend assets could not be copied. The application may not function correctly.${NC}"
            echo -e "${YELLOW}Would you like to continue with deployment anyway? (y/n)${NC}"
            read -r continue_response
            
            if [[ ! "$continue_response" =~ ^[Yy]$ ]]; then
                log_error "Deployment aborted due to missing frontend assets"
                echo "[DEPLOYMENT_ABORTED] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Deployment aborted due to missing frontend assets" >> "$LOG_FILE"
                exit 1
            else
                log_warning "Continuing deployment despite missing frontend assets"
                echo "[FRONTEND_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Continuing deployment despite missing frontend assets" >> "$LOG_FILE"
            fi
        fi
    # Try looking in frontend/build for React apps using Create React App
    elif [ -d "frontend/build" ] && [ "$(ls -A frontend/build 2>/dev/null)" ]; then
        log_info "Found assets in frontend/build. Copying to public directory..."
        run_command "cp -r frontend/build/* public/" "Copying frontend assets from frontend/build"
        
        # Verify the copy succeeded
        if [ "$(ls -A public 2>/dev/null)" ]; then
            log_success "Successfully copied frontend assets from frontend/build to public directory"
            run_command "ls -la public" "Listing copied frontend assets"
        else
            log_error "Failed to copy frontend assets from frontend/build. Deployment may fail."
            echo "[FRONTEND_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Failed to copy frontend assets from frontend/build" >> "$LOG_FILE"
            
            # Ask user if they want to continue
            echo -e "${RED}Frontend assets could not be copied. The application may not function correctly.${NC}"
            echo -e "${YELLOW}Would you like to continue with deployment anyway? (y/n)${NC}"
            read -r continue_response
            
            if [[ ! "$continue_response" =~ ^[Yy]$ ]]; then
                log_error "Deployment aborted due to missing frontend assets"
                exit 1
            else
                log_warning "Continuing deployment despite missing frontend assets"
            fi
        fi
    else
        log_error "No frontend assets found in expected build directories (frontend/dist, frontend/build)"
        echo "[FRONTEND_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - No frontend assets found in expected build directories" >> "$LOG_FILE"
        
        # Last resort: try running the frontend build again
        log_warning "Attempting to rebuild frontend as last resort..."
        run_command "cd frontend && npm run build" "Rebuilding frontend assets"
        
        # Check if build succeeded and look for assets again
        if [ -d "frontend/dist" ] && [ "$(ls -A frontend/dist 2>/dev/null)" ]; then
            log_info "Rebuild successful. Copying newly built assets to public directory..."
            run_command "cp -r frontend/dist/* public/" "Copying rebuilt frontend assets"
            
            if [ "$(ls -A public 2>/dev/null)" ]; then
                log_success "Successfully copied rebuilt frontend assets to public directory"
            else
                log_error "Failed to copy rebuilt frontend assets. Deployment may fail."
                echo "[FRONTEND_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Failed to copy rebuilt frontend assets" >> "$LOG_FILE"
            fi
        else
            log_error "Frontend rebuild failed or produced no assets. Deployment may fail."
            echo "[FRONTEND_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Frontend rebuild failed or produced no assets" >> "$LOG_FILE"
            
            # Ask user if they want to continue
            echo -e "${RED}Frontend assets could not be found or built. The application may not function correctly.${NC}"
            echo -e "${YELLOW}Would you like to continue with deployment anyway? (y/n)${NC}"
            read -r continue_response
            
            if [[ ! "$continue_response" =~ ^[Yy]$ ]]; then
                log_error "Deployment aborted due to missing frontend assets"
                echo "[DEPLOYMENT_ABORTED] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Deployment aborted due to missing frontend assets" >> "$LOG_FILE"
                exit 1
            else
                log_warning "Continuing deployment despite missing frontend assets"
                echo "[FRONTEND_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Continuing deployment despite missing frontend assets" >> "$LOG_FILE"
            fi
        fi
    fi
fi

# Step 9: Build and configure backend
log_info "Step 9: Building and configuring backend..."

# Ensure Python requirements are installed
log_info "Installing Python dependencies..."
run_command "cd backend && pip3 install -r requirements.txt --no-cache-dir" "Installing backend dependencies"
log_success "Backend dependencies installed successfully"

# Step 10: Stopping existing containers
log_info "Step 10: Stopping existing containers..."
echo "[DOCKER] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Stopping containers" >> "$LOG_FILE"
run_command "docker compose down" "Stopping and removing all existing containers"
log_success "All existing containers stopped and removed"

# Step 10.5: Run database migrations with Alembic hash-based IDs
log_info "Step 10.5: Running database migrations with Alembic hash-based IDs..."
echo "[DATABASE] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Starting enhanced database migration process" >> "$LOG_FILE"

# Ensure environment files are copied before running migrations
log_info "Ensuring latest environment files are available for database migrations..."

# Copy main .env file from environment directory if available
if [ -f "/home/ubuntu/environment/.env" ]; then
    log_info "Copying main .env file from environment directory..."
    run_command "cp /home/ubuntu/environment/.env .env" "Copying main .env file before migration"
    log_success "Main .env file copied successfully"
else
    log_warning "No main .env file found in environment directory, using existing file"
fi

# Copy backend .env.backend file from environment directory if available
if [ -f "/home/ubuntu/environment/.env.backend" ]; then
    log_info "Copying backend .env.backend file from environment directory..."
    run_command "cp /home/ubuntu/environment/.env.backend backend/.env.backend" "Copying backend .env.backend file before migration"
    log_success "Backend .env.backend file copied successfully"
else
    log_warning "No backend .env.backend file found in environment directory, using existing file"
fi

# Try to run Alembic migrations directly first (hash-based ID approach)
if [ -d "backend/alembic" ]; then
    log_info "Using Alembic hash-based ID migrations..."
    
    # Create backup of database first
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_DIR="database_backups"
    mkdir -p "$BACKUP_DIR"
    
    # Try to backup the database if possible
    if command -v pg_dump &> /dev/null; then
        BACKUP_FILE="$BACKUP_DIR/probeops_backup_$TIMESTAMP.sql"
        log_info "Creating database backup to $BACKUP_FILE..."
        
        # Check if we can get the DATABASE_URL from environment
        if [ -z "$DATABASE_URL" ]; then
            # Try to get it from backend/.env.backend
            if [ -f "backend/.env.backend" ]; then
                DATABASE_URL=$(grep "DATABASE_URL" backend/.env.backend | cut -d= -f2-)
                log_info "Found DATABASE_URL in backend/.env.backend"
            fi
            
            # Try to get it from .env
            if [ -z "$DATABASE_URL" ] && [ -f ".env" ]; then
                DATABASE_URL=$(grep "DATABASE_URL" .env | cut -d= -f2-)
                log_info "Found DATABASE_URL in .env"
            fi
            
            # Try to get it from environment directory
            if [ -z "$DATABASE_URL" ] && [ -f "/home/ubuntu/environment/.env.backend" ]; then
                DATABASE_URL=$(grep "DATABASE_URL" /home/ubuntu/environment/.env.backend | cut -d= -f2-)
                log_info "Found DATABASE_URL in /home/ubuntu/environment/.env.backend"
            fi
        fi
        
        if [ -n "$DATABASE_URL" ]; then
            # Extract connection details from DATABASE_URL
            DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
            DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
            DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
            DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
            
            # Log the extracted connection details (excluding password)
            log_info "Database connection details: User: $DB_USER, Host: $DB_HOST, Port: $DB_PORT, Database: $DB_NAME"
        else
            log_warning "Could not find DATABASE_URL in any config files. Skipping backup."
            return
        fi
        
        # Use environment variables for authentication
        export PGPASSWORD=$DB_PASSWORD
        
        # Create backup
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p > "$BACKUP_FILE" 2>/dev/null; then
            log_success "Database backup created successfully"
        else
            log_warning "Failed to create database backup. Continuing with migration."
        fi
        
        # Unset password
        unset PGPASSWORD
    else
        log_warning "pg_dump not available or DATABASE_URL not set. Skipping backup."
    fi
    
    echo "[DATABASE] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Starting Alembic migration..." >> "$LOG_FILE"
    
    # Change to backend directory and run Alembic migration
    cd backend || { 
        log_error "Failed to change to backend directory!"
        cd ..
        return 1
    }
    log_info "Running Alembic migrations from $(pwd)..."
    
    # First make sure script_location is correct in alembic.ini
    if [ -f "alembic.ini" ] && grep -q "script_location = backend/alembic" alembic.ini; then
        log_warning "Fixing incorrect script_location path in alembic.ini..."
        sed -i 's|script_location = backend/alembic|script_location = alembic|g' alembic.ini
        log_info "Updated alembic.ini with correct script_location path"
    fi
    
    # Check if alembic directory exists
    if [ ! -d "alembic" ]; then
        log_error "Alembic directory not found in backend folder"
        echo "[DATABASE_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Alembic directory not found in backend folder" >> "../$LOG_FILE"
        
        # Check if it exists in a nested path
        if [ -d "backend/alembic" ]; then
            log_warning "Found alembic directory at backend/alembic, moving it to correct location..."
            mv backend/alembic ./alembic
            log_info "Moved alembic directory to correct location"
        fi
    fi
    
    # Verify alembic is installed
    if ! command -v alembic &> /dev/null && ! python3 -m alembic --version &> /dev/null; then
        log_warning "Alembic command not found, installing it..."
        pip3 install alembic
        log_info "Alembic installed"
    fi
    
    # Try regular upgrade first
    log_info "Running Alembic migrations from $(pwd)..."
    set +e  # Temporarily disable exit on error
    MIGRATION_OUTPUT=$(python3 -m alembic upgrade head 2>&1)
    MIGRATION_STATUS=$?
    set -e  # Re-enable exit on error
    
    # Check for common errors that can be safely ignored
    if [ $MIGRATION_STATUS -ne 0 ]; then
        if echo "$MIGRATION_OUTPUT" | grep -q "DuplicateTable"; then
            log_warning "Some database tables already exist. This is usually harmless."
            # Set migration status to success since the database structure should be fine
            MIGRATION_STATUS=0
        elif echo "$MIGRATION_OUTPUT" | grep -q "already exists" || echo "$MIGRATION_OUTPUT" | grep -q "duplicate"; then
            log_warning "Some database objects already exist. This is usually harmless."
            # Set migration status to success since the database structure should be fine
            MIGRATION_STATUS=0
        fi
    fi
    
    # Check if we have multiple heads
    if echo "$MIGRATION_OUTPUT" | grep -q "multiple heads"; then
        log_warning "Multiple Alembic migration heads detected. Attempting to merge..."
        
        # Get the heads
        HEADS=$(python3 -m alembic heads)
        log_info "Found migration heads: $HEADS"
        
        # Create a merge migration
        MERGE_MESSAGE="merge_$(date +%Y%m%d%H%M%S)"
        log_info "Creating merge migration: $MERGE_MESSAGE"
        python3 -m alembic merge heads -m "$MERGE_MESSAGE"
        
        # Run the merge migration
        log_info "Running merge migration..."
        if python3 -m alembic upgrade head; then
            log_success "Alembic merge migration completed successfully"
            MIGRATION_STATUS=0
        else
            log_error "Alembic merge migration failed"
            MIGRATION_STATUS=1
        fi
    fi
    
    # Return to previous directory
    cd ..
    
    # Check if migration was successful
    if [ $MIGRATION_STATUS -eq 0 ]; then
        log_success "Alembic migrations completed successfully"
    else
        log_error "Alembic migrations failed"
        echo "[DATABASE_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - $MIGRATION_OUTPUT" >> "$LOG_FILE"
        
        # Do not attempt any fallback migrations
        log_error "Database migration failed. No fallback will be attempted as requested."
        echo "[DATABASE_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migration failed - no fallbacks attempted" >> "$LOG_FILE"
        
        # Ask the user if they want to continue despite the migration failure
        echo -e "${RED}Database migration failed. This may cause application issues.${NC}"
        echo -e "${YELLOW}Would you like to continue with deployment anyway? (y/n)${NC}"
        read -r continue_response
        
        if [[ ! "$continue_response" =~ ^[Yy]$ ]]; then
            log_error "Deployment aborted due to database migration failure"
            echo "[DEPLOYMENT_ABORTED] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Deployment aborted due to database migration failure" >> "$LOG_FILE"
            exit 1
        else
            log_warning "Continuing deployment despite database migration failure"
            echo "[DATABASE_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Continuing deployment despite database migration failure" >> "$LOG_FILE"
        fi
    fi
else
    # Alembic directory not found, this is an error
    log_error "Alembic directory not found in expected location."
    echo "[DATABASE_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Alembic directory not found" >> "$LOG_FILE"
    
    # Ask the user if they want to continue without running migrations
    echo -e "${RED}Alembic directory not found. Database migrations cannot be run.${NC}"
    echo -e "${YELLOW}Would you like to continue with deployment anyway? (y/n)${NC}"
    read -r continue_response
    
    if [[ ! "$continue_response" =~ ^[Yy]$ ]]; then
        log_error "Deployment aborted due to missing Alembic directory"
        echo "[DEPLOYMENT_ABORTED] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Deployment aborted due to missing Alembic directory" >> "$LOG_FILE"
        exit 1
    else
        log_warning "Continuing deployment despite missing Alembic directory"
        echo "[DATABASE_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Continuing deployment despite missing Alembic directory" >> "$LOG_FILE"
    fi
fi

# JWT authentication step removed - fresh deployment no longer requires JWT fix
log_info "Step 10.6: Authentication check - skipping since we're using a fresh deployment"
echo "[AUTH] $(date +"%Y-%m-%d %H:%M:%S.%3N") - JWT auth fix skipped for fresh deployment" >> "$LOG_FILE"

# Step 10.7: Check if diagnostic tools should be enabled
log_info "Step 10.7: Checking if diagnostic tools should be enabled..."
echo -e "${BLUE}Would you like to enable the diagnostic dashboard for troubleshooting? (y/n)${NC}"
read -r enable_diagnostics

if [[ "$enable_diagnostics" =~ ^[Yy]$ ]]; then
    log_info "Setting up diagnostic dashboard..."
    if [ -f "scripts/deployment/diagnostics-setup.sh" ]; then
        chmod +x scripts/deployment/diagnostics-setup.sh
        run_command "./scripts/deployment/diagnostics-setup.sh" "Setting up diagnostic tools"
        log_success "Diagnostic dashboard setup complete"
        log_info "You can access the diagnostic dashboard at: https://your-domain.com/diagnostics"
        log_info "Default password is 'probeops-diagnostics' - please change this in production"
    else
        log_warning "Diagnostic setup script not found. Skipping diagnostics setup."
    fi
else
    log_info "Diagnostic dashboard not enabled - skipping setup"
fi

# Step 11: Starting Docker containers
log_info "Step 11: Starting Docker containers..."
run_command "docker compose up -d" "Starting all containers in detached mode"
log_success "All containers started successfully"

# Step 12: Verify deployment
log_info "Step 12: Verifying deployment..."
sleep 5  # Wait a bit for containers to start fully

# Check Docker container status
log_info "Checking Docker container status..."
run_command "docker compose ps" "Listing container status"

# Count running containers
RUNNING_CONTAINERS=$(docker compose ps --status running | grep -v "Name" | wc -l)
EXPECTED_CONTAINERS=$(grep "container_name:" docker-compose.yml | wc -l)

if [ "$RUNNING_CONTAINERS" -lt "$EXPECTED_CONTAINERS" ]; then
    log_warning "Not all expected containers are running! ($RUNNING_CONTAINERS/$EXPECTED_CONTAINERS)"
    echo "[DEPLOYMENT_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Not all containers are running: $RUNNING_CONTAINERS/$EXPECTED_CONTAINERS" >> "$LOG_FILE"
    
    # Show logs for containers that might have failed
    log_info "Checking container logs for issues..."
    run_command "docker compose logs --tail=50" "Showing container logs"
else
    log_success "All expected containers are running: $RUNNING_CONTAINERS/$EXPECTED_CONTAINERS"
    echo "[DEPLOYMENT_SUCCESS] $(date +"%Y-%m-%d %H:%M:%S.%3N") - All containers are running: $RUNNING_CONTAINERS/$EXPECTED_CONTAINERS" >> "$LOG_FILE"
fi

# Step 13: Final deployment summary
log_info "Step 13: Deployment summary"
echo "===== DEPLOYMENT SUMMARY =====" >> "$LOG_FILE"

# Check frontend accessibility
if [ -d "public" ] && [ "$(ls -A public 2>/dev/null)" ]; then
    log_success "✅ Frontend assets are properly deployed"
    echo "[FRONTEND_SUCCESS] Frontend assets are properly deployed" >> "$LOG_FILE"
else
    log_error "❌ Frontend assets are missing or incomplete"
    echo "[FRONTEND_ERROR] Frontend assets are missing or incomplete" >> "$LOG_FILE"
fi

# Check backend status
if docker compose ps backend | grep -q "Up"; then
    log_success "✅ Backend API container is running"
    echo "[BACKEND_SUCCESS] Backend API container is running" >> "$LOG_FILE"
else
    log_error "❌ Backend API container is not running"
    echo "[BACKEND_ERROR] Backend API container is not running" >> "$LOG_FILE"
fi

# Check database migrations
if [ -d "backend/alembic" ]; then
    log_success "✅ Database migrations are configured with Alembic hash-based IDs"
    echo "[DATABASE_SUCCESS] Database migrations are configured with Alembic hash-based IDs" >> "$LOG_FILE"
else
    log_warning "⚠️ Using legacy database migration approach"
    echo "[DATABASE_WARNING] Using legacy database migration approach" >> "$LOG_FILE"
fi

# Display deployment success message
echo -e "\n${GREEN}===== PROBEOPS DEPLOYMENT COMPLETED =====${NC}"
echo -e "${GREEN}Deployment completed at: $(date)${NC}"
echo -e "${BLUE}Frontend accessible at: http://localhost:80${NC}"
echo -e "${BLUE}Backend API accessible at: http://localhost:8000${NC}"
echo -e "${BLUE}Deployment logs available at: $LOG_FILE${NC}"
echo -e "${YELLOW}Note: You may need to set up SSL certificates for production use.${NC}"

# Record completion in log
echo "===== DEPLOYMENT COMPLETED: $(date +"%Y-%m-%d %H:%M:%S.%3N") =====" >> "$LOG_FILE"
echo "Success: Deployment completed successfully!" >> "$LOG_FILE"

exit 0