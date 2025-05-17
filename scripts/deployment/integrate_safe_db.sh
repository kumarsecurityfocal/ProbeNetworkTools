#!/bin/bash
# Script to integrate safe_deploy_db.sh into the deploy.sh script
# This ensures a safer database migration process without creating redundant scripts

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions for logging
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

# Verify the deploy.sh script exists
if [ ! -f "scripts/deployment/deploy.sh" ]; then
    log_error "deploy.sh not found in scripts/deployment directory!"
    exit 1
fi

# Verify the safe_deploy_db.sh script exists
if [ ! -f "scripts/database/safe_deploy_db.sh" ]; then
    log_error "safe_deploy_db.sh not found in scripts/database directory!"
    exit 1
fi

# Create backup of deploy.sh before modifying
cp scripts/deployment/deploy.sh scripts/deployment/deploy.sh.bak
log_success "Created backup of deploy.sh at scripts/deployment/deploy.sh.bak"

# Find the database migration section in deploy.sh
DB_MIGRATION_START=$(grep -n "Step 10.5: Running database migrations" scripts/deployment/deploy.sh | cut -d: -f1)
if [ -z "$DB_MIGRATION_START" ]; then
    log_error "Could not find database migration section in deploy.sh"
    exit 1
fi

# Calculate the line to start replacement (3 lines before the section header)
SECTION_START=$((DB_MIGRATION_START - 3))

# Find the end of the database migration section
NEXT_SECTION_START=$(grep -n "Step 10.6:" scripts/deployment/deploy.sh | cut -d: -f1)
if [ -z "$NEXT_SECTION_START" ]; then
    log_error "Could not find the end of database migration section"
    exit 1
fi

# Calculate the line to end replacement (2 lines before the next section)
SECTION_END=$((NEXT_SECTION_START - 2))

# Create the new replacement section for safe database migrations
REPLACEMENT_TEXT=$(cat <<'EOF'
# Step 10.5: Run database migrations with enhanced safety measures
log_info "Step 10.5: Running database migrations with enhanced safety measures..."
echo "[DATABASE] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Starting enhanced database migration process" >> "$LOG_FILE"

# Check if our safe database migration script exists
SAFE_DB_SCRIPT="$SCRIPT_DIR/scripts/database/safe_deploy_db.sh"

if [ -f "$SAFE_DB_SCRIPT" ]; then
    log_info "Found enhanced database migration script at $SAFE_DB_SCRIPT"
    
    # Make sure it's executable
    chmod +x "$SAFE_DB_SCRIPT"
    
    # Execute the safe database migration script
    log_info "Running enhanced database migration script..."
    if "$SAFE_DB_SCRIPT"; then
        log_success "Database migrations completed successfully!"
        echo "[DATABASE_SUCCESS] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migrations completed successfully" >> "$LOG_FILE"
    else
        log_error "Database migration encountered issues"
        echo "[DATABASE_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migration script reported issues" >> "$LOG_FILE"
        
        # Ask user if they want to continue despite migration issues
        read -p "Database migration issues detected. Would you like to continue with deployment anyway? (y/n) " continue_deploy
        if [[ $continue_deploy != "y" ]]; then
            log_error "Deployment aborted due to database migration issues"
            echo "[DEPLOYMENT_ABORTED] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Deployment aborted due to database migration issues" >> "$LOG_FILE"
            exit 1
        else
            log_warning "Continuing deployment despite database migration issues"
            echo "[DATABASE_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Continuing deployment despite database migration issues" >> "$LOG_FILE"
        fi
    fi
else
    # Fallback to traditional database migration approach
    log_warning "Enhanced database migration script not found. Using standard approach."
    echo "[DATABASE_WARNING] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Enhanced database migration script not found" >> "$LOG_FILE"
    
    # Check if the standard database migration script exists
    DB_MIGRATION_SCRIPT="$SCRIPT_DIR/scripts/deployment/db_migration_deploy.sh"
    
    if [ -f "$DB_MIGRATION_SCRIPT" ]; then
        log_info "Found standard database migration script at $DB_MIGRATION_SCRIPT"
        
        # Make sure it's executable
        chmod +x "$DB_MIGRATION_SCRIPT"
        
        # Run the database migration script
        log_info "Running standard database migration script..."
        if "$DB_MIGRATION_SCRIPT"; then
            log_success "Database migrations completed successfully"
            echo "[DATABASE_SUCCESS] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migrations completed successfully" >> "$LOG_FILE"
        else
            log_error "Database migration failed"
            echo "[DATABASE_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migration script reported failure" >> "$LOG_FILE"
            
            # Ask user if they want to continue despite migration failure
            read -p "Database migration failed. Would you like to continue with deployment anyway? (y/n) " continue_deploy
            if [[ $continue_deploy != "y" ]]; then
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
                log_success "Database migrations completed successfully"
                echo "[DATABASE_SUCCESS] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migrations completed successfully" >> "$LOG_FILE"
            else
                log_error "Database migration failed"
                echo "[DATABASE_ERROR] $(date +"%Y-%m-%d %H:%M:%S.%3N") - Database migration script reported failure" >> "$LOG_FILE"
                
                # Ask user if they want to continue despite migration failure
                read -p "Database migration failed. Would you like to continue with deployment anyway? (y/n) " continue_deploy
                if [[ $continue_deploy != "y" ]]; then
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
fi
EOF
)

# Create a temporary file with the modifications
TEMP_FILE=$(mktemp)
{
    # Copy content before the section
    head -n $((SECTION_START - 1)) scripts/deployment/deploy.sh
    
    # Insert the replacement text
    echo "$REPLACEMENT_TEXT"
    
    # Copy content after the section
    tail -n +$((SECTION_END + 1)) scripts/deployment/deploy.sh
} > "$TEMP_FILE"

# Replace the original file
mv "$TEMP_FILE" scripts/deployment/deploy.sh
chmod +x scripts/deployment/deploy.sh

log_success "Successfully integrated safe_deploy_db.sh into deploy.sh!"
log_info "The deployment script will now use the enhanced database migration process."
echo ""
log_info "To use this change in production:"
echo "1. Copy the updated scripts/deployment/deploy.sh to your production environment"
echo "2. Make sure scripts/database/safe_deploy_db.sh is also available in the same relative path"
echo "3. Run the deploy.sh script as usual"