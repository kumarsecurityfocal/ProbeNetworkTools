#!/usr/bin/env python3
"""
ProbeOps Database Migration Manager
===================================

A comprehensive tool for managing database migrations in a strategic way.
This script ensures migrations are applied in the correct order and tracks
which migrations have been applied.

Usage:
    python migration_manager.py [--check] [--apply] [--reset] [--env ENV_FILE]

Options:
    --check     Check if all required migrations exist and can be applied
    --apply     Apply all pending migrations
    --reset     Reset the database and apply all migrations from scratch (USE WITH CAUTION)
    --env       Specify a .env file to load (default: .env.db)
"""

import os
import sys
import argparse
import logging
import importlib.util
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dotenv import load_dotenv

# Try to import alembic components, install if missing
try:
    from alembic import command
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    from alembic.runtime.migration import MigrationContext
    import sqlalchemy as sa
except ImportError:
    print("Alembic or SQLAlchemy not installed. Installing...")
    os.system("pip install alembic sqlalchemy psycopg2-binary")
    # Re-import after installation
    from alembic import command
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    from alembic.runtime.migration import MigrationContext
    import sqlalchemy as sa

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('migration_manager')

# Constants
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ALEMBIC_INI = PROJECT_ROOT / "backend" / "alembic.ini"
VERSIONS_DIR = PROJECT_ROOT / "backend" / "alembic" / "versions"

