"""
Script to run the Alembic migrations.
"""
import os
import sys
from alembic import command
from alembic.config import Config

def run_migrations():
    """Run the Alembic migrations."""
    # Get the current directory (should be the backend directory)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create full path to alembic.ini
    alembic_ini_path = os.path.join(current_dir, "alembic.ini")
    
    # Check if the file exists
    if not os.path.exists(alembic_ini_path):
        print(f"Error: alembic.ini not found at {alembic_ini_path}")
        return
    
    print(f"Using alembic.ini at: {alembic_ini_path}")
    
    # Create config with correct path
    alembic_cfg = Config(alembic_ini_path)
    
    # Run only our specific migration to add the probe connection fields
    print("Running specific migration: 20250515_add_probe_connection_fields...")
    command.upgrade(alembic_cfg, "20250515_add_probe_connection_fields")
    print("Migration completed successfully.")

if __name__ == "__main__":
    # Add the parent directory to sys.path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    sys.path.append(parent_dir)
    
    run_migrations()