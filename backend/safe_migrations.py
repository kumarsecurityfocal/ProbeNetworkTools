"""
Safe migrations utility for ProbeOps.
This script provides a safer way to run migrations by:
1. Creating a backup first
2. Running migrations within a try/except block
3. Providing more detailed error information
"""

import os
import sys
import traceback
import logging
from datetime import datetime
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('safe_migrations')

def get_db_url():
    """Get the database URL from environment or fallback to a default."""
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        logger.error("DATABASE_URL environment variable not set.")
        sys.exit(1)
    return db_url

def create_backup(db_url):
    """Create a backup of the database before running migrations."""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"probeops_backup_{timestamp}"
        
        # Extract database name from connection string
        # Format typically: postgresql://user:pass@host:port/dbname
        db_name = db_url.split('/')[-1].split('?')[0]
        
        # Create a pg_dump command
        backup_file = f"./backups/{backup_name}.sql"
        os.makedirs("./backups", exist_ok=True)
        
        # Use environment variables from the connection string for authentication
        pg_host = os.environ.get('PGHOST')
        pg_user = os.environ.get('PGUSER')
        pg_password = os.environ.get('PGPASSWORD')
        pg_port = os.environ.get('PGPORT', '5432')
        
        # Set environment variables for pg_dump
        backup_env = os.environ.copy()
        if not pg_host or not pg_user:
            # Extract from connection URL if environment variables not set
            parts = db_url.split('/')
            host_port_part = parts[2]
            if '@' in host_port_part:
                auth, host_port = host_port_part.split('@')
                if ':' in auth:
                    user, password = auth.split(':')
                    backup_env['PGUSER'] = user
                    backup_env['PGPASSWORD'] = password
                if ':' in host_port:
                    host, port = host_port.split(':')
                    backup_env['PGHOST'] = host
                    backup_env['PGPORT'] = port
        
        # Construct the backup command
        cmd = f"pg_dump -Fc {db_name} > {backup_file}"
        logger.info(f"Creating database backup to {backup_file}")
        
        # Execute backup command
        backup_result = os.system(cmd)
        if backup_result != 0:
            logger.warning(f"Backup command failed with code {backup_result}")
            logger.warning("Will attempt alternative backup method")
            
            # Try using SQLAlchemy for a more basic schema backup
            engine = create_engine(db_url)
            with engine.connect() as connection:
                # Get table schema
                schema_query = """
                SELECT table_name, column_name, data_type 
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position;
                """
                schema_info = connection.execute(text(schema_query))
                
                # Write schema to a file
                alt_backup_file = f"./backups/{backup_name}_schema.txt"
                with open(alt_backup_file, 'w') as f:
                    f.write("# Database Schema Backup\n")
                    f.write(f"# Created: {datetime.now()}\n\n")
                    
                    current_table = None
                    for table, column, data_type in schema_info:
                        if table != current_table:
                            f.write(f"\n## Table: {table}\n")
                            current_table = table
                        f.write(f"- {column}: {data_type}\n")
                
                logger.info(f"Created schema backup to {alt_backup_file}")
            
            return None  # Return None to indicate backup couldn't be fully created
        
        logger.info("Database backup created successfully")
        return backup_file
        
    except Exception as e:
        logger.error(f"Error creating backup: {str(e)}")
        logger.error(traceback.format_exc())
        return None