class MigrationManager:
    """Manages database migrations for ProbeOps."""
    
    def __init__(self, env_file='.env.db'):
        """Initialize the migration manager."""
        # Load environment variables from the specified file
        self._load_env_file(env_file)
        
        self._validate_paths()
        self.alembic_cfg = Config(str(ALEMBIC_INI))
        # Set the script_location explicitly to point to the correct alembic directory
        self.alembic_cfg.set_main_option('script_location', str(PROJECT_ROOT / 'backend' / 'alembic'))
        self.script_directory = ScriptDirectory.from_config(self.alembic_cfg)
        self.engine = self._get_database_engine()
        
    def _load_env_file(self, env_file):
        """Load environment variables from the specified file."""
        env_path = PROJECT_ROOT / env_file
        if env_path.exists():
            logger.info(f"Loading environment from {env_path}")
            load_dotenv(dotenv_path=env_path)
        else:
            logger.warning(f"Environment file {env_path} not found, using current environment variables")
        
    def _validate_paths(self):
        """Validate that all required paths exist."""
        if not ALEMBIC_INI.exists():
            raise FileNotFoundError(f"Alembic config not found at {ALEMBIC_INI}")
        
        if not VERSIONS_DIR.exists():
            VERSIONS_DIR.mkdir(parents=True, exist_ok=True)
            logger.warning(f"Created versions directory at {VERSIONS_DIR}")
    
    def _get_database_engine(self):
        """Get a database engine from the configuration."""
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            # Try to extract from alembic.ini
            from configparser import ConfigParser
            config = ConfigParser()
            config.read(ALEMBIC_INI)
            try:
                database_url = config["alembic"]["sqlalchemy.url"]
            except (KeyError, ValueError):
                raise ValueError(
                    "DATABASE_URL environment variable not set and "
                    "could not find sqlalchemy.url in alembic.ini"
                )
        
        return sa.create_engine(database_url)
    
    def get_current_revision(self) -> Optional[str]:
        """Get the current database revision."""
        with self.engine.connect() as conn:
            context = MigrationContext.configure(conn)
            return context.get_current_revision()
    
    def check_migrations(self) -> Tuple[bool, List[str]]:
        """
        Check if all migrations are present and in the correct order.
        
        Returns:
            Tuple containing:
                - Boolean indicating if the check passed
                - List of missing or problematic migrations
        """
        # Get all migration scripts
        all_scripts = self.script_directory.get_revisions("head")
        all_revisions = [script.revision for script in all_scripts]
        
        # Build dependency tree
        dependencies = {}
        for script in all_scripts:
            dependencies[script.revision] = script.down_revision
        
        # Check if there's a proper base (one with down_revision=None)
        base_migrations = [rev for rev, down in dependencies.items() if down is None]
        if not base_migrations:
            return False, ["Missing base migration (one with down_revision=None)"]
        
        if len(base_migrations) > 1:
            return False, [f"Multiple base migrations found: {', '.join(base_migrations)}"]
        
        # Check if all migrations form a single chain (no branches)
        visited = set()
        missing_dependencies = []
        
        current = "head"
        while current and current != "base":
            # Get the script for this revision
            script = self.script_directory.get_revision(current)
            if script is None:
                missing_dependencies.append(f"Migration {current} not found")
                break
            
            # Mark as visited
            visited.add(script.revision)
            
            # Move to the parent
            current = script.down_revision
            
            # Check if we have a circular dependency
            if current in visited:
                return False, [f"Circular dependency detected at {current}"]
        
        # Check if all migrations are in the chain
        unvisited = set(all_revisions) - visited
        if unvisited:
            return False, [f"Migrations not in the main chain: {', '.join(unvisited)}"]
        
        return True, []
    
    def apply_migrations(self, target: str = "head") -> bool:
        """
        Apply migrations up to the specified target.
        
        Args:
            target: The target revision to migrate to (default: "head")
            
        Returns:
            Boolean indicating if the migrations were successfully applied
        """
        try:
            # Run the upgrade
            command.upgrade(self.alembic_cfg, target)
            logger.info(f"Successfully migrated to: {target}")
            return True
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            return False
    
    def reset_database(self) -> bool:
        """
        Reset the database by dropping all tables and reapplying migrations.
        USE WITH CAUTION!
        
        Returns:
            Boolean indicating if the reset was successful
        """
        try:
            # Get all table names
            inspector = sa.inspect(self.engine)
            metadata = sa.MetaData()
            
            # Drop all tables
            for table_name in reversed(inspector.get_table_names()):
                logger.info(f"Dropping table: {table_name}")
                table = sa.Table(table_name, metadata)
                table.drop(self.engine)
            
            # Apply all migrations
            return self.apply_migrations()
        except Exception as e:
            logger.error(f"Database reset failed: {str(e)}")
            return False
    
    def ensure_base_migration_exists(self) -> bool:
        """
        Ensure a base migration exists. If not, create one based on current models.
        
        Returns:
            Boolean indicating if a base migration exists or was created
        """
        # Check if we have a base migration
        base_migrations = []
        for script in self.script_directory.get_revisions():
            if script.down_revision is None:
                base_migrations.append(script.revision)
        
        if base_migrations:
            logger.info(f"Base migration found: {base_migrations[0]}")
            return True
        
        # We need to create a base migration
        logger.warning("No base migration found. Creating one...")
        timestamp = datetime.now().strftime("%Y%m%d")
        base_name = f"{timestamp}_base_tables"
        
        # Create the migration file
        try:
            command.revision(
                self.alembic_cfg,
                message="Create base tables",
                rev_id=base_name
            )
            logger.info(f"Created base migration: {base_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to create base migration: {str(e)}")
            return False

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="ProbeOps Database Migration Manager"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check if all required migrations exist and can be applied"
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply all pending migrations"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset the database and apply all migrations from scratch (USE WITH CAUTION)"
    )
    parser.add_argument(
        "--ensure-base",
        action="store_true",
        help="Ensure a base migration exists"
    )
    parser.add_argument(
        "--env",
        default=".env.db",
        help="Specify a .env file to load (default: .env.db)"
    )
    return parser.parse_args()

def main():
    """Main entry point."""
    args = parse_args()
    manager = MigrationManager(env_file=args.env)
    
    if args.check:
        success, issues = manager.check_migrations()
        if success:
            logger.info("Migration check passed!")
        else:
            logger.error("Migration check failed!")
            for issue in issues:
                logger.error(f"- {issue}")
                
    if args.ensure_base:
        if manager.ensure_base_migration_exists():
            logger.info("Base migration is available")
        else:
            logger.error("Failed to ensure base migration")
    
    if args.apply:
        current = manager.get_current_revision()
        logger.info(f"Current database revision: {current}")
        
        if manager.apply_migrations():
            logger.info("Migrations applied successfully")
        else:
            logger.error("Failed to apply migrations")
    
    if args.reset:
        if input("Are you sure you want to reset the database? This will DELETE ALL DATA! (y/N): ").lower() == 'y':
            if manager.reset_database():
                logger.info("Database reset and migrations applied successfully")
            else:
                logger.error("Failed to reset database")
        else:
            logger.info("Database reset cancelled")

if __name__ == "__main__":
    main()