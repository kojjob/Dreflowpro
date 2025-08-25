"""Add Phase 2 models: pipelines and connectors

Revision ID: 005_add_phase_2_models
Revises: 004_add_audit_logs
Create Date: 2025-08-24 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_add_phase_2_models'
down_revision = '004_add_audit_logs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create data_connectors table
    op.create_table('data_connectors',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('type', sa.Enum('FILE_UPLOAD', 'DATABASE', 'API', 'WEBHOOK', 'CSV', 'EXCEL', 'JSON', name='connectortype'), nullable=False),
        sa.Column('status', sa.Enum('ACTIVE', 'INACTIVE', 'ERROR', 'TESTING', name='connectorstatus'), nullable=True),
        sa.Column('connection_config', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('schema_info', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('file_type', sa.String(50), nullable=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('last_tested', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('last_used', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'])
    )
    
    # Create indexes for data_connectors
    op.create_index(op.f('ix_data_connectors_type'), 'data_connectors', ['type'])
    op.create_index(op.f('ix_data_connectors_status'), 'data_connectors', ['status'])
    op.create_index(op.f('ix_data_connectors_file_type'), 'data_connectors', ['file_type'])
    op.create_index(op.f('ix_data_connectors_organization_id'), 'data_connectors', ['organization_id'])
    op.create_index(op.f('ix_data_connectors_created_by_id'), 'data_connectors', ['created_by_id'])
    op.create_index(op.f('ix_data_connectors_last_used'), 'data_connectors', ['last_used'])

    # Create data_previews table
    op.create_table('data_previews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('connector_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('preview_data', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('column_info', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['connector_id'], ['data_connectors.id'])
    )

    # Create etl_pipelines table
    op.create_table('etl_pipelines',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('DRAFT', 'ACTIVE', 'INACTIVE', 'RUNNING', 'ERROR', name='pipelinestatus'), nullable=True),
        sa.Column('pipeline_config', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('schedule_cron', sa.String(100), nullable=True),
        sa.Column('is_scheduled', sa.Boolean(), nullable=True),
        sa.Column('next_run', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('tags', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('version', sa.Integer(), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'])
    )
    
    # Create indexes for etl_pipelines
    op.create_index(op.f('ix_etl_pipelines_is_scheduled'), 'etl_pipelines', ['is_scheduled'])
    op.create_index(op.f('ix_etl_pipelines_next_run'), 'etl_pipelines', ['next_run'])
    op.create_index(op.f('ix_etl_pipelines_organization_id'), 'etl_pipelines', ['organization_id'])
    op.create_index(op.f('ix_etl_pipelines_created_by_id'), 'etl_pipelines', ['created_by_id'])
    op.create_index(op.f('ix_etl_pipelines_created_at'), 'etl_pipelines', ['created_at'])

    # Create pipeline_steps table
    op.create_table('pipeline_steps',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('pipeline_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('step_order', sa.Integer(), nullable=False),
        sa.Column('step_type', sa.String(50), nullable=False),
        sa.Column('step_name', sa.String(255), nullable=False),
        sa.Column('step_config', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('source_connector_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transformation_type', sa.Enum('FILTER', 'MAP', 'AGGREGATE', 'JOIN', 'SORT', 'DEDUPLICATE', 'VALIDATE', 'CALCULATE', 'SPLIT', 'MERGE', name='transformationtype'), nullable=True),
        sa.Column('transformation_config', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['pipeline_id'], ['etl_pipelines.id']),
        sa.ForeignKeyConstraint(['source_connector_id'], ['data_connectors.id'])
    )
    
    # Create indexes for pipeline_steps
    op.create_index(op.f('ix_pipeline_steps_pipeline_id'), 'pipeline_steps', ['pipeline_id'])
    op.create_index(op.f('ix_pipeline_steps_step_order'), 'pipeline_steps', ['step_order'])
    op.create_index(op.f('ix_pipeline_steps_step_type'), 'pipeline_steps', ['step_type'])
    op.create_index(op.f('ix_pipeline_steps_source_connector_id'), 'pipeline_steps', ['source_connector_id'])
    op.create_index(op.f('ix_pipeline_steps_transformation_type'), 'pipeline_steps', ['transformation_type'])

    # Create pipeline_executions table
    op.create_table('pipeline_executions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('pipeline_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', name='executionstatus'), nullable=True),
        sa.Column('started_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('completed_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('started_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('rows_processed', sa.Integer(), nullable=True),
        sa.Column('rows_successful', sa.Integer(), nullable=True),
        sa.Column('rows_failed', sa.Integer(), nullable=True),
        sa.Column('execution_log', sa.Text(), nullable=True),
        sa.Column('error_log', sa.Text(), nullable=True),
        sa.Column('execution_metrics', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('trigger_type', sa.String(50), nullable=True),
        sa.Column('trigger_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['pipeline_id'], ['etl_pipelines.id']),
        sa.ForeignKeyConstraint(['started_by_id'], ['users.id'])
    )
    
    # Create indexes for pipeline_executions
    op.create_index(op.f('ix_pipeline_executions_pipeline_id'), 'pipeline_executions', ['pipeline_id'])
    op.create_index(op.f('ix_pipeline_executions_status'), 'pipeline_executions', ['status'])
    op.create_index(op.f('ix_pipeline_executions_started_at'), 'pipeline_executions', ['started_at'])
    op.create_index(op.f('ix_pipeline_executions_completed_at'), 'pipeline_executions', ['completed_at'])
    op.create_index(op.f('ix_pipeline_executions_started_by_id'), 'pipeline_executions', ['started_by_id'])
    op.create_index(op.f('ix_pipeline_executions_trigger_type'), 'pipeline_executions', ['trigger_type'])

    # Create transformation_templates table
    op.create_table('transformation_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('transformation_type', sa.Enum('FILTER', 'MAP', 'AGGREGATE', 'JOIN', 'SORT', 'DEDUPLICATE', 'VALIDATE', 'CALCULATE', 'SPLIT', 'MERGE', name='transformationtype'), nullable=False),
        sa.Column('template_config', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('ui_config', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), onupdate=sa.func.now())
    )


def downgrade() -> None:
    # Drop tables in reverse order to handle foreign key dependencies
    op.drop_table('transformation_templates')
    op.drop_table('pipeline_executions')
    op.drop_table('pipeline_steps')
    op.drop_table('etl_pipelines')
    op.drop_table('data_previews')
    op.drop_table('data_connectors')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS executionstatus")
    op.execute("DROP TYPE IF EXISTS transformationtype")
    op.execute("DROP TYPE IF EXISTS pipelinestatus")
    op.execute("DROP TYPE IF EXISTS connectorstatus")
    op.execute("DROP TYPE IF EXISTS connectortype")