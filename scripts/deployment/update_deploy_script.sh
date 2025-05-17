#!/bin/bash
# Script to update deploy.sh with new migration approach
# This modifies the database migration section in deploy.sh
# to use the Alembic hash-based ID approach

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
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

# Check if deploy script exists
DEPLOY_SCRIPT="scripts/deployment/deploy.sh"
if [ ! -f "$DEPLOY_SCRIPT" ]; then
    log_error "Deploy script not found at $DEPLOY_SCRIPT"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Create backup of deploy script
BACKUP_FILE="${DEPLOY_SCRIPT}.bak"
cp "$DEPLOY_SCRIPT" "$BACKUP_FILE"
log_success "Created backup of deploy.sh at $BACKUP_FILE"

# Find the database migration section in deploy.sh
DB_MIGRATION_START=$(grep -n "Step 10.5: Running database migrations" "$DEPLOY_SCRIPT" | cut -d: -f1)
if [ -z "$DB_MIGRATION_START" ]; then
    log_error "Could not find database migration section in deploy.sh"
    exit 1
fi

# Find the start of the next section (Step 10.6)
NEXT_SECTION_START=$(grep -n "Step 10.6:" "$DEPLOY_SCRIPT" | cut -d: -f1)
if [ -z "$NEXT_SECTION_START" ]; then
    log_error "Could not find the next section in deploy.sh"
    exit 1
fi

# Calculate line numbers for replacement
SECTION_START=$((DB_MIGRATION_START - 1))
SECTION_END=$((NEXT_SECTION_START - 1))

# Create temporary file for the edited content
TEMP_FILE=$(mktemp)

# Copy content before the database migration section
head -n $SECTION_START "$DEPLOY_SCRIPT" > "$TEMP_FILE"

# Append new database migration section
cat << 'EOF' >> "$TEMP_FILE"
# Step 10.5: Run database migrations with Alembic hash-based IDs
log_info "Step 10.5: Running database migrations with Alembic hash-based IDs..."
echo "[DATABASE] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Starting enhanced database migration process" >> "$LOG_FILE"

# Check if our new migration script exists
UPDATED_DB_SCRIPT="$SCRIPT_DIR/scripts/deployment/updated_db_migration.sh"

if [ -f "$UPDATED_DB_SCRIPT" ]; then
    log_info "Using enhanced Alembic migration script"
    
    # Make sure it's executable
    chmod +x "$UPDATED_DB_SCRIPT"
    
    # Run the updated migration script
    if "$UPDATED_DB_SCRIPT"; then
        log_success "Database migration completed successfully"
        echo "[DATABASE_SUCCESS] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migration completed successfully" >> "$LOG_FILE"
    else
        log_error "Database migration failed"
        echo "[DATABASE_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migration failed" >> "$LOG_FILE"
        
        # Ask user if they want to continue despite migration failure
        echo -e "${RED}Database migration failed. This may cause application issues.${NC}"
        echo -e "${YELLOW}Would you like to continue with deployment anyway? (y/n)${NC}"
        read -r continue_deploy
        
        if [[ ! "$continue_deploy" =~ ^[Yy]$ ]]; then
            log_error "Deployment aborted due to database migration failure"
            echo "[DEPLOYMENT_ABORTED] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Deployment aborted due to database migration failure" >> "$LOG_FILE"
            exit 1
        else
            log_warning "Continuing deployment despite database migration failure"
            echo "[DATABASE_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Continuing deployment despite database migration failure" >> "$LOG_FILE"
        fi
    fi
else
    # Fall back to traditional database migration approach
    log_warning "Enhanced migration script not found. Using traditional approach."
    echo "[DATABASE_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Enhanced migration script not found" >> "$LOG_FILE"
    
    # Check if the database migration script exists
    DB_MIGRATION_SCRIPT="$SCRIPT_DIR/scripts/database/safe_deploy_db.sh"
    if [ -f "$DB_MIGRATION_SCRIPT" ]; then
        log_info "Found database migration script at $DB_MIGRATION_SCRIPT"
        
        # Make sure the script is executable
        chmod +x "$DB_MIGRATION_SCRIPT"
        
        # Run the database migration script
        log_info "Running database migration script..."
        if "$DB_MIGRATION_SCRIPT"; then
            log_success "Database migration completed successfully"
            echo "[DATABASE_SUCCESS] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migration completed successfully" >> "$LOG_FILE"
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
        # Check for alternative database script location
        ALT_DB_SCRIPT="$SCRIPT_DIR/backend/scripts/run_migrations.sh"
        
        if [ -f "$ALT_DB_SCRIPT" ]; then
            log_info "Found alternative database migration script at $ALT_DB_SCRIPT"
            
            # Make sure it's executable
            chmod +x "$ALT_DB_SCRIPT"
            
            # Run the alternative database migration script
            log_info "Running alternative database migration script..."
            if "$ALT_DB_SCRIPT"; then
                log_success "Database migration completed successfully"
                echo "[DATABASE_SUCCESS] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migration completed successfully" >> "$LOG_FILE"
            else
                log_error "Database migration failed"
                echo "[DATABASE_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migration failed" >> "$LOG_FILE"
                
                # Ask user if they want to continue despite migration failure
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
            # Try direct Alembic command as a last resort
            log_info "No migration scripts found. Attempting direct Alembic migration..."
            
            # Check if we have the right directory
            if [ -d "$SCRIPT_DIR/backend/alembic" ]; then
                cd "$SCRIPT_DIR/backend"
                
                # Try to run Alembic directly
                if python3 -m alembic upgrade head; then
                    log_success "Direct Alembic migration completed successfully"
                    echo "[DATABASE_SUCCESS] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Direct Alembic migration completed successfully" >> "$LOG_FILE"
                    cd "$SCRIPT_DIR"
                else
                    log_error "Direct Alembic migration failed"
                    echo "[DATABASE_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Direct Alembic migration failed" >> "$LOG_FILE"
                    cd "$SCRIPT_DIR"
                    
                    # Ask user if they want to continue
                    echo -e "${RED}Direct Alembic migration failed. This may cause application issues.${NC}"
                    echo -e "${YELLOW}Would you like to continue with deployment anyway? (y/n)${NC}"
                    read -r continue_response
                    
                    if [[ ! "$continue_response" =~ ^[Yy]$ ]]; then
                        log_error "Deployment aborted due to migration failure"
                        echo "[DEPLOYMENT_ABORTED] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Deployment aborted due to migration failure" >> "$LOG_FILE"
                        exit 1
                    else
                        log_warning "Continuing deployment despite migration failure"
                        echo "[DATABASE_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Continuing deployment despite migration failure" >> "$LOG_FILE"
                    fi
                fi
            else
                log_warning "No database migration scripts or Alembic setup found - skipping database migrations"
                echo "[DATABASE_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - No database migration scripts found" >> "$LOG_FILE"
            fi
        fi
    fi
fi
EOF

# Copy content after the database migration section
tail -n +$((SECTION_END + 1)) "$DEPLOY_SCRIPT" >> "$TEMP_FILE"

# Replace the original file with the modified content
mv "$TEMP_FILE" "$DEPLOY_SCRIPT"

# Make the script executable
chmod +x "$DEPLOY_SCRIPT"

log_success "Successfully updated deploy.sh to use new Alembic hash-based ID migration approach"
log_info "A backup of the original deploy.sh was created at $BACKUP_FILE"
log_info "To test the updated deployment script, run: $DEPLOY_SCRIPT"