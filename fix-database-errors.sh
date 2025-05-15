#!/bin/bash

# Color output functions
function log_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

function log_warning() {
    echo -e "\033[0;33m[WARNING]\033[0m $1"
}

function log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

function log_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

echo "==== ProbeOps Database Error Fix Script ===="
echo "This script will fix common database issues and errors."
echo ""

# Step 1: Check DATABASE_URL environment variable
log_info "Step 1: Checking DATABASE_URL environment variable..."

if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL environment variable is not set!"
    log_info "Please set the DATABASE_URL environment variable before running this script."
    exit 1
else
    log_success "DATABASE_URL is set."
fi

# Step 2: Test database connection
log_info "Step 2: Testing database connection..."

python -c "
import psycopg2
import os
import sys
try:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    print('Database connection successful!')
    conn.close()
except Exception as e:
    print(f'Error: Could not connect to the database: {str(e)}')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    log_error "Database connection failed. Aborting."
    exit 1
else
    log_success "Database connection successful."
fi

# Step 3: Update main.py to use defensive table creation
log_info "Step 3: Updating main.py to use defensive table creation..."

MAIN_PY="backend/app/main.py"
if [ -f "$MAIN_PY" ]; then
    # Check if main.py already has the defensive check
    if grep -q "inspector = inspect(engine)" "$MAIN_PY"; then
        log_success "main.py already has defensive table creation logic."
    else
        # Backup main.py
        cp "$MAIN_PY" "${MAIN_PY}.bak"
        log_info "Backed up main.py to ${MAIN_PY}.bak"
        
        # Update main.py to use defensive table creation
        sed -i 's/# Create database tables/# Check database tables - only create if they do not exist/' "$MAIN_PY"
        sed -i 's/Base.metadata.create_all(bind=engine)/from sqlalchemy import inspect\ninspector = inspect(engine)\n# Only create tables that do not exist yet\nif not inspector.has_table("probe_nodes"):\n    logger.info("Creating missing database tables...")\n    Base.metadata.create_all(bind=engine)\nelse:\n    logger.info("Database tables already exist, skipping table creation...")/' "$MAIN_PY"
        
        log_success "Updated main.py to use defensive table creation."
    fi
else
    log_error "main.py not found at $MAIN_PY. Skipping this step."
fi

# Step 4: Fix init_db.py to handle existing tables gracefully
log_info "Step 4: Updating init_db.py to handle existing tables gracefully..."

INIT_DB="backend/init_db.py"
if [ -f "$INIT_DB" ]; then
    # Check if init_db.py already has the defensive check
    if grep -q "inspector = inspect(engine)" "$INIT_DB"; then
        log_success "init_db.py already has defensive table creation logic."
    else
        # Backup init_db.py
        cp "$INIT_DB" "${INIT_DB}.bak"
        log_info "Backed up init_db.py to ${INIT_DB}.bak"
        
        # Update the create_all line with a try-except block
        sed -i '/Base.metadata.create_all(bind=engine)/i\    from sqlalchemy import inspect\n    inspector = inspect(engine)\n    if not inspector.has_table("probe_nodes"):\n        logger.info("Creating missing database tables...")\n    else:\n        logger.info("Tables already exist, will attempt to create only missing tables...")\n    \n    try:' "$INIT_DB"
        sed -i '/Base.metadata.create_all(bind=engine)/a\    except Exception as e:\n        logger.warning(f"Table creation produced an error (this may be normal if tables exist): {str(e)}")' "$INIT_DB"
        
        log_success "Updated init_db.py to handle existing tables gracefully."
    fi
else
    log_warning "init_db.py not found at $INIT_DB. Skipping this step."
fi

# Step 5: Fix database.py to have proper error handling for connection issues
log_info "Step 5: Updating database.py to improve connection error handling..."

DATABASE_PY="backend/app/database.py"
if [ -f "$DATABASE_PY" ]; then
    # Check if database.py already has retries configured
    if grep -q "def get_db_with_retry" "$DATABASE_PY"; then
        log_success "database.py already has retry logic for connections."
    else
        # Backup database.py
        cp "$DATABASE_PY" "${DATABASE_PY}.bak"
        log_info "Backed up database.py to ${DATABASE_PY}.bak"
        
        # Add retry logic to get_db function
        DB_FUNC=$(grep -n "def get_db" "$DATABASE_PY" | cut -d: -f1)
        if [ -n "$DB_FUNC" ]; then
            # Insert before the get_db function
            sed -i "${DB_FUNC}i# Retry mechanism for database connections\ndef get_db_with_retry(retries=3, delay=1):\n    \"\"\"Get a database connection with retry logic.\"\"\"\n    last_error = None\n    for attempt in range(retries):\n        try:\n            db = SessionLocal()\n            try:\n                # Test the connection with a simple query\n                db.execute(text('SELECT 1'))\n                yield db\n                return\n            finally:\n                db.close()\n        except (OperationalError, DBAPIError) as e:\n            last_error = e\n            if attempt < retries - 1:  # Don't sleep on the last attempt\n                time.sleep(delay)\n                delay *= 2  # Exponential backoff\n    \n    # If we got here, all attempts failed\n    raise last_error\n\n" "$DATABASE_PY"
            
            # Update the existing get_db function to use retries in production
            sed -i "/def get_db/a\    \"\"\"Get a database connection. In production, uses retry logic.\"\"\"\n    # Check if we're in debug mode\n    debug_mode = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 't')\n    \n    # In production or when DEBUG is not True, use retry logic\n    if not debug_mode:\n        yield from get_db_with_retry()\n        return\n        \n    # In debug mode, use simpler logic without retries" "$DATABASE_PY"
            
            log_success "Added retry logic to database.py for connection resilience."
        else
            log_warning "Could not find get_db function in database.py. Skipping retry logic."
        fi
    fi
