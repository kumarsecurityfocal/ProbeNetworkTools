#!/bin/bash
# Updated database migration script for ProbeOps deploy.sh
# This script uses the new hash-based Alembic migration approach

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Setup logging
LOG_FILE="deploy_migration.log"

# Helper functions for logging
function log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo "[SUCCESS] $(date +'%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

function log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
    echo "[WARNING] $(date +'%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

function log_error() {
    echo -e "${RED}❌ $1${NC}"
    echo "[ERROR] $(date +'%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

function log_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
    echo "[INFO] $(date +'%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Create a backup of the database
function create_backup() {
    log_info "Creating database backup before migration..."
    
    # Create backup directory
    mkdir -p database_backups
    
    # Generate timestamp for backup file
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="database_backups/probeops_backup_$TIMESTAMP.sql"
    
    # Backup using pg_dump
    if command -v pg_dump &> /dev/null; then
        log_info "Using pg_dump for backup..."
        
        # Try to use environment variables for database connection
        if [ -n "$DATABASE_URL" ]; then
            # Extract database connection details
            DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
            DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
            DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
            DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
            
            # Use environment variables for authentication
            export PGPASSWORD=$DB_PASSWORD
            
            # Create backup
            pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p > "$BACKUP_FILE" 2>/dev/null
            
            # Check if backup was successful
            if [ $? -eq 0 ]; then
                log_success "Database backup created at: $BACKUP_FILE"
                unset PGPASSWORD
                return 0
            else
                log_warning "Failed to create backup using pg_dump"
                unset PGPASSWORD
            fi
        else
            log_warning "DATABASE_URL not set, cannot create backup using pg_dump"
        fi
    else
        log_warning "pg_dump not available, skipping database backup"
    fi
    
    log_warning "No database backup created"
    return 1
}

# Run Alembic migrations
function run_migrations() {
    log_info "Running database migrations using Alembic..."
    
    # Find the Alembic directory
    if [ -d "backend/alembic" ]; then
        ALEMBIC_DIR="backend/alembic"
    elif [ -d "alembic" ]; then
        ALEMBIC_DIR="alembic"
    else
        log_error "Could not find Alembic directory"
        return 1
    fi
    
    # Run the migrations
    cd backend
    
    # First check for any pending migrations
    log_info "Checking for pending migrations..."
    python3 -m alembic current
    
    # Then run the migrations
    log_info "Applying migrations..."
    if python3 -m alembic upgrade head; then
        log_success "Alembic migrations applied successfully"
        cd ..
        return 0
    else
        log_error "Alembic migrations failed"
        cd ..
        return 1
    fi
}

# Main function
function main() {
    log_info "Starting ProbeOps database migration process..."
    
    # First try the traditional safe_deploy_db.sh if it exists
    SAFE_DEPLOY_SCRIPT="$(pwd)/scripts/database/safe_deploy_db.sh"
    
    if [ -f "$SAFE_DEPLOY_SCRIPT" ]; then
        log_info "Found safe_deploy_db.sh script, trying it first..."
        chmod +x "$SAFE_DEPLOY_SCRIPT"
        
        if "$SAFE_DEPLOY_SCRIPT"; then
            log_success "Database migration with safe_deploy_db.sh completed successfully"
            return 0
        else
            log_warning "safe_deploy_db.sh migration failed, falling back to Alembic direct migration"
        fi
    else
        log_info "No safe_deploy_db.sh found, using direct Alembic migration"
    fi
    
    # Create backup before migrations
    create_backup
    
    # Run the migrations using Alembic
    if run_migrations; then
        log_success "Database migration with Alembic completed successfully"
        return 0
    else
        log_error "Database migration failed"
        return 1
    fi
}

# Run the main function
main