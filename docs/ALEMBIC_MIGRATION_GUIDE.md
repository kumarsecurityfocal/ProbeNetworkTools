# ProbeOps Alembic Migration Guide

## Overview

This guide explains how to transition from our current manually-named migration approach to a more robust Alembic autogenerate system with hash-based revision IDs. This change will:

1. Prevent PostgreSQL migration failures due to VARCHAR(32) limits
2. Enable more reliable migration ordering and dependency tracking
3. Support proper `alembic revision --autogenerate` functionality
4. Improve deployment resilience and backwards compatibility

## Why Change Our Migration Approach?

Our current migration strategy uses manually-created files with long descriptive IDs like:
```
20250515_add_probe_connection_fields
```

This approach has caused several problems:
- Long IDs exceed Alembic's default VARCHAR(32) column width
- Manual revision ordering is error-prone during merges and concurrent development
- Schema version tracking falls out of sync during deployment

## New Migration Approach

We'll transition to Alembic's standard approach:
- Short hash-based revision IDs (e.g., `2f9d4d8b19e3`)
- Descriptive message component in filename (`2f9d4d8b19e3_create_users_table.py`)
- Support for automatic migration detection via `--autogenerate`

## Migration Process

### 1. Preparation

1. Make sure you have a backup of your database
   ```bash
   cd scripts/database
   ./safe_deploy_db.sh  # This creates a backup
   ```

2. Run the migration script in dry-run mode first:
   ```bash
   cd scripts/database
   python migrate_to_hash_ids.py --dry-run
   ```

### 2. Execute the Migration

Run the script without the dry-run flag to perform the actual migration:
```bash
cd scripts/database
python migrate_to_hash_ids.py
```

This will:
- Back up all existing migration files
- Convert revision IDs to hash-based format
- Update the database `alembic_version` table
- Configure Alembic properly for autogenerate support

### 3. After Migration

Once migration is complete, use standard Alembic commands for all future schema changes:

```bash
# Generate a new migration automatically
cd backend
alembic revision --autogenerate -m "add user preferences table"

# Apply pending migrations
alembic upgrade head

# Mark current schema version without applying changes
alembic stamp head
```

## Troubleshooting

### If Migration Fails

1. Restore your database from the backup created during step 1
2. Check the error messages to identify the issue
3. Consult the documentation at `scripts/database/README_MIGRATIONS.md` after migration

### If Deployment Fails After Migration

The migration process creates comprehensive backups of both your migration files and database. To revert:

1. Restore the database from backup
2. Replace the migration files with those from the backup
3. Update the `alembic_version` table to match the original revision ID

## Using Autogenerate

After migration, you can automatically generate migration scripts from model changes:

1. Make changes to your SQLAlchemy models in `backend/models.py`
2. Run:
   ```bash
   cd backend
   alembic revision --autogenerate -m "description of changes"
   ```
3. Review the generated migration script in `alembic/versions/`
4. Apply the migration with `alembic upgrade head`

## Best Practices

1. **Always review autogenerated migrations** before applying them
2. Let Alembic generate revision IDs; don't create them manually
3. Use descriptive messages that explain what the migration does
4. For complex migrations (data migrations, etc.), edit the autogenerated file
5. Always test migrations on a development database before deploying

## Support

If you encounter issues with the migration process or need assistance with future migrations, consult the Alembic documentation or reach out to the DevOps team.