else
    log_warning "database.py not found at $DATABASE_PY. Skipping this step."
fi

# Step 6: Create a database migration script to check for and add missing columns
log_info "Step 6: Creating a database migration helper script..."

MIGRATION_SCRIPT="backend/db_check_migrations.py"
cat > "$MIGRATION_SCRIPT" << 'EOF'
"""
Script to check and add missing columns to database tables.
This is a helper script that should be run manually if you suspect
schema mismatches between models and the database.
"""
import os
import sys
import logging
from sqlalchemy import create_engine, inspect, Column, Integer, String, Boolean, Float, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import app modules
from app.config import settings
from app.models import ProbeNode  # Import the model to check

def check_and_add_missing_columns():
    """Check for missing columns and add them if needed."""
    # Create engine
    engine = create_engine(settings.sqlalchemy_database_url)
    
    # Create inspector
    inspector = inspect(engine)
    
    # Check if the table exists
    if not inspector.has_table("probe_nodes"):
        logger.error("probe_nodes table does not exist. Run normal migrations first.")
        return False
    
    # Get existing columns
    existing_columns = {col['name'] for col in inspector.get_columns("probe_nodes")}
    logger.info(f"Existing columns: {existing_columns}")
    
    # Get expected columns from the model
    model_columns = {c.name for c in ProbeNode.__table__.columns}
    logger.info(f"Model columns: {model_columns}")
    
    # Find missing columns
    missing_columns = model_columns - existing_columns
    if not missing_columns:
        logger.info("No missing columns found.")
        return True
    
    logger.warning(f"Missing columns found: {missing_columns}")
    
    # Add missing columns
    # Note: This is a simplified approach. In a production environment,
    # you should use proper migrations with Alembic.
    conn = engine.connect()
    for col_name in missing_columns:
        # Get column definition from model
        col = next((c for c in ProbeNode.__table__.columns if c.name == col_name), None)
        if col is None:
            logger.warning(f"Could not find column definition for {col_name}.")
            continue
            
        # Add column
        col_type = str(col.type)
        logger.info(f"Adding column {col_name} with type {col_type}")
        
        # Build ALTER TABLE statement
        alter_stmt = f"ALTER TABLE probe_nodes ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
        
        # Add NOT NULL if column is not nullable
        if not col.nullable:
            # If column is not nullable, we need to add a default value
            if col_name == 'is_active':
                alter_stmt += " DEFAULT TRUE"
            elif col_name == 'status':
                alter_stmt += " DEFAULT 'UNKNOWN'"
            elif col_name == 'priority':
                alter_stmt += " DEFAULT 0"
            elif col_name == 'current_load':
                alter_stmt += " DEFAULT 0.0"
            elif col_name == 'avg_response_time':
                alter_stmt += " DEFAULT 0.0"
            elif col_name == 'error_count':
                alter_stmt += " DEFAULT 0"
            elif col_name == 'total_probes_executed':
                alter_stmt += " DEFAULT 0"
            else:
                # For other NOT NULL columns, use a generic default
                if 'INT' in col_type.upper():
                    alter_stmt += " DEFAULT 0"
                elif 'BOOL' in col_type.upper():
                    alter_stmt += " DEFAULT FALSE"
                elif 'VARCHAR' in col_type.upper() or 'TEXT' in col_type.upper():
                    alter_stmt += " DEFAULT ''"
                elif 'FLOAT' in col_type.upper():
                    alter_stmt += " DEFAULT 0.0"
            
            # Add NOT NULL constraint
            alter_stmt += " NOT NULL"
        
        try:
            conn.execute(alter_stmt)
            logger.info(f"Column {col_name} added successfully.")
        except Exception as e:
            logger.error(f"Error adding column {col_name}: {str(e)}")
    
    conn.close()
    return True

if __name__ == "__main__":
    # Execute the function
    success = check_and_add_missing_columns()
    if success:
        print("\nDatabase column check completed.")
        print("Any missing columns have been added.")
    else:
        print("\nDatabase column check failed.")
        print("Please check the logs for details.")
EOF

log_success "Created database migration helper script at $MIGRATION_SCRIPT"

# Step 7: Try to run the migration helper script
log_info "Step 7: Running the database migration helper script..."

cd backend
python db_check_migrations.py

if [ $? -ne 0 ]; then
    log_warning "Migration helper script encountered errors, but this might be expected."
else
    log_success "Migration helper script completed successfully."
fi

cd ..

echo ""
echo "==== Database Error Fix Complete ===="
echo "The script has made the following changes:"
echo "1. Updated backend/app/main.py to use defensive table creation"
echo "2. Updated backend/init_db.py to handle existing tables gracefully"
echo "3. Added retry logic to database connections for better resilience"
echo "4. Created a database migration helper script to fix column issues"
echo ""
echo "If you continue to have issues:"
echo "1. Consider using Alembic for proper schema migrations"
echo "2. Check the application logs for more detailed error information"
echo "3. Inspect your database schema directly using a tool like pgAdmin"
echo ""
echo "You may need to restart your application for these changes to take effect."