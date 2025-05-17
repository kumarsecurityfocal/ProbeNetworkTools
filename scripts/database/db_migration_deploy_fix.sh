#!/bin/bash
# Enhanced database migration script for ProbeOps deploy.sh
# This script safely runs migrations and handles common errors

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log file
LOG_FILE="../database_migration.log"

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

# Create a backup of the database before migrations
create_backup() {
    log_info "Creating database backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p ../database_backups
    
    # Generate a timestamp for the backup file
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="../database_backups/probeops_backup_$TIMESTAMP.sql"
    
    # Try to use pg_dump to create backup
    if command -v pg_dump > /dev/null; then
        if [ -n "$DATABASE_URL" ]; then
            # Extract connection details from DATABASE_URL
            DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
            DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
            DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
            DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
            
            # Use environment variables for authentication
            export PGPASSWORD=$DB_PASSWORD
            
            # Execute pg_dump
            if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p > "$BACKUP_FILE"; then
                log_success "Backup created successfully at $BACKUP_FILE"
                # Unset password after use
                unset PGPASSWORD
                return 0
            else
                log_warning "Failed to create backup with pg_dump. Will try alternative method."
                unset PGPASSWORD
            fi
        else
            log_warning "DATABASE_URL not set, skipping backup"
        fi
    else
        log_warning "pg_dump not found, skipping backup"
    fi
    
    # Alternative backup method using Python/SQLAlchemy if available
    if command -v python > /dev/null; then
        log_info "Attempting backup using Python..."
        python -c "
import os
import sqlalchemy as sa
from datetime import datetime

try:
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        print('DATABASE_URL not set')
        exit(1)
    
    engine = sa.create_engine(db_url)
    
    with engine.connect() as conn:
        with open('$BACKUP_FILE.schema', 'w') as f:
            # Get table names
            tables = conn.execute(sa.text(\"\"\"
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            \"\"\")).fetchall()
            
            f.write('-- Schema Backup Generated: ' + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + '\\n\\n')
            
            # Get schema for each table
            for table in tables:
                table_name = table[0]
                f.write('-- Table: ' + table_name + '\\n')
                
                # Get columns
                columns = conn.execute(sa.text(\"\"\"
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = :table_name
                    ORDER BY ordinal_position
                \"\"\"), {'table_name': table_name}).fetchall()
                
                for col in columns:
                    f.write(f'--   {col[0]}: {col[1]} (Nullable: {col[2]})\\n')
                
                f.write('\\n')
    
    print('Schema backup created at $BACKUP_FILE.schema')
    exit(0)
except Exception as e:
    print(f'Error creating schema backup: {str(e)}')
    exit(1)
        "
        if [ $? -eq 0 ]; then
            log_success "Schema backup created at $BACKUP_FILE.schema"
            return 0
        else
            log_warning "Failed to create schema backup using Python"
        fi
    fi
    
    log_warning "No backup created. Proceeding with migration without backup."
    return 1
}

# Fix foreign key constraints in the usage_logs table
fix_foreign_key_constraints() {
    log_info "Checking for foreign key constraint issues..."
    
    if [ -z "$DATABASE_URL" ]; then
        log_warning "DATABASE_URL not set, skipping constraint fixes"
        return 1
    fi
    
    # Extract connection details from DATABASE_URL
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    # Use environment variables for authentication
    export PGPASSWORD=$DB_PASSWORD
    
    # Check if the usage_logs table exists
    TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'usage_logs'
        );
    " 2>/dev/null)
    
    # Trim whitespace from result
    TABLE_EXISTS=$(echo "$TABLE_EXISTS" | xargs)
    
    if [ "$TABLE_EXISTS" = "t" ]; then
        log_info "Found usage_logs table. Checking foreign key constraints..."
        
        # Get list of foreign key constraints on the usage_logs table
        FK_CONSTRAINTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT tc.constraint_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'usage_logs';
        " 2>/dev/null)
        
        # If there are foreign key constraints, drop them and add them back with ON DELETE SET NULL
        if [ -n "$FK_CONSTRAINTS" ]; then
            log_info "Found foreign key constraints on usage_logs table. Fixing them..."
            
            # Iterate through each constraint and drop it
            while IFS= read -r constraint; do
                # Remove leading/trailing whitespace
                constraint=$(echo "$constraint" | xargs)
                
                if [ -n "$constraint" ]; then
                    log_info "Dropping constraint: $constraint"
                    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
                        ALTER TABLE usage_logs DROP CONSTRAINT IF EXISTS $constraint;
                    " 2>/dev/null
                    
                    if [ $? -eq 0 ]; then
                        log_success "Dropped constraint: $constraint"
                    else
                        log_warning "Failed to drop constraint: $constraint"
                    fi
                fi
            done <<< "$FK_CONSTRAINTS"
            
            # Add back foreign keys with ON DELETE SET NULL
            log_info "Re-adding foreign key constraints with ON DELETE SET NULL..."
            
            # Check if these tables and columns exist before adding constraints
            USER_TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'users'
                );
            " 2>/dev/null | xargs)
            
            TIER_TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'subscription_tiers'
                );
            " 2>/dev/null | xargs)
            
            APIKEYS_TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'api_keys'
                );
            " 2>/dev/null | xargs)
            
            # Add user_id foreign key if users table exists
            if [ "$USER_TABLE_EXISTS" = "t" ]; then
                log_info "Adding user_id foreign key constraint..."
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
                    ALTER TABLE usage_logs 
                    ADD CONSTRAINT usage_logs_user_id_fkey 
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
                " 2>/dev/null
                
                if [ $? -eq 0 ]; then
                    log_success "Added user_id foreign key constraint"
                else
                    log_warning "Failed to add user_id foreign key constraint"
                fi
            fi
            
            # Add tier_id foreign key if subscription_tiers table exists
            if [ "$TIER_TABLE_EXISTS" = "t" ]; then
                log_info "Adding tier_id foreign key constraint..."
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
                    ALTER TABLE usage_logs 
                    ADD CONSTRAINT usage_logs_tier_id_fkey 
                    FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id) ON DELETE SET NULL;
                " 2>/dev/null
                
                if [ $? -eq 0 ]; then
                    log_success "Added tier_id foreign key constraint"
                else
                    log_warning "Failed to add tier_id foreign key constraint"
                fi
            fi
            
            # Add api_key_id foreign key if api_keys table exists
            if [ "$APIKEYS_TABLE_EXISTS" = "t" ]; then
                log_info "Adding api_key_id foreign key constraint..."
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
                    ALTER TABLE usage_logs 
                    ADD CONSTRAINT usage_logs_api_key_id_fkey 
                    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL;
                " 2>/dev/null
                
                if [ $? -eq 0 ]; then
                    log_success "Added api_key_id foreign key constraint"
                else
                    log_warning "Failed to add api_key_id foreign key constraint"
                fi
            fi
            
            log_success "Fixed foreign key constraints for usage_logs table"
        else
            log_info "No foreign key constraints found on usage_logs table"
        fi
    else
        log_info "usage_logs table doesn't exist yet. No constraints to fix."
    fi
    
    # Unset password after use
    unset PGPASSWORD
    
    return 0
}

