#!/usr/bin/env python3
"""
ProbeOps AWS Database Initialization Script

This script initializes the database schema for ProbeOps in AWS.
It creates all necessary tables including users, usage_logs, subscriptions, etc.

Usage:
    python initialize_aws_db.py
"""

import os
import sys
import logging
import importlib.util
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def validate_environment():
    """Validate required environment variables are set."""
    required_vars = ["DATABASE_URL"]
    missing = [var for var in required_vars if not os.environ.get(var)]
    
    if missing:
        logger.error(f"❌ Missing required environment variables: {', '.join(missing)}")
        logger.error(f"Please set them before running this script:")
        logger.error(f"export DATABASE_URL=postgresql://username:password@hostname:port/dbname")
        return False
    
    return True

def find_alembic_module():
    """Try to find and import the alembic migration modules."""
    # Try different possible locations
    possible_paths = [
        "backend/alembic",
        "alembic",
        "app/alembic",
        "backend/app/alembic"
    ]
    
    for path in possible_paths:
        alembic_path = Path(path)
        if alembic_path.exists() and alembic_path.is_dir():
            logger.info(f"✅ Found alembic directory at {alembic_path}")
            return alembic_path
    
    logger.error("❌ Could not find alembic directory")
    return None

def run_alembic_migrations(alembic_path):
    """Run alembic migrations if available."""
    try:
        # Try to import and use alembic API
        from alembic import command
        from alembic.config import Config
        
        alembic_cfg = Config(str(alembic_path / "alembic.ini"))
        logger.info("🔄 Running database migrations with Alembic...")
        command.upgrade(alembic_cfg, "head")
        logger.info("✅ Alembic migrations completed successfully")
        return True
    except ImportError:
        logger.warning("⚠️ Alembic not installed, will use fallback method")
        return False
    except Exception as e:
        logger.error(f"❌ Error running Alembic migrations: {e}")
        return False

def run_migration_script():
    """Try to find and run a migration script."""
    possible_scripts = [
        "backend/run_migration.py",
        "backend/app/run_migration.py",
        "scripts/run_migration.py",
        "run_migration.py"
    ]
    
    for script_path in possible_scripts:
        if Path(script_path).exists():
            logger.info(f"✅ Found migration script at {script_path}")
            try:
                # Load and execute the script
                spec = importlib.util.spec_from_file_location("migration_module", script_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Try to call the main function if it exists
                if hasattr(module, "main"):
                    logger.info("🔄 Running migration script...")
                    module.main()
                    logger.info("✅ Migration script completed successfully")
                    return True
                elif hasattr(module, "run_migrations"):
                    logger.info("🔄 Running migration script...")
                    module.run_migrations()
                    logger.info("✅ Migration script completed successfully")
                    return True
                else:
                    logger.warning(f"⚠️ Migration script found but no main/run_migrations function")
            except Exception as e:
                logger.error(f"❌ Error running migration script: {e}")
        
    logger.error("❌ Could not find any migration scripts")
    return False

def create_tables_manually():
    """Create basic tables manually if all else fails."""
    try:
        import psycopg2
        
        logger.warning("⚠️ Using fallback method to create tables manually")
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        conn.autocommit = False
        cursor = conn.cursor()
        
        # Create minimal schema for authentication to work
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS usage_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            endpoint VARCHAR(255),
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            success BOOLEAN DEFAULT TRUE,
            response_time FLOAT,
            ip_address VARCHAR(45),
            tier_id INTEGER,
            api_key_id INTEGER,
            was_queued BOOLEAN DEFAULT FALSE,
            queue_time FLOAT
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS subscription_tiers (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price FLOAT NOT NULL,
            request_limit INTEGER,
            concurrency_limit INTEGER,
            rate_limit_per_minute INTEGER,
            features JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            tier_id INTEGER REFERENCES subscription_tiers(id),
            start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            end_date TIMESTAMP WITH TIME ZONE,
            active BOOLEAN DEFAULT TRUE,
            payment_status VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """)
        
        # Insert default tier
        cursor.execute("""
        INSERT INTO subscription_tiers (name, price, request_limit, concurrency_limit, rate_limit_per_minute, features)
        VALUES ('Free', 0, 100, 1, 10, '{"diagnostics": true, "scheduled_probes": false, "multiple_probe_nodes": false}')
        ON CONFLICT DO NOTHING;
        """)
        
        conn.commit()
        logger.info("✅ Basic tables created successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Error creating tables manually: {e}")
        if 'conn' in locals():
            conn.rollback()
        return False

def main():
    """Main function to initialize the database."""
    logger.info("🚀 Starting ProbeOps AWS Database Initialization")
    
    if not validate_environment():
        sys.exit(1)
    
    # Try Alembic migrations first
    alembic_path = find_alembic_module()
    if alembic_path and run_alembic_migrations(alembic_path):
        logger.info("✅ Database initialized successfully using Alembic")
        return
    
    # Try migration script next
    if run_migration_script():
        logger.info("✅ Database initialized successfully using migration script")
        return
    
    # Fallback to manual creation
    if create_tables_manually():
        logger.info("✅ Database initialized with basic tables manually")
        logger.info("⚠️ Note: This is a minimal schema. Some features may require additional tables.")
        return
    
    logger.error("❌ All database initialization methods failed")
    sys.exit(1)

if __name__ == "__main__":
    main()