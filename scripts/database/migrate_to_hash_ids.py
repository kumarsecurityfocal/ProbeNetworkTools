#!/usr/bin/env python3
"""
ProbeOps Migration Schema Upgrade Script

This script converts manually-named migration revision IDs to Alembic's standard
hash-based revision IDs, ensuring compatibility with Alembic defaults and
avoiding PostgreSQL varchar(32) truncation issues.

Usage:
  python migrate_to_hash_ids.py [--dry-run]

Options:
  --dry-run    Show what would be done without making actual changes
"""

import os
import sys
import re
import hashlib
import argparse
import shutil
from pathlib import Path
from datetime import datetime
import sqlalchemy as sa
from sqlalchemy import text
from alembic.config import Config
from alembic import command, script
from alembic.runtime.migration import MigrationContext

# Define configuration
ALEMBIC_DIR = Path("../backend/alembic")
VERSIONS_DIR = ALEMBIC_DIR / "versions"
BACKUP_DIR = Path("../database_backups/migration_backups")
ALEMBIC_CONFIG_PATH = ALEMBIC_DIR / "alembic.ini"

# Basic logging setup
def log_info(message):
    """Log an informational message."""
    print(f"\033[94m[INFO]\033[0m {message}")

def log_success(message):
    """Log a success message."""
    print(f"\033[92m[SUCCESS]\033[0m {message}")

def log_warning(message):
    """Log a warning message."""
    print(f"\033[93m[WARNING]\033[0m {message}")

def log_error(message):
    """Log an error message."""
    print(f"\033[91m[ERROR]\033[0m {message}")

def get_database_url():
    """Get the database URL from environment variables."""
    import os
    db_url = os.environ.get("DATABASE_URL")
    
    if not db_url:
        # Try to find .env file and extract DATABASE_URL
        env_files = [
            "../.env", 
            "../.env.db", 
            "../backend/.env", 
            "../backend/.env.backend"
        ]
        
        for env_file in env_files:
            if os.path.exists(env_file):
                with open(env_file, "r") as f:
                    for line in f:
                        if line.startswith("DATABASE_URL="):
                            db_url = line.strip().split("=", 1)[1].strip('"\'')
                            break
                if db_url:
                    break
    
    if not db_url:
        log_error("DATABASE_URL environment variable not found.")
        log_info("Set the DATABASE_URL environment variable or create a .env file with DATABASE_URL.")
        sys.exit(1)
    
    return db_url

def create_backup(directory=None):
    """Create backup of migration files and alembic_version table."""
    if directory is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        directory = BACKUP_DIR / f"migration_backup_{timestamp}"
    
    # Create backup directory
    os.makedirs(directory, exist_ok=True)
    
    # Backup all migration files
    os.makedirs(directory / "versions", exist_ok=True)
    for migration_file in VERSIONS_DIR.glob("*.py"):
        shutil.copy2(migration_file, directory / "versions" / migration_file.name)
    
    # Backup alembic.ini if it exists
    if ALEMBIC_CONFIG_PATH.exists():
        shutil.copy2(ALEMBIC_CONFIG_PATH, directory / "alembic.ini")
    
    # Backup alembic_version table
    try:
        db_url = get_database_url()
        engine = sa.create_engine(db_url)
        
        with engine.connect() as conn:
            # Check if alembic_version table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'alembic_version'
                )
            """))
            table_exists = result.scalar()
            
            if table_exists:
                # Get current version
                result = conn.execute(text("SELECT version_num FROM alembic_version"))
                versions = [row[0] for row in result]
                
                # Save current version to backup
                with open(directory / "alembic_version.txt", "w") as f:
                    for version in versions:
                        f.write(f"{version}\n")
                
                log_success(f"Backed up alembic_version table with values: {versions}")
            else:
                log_warning("alembic_version table does not exist in the database")
    except Exception as e:
        log_error(f"Failed to backup alembic_version table: {str(e)}")
    
    log_success(f"Backup created at: {directory}")
    return directory

def generate_hash_id(message):
    """Generate a hash ID compatible with Alembic's format."""
    # Alembic uses this format: .rjust(12, '0')
    return hashlib.sha256(message.encode()).hexdigest()[:12]

