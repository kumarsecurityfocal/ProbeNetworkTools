"""Add probe connection fields

Revision ID: 20250515_add_probe_connection_fields
Revises: 20250515_add_probe_nodes
Create Date: 2025-05-15 09:25:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250515_add_probe_connection_fields'
down_revision = '20250515_add_probe_nodes'
branch_labels = None
depends_on = None


def upgrade():
    # Add the missing WebSocket connection fields to probe_nodes
    op.add_column('probe_nodes', sa.Column('connection_type', sa.String(), nullable=True))
    op.add_column('probe_nodes', sa.Column('last_connected', sa.DateTime(), nullable=True))
    op.add_column('probe_nodes', sa.Column('connection_id', sa.String(), nullable=True))
    op.add_column('probe_nodes', sa.Column('reconnect_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    # Remove the added columns
    op.drop_column('probe_nodes', 'reconnect_count')
    op.drop_column('probe_nodes', 'connection_id')
    op.drop_column('probe_nodes', 'last_connected')
    op.drop_column('probe_nodes', 'connection_type')