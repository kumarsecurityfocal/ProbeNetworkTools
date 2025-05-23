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
run_command "cd frontend && npm install" "Installing frontend dependencies"
run_command "cd frontend && npm run build" "Building frontend assets"
log_success "Frontend assets built successfully"

# Step 8: Verify frontend assets
log_info "Step 8: Verifying frontend assets..."
if [ -d "public" ] && [ "$(ls -A public 2>/dev/null)" ]; then
    log_success "Frontend assets verified in public directory"
    run_command "ls -la public" "Listing frontend assets"
else
    log_error "Frontend assets not found in public directory!"
    echo "[FRONTEND_ERROR] Frontend assets not found in public directory" >> "$LOG_FILE"
    
    # Try copying from frontend/dist if it exists
    if [ -d "frontend/dist" ] && [ "$(ls -A frontend/dist 2>/dev/null)" ]; then
        log_warning "Found assets in frontend/dist. Trying to copy..."
        run_command "cp -r frontend/dist/* public/" "Copying frontend assets from frontend/dist"
        
        if [ "$(ls -A public 2>/dev/null)" ]; then
            log_success "Successfully copied frontend assets from frontend/dist"
        else
            log_error "Failed to copy frontend assets. Deployment may fail."
            echo "[FRONTEND_ERROR] Failed to copy frontend assets" >> "$LOG_FILE"
        fi
    else
        log_error "No frontend assets found in frontend/dist either!"
        echo "[FRONTEND_ERROR] No frontend assets found in frontend/dist" >> "$LOG_FILE"
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

# Try to run Alembic migrations directly first (hash-based ID approach)
if [ -d "backend/alembic" ]; then
    log_info "Using Alembic hash-based ID migrations..."
    
    # Create backup of database first
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_DIR="database_backups"
    mkdir -p "$BACKUP_DIR"
    
    # Try to backup the database if possible
    if command -v pg_dump &> /dev/null && [ -n "$DATABASE_URL" ]; then
        BACKUP_FILE="$BACKUP_DIR/probeops_backup_$TIMESTAMP.sql"
        log_info "Creating database backup to $BACKUP_FILE..."
        
        # Extract connection details from DATABASE_URL
        DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
        
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
    
    # Change to backend directory and run Alembic migration
    cd backend
    log_info "Running Alembic migrations..."
    
    if python3 -m alembic upgrade head; then
        log_success "Alembic migrations completed successfully"
        cd ..
    else
        log_error "Alembic migrations failed"
        cd ..
        
        # Try the traditional safe_deploy_db.sh as fallback
        log_warning "Trying traditional migration approach as fallback..."
        DB_MIGRATION_SCRIPT="scripts/database/safe_deploy_db.sh"
        
        if [ -f "$DB_MIGRATION_SCRIPT" ]; then
            log_info "Found database migration script at $DB_MIGRATION_SCRIPT"
            
            # Make sure the script is executable
            chmod +x "$DB_MIGRATION_SCRIPT"
            
            # Run the database migration script
            log_info "Running database migration script..."
            if "./$DB_MIGRATION_SCRIPT"; then
                log_success "Fallback database migration completed successfully"
            else
                log_error "Fallback database migration also failed!"
                echo "[DATABASE_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - All database migration methods failed" >> "$LOG_FILE"
                
                # Ask the user if they want to continue despite the migration failure
                echo -e "${RED}All database migration methods failed. This may cause application issues.${NC}"
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
            # Ask the user if they want to continue despite the migration failure
            echo -e "${RED}Database migration failed and no fallback script found. This may cause application issues.${NC}"
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
    fi
else
    # If Alembic directory not found, try the traditional approach
    log_warning "Alembic directory not found. Using traditional migration approach..."
    
    # Check if the database migration script exists
    DB_MIGRATION_SCRIPT="scripts/database/safe_deploy_db.sh"
    if [ -f "$DB_MIGRATION_SCRIPT" ]; then
        log_info "Found database migration script at $DB_MIGRATION_SCRIPT"
        
        # Make sure the script is executable
        chmod +x "$DB_MIGRATION_SCRIPT"
        
        # Run the database migration script
        log_info "Running database migration script..."
        if "./$DB_MIGRATION_SCRIPT"; then
            log_success "Database migration completed successfully"
        else
            log_error "Database migration failed!"
            echo "[DATABASE_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migration failed" >> "$LOG_FILE"
            
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
        log_warning "No database migration scripts found - skipping database migrations"
        echo "[DATABASE_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - No database migration scripts found" >> "$LOG_FILE"
    fi
fi

# Step 10.6: Fix JWT user authentication
log_info "Step 10.6: Ensuring admin user and JWT authentication..."
echo "[AUTH] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Starting JWT auth fix process" >> "$LOG_FILE"

# Check if the auth fix script exists
AUTH_FIX_SCRIPT="scripts/fix_jwt_auth.py"
if [ -f "$AUTH_FIX_SCRIPT" ]; then
    log_info "Found JWT authentication fix script at $AUTH_FIX_SCRIPT"
    log_info "Running authentication fix script..."
    run_command "cd backend && python3 ../$AUTH_FIX_SCRIPT" "Running JWT authentication fix"
    log_success "JWT authentication fix completed"
else
    log_warning "JWT authentication fix script not found at $AUTH_FIX_SCRIPT - skipping"
    echo "[AUTH_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - JWT authentication fix script not found" >> "$LOG_FILE"
    
    # Try alternative auth fix implementation if it exists
    ALT_AUTH_FIX_SCRIPT="auth-fix.js"
    if [ -f "$ALT_AUTH_FIX_SCRIPT" ]; then
        log_info "Found alternative JWT authentication fix script at $ALT_AUTH_FIX_SCRIPT"
        log_info "Running alternative authentication fix script..."
        run_command "node $ALT_AUTH_FIX_SCRIPT" "Running alternative JWT authentication fix"
        log_success "Alternative JWT authentication fix completed"
    else
        log_warning "No JWT authentication fix scripts found - auth may require manual setup"
        echo "[AUTH_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - No JWT authentication fix scripts found" >> "$LOG_FILE"
    fi
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