#!/bin/bash
# Database migration patch script for deploy.sh
# This script creates a safer version of the database migration process
# It's designed to be run during deployment, but can also be run manually

set -e # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log file
LOG_FILE="database_migration_fix.log"
mkdir -p database_backups

# Function to log messages
log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️ $1${NC}"
    echo "[INFO] $(date +'%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
    echo "[SUCCESS] $(date +'%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️ $1${NC}"
    echo "[WARNING] $(date +'%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
    echo "[ERROR] $(date +'%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check if we have the required tools
if ! command -v pg_dump &> /dev/null; then
    log_warning "pg_dump not found. Backup may not work."
fi

# Function to backup the database
backup_database() {
    log_info "Creating database backup before migration..."
    
    # Get database connection parameters from environment
    if [ -z "$DATABASE_URL" ]; then
        # Try to source environment variables from .env file
        if [ -f ".env" ]; then
            source .env
        elif [ -f ".env.db" ]; then
            source .env.db
        fi
    fi
    
    # If still no DATABASE_URL, use individual parameters
    if [ -z "$DATABASE_URL" ]; then
        if [ -z "$PGHOST" ] || [ -z "$PGUSER" ] || [ -z "$PGDATABASE" ]; then
            log_error "Database connection parameters not found. Backup skipped."
            return 1
        fi
        
        # Build connection string
        CONNECTION="--host=$PGHOST --port=${PGPORT:-5432} --username=$PGUSER $PGDATABASE"
    else
        # Parse DATABASE_URL
        DB_URL=$DATABASE_URL
        CONNECTION="$DB_URL"
    fi
    
    # Create backup
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="database_backups/probeops_backup_$TIMESTAMP.sql"
    
    log_info "Backing up to $BACKUP_FILE..."
    
    # Try pg_dump with connection string
    if pg_dump -Fc "$CONNECTION" > "$BACKUP_FILE" 2>/dev/null; then
        log_success "Database backup created successfully."
        return 0
    else
        log_warning "pg_dump failed. Trying alternative backup method..."
        
        # Try to get schema via SQL
        psql "$CONNECTION" -c "\\d" > "$BACKUP_FILE.schema" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            log_success "Schema backup created at $BACKUP_FILE.schema"
            return 0
        else
            log_warning "Backup failed. Continuing without backup."
            return 1
        fi
    fi
}

# Function to fix the usage_logs migration issue
fix_usage_logs_table() {
    log_info "Checking for usage_logs table issues..."
    
    # Get database connection parameters
    if [ -z "$DATABASE_URL" ]; then
        # Try to source environment variables from .env file
        if [ -f ".env" ]; then
            source .env
        elif [ -f ".env.db" ]; then
            source .env.db
        fi
    fi
    
    # If still no DATABASE_URL, use individual parameters
    if [ -z "$DATABASE_URL" ]; then
        if [ -z "$PGHOST" ] || [ -z "$PGUSER" ] || [ -z "$PGDATABASE" ]; then
            log_error "Database connection parameters not found. Fix skipped."
            return 1
        fi
        
        # Build connection string
        CONNECTION="--host=$PGHOST --port=${PGPORT:-5432} --username=$PGUSER $PGDATABASE"
    else
        # Parse DATABASE_URL
        DB_URL=$DATABASE_URL
        CONNECTION="$DB_URL"
    fi
    
    # Check if usage_logs table exists
    TABLE_EXISTS=$(psql "$CONNECTION" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_logs');" 2>/dev/null)
    
    if [[ $TABLE_EXISTS == *"t"* ]]; then
        log_info "usage_logs table exists. Checking for foreign key constraints..."
        
        # Get current foreign key constraints
        FK_CONSTRAINTS=$(psql "$CONNECTION" -t -c "SELECT tc.constraint_name FROM information_schema.table_constraints AS tc WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'usage_logs';" 2>/dev/null)
        
        if [ -n "$FK_CONSTRAINTS" ]; then
            log_info "Found foreign key constraints on usage_logs table. Dropping them..."
            
            # Drop each constraint
            while IFS= read -r constraint; do
                constraint=$(echo "$constraint" | xargs) # Trim whitespace
                if [ -n "$constraint" ]; then
                    log_info "Dropping constraint: $constraint"
                    psql "$CONNECTION" -c "ALTER TABLE usage_logs DROP CONSTRAINT $constraint;" 2>/dev/null
                    
                    if [ $? -eq 0 ]; then
                        log_success "Dropped constraint: $constraint"
                    else
                        log_warning "Failed to drop constraint: $constraint"
                    fi
                fi
            done <<< "$FK_CONSTRAINTS"
            
            # Add back the constraints with ON DELETE SET NULL
            log_info "Re-adding foreign key constraints with ON DELETE SET NULL..."
            
            # Add user_id constraint safely
            psql "$CONNECTION" -c "ALTER TABLE usage_logs ADD CONSTRAINT usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;" 2>/dev/null
            
            if [ $? -eq 0 ]; then
                log_success "Re-added user_id foreign key constraint with ON DELETE SET NULL"
            else
                log_warning "Failed to re-add user_id foreign key constraint"
            fi
            
            # Add tier_id constraint safely
            psql "$CONNECTION" -c "ALTER TABLE usage_logs ADD CONSTRAINT usage_logs_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id) ON DELETE SET NULL;" 2>/dev/null
            
            if [ $? -eq 0 ]; then
                log_success "Re-added tier_id foreign key constraint with ON DELETE SET NULL"
            else
                log_warning "Failed to re-add tier_id foreign key constraint"
            fi
            
            # Add api_key_id constraint safely
            psql "$CONNECTION" -c "ALTER TABLE usage_logs ADD CONSTRAINT usage_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL;" 2>/dev/null
            
            if [ $? -eq 0 ]; then
                log_success "Re-added api_key_id foreign key constraint with ON DELETE SET NULL"
            else
                log_warning "Failed to re-add api_key_id foreign key constraint"
            fi
            
            log_success "Foreign key constraints updated for usage_logs table"
            return 0
        else
            log_info "No foreign key constraints found on usage_logs table."
            return 0
        fi
    else
        log_info "usage_logs table doesn't exist. No fixes needed."
        return 0
    fi
}

# Main function
run_migration_fixes() {
    log_info "Starting database migration fixes..."
    
    # Backup database first
    backup_database
    
    # Fix usage_logs table if it exists
    fix_usage_logs_table
    
    log_success "Database migration fixes completed."
}

# Run the script
run_migration_fixes