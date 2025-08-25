"""Add reports functionality

Revision ID: 006_add_reports_functionality
Revises: 005_add_phase_2_models
Create Date: 2025-01-27 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006_add_reports_functionality'
down_revision = '005_add_phase_2_models'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create report enums
    op.execute("CREATE TYPE reporttype AS ENUM ('EXECUTIVE', 'ANALYST', 'PRESENTATION', 'DASHBOARD_EXPORT')")
    op.execute("CREATE TYPE reportstatus AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED', 'CANCELLED')")
    op.execute("CREATE TYPE reportformat AS ENUM ('PDF', 'EXCEL', 'POWERPOINT', 'CSV', 'JSON')")
    
    # Create report_templates table
    op.create_table('report_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('report_type', sa.Enum('EXECUTIVE', 'ANALYST', 'PRESENTATION', 'DASHBOARD_EXPORT', name='reporttype'), nullable=False),
        sa.Column('template_config', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE')
    )
    
    # Create indexes for report_templates
    op.create_index(op.f('ix_report_templates_report_type'), 'report_templates', ['report_type'])
    op.create_index(op.f('ix_report_templates_is_default'), 'report_templates', ['is_default'])
    op.create_index(op.f('ix_report_templates_is_active'), 'report_templates', ['is_active'])
    op.create_index(op.f('ix_report_templates_user_id'), 'report_templates', ['user_id'])
    op.create_index(op.f('ix_report_templates_organization_id'), 'report_templates', ['organization_id'])
    op.create_index(op.f('ix_report_templates_created_at'), 'report_templates', ['created_at'])

    # Create generated_reports table
    op.create_table('generated_reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('report_type', sa.Enum('EXECUTIVE', 'ANALYST', 'PRESENTATION', 'DASHBOARD_EXPORT', name='reporttype'), nullable=False),
        sa.Column('format', sa.Enum('PDF', 'EXCEL', 'POWERPOINT', 'CSV', 'JSON', name='reportformat'), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'GENERATING', 'COMPLETED', 'FAILED', 'CANCELLED', name='reportstatus'), default='PENDING'),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('dataset_id', sa.String(255), nullable=True),
        sa.Column('pipeline_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('generation_config', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('generation_results', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('file_name', sa.String(255), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('download_count', sa.Integer(), nullable=True, default=0),
        sa.Column('view_count', sa.Integer(), nullable=True, default=0),
        sa.Column('shared_with', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_scheduled', sa.Boolean(), nullable=True, default=False),
        sa.Column('schedule_config', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('task_id', sa.String(255), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('generated_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pipeline_id'], ['etl_pipelines.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['template_id'], ['report_templates.id'], ondelete='SET NULL')
    )
    
    # Create indexes for generated_reports
    op.create_index(op.f('ix_generated_reports_report_type'), 'generated_reports', ['report_type'])
    op.create_index(op.f('ix_generated_reports_status'), 'generated_reports', ['status'])
    op.create_index(op.f('ix_generated_reports_user_id'), 'generated_reports', ['user_id'])
    op.create_index(op.f('ix_generated_reports_organization_id'), 'generated_reports', ['organization_id'])
    op.create_index(op.f('ix_generated_reports_pipeline_id'), 'generated_reports', ['pipeline_id'])
    op.create_index(op.f('ix_generated_reports_template_id'), 'generated_reports', ['template_id'])
    op.create_index(op.f('ix_generated_reports_is_scheduled'), 'generated_reports', ['is_scheduled'])
    op.create_index(op.f('ix_generated_reports_expires_at'), 'generated_reports', ['expires_at'])
    op.create_index(op.f('ix_generated_reports_task_id'), 'generated_reports', ['task_id'])
    op.create_index(op.f('ix_generated_reports_generated_at'), 'generated_reports', ['generated_at'])
    op.create_index(op.f('ix_generated_reports_created_at'), 'generated_reports', ['created_at'])


def downgrade() -> None:
    # Drop tables
    op.drop_table('generated_reports')
    op.drop_table('report_templates')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS reportformat")
    op.execute("DROP TYPE IF EXISTS reportstatus")
    op.execute("DROP TYPE IF EXISTS reporttype")