def run_migrations(alembic_ini_path):
    """Run the Alembic migrations with better error handling."""
    try:
        # Create Alembic config
        alembic_cfg = Config(alembic_ini_path)
        
        # Get current revision before upgrade
        from alembic.migration import MigrationContext
        from sqlalchemy import create_engine
        
        engine = create_engine(get_db_url())
        with engine.connect() as connection:
            context = MigrationContext.configure(connection)
            current_rev = context.get_current_revision()
            logger.info(f"Current database revision: {current_rev}")
            if not current_rev:
                logger.warning("Database not initialized with Alembic. Will stamp as initial revision.")
                command.stamp(alembic_cfg, "20250514_create_base_schema")
        
        # Run the upgrade to latest
        logger.info("Running database migrations...")
        command.upgrade(alembic_cfg, "head")
        
        logger.info("Migrations completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Provide more specific guidance based on error type
        error_str = str(e).lower()
        if "permission denied" in error_str:
            logger.error("Database permission error. Check that your user has the necessary privileges.")
        elif "already exists" in error_str:
            logger.error("Schema conflict. A table or column you're trying to create already exists.")
        elif "foreign key constraint" in error_str:
            logger.error("Foreign key constraint violation. Check that referenced tables and columns exist.")
        elif "duplicate key" in error_str:
            logger.error("Duplicate key violation. A unique constraint is being violated.")
        
        return False

def fix_common_issues():
    """Attempt to fix common migration issues."""
    try:
        db_url = get_db_url()
        engine = create_engine(db_url)
        
        with engine.connect() as connection:
            # Check if usage_logs table exists and has foreign key issues
            check_query = """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'usage_logs'
            );
            """
            result = connection.execute(text(check_query))
            table_exists = result.scalar()
            
            if table_exists:
                logger.info("Usage logs table exists, checking for foreign key issues...")
                
                # Check if the user_id column has a foreign key constraint
                fk_query = """
                SELECT tc.constraint_name
                FROM information_schema.table_constraints AS tc 
                JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'usage_logs'
                AND ccu.column_name = 'user_id';
                """
                result = connection.execute(text(fk_query))
                fk_exists = result.scalar()
                
                if fk_exists:
                    logger.info(f"Found foreign key constraint: {fk_exists}")
                    logger.info("Attempting to drop the constraint...")
                    
                    # Drop the foreign key constraint
                    try:
                        connection.execute(text(f"ALTER TABLE usage_logs DROP CONSTRAINT {fk_exists};"))
                        connection.commit()
                        logger.info("Successfully dropped foreign key constraint.")
                        return True
                    except Exception as e:
                        logger.error(f"Failed to drop constraint: {str(e)}")
                        return False
            
            # If we got here, no issues were fixed
            logger.info("No common issues detected or fixed.")
            return False
        
    except Exception as e:
        logger.error(f"Error fixing common issues: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def main():
    """Main entry point for the script."""
    alembic_ini_path = 'alembic.ini'
    
    # Check if alembic.ini exists
    if not os.path.exists(alembic_ini_path):
        logger.error(f"Alembic config file not found at: {alembic_ini_path}")
        alembic_ini_path = 'backend/alembic.ini'
        
        if not os.path.exists(alembic_ini_path):
            logger.error(f"Alembic config file also not found at: {alembic_ini_path}")
            sys.exit(1)
    
    # Step 1: Create backup
    backup_file = create_backup(get_db_url())
    if not backup_file:
        logger.warning("Proceeding without a full backup. Be cautious!")
    
    # Step 2: Run migrations
    migration_success = run_migrations(alembic_ini_path)
    
    if not migration_success:
        logger.error("Migrations failed!")
        
        # Step 3: Attempt to fix common issues if migrations failed
        print("Would you like to attempt fixing common issues? (y/n)")
        choice = input().strip().lower()
        
        if choice == 'y':
            logger.info("Attempting to fix common issues...")
            fix_result = fix_common_issues()
            
            if fix_result:
                logger.info("Issues fixed. Attempting migrations again...")
                migration_success = run_migrations(alembic_ini_path)
                
                if migration_success:
                    logger.info("Migrations completed successfully after fixes!")
                else:
                    logger.error("Migrations still failing after attempted fixes.")
            else:
                logger.info("No issues fixed automatically.")
        else:
            logger.info("Skipping automatic fixes.")
        
        # If still failing, provide guidance
        if not migration_success:
            logger.info("\nMigration failed. You have these options:")
            logger.info("1. Check the error messages above and fix the issues manually")
            logger.info("2. Modify the migration scripts to handle the specific error")
            logger.info("3. For development, you can consider dropping and recreating the database")
            
            if backup_file:
                logger.info(f"A backup was created at: {backup_file}")
    
    return 0 if migration_success else 1

if __name__ == "__main__":
    sys.exit(main())