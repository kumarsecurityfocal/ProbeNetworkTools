#!/bin/bash
# ProbeOps Safe Database Deployment Script
# ========================================
# This script safely applies database migrations with validation and rollback capability
# It's designed to be used in production deployments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/database_backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/probeops_backup_$TIMESTAMP.sql"

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}ProbeOps Safe Database Deployment${NC}"
echo "============================================="
echo "Starting database deployment process..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    echo "Please set the DATABASE_URL environment variable and try again."
    exit 1
fi

# Extract database connection details from DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Step 1: Running pre-deployment validation"
echo "-----------------------------------------"
python3 "$SCRIPT_DIR/pre_deploy_validate.py"
VALIDATION_RESULT=$?

if [ $VALIDATION_RESULT -ne 0 ]; then
    echo -e "${YELLOW}Validation detected issues. Attempting to fix automatically...${NC}"
    python3 "$SCRIPT_DIR/pre_deploy_validate.py" --fix
    VALIDATION_RESULT=$?
    
    if [ $VALIDATION_RESULT -ne 0 ]; then
        echo -e "${RED}Automatic fixes failed. Please resolve the issues manually.${NC}"
        echo "Check the validation report for details."
        exit 1
    fi
fi

echo -e "${GREEN}Validation passed!${NC}"

echo "Step 2: Creating database backup"
echo "-------------------------------"
echo "Backing up database to: $BACKUP_FILE"

# Check if pg_dump is available
if command -v pg_dump &> /dev/null; then
    # Use environment variables for authentication to avoid password prompt
    PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    export PGPASSWORD
    
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Backup created successfully!${NC}"
        # Compress the backup
        gzip "$BACKUP_FILE"
        echo "Backup compressed to: ${BACKUP_FILE}.gz"
    else
        echo -e "${YELLOW}WARNING: Failed to create backup. Proceeding without backup.${NC}"
    fi
    
    # Unset password
    unset PGPASSWORD
else
    echo -e "${YELLOW}WARNING: pg_dump not available. Skipping backup.${NC}"
fi

echo "Step 3: Running migrations"
echo "-------------------------"
echo "Applying database migrations..."

python3 "$SCRIPT_DIR/migration_manager.py" --apply

if [ $? -ne 0 ]; then
    echo -e "${RED}Migration failed!${NC}"
    echo "Would you like to restore from backup? (y/n)"
    read -r restore_choice
    
    if [ "$restore_choice" = "y" ]; then
        echo "Restoring from backup..."
        
        if [ -f "${BACKUP_FILE}.gz" ]; then
            # Decompress backup
            gunzip "${BACKUP_FILE}.gz"
            
            # Restore database
            PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
            export PGPASSWORD
            
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
            
            unset PGPASSWORD
            
            echo -e "${GREEN}Database restored from backup.${NC}"
        else
            echo -e "${RED}Backup file not found. Manual intervention required.${NC}"
            exit 1
        fi
    else
        echo "Skipping restore. Database may be in an inconsistent state."
        exit 1
    fi
else
    echo -e "${GREEN}Migrations applied successfully!${NC}"
fi

echo "Step 4: Final validation"
echo "------------------------"
python3 "$SCRIPT_DIR/pre_deploy_validate.py"

if [ $? -ne 0 ]; then
    echo -e "${RED}Final validation failed! Manual intervention required.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database deployment completed successfully!${NC}"
echo "============================================="