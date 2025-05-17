#!/bin/bash

# ProbeOps Database Migration Integration Script
# This script integrates the safe_deploy_db.sh script into the main deployment workflow

# Set script to exit on error
set -e

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
function log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

function log_error() {
    echo -e "${RED}❌ $1${NC}"
}

function log_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Determine script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_SCRIPTS_DIR="$PROJECT_ROOT/scripts/database"

# Create log directory if it doesn't exist
LOG_DIR="$PROJECT_ROOT/deployment_logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/db_migration_$(date +"%Y%m%d_%H%M%S").log"

echo "==========================================="
echo "🚀 PROBEOPS DATABASE MIGRATION INTEGRATION"
echo "==========================================="
echo "Starting database migration process..."
echo "Logs will be saved to: $LOG_FILE"
echo ""

# Check if the safe_deploy_db.sh script exists
if [ ! -f "$DB_SCRIPTS_DIR/safe_deploy_db.sh" ]; then
    log_error "Cannot find safe_deploy_db.sh script at $DB_SCRIPTS_DIR/safe_deploy_db.sh"
    log_error "Please ensure the script exists and you're running this from the correct directory"
    exit 1
fi

# Make sure the script is executable
chmod +x "$DB_SCRIPTS_DIR/safe_deploy_db.sh"

# Check if .env.db exists, if not try to create it from .env
ENV_DB_FILE="$PROJECT_ROOT/.env.db"
if [ ! -f "$ENV_DB_FILE" ]; then
    log_warning "No .env.db file found at $ENV_DB_FILE"
    
    if [ -f "$PROJECT_ROOT/.env" ]; then
        log_info "Found .env file, creating .env.db from it..."
        grep -E "^(DATABASE_URL|DB_|PG|POSTGRES)" "$PROJECT_ROOT/.env" > "$ENV_DB_FILE"
        log_success "Created .env.db with database configuration from .env"
    else
        log_warning "No .env file found, using default DATABASE_URL if available in environment"
    fi
fi

# Run the database validation and migration script
log_info "Running database pre-deployment validation and migration..."
"$DB_SCRIPTS_DIR/safe_deploy_db.sh" 2>&1 | tee -a "$LOG_FILE"

# Check if migration was successful
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log_success "Database migration completed successfully!"
else
    log_error "Database migration failed! Check $LOG_FILE for details"
    log_warning "You may need to fix database issues before continuing with deployment"
    
    # Ask user if they want to continue with deployment
    read -p "Continue with deployment despite database issues? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Deployment aborted by user due to database issues"
        exit 1
    else
        log_warning "Continuing with deployment despite database issues - this may cause application problems!"
    fi
fi

log_info "Database migration process completed"
echo "==========================================="
echo ""