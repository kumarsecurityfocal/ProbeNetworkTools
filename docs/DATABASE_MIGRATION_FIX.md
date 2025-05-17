# Database Migration Fix Guide

This guide addresses common issues with the database migration process in the ProbeOps deployment pipeline.

## Problem: Foreign Key Constraint Failures

The most common migration error occurs in the `20250515_add_usage_logs.py` migration, which creates a new `usage_logs` table with foreign key constraints to existing tables.

Error typically looks like:
```
INFO [alembic.runtime.migration] Running upgrade 20250515_add_tier_limits -> 20250515_add_usage_logs, add_usage_logs
[2025-05-17 15:59:13.566] ❌ Database migration failed!
```

## Root Cause

The migration adds foreign key constraints on the `usage_logs` table that reference:
1. `users.id` 
2. `subscription_tiers.id`
3. `api_keys.id`

But when the migration is executed, one of these constraints may fail due to:
- The referenced table not having the expected structure
- Missing primary keys on referenced tables
- Existing data that violates the constraints

## Solution Options

### Option 1: Safe Migration Script (Recommended)

Use the `safe_migrations.py` script which:
- Creates a database backup before migration
- Reports detailed error information
- Helps fix common issues automatically

```bash
cd backend
python safe_migrations.py
```

### Option 2: Modify Migration Script

Edit `backend/alembic/versions/20250515_add_usage_logs.py` to make the foreign keys nullable or use a create_table_comment approach:

```python
def upgrade():
    # Create usage_logs table for detailed request tracking
    op.create_table('usage_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        # ... other columns
        # Comment out or remove problematic foreign keys
        # sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Optionally add the foreign keys in a separate operation with ondelete='SET NULL'
    op.create_foreign_key(
        "fk_usage_logs_user_id", 
        "usage_logs", "users",
        ["user_id"], ["id"], 
        ondelete="SET NULL"
    )
```

### Option 3: Manual Database Fix

If you can't modify the migration file, you can manually fix the database:

```sql
-- Run these SQL commands directly on the database
ALTER TABLE usage_logs DROP CONSTRAINT IF EXISTS usage_logs_user_id_fkey;
ALTER TABLE usage_logs ADD CONSTRAINT usage_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
```

## Prevention for Future

1. Always test migrations on a copy of the production database before deployment
2. Use ondelete="SET NULL" for foreign keys to prevent cascading issues
3. Make foreign key columns nullable in most cases
4. Consider using separate migration files for schema changes vs. constraint additions

## Emergency Rollback

If you need to quickly roll back failing migrations:

```bash
cd backend
alembic downgrade 20250515_add_tier_limits
```

This will revert to the previous working migration.