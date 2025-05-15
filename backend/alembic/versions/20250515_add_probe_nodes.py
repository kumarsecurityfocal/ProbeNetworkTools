"""Add probe node models

Revision ID: 20250515_add_probe_nodes
Revises: 20250515_add_usage_logs
Create Date: 2025-05-15 07:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = '20250515_add_probe_nodes'
down_revision = '20250515_add_usage_logs'
branch_labels = None
depends_on = None


def upgrade():
    # Create probe_nodes table
    op.create_table(
        'probe_nodes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('node_uuid', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('hostname', sa.String(), nullable=False),
        sa.Column('internal_ip', sa.String(), nullable=True),
        sa.Column('external_ip', sa.String(), nullable=True),
        sa.Column('region', sa.String(), nullable=False),
        sa.Column('zone', sa.String(), nullable=True),
        sa.Column('api_key', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('status', sa.String(), nullable=False, default='registered'),
        sa.Column('last_heartbeat', sa.DateTime(), nullable=True),
        sa.Column('version', sa.String(), nullable=True),
        sa.Column('max_concurrent_probes', sa.Integer(), nullable=False, default=10),
        sa.Column('supported_tools', JSON, nullable=True),
        sa.Column('hardware_info', JSON, nullable=True),
        sa.Column('network_info', JSON, nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False, default=1),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('current_load', sa.Float(), nullable=False, default=0.0),
        sa.Column('avg_response_time', sa.Float(), nullable=False, default=0.0),
        sa.Column('error_count', sa.Integer(), nullable=False, default=0),
        sa.Column('total_probes_executed', sa.Integer(), nullable=False, default=0),
        sa.Column('config', JSON, nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('node_uuid'),
        sa.UniqueConstraint('api_key')
    )
    op.create_index(op.f('ix_probe_nodes_id'), 'probe_nodes', ['id'], unique=False)
    op.create_index(op.f('ix_probe_nodes_node_uuid'), 'probe_nodes', ['node_uuid'], unique=True)
    
    # Create node_diagnostics association table
    op.create_table(
        'node_diagnostics',
        sa.Column('node_id', sa.Integer(), nullable=False),
        sa.Column('diagnostic_id', sa.Integer(), nullable=False),
        sa.Column('executed_at', sa.DateTime(), nullable=False),
        sa.Column('execution_time', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['diagnostic_id'], ['diagnostics.id'], ),
        sa.ForeignKeyConstraint(['node_id'], ['probe_nodes.id'], ),
        sa.PrimaryKeyConstraint('node_id', 'diagnostic_id')
    )
    
    # Create node_registration_tokens table
    op.create_table(
        'node_registration_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, default=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_user_id', sa.Integer(), nullable=False),
        sa.Column('node_id', sa.Integer(), nullable=True),
        sa.Column('intended_region', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['node_id'], ['probe_nodes.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
    op.create_index(op.f('ix_node_registration_tokens_id'), 'node_registration_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_node_registration_tokens_token'), 'node_registration_tokens', ['token'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_node_registration_tokens_token'), table_name='node_registration_tokens')
    op.drop_index(op.f('ix_node_registration_tokens_id'), table_name='node_registration_tokens')
    op.drop_table('node_registration_tokens')
    op.drop_table('node_diagnostics')
    op.drop_index(op.f('ix_probe_nodes_node_uuid'), table_name='probe_nodes')
    op.drop_index(op.f('ix_probe_nodes_id'), table_name='probe_nodes')
    op.drop_table('probe_nodes')