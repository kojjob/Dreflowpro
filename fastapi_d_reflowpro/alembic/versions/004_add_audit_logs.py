"""Add all required tables for production-ready ETL platform

Revision ID: 004_add_audit_logs
Revises: None
Create Date: 2024-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '004_add_audit_logs'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add audit logs table with comprehensive security tracking."""
    
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('event_type', sa.String(50), nullable=False, index=True),
        sa.Column('severity', sa.String(20), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('session_id', sa.String(255), nullable=True, index=True),
        sa.Column('ip_address', sa.String(45), nullable=True, index=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('resource_type', sa.String(50), nullable=True, index=True),
        sa.Column('resource_id', sa.String(255), nullable=True, index=True),
        sa.Column('action', sa.String(50), nullable=True, index=True),
        sa.Column('outcome', sa.String(20), nullable=False, index=True),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('details', postgresql.JSON, nullable=True),
        sa.Column('correlation_id', sa.String(255), nullable=True, index=True),
        sa.Column('request_path', sa.String(500), nullable=True),
        sa.Column('request_method', sa.String(10), nullable=True),
        sa.Column('response_status', sa.Integer, nullable=True),
        sa.Column('duration_ms', sa.Integer, nullable=True),
    )
    
    # Create composite indexes for efficient querying
    op.create_index('ix_audit_logs_timestamp_event', 'audit_logs', ['timestamp', 'event_type'])
    op.create_index('ix_audit_logs_user_timestamp', 'audit_logs', ['user_id', 'timestamp'])
    op.create_index('ix_audit_logs_severity_timestamp', 'audit_logs', ['severity', 'timestamp'])
    op.create_index('ix_audit_logs_correlation', 'audit_logs', ['correlation_id'])
    
    # Create foreign key constraint to users table
    op.create_foreign_key(
        'fk_audit_logs_user_id',
        'audit_logs', 'users',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Remove audit logs table."""
    
    # Drop foreign key constraint
    op.drop_constraint('fk_audit_logs_user_id', 'audit_logs', type_='foreignkey')
    
    # Drop indexes
    op.drop_index('ix_audit_logs_correlation', 'audit_logs')
    op.drop_index('ix_audit_logs_severity_timestamp', 'audit_logs')
    op.drop_index('ix_audit_logs_user_timestamp', 'audit_logs')
    op.drop_index('ix_audit_logs_timestamp_event', 'audit_logs')
    
    # Drop table
    op.drop_table('audit_logs')