def get_migration_files():
    """Get all migration files."""
    return sorted(VERSIONS_DIR.glob("*.py"))

def parse_migration_file(file_path):
    """Parse a migration file to extract revision information."""
    with open(file_path, "r") as f:
        content = f.read()
    
    # Extract revision information
    revision_match = re.search(r'revision\s*=\s*[\'"](.*?)[\'"]', content)
    down_revision_match = re.search(r'down_revision\s*=\s*(.*)', content)
    
    revision = revision_match.group(1) if revision_match else None
    down_revision = down_revision_match.group(1).strip() if down_revision_match else None
    
    # Clean up down_revision (handle None, quotes, etc.)
    if down_revision in ["None", "none", "null"]:
        down_revision = None
    elif down_revision:
        # Remove quotes if present
        down_revision = re.sub(r'[\'"]', '', down_revision)
    
    return {
        "file_path": file_path,
        "revision": revision,
        "down_revision": down_revision,
        "content": content
    }

def build_migration_graph():
    """Build a graph of all migrations and their relationships."""
    migrations = {}
    
    for file_path in get_migration_files():
        migration = parse_migration_file(file_path)
        if migration["revision"]:
            migrations[migration["revision"]] = migration
    
    # Build the graph from root to leaf nodes
    root_nodes = [rev for rev, data in migrations.items() if data["down_revision"] is None]
    
    if not root_nodes:
        log_warning("No root migration found!")
        return migrations, []
    
    # Sort the migrations in topological order
    ordered_revisions = []
    visited = set()
    
    def visit(revision):
        if revision in visited:
            return
        visited.add(revision)
        
        # Find all migrations that have this revision as down_revision
        children = [r for r, m in migrations.items() if m["down_revision"] == revision]
        for child in sorted(children):  # Sort for deterministic ordering
            visit(child)
        
        ordered_revisions.append(revision)
    
    for root in sorted(root_nodes):  # Sort for deterministic ordering
        visit(root)
    
    return migrations, list(reversed(ordered_revisions))

def create_hash_mappings(migrations, ordered_revisions):
    """Create mappings between old revision IDs and new hash-based IDs."""
    mapping = {}
    
    # Start with the root migrations
    for revision in ordered_revisions:
        migration = migrations[revision]
        old_id = revision
        
        # For root migrations (no down_revision)
        if migration["down_revision"] is None:
            # Generate a hash based on file content to ensure stability
            new_id = generate_hash_id(f"root_{migration['file_path'].stem}")
        else:
            # For non-root migrations, include the new parent ID in the hash
            parent_id = mapping.get(migration["down_revision"], migration["down_revision"])
            new_id = generate_hash_id(f"{parent_id}_{migration['file_path'].stem}")
        
        mapping[old_id] = new_id
    
    return mapping

def update_migration_files(migrations, id_mapping, dry_run=False):
    """Update migration files with new hash-based IDs."""
    for old_id, new_id in id_mapping.items():
        migration = migrations[old_id]
        file_path = migration["file_path"]
        content = migration["content"]
        
        # Update revision
        content = re.sub(
            r'(revision\s*=\s*[\'"])(.*?)([\'"])',
            f'\\1{new_id}\\3',
            content
        )
        
        # Update down_revision if it exists and has a mapping
        if migration["down_revision"] and migration["down_revision"] in id_mapping:
            new_down_rev = id_mapping[migration["down_revision"]]
            content = re.sub(
                r'(down_revision\s*=\s*[\'"])(.*?)([\'"])',
                f'\\1{new_down_rev}\\3',
                content
            )
        
        # Create new filename
        filename_prefix = file_path.stem.split('_', 1)[-1] if '_' in file_path.stem else file_path.stem
        new_filename = f"{new_id}_{filename_prefix}.py"
        new_file_path = file_path.parent / new_filename
        
        if dry_run:
            log_info(f"Would rename {file_path.name} to {new_filename}")
            log_info(f"Would update revision ID from {old_id} to {new_id}")
        else:
            # Write updated content to new file
            with open(new_file_path, "w") as f:
                f.write(content)
            
            # Remove old file if new file was created successfully and it's not the same file
            if new_file_path.exists() and new_file_path != file_path:
                os.remove(file_path)
            
            log_success(f"Updated migration: {old_id} → {new_id}")

