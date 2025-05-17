# ProbeOps Database Migration System

This document explains how the database migration system works and how it's integrated into the deployment process.

## Overview

The ProbeOps Database Migration System provides a robust, safe way to manage database schema changes across different environments (development, staging, production). It handles:

- Validation of database migrations before deployment
- Creation of database backups before applying changes
- Automatic database stamping for fresh databases
- Safe, atomic application of migrations
- Version compatibility checks between PostgreSQL server and client

## Core Components

1. **safe_deploy_db.sh**  
   The main script that orchestrates the entire migration process including validation, backup, and applying migrations.

2. **migration_manager.py**  
   Python library that provides core functionality for working with Alembic migrations:
   - Finding and validating migration chains
   - Applying migrations to databases
   - Stamping fresh databases with appropriate revision
   - Resetting databases (with confirmation)

3. **pre_deploy_validate.py**  
   Validates that the database is ready for deployment by:
   - Checking that all needed migrations exist and are in correct order
   - Verifying the presence of a base migration (with down_revision=None)
   - Testing database connectivity
   - Validating current database state against expected schema

4. **db_migration_deploy.sh**  
   Integration script that connects the migration system to the main deployment workflow.

## Migration File Structure

Migrations are stored in `backend/alembic/versions/` and follow this pattern:

- **20250514_create_base_schema.py**: Base migration with `down_revision=None` that creates initial tables
- **20250515_add_tier_limits.py**: Subsequent migrations with specific changes that build on previous migrations

## Integration with Deployment

During deployment:

1. The main `deploy.sh` script should call `db_migration_deploy.sh` early in the process
2. The migration system validates the database and migrations
3. If validation passes, a backup is created and migrations are applied
4. For fresh databases, the system offers to stamp with the base migration before applying changes

## Usage in Different Environments

### Fresh Deployment

For a fresh deployment:
```bash
# Run the database migration as a separate step
./scripts/deployment/db_migration_deploy.sh

# Then continue with main deployment
./deploy.sh
```

### Existing Deployment

When updating an existing deployment:
```bash
# The main deployment script will call the DB migration script
./deploy.sh
```

### Creating New Migrations

To create a new migration:

1. Create a new file in `backend/alembic/versions/` following the naming convention: `YYYYMMDD_description.py`
2. Set `down_revision` to the previous migration ID
3. Implement `upgrade()` and `downgrade()` functions with SQL operations

## Troubleshooting

If migration errors occur:

1. Check the logs in `deployment_logs/`
2. Verify that the database backup was created successfully
3. If necessary, restore from backup using the instructions in the error message
4. Ensure PostgreSQL client and server versions are compatible

## Further Development

For future improvements:
- Add more comprehensive validation checks
- Implement more detailed reporting
- Add support for partial migrations and data migrations