# Run database migrations safely
run_migrations() {
    log_info "Running database migrations..."
    
    # Determine which version of the migration command to run
    if [ -d "../backend/alembic" ]; then
        log_info "Using Alembic for migrations..."
        
        # Change to the backend directory first
        cd ../backend
        
        # Run the migration script if it exists
        if [ -f "run_migration.py" ]; then
            log_info "Running run_migration.py..."
            if python -c "from backend.run_migration import run_migrations; run_migrations()"; then
                log_success "Database migrations completed successfully"
                return 0
            else
                log_error "Database migrations failed"
                
                # Try to fix foreign key constraints and retry
                log_info "Attempting to fix common migration issues..."
                cd ..
                if fix_foreign_key_constraints; then
                    log_info "Retrying migrations after fixes..."
                    cd backend
                    if python -c "from backend.run_migration import run_migrations; run_migrations()"; then
                        log_success "Database migrations completed successfully after fixes"
                        return 0
                    else
                        log_error "Database migrations still failing after fixes"
                        return 1
                    fi
                else
                    log_error "Failed to fix migration issues"
                    return 1
                fi
            fi
        else
            log_error "Migration script run_migration.py not found"
            return 1
        fi
    else
        log_error "Alembic directory not found"
        return 1
    fi
}

# Main function
main() {
    log_info "Starting database migration process..."
    
    # Create a backup first
    create_backup
    
    # Fix any existing foreign key constraints
    fix_foreign_key_constraints
    
    # Run the migrations
    if run_migrations; then
        log_success "Database migration process completed successfully"
        return 0
    else
        log_error "Database migration process failed"
        echo -e "${YELLOW}Would you like to continue with deployment anyway? (y/n)${NC}"
        read -r continue_choice
        
        if [ "$continue_choice" = "y" ]; then
            log_warning "Continuing deployment despite migration failure"
            return 0
        else
            log_error "Deployment aborted due to migration failure"
            return 1
        fi
    fi
}

# Run the main function
main
exit $?