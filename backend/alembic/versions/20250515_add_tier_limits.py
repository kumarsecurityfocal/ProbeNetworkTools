"""Add tier limit columns to subscription_tiers

Revision ID: 20250515_add_tier_limits
Revises: 
Create Date: 2025-05-15 04:18:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250515_add_tier_limits'
down_revision = '20250514_create_base_schema'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to subscription_tiers table
    op.add_column('subscription_tiers', sa.Column('rate_limit_day', sa.Integer(), nullable=True))
    op.add_column('subscription_tiers', sa.Column('rate_limit_month', sa.Integer(), nullable=True))
    op.add_column('subscription_tiers', sa.Column('allowed_probe_intervals', sa.String(), nullable=True, server_default="15,60,1440"))
    op.add_column('subscription_tiers', sa.Column('max_concurrent_requests', sa.Integer(), nullable=True, server_default="5"))
    op.add_column('subscription_tiers', sa.Column('request_priority', sa.Integer(), nullable=True, server_default="1"))
    
    # Update existing tiers with default values
    # FREE tier - 25 calls/day, 500/month
    op.execute("""
        UPDATE subscription_tiers 
        SET rate_limit_day = 25, 
            rate_limit_month = 500,
            allowed_probe_intervals = '15,60,1440',
            max_concurrent_requests = 3,
            request_priority = 1
        WHERE name = 'FREE'
    """)
    
    # STANDARD tier - 200 calls/day, 5000/month
    op.execute("""
        UPDATE subscription_tiers 
        SET rate_limit_day = 200, 
            rate_limit_month = 5000,
            allowed_probe_intervals = '5,15,60,1440',
            max_concurrent_requests = 10,
            request_priority = 2
        WHERE name = 'STANDARD'
    """)
    
    # ENTERPRISE tier - 1000 calls/day, 15000/month
    op.execute("""
        UPDATE subscription_tiers 
        SET rate_limit_day = 1000, 
            rate_limit_month = 15000,
            allowed_probe_intervals = '5,15,60,1440',
            max_concurrent_requests = 50,
            request_priority = 3
        WHERE name = 'ENTERPRISE'
    """)


def downgrade():
    # Remove the new columns
    op.drop_column('subscription_tiers', 'rate_limit_day')
    op.drop_column('subscription_tiers', 'rate_limit_month')
    op.drop_column('subscription_tiers', 'allowed_probe_intervals')
    op.drop_column('subscription_tiers', 'max_concurrent_requests')
    op.drop_column('subscription_tiers', 'request_priority')