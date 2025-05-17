#!/usr/bin/env python3
"""
Configuration Helper for Database Migration Scripts
--------------------------------------------------

This script provides utilities for handling Alembic configuration paths.
It ensures that migrations work correctly regardless of whether they're
run from the project root or the backend directory.
"""

import os
import sys
import logging
from pathlib import Path
from configparser import ConfigParser

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def find_project_root() -> Path:
    """Find the project root directory."""
    # Start from the current directory
    current_dir = Path.cwd()
    
    # Check if we're in the project root (has backend dir)
    if (current_dir / 'backend').is_dir():
        return current_dir
    
    # Check if we're in the backend directory
    if current_dir.name == 'backend' and (current_dir.parent / 'backend').is_dir():
        return current_dir.parent
    
    # Walk up the directory tree looking for project root indicators
    for parent in current_dir.parents:
        if (parent / 'backend').is_dir():
            return parent
    
    # If we can't find a clear project root, use the current directory
    logger.warning("Could not determine project root. Using current directory.")
    return current_dir

def fix_alembic_config(config_path: str) -> bool:
    """
    Fix the Alembic configuration path.
    
    Args:
        config_path: Path to the alembic.ini file
        
    Returns:
        Boolean indicating success
    """
    try:
        # Read the config file
        config = ConfigParser()
        config.read(config_path)
        
        # Check the script_location setting
        current_location = config.get('alembic', 'script_location')
        logger.info(f"Current script_location: {current_location}")
        
        # Check if the path exists
        script_path = Path(config_path).parent / current_location
        if not script_path.is_dir():
            # Try to find the correct path
            project_root = find_project_root()
            possible_paths = [
                'backend/alembic',
                'alembic'
            ]
            
            fixed = False
            for path in possible_paths:
                full_path = project_root / path
                if full_path.is_dir():
                    # Update config
                    config.set('alembic', 'script_location', path)
                    with open(config_path, 'w') as f:
                        config.write(f)
                    logger.info(f"Updated script_location to: {path}")
                    fixed = True
                    break
            
            if not fixed:
                logger.error("Could not find a valid migration directory")
                return False
        else:
            logger.info(f"Script location path exists: {script_path}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error fixing Alembic config: {str(e)}")
        return False

def main():
    """Main entry point."""
    project_root = find_project_root()
    alembic_ini = project_root / 'backend' / 'alembic.ini'
    
    if not alembic_ini.is_file():
        logger.error(f"Alembic config not found at: {alembic_ini}")
        sys.exit(1)
    
    if fix_alembic_config(str(alembic_ini)):
        logger.info("Alembic configuration verified or fixed")
    else:
        logger.error("Failed to fix Alembic configuration")
        sys.exit(1)

if __name__ == "__main__":
    main()