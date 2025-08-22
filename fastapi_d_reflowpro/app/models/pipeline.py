from sqlalchemy import Column, String, DateTime, Boolean, Enum, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
import uuid
from ..core.database import Base


class PipelineStatus(str, PyEnum):
    """Status of ETL pipelines."""
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    RUNNING = "running"
    ERROR = "error"


class ExecutionStatus(str, PyEnum):
    """Status of pipeline executions."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TransformationType(str, PyEnum):
    """Types of transformations available."""
    FILTER = "filter"
    MAP = "map"
    AGGREGATE = "aggregate"
    JOIN = "join"
    SORT = "sort"
    DEDUPLICATE = "deduplicate"
    VALIDATE = "validate"
    CALCULATE = "calculate"
    SPLIT = "split"
    MERGE = "merge"


class ETLPipeline(Base):
    """ETL Pipeline model."""
    __tablename__ = "etl_pipelines"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(PipelineStatus), default=PipelineStatus.DRAFT)
    
    # Pipeline configuration (visual flow)
    pipeline_config = Column(JSON, nullable=True)  # Nodes, connections, etc.
    
    # Scheduling
    schedule_cron = Column(String(100), nullable=True)  # Cron expression
    is_scheduled = Column(Boolean, default=False)
    next_run = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    tags = Column(JSON, nullable=True)  # Array of tags
    version = Column(Integer, default=1)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="pipelines")
    created_by = relationship("User", back_populates="created_pipelines")
    steps = relationship("PipelineStep", back_populates="pipeline", cascade="all, delete-orphan")
    executions = relationship("PipelineExecution", back_populates="pipeline")


class PipelineStep(Base):
    """Individual steps in a pipeline."""
    __tablename__ = "pipeline_steps"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"))
    step_order = Column(Integer, nullable=False)
    step_type = Column(String(50), nullable=False)  # source, transform, destination
    step_name = Column(String(255), nullable=False)
    
    # Configuration for this step
    step_config = Column(JSON, nullable=False)
    
    # For source steps
    source_connector_id = Column(UUID(as_uuid=True), ForeignKey("data_connectors.id"), nullable=True)
    
    # Transformation details
    transformation_type = Column(Enum(TransformationType), nullable=True)
    transformation_config = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    pipeline = relationship("ETLPipeline", back_populates="steps")
    source_connector = relationship("DataConnector", back_populates="pipeline_steps")


class PipelineExecution(Base):
    """Pipeline execution history."""
    __tablename__ = "pipeline_executions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"))
    status = Column(Enum(ExecutionStatus), default=ExecutionStatus.PENDING)
    
    # Execution details
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    started_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Results and logging
    rows_processed = Column(Integer, default=0)
    rows_successful = Column(Integer, default=0)
    rows_failed = Column(Integer, default=0)
    execution_log = Column(Text, nullable=True)
    error_log = Column(Text, nullable=True)
    execution_metrics = Column(JSON, nullable=True)  # Duration, memory, etc.
    
    # Trigger information
    trigger_type = Column(String(50), nullable=True)  # manual, scheduled, webhook
    trigger_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    pipeline = relationship("ETLPipeline", back_populates="executions")
    started_by = relationship("User")


class TransformationTemplate(Base):
    """Pre-built transformation templates for non-technical users."""
    __tablename__ = "transformation_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)  # cleaning, formatting, calculation
    transformation_type = Column(Enum(TransformationType), nullable=False)
    
    # Template configuration
    template_config = Column(JSON, nullable=False)
    ui_config = Column(JSON, nullable=False)  # How to render in UI
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())