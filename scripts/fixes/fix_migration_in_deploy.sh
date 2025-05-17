#!/bin/bash
# Fix for deploy.sh to handle database migration errors gracefully
# This script modifies the database migration part of deploy.sh to use our safer approach

set -e # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️ $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Check if we are in the correct directory
if [ ! -f "deploy.sh" ]; then
    log_error "This script must be run from the root directory of the project."
    echo "Please run this script from the root directory where deploy.sh is located."
    exit 1
fi

# Check if backup of deploy.sh exists
if [ -f "deploy.sh.bak" ]; then
    log_warning "Backup of deploy.sh already exists."
    read -p "Do you want to overwrite the existing backup? (y/n): " overwrite
    if [ "$overwrite" != "y" ]; then
        log_info "Aborting. No changes made."
        exit 0
    fi
fi

# Make a backup of deploy.sh
cp deploy.sh deploy.sh.bak
log_success "Created backup of deploy.sh as deploy.sh.bak"

# Original database migration section pattern to replace
ORIG_DB_SECTION=$(cat <<'EOF'
# Step 10.5: Migrate the database schema if needed
log_info "Step 10.5: Migrating database schema..."
# Go to the backend directory
cd "$SCRIPT_DIR/backend"

# Perform the Alembic migration
# Only if this fails, we'll ask the user if they want to continue
if ! python -c "from backend.run_migration import run_migrations; run_migrations()"; then
    log_error "Database migration failed!"
    read -p "Database migration failed. This may cause application issues. Would you like to continue with deployment anyway? (y/n) " continue_deploy
    if [[ $continue_deploy != "y" ]]; then
        log_error "Deployment aborted due to database migration failure."
        exit 1
    else
        log_warning "Continuing deployment despite database migration failure"
    fi
else
    log_success "Database schema migrations applied successfully"
fi

# Return to the script directory
cd "$SCRIPT_DIR"
EOF
)

# New replacement database migration section
NEW_DB_SECTION=$(cat <<'EOF'
# Step 10.5: Migrate the database schema with improved error handling
log_info "Step 10.5: Migrating database schema with improved error handling..."

# First, check if our patch script exists
if [ -f "$SCRIPT_DIR/scripts/fixes/patch_deploy_db.sh" ]; then
    log_info "Using enhanced database migration process..."
    
    # Execute the patch script for safer migrations
    if bash "$SCRIPT_DIR/scripts/fixes/patch_deploy_db.sh"; then
        log_success "Enhanced database migration completed successfully"
    else
        log_warning "Enhanced database migration reported issues"
        
        # Try the standard migration as fallback
        log_info "Falling back to standard migration..."
        
        # Go to the backend directory
        cd "$SCRIPT_DIR/backend"
        
        # Perform the Alembic migration
        if ! python -c "from backend.run_migration import run_migrations; run_migrations()"; then
            log_error "Standard database migration also failed!"
            read -p "Database migration failed. This may cause application issues. Would you like to continue with deployment anyway? (y/n) " continue_deploy
            if [[ $continue_deploy != "y" ]]; then
                log_error "Deployment aborted due to database migration failure."
                exit 1
            else
                log_warning "Continuing deployment despite database migration failure"
            fi
        else
            log_success "Standard database schema migrations applied successfully"
        fi
        
        # Return to the script directory
        cd "$SCRIPT_DIR"
    fi
else
    # If patch script doesn't exist, run the original migration code
    log_info "Enhanced migration script not found, using standard process..."
    
    # Go to the backend directory
    cd "$SCRIPT_DIR/backend"
    
    # Perform the Alembic migration
    if ! python -c "from backend.run_migration import run_migrations; run_migrations()"; then
        log_error "Database migration failed!"
        read -p "Database migration failed. This may cause application issues. Would you like to continue with deployment anyway? (y/n) " continue_deploy
        if [[ $continue_deploy != "y" ]]; then
            log_error "Deployment aborted due to database migration failure."
            exit 1
        else
            log_warning "Continuing deployment despite database migration failure"
        fi
    else
        log_success "Database schema migrations applied successfully"
    fi
    
    # Return to the script directory
    cd "$SCRIPT_DIR"
fi
EOF
)

# Temp file for sed operations
TEMP_FILE=$(mktemp)

# Replace the database migration section in deploy.sh
sed "s|$ORIG_DB_SECTION|$NEW_DB_SECTION|" deploy.sh > "$TEMP_FILE"
mv "$TEMP_FILE" deploy.sh

# Make deploy.sh executable
chmod +x deploy.sh

log_success "Updated deploy.sh with enhanced database migration logic"
log_info "The updated deploy.sh will now:"
log_info "1. Use scripts/fixes/patch_deploy_db.sh for safer migrations"
log_info "2. Create database backups before migrations"
log_info "3. Better handle foreign key constraints"
log_info "4. Provide more detailed error information"
log_info "5. Fallback to standard migration if the enhanced process fails"

log_info "You can now run ./deploy.sh as normal"