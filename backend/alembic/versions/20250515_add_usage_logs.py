"""add_usage_logs

Revision ID: 20250515_add_usage_logs
Revises: 20250515_add_tier_limits
Create Date: 2025-05-15 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250515_add_usage_logs'
down_revision = '20250515_add_tier_limits'
branch_labels = None
depends_on = None


def upgrade():
    # Create usage_logs table for detailed request tracking
    op.create_table('usage_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('endpoint', sa.String(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=True),
        sa.Column('response_time', sa.Float(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('tier_id', sa.Integer(), nullable=True),
        sa.Column('api_key_id', sa.Integer(), nullable=True),
        sa.Column('was_queued', sa.Boolean(), nullable=True),
        sa.Column('queue_time', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['api_key_id'], ['api_keys.id'], ),
        sa.ForeignKeyConstraint(['tier_id'], ['subscription_tiers.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_usage_logs_id'), 'usage_logs', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_usage_logs_id'), table_name='usage_logs')
    op.drop_table('usage_logs')