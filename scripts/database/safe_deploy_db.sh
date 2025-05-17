#!/bin/bash
# ProbeOps Safe Database Deployment Script
# ========================================
# This script safely applies database migrations with validation and rollback capability
# It's designed to be used in production deployments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE=".env.db"
BACKUP_DIR="$PROJECT_ROOT/database_backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/probeops_backup_$TIMESTAMP.sql"

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env=*)
      ENV_FILE="${1#*=}"
      shift
      ;;
    --env)
      ENV_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check for environment directory and copy .env.db if available
if [ -f "$PROJECT_ROOT/../environment/.env.db" ]; then
    echo "Found .env.db in environment directory, copying to home directory"
    cp "$PROJECT_ROOT/../environment/.env.db" "$PROJECT_ROOT/$ENV_FILE"
    echo "Successfully copied .env.db to $PROJECT_ROOT/$ENV_FILE"
fi

# Load environment variables from .env.db file if it exists
if [ -f "$PROJECT_ROOT/$ENV_FILE" ]; then
    echo "Loading environment from $PROJECT_ROOT/$ENV_FILE"
    export $(grep -v '^#' "$PROJECT_ROOT/$ENV_FILE" | xargs)
else
    echo "Environment file $ENV_FILE not found, using current environment variables"
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}ProbeOps Safe Database Deployment${NC}"
echo "============================================="
echo "Starting database deployment process..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    echo "Please create a $ENV_FILE file with DATABASE_URL or set it in your environment."
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
    # Check PostgreSQL client version
    PG_CLIENT_VERSION=$(pg_dump --version | grep -oP '\d+\.\d+')
    PG_SERVER_VERSION_MAJOR=$(echo $DATABASE_URL | grep -oP 'postgres(?:ql)?://.*@.*:\d+/.*\?.*server_version=\K\d+' || echo "")
    
    if [ -z "$PG_SERVER_VERSION_MAJOR" ]; then
        echo "Could not determine PostgreSQL server version from DATABASE_URL."
        echo "Attempting to get version from server..."
        
        # Try to get the version from the server
        PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        export PGPASSWORD
        
        PG_SERVER_VERSION=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT current_setting('server_version')" 2>/dev/null)
        PG_SERVER_VERSION_MAJOR=$(echo $PG_SERVER_VERSION | cut -d. -f1)
        
        unset PGPASSWORD
    fi
    
    # Check for version mismatch
    echo "PostgreSQL client version: $PG_CLIENT_VERSION"
    echo "PostgreSQL server version: $PG_SERVER_VERSION_MAJOR.*"
    
    # Attempt to find or install matching PostgreSQL client tools
    if [ ! -z "$PG_SERVER_VERSION_MAJOR" ] && [ "$PG_CLIENT_VERSION" != "$PG_SERVER_VERSION_MAJOR"* ]; then
        echo -e "${YELLOW}WARNING: PostgreSQL version mismatch detected.${NC}"
        echo "Server is version $PG_SERVER_VERSION_MAJOR.*, but client is version $PG_CLIENT_VERSION"
        
        if [ -x "$(command -v apt-get)" ]; then
            echo "Attempting to install PostgreSQL $PG_SERVER_VERSION_MAJOR client tools..."
            # Add PostgreSQL repository if not already present
            if [ ! -f /etc/apt/sources.list.d/pgdg.list ]; then
                echo "Adding PostgreSQL repository..."
                echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list > /dev/null
                wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
                sudo apt-get update
            fi
            
            # Install matching PostgreSQL client
            sudo apt-get install -y postgresql-client-$PG_SERVER_VERSION_MAJOR
            
            # Check if installation succeeded
            if command -v pg_dump.$PG_SERVER_VERSION_MAJOR &> /dev/null; then
                echo -e "${GREEN}Successfully installed PostgreSQL $PG_SERVER_VERSION_MAJOR client tools.${NC}"
                PG_DUMP_CMD="pg_dump.$PG_SERVER_VERSION_MAJOR"
            else
                echo -e "${YELLOW}Failed to install matching PostgreSQL client. Proceeding with backup attempt.${NC}"
                PG_DUMP_CMD="pg_dump"
            fi
        else
            echo -e "${YELLOW}Package manager not found. Cannot install matching PostgreSQL client.${NC}"
            PG_DUMP_CMD="pg_dump"
        fi
    else
        PG_DUMP_CMD="pg_dump"
    fi
    
    # Use environment variables for authentication to avoid password prompt
    PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    export PGPASSWORD
    
    echo "Running backup with $PG_DUMP_CMD..."
    $PG_DUMP_CMD -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Backup created successfully!${NC}"
        # Compress the backup
        gzip "$BACKUP_FILE"
        echo "Backup compressed to: ${BACKUP_FILE}.gz"
    else
        echo -e "${YELLOW}WARNING: Failed to create backup. This might be due to PostgreSQL version mismatch.${NC}"
        echo "Proceeding without backup. Consider manually backing up your database before continuing."
        echo "Would you like to continue without a backup? (y/n)"
        read -r continue_choice
        
        if [ "$continue_choice" != "y" ]; then
            echo "Aborting deployment."
            exit 1
        fi
    fi
    
    # Unset password
    unset PGPASSWORD
else
    echo -e "${YELLOW}WARNING: pg_dump not available. Skipping backup.${NC}"
fi

echo "Step 3: Running migrations"
echo "-------------------------"
echo "Checking if database is fresh and needs stamping..."

# Check if alembic_version table exists and has any entries
PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
export PGPASSWORD

# Try to count rows in alembic_version table, redirect errors to /dev/null
VERSION_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM alembic_version;" 2>/dev/null || echo "table_not_found")

if [ "$VERSION_COUNT" = "table_not_found" ] || [ "$VERSION_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}Fresh database detected with no migration history.${NC}"
    echo "Checking for base migration to stamp..."
    
    # Find the base migration using the migration manager
    BASE_MIGRATION=$(python3 -c "
import sys
sys.path.append('$SCRIPT_DIR')
from migration_manager import MigrationManager
manager = MigrationManager()
base_migrations = []
for script in manager.script_directory.walk_revisions():
    if script.down_revision is None:
        base_migrations.append(script.revision)
if base_migrations:
    print(base_migrations[0])
else:
    print('')
")
    
    if [ -n "$BASE_MIGRATION" ]; then
        echo -e "${YELLOW}Found base migration: $BASE_MIGRATION${NC}"
        echo "Would you like to stamp the database with this base migration? (y/n)"
        read -r stamp_choice
        
        if [ "$stamp_choice" = "y" ]; then
            echo "Stamping database with base migration: $BASE_MIGRATION"
            python3 "$SCRIPT_DIR/migration_manager.py" --stamp "$BASE_MIGRATION"
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Database stamped successfully!${NC}"
            else
                echo -e "${RED}Failed to stamp database.${NC}"
                echo "Proceeding with regular migration process."
            fi
        fi
    else
        echo -e "${YELLOW}No base migration found. Proceeding with regular migration process.${NC}"
    fi
fi

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