def update_alembic_version_table(id_mapping, dry_run=False):
    """Update the alembic_version table in the database."""
    try:
        db_url = get_database_url()
        engine = sa.create_engine(db_url)
        
        with engine.connect() as conn:
            # Check if alembic_version table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'alembic_version'
                )
            """))
            table_exists = result.scalar()
            
            if not table_exists:
                log_warning("alembic_version table does not exist in the database")
                return
            
            # Get current version
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            versions = [row[0] for row in result]
            
            # Update alembic_version table
            for version in versions:
                if version in id_mapping:
                    new_version = id_mapping[version]
                    
                    if dry_run:
                        log_info(f"Would update alembic_version from {version} to {new_version}")
                    else:
                        # Begin a transaction
                        with conn.begin():
                            # Delete old version
                            conn.execute(text("DELETE FROM alembic_version WHERE version_num = :version"), 
                                        {"version": version})
                            
                            # Insert new version
                            conn.execute(text("INSERT INTO alembic_version (version_num) VALUES (:version)"), 
                                        {"version": new_version})
                        
                        log_success(f"Updated alembic_version table: {version} → {new_version}")
                else:
                    log_warning(f"Version {version} in alembic_version table not found in migrations")
    except Exception as e:
        log_error(f"Failed to update alembic_version table: {str(e)}")

def create_new_migration_config(id_mapping, dry_run=False):
    """Create an updated alembic.ini file with appropriate settings."""
    if not ALEMBIC_CONFIG_PATH.exists():
        log_warning(f"alembic.ini not found at {ALEMBIC_CONFIG_PATH}")
        return
    
    # Read current alembic.ini
    with open(ALEMBIC_CONFIG_PATH, "r") as f:
        config_content = f.read()
    
    # Ensure script_location is correct
    config_content = re.sub(
        r'(script_location\s*=\s*)(.*)',
        r'\1alembic',
        config_content
    )
    
    # Update file_template to use hash-based revisions
    if 'file_template' not in config_content:
        config_content = re.sub(
            r'(script_location\s*=\s*.*\n)',
            r'\1file_template = %%(rev)s_%%(slug)s\n',
            config_content
        )
    else:
        config_content = re.sub(
            r'(file_template\s*=\s*)(.*)',
            r'\1%%(rev)s_%%(slug)s',
            config_content
        )
    
    if dry_run:
        log_info("Would update alembic.ini with hash-based revision settings")
    else:
        # Backup original config
        backup_config_path = ALEMBIC_CONFIG_PATH.with_suffix('.ini.bak')
        shutil.copy2(ALEMBIC_CONFIG_PATH, backup_config_path)
        
        # Write updated config
        with open(ALEMBIC_CONFIG_PATH, "w") as f:
            f.write(config_content)
        
        log_success(f"Updated alembic.ini with hash-based revision settings (backup at {backup_config_path})")

def update_alembic_autogenerate_template(dry_run=False):
    """Update the env.py file to ensure autogenerate works properly."""
    env_py_path = ALEMBIC_DIR / "env.py"
    
    if not env_py_path.exists():
        log_warning(f"env.py not found at {env_py_path}")
        return
    
    with open(env_py_path, "r") as f:
        content = f.read()
    
    # Check if we need to update the env.py file
    autogenerate_import = "from alembic import context\n# Required for autogenerate support\nfrom backend.models import Base"
    if "from backend.models import Base" not in content:
        content = content.replace(
            "from alembic import context",
            autogenerate_import
        )
        
        # Also ensure target_metadata is set correctly
        if "target_metadata = None" in content:
            content = content.replace(
                "target_metadata = None",
                "target_metadata = Base.metadata"
            )
    
    if dry_run:
        log_info("Would update env.py to support autogenerate")
    else:
        # Backup original file
        backup_path = env_py_path.with_suffix('.py.bak')
        shutil.copy2(env_py_path, backup_path)
        
        # Write updated content
        with open(env_py_path, "w") as f:
            f.write(content)
        
        log_success(f"Updated env.py to support autogenerate (backup at {backup_path})")

def create_readme_guide(id_mapping, dry_run=False):
    """Create a README file explaining the migration changes."""
    readme_content = """# ProbeOps Migration Schema Upgrade

## Overview
This directory contains the results of migrating from manually-named migration revision IDs 
to Alembic's standard hash-based revision IDs. This change ensures:

1. Compatibility with Alembic defaults (VARCHAR(32) column)
2. Avoid PostgreSQL truncation issues with long revision IDs
3. Support for `alembic revision --autogenerate` and other standard Alembic commands

## ID Mapping
The following mapping shows the relationship between old and new revision IDs:

```
"""
    
    # Add mapping details
    for old_id, new_id in id_mapping.items():
        readme_content += f"{old_id:40} → {new_id}\n"
    
    readme_content += """```

## Usage Instructions
1. Migrations now support standard Alembic commands:
   - `alembic revision --autogenerate -m "description"` to create migrations
   - `alembic upgrade head` to apply migrations
   - `alembic stamp head` to mark as applied

2. When creating new migrations, let Alembic generate the IDs automatically.
   DO NOT manually specify long descriptive IDs like before.

3. Migration files now follow the pattern: `{hash_id}_{description}.py`

## Reverting (Emergency Only)
A backup of the original migration files is stored in the backup directory.
"""
    
    readme_path = ALEMBIC_DIR / "README_MIGRATIONS.md"
    
    if dry_run:
        log_info(f"Would create migration guide at {readme_path}")
    else:
        with open(readme_path, "w") as f:
            f.write(readme_content)
        
        log_success(f"Created migration guide at {readme_path}")

def main():
    """Execute the migration process."""
    parser = argparse.ArgumentParser(description="Convert migration revision IDs to hash-based IDs")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    args = parser.parse_args()
    
    dry_run = args.dry_run
    
    if dry_run:
        log_info("Running in DRY RUN mode - no changes will be made")
    
    # Check if versions directory exists
    if not VERSIONS_DIR.exists():
        log_error(f"Alembic versions directory not found at {VERSIONS_DIR}")
        log_info(f"Please run this script from the ProbeOps project root or ensure {VERSIONS_DIR} exists")
        return 1
    
    # Create backup
    if not dry_run:
        backup_dir = create_backup()
        log_info(f"Created backup at {backup_dir}")
    
    # Build migration graph
    log_info("Analyzing migration files...")
    migrations, ordered_revisions = build_migration_graph()
    
    if not ordered_revisions:
        log_error("No migrations found or unable to build dependency graph")
        return 1
    
    # Create ID mappings
    log_info("Creating hash-based ID mappings...")
    id_mapping = create_hash_mappings(migrations, ordered_revisions)
    
    # Display migration mapping
    log_info("Migration ID mappings:")
    for old_id, new_id in id_mapping.items():
        print(f"  {old_id:40} → {new_id}")
    
    # Update migration files
    log_info("Updating migration files...")
    update_migration_files(migrations, id_mapping, dry_run)
    
    # Update alembic_version table
    log_info("Updating alembic_version table in database...")
    update_alembic_version_table(id_mapping, dry_run)
    
    # Create updated alembic.ini
    log_info("Updating Alembic configuration...")
    create_new_migration_config(id_mapping, dry_run)
    
    # Update env.py for autogenerate support
    log_info("Updating env.py for autogenerate support...")
    update_alembic_autogenerate_template(dry_run)
    
    # Create README guide
    log_info("Creating migration guide...")
    create_readme_guide(id_mapping, dry_run)
    
    if dry_run:
        log_success("Dry run completed. No changes were made.")
        log_info("Run without --dry-run to apply changes")
    else:
        log_success("Migration completed successfully!")
        log_info("You can now use standard Alembic commands like:")
        log_info("  - alembic revision --autogenerate -m \"description\"")
        log_info("  - alembic upgrade head")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())