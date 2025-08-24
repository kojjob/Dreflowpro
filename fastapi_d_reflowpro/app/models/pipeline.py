# Pipeline Models for DReflowPro ETL Platform

from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Any, Optional, List
from uuid import uuid4

from sqlalchemy import Column, String, DateTime, JSON, Integer, ForeignKey, Boolean, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

from ..core.database import Base


class PipelineStatus(str, Enum):
    """Pipeline execution status"""
    DRAFT = "draft"
    ACTIVE = "active"  
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class StepType(str, Enum):
    """Pipeline step types"""
    SOURCE = "source"
    TRANSFORM = "transform" 
    DESTINATION = "destination"


class TransformationType(str, Enum):
    """Available transformation types"""
    FILTER = "filter"
    MAP = "map"
    AGGREGATE = "aggregate"
    JOIN = "join"
    SORT = "sort"
    PIVOT = "pivot"
    UNPIVOT = "unpivot"
    DEDUPLICATE = "deduplicate"
    VALIDATE = "validate"


class Pipeline(Base):
    """ETL Pipeline definition"""
    __tablename__ = "pipelines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Ownership
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Pipeline configuration
    config = Column(JSON, default=dict)
    schedule = Column(JSON)  # Cron-like scheduling config
    
    # Status and metadata
    status = Column(String(20), default=PipelineStatus.DRAFT.value)
    is_active = Column(Boolean, default=True)
    version = Column(Integer, default=1)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_run_at = Column(DateTime(timezone=True))
    
    # Relationships
    organization = relationship("Organization", back_populates="pipelines")
    creator = relationship("User", back_populates="created_pipelines")
    steps = relationship("PipelineStep", back_populates="pipeline", cascade="all, delete-orphan", order_by="PipelineStep.step_order")
    executions = relationship("PipelineExecution", back_populates="pipeline", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('organization_id', 'name', name='unique_pipeline_name_per_org'),
    )


class PipelineStep(Base):
    """Individual step in a pipeline"""
    __tablename__ = "pipeline_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("pipelines.id"), nullable=False)
    
    # Step definition
    step_order = Column(Integer, nullable=False)
    step_type = Column(String(20), nullable=False)  # source, transform, destination
    step_name = Column(String(255), nullable=False)
    step_config = Column(JSON, default=dict)
    
    # For source steps - connector reference
    source_connector_id = Column(UUID(as_uuid=True), ForeignKey("connectors.id"))
    
    # For transform steps
    transformation_type = Column(String(50))  # filter, map, aggregate, etc.
    transformation_config = Column(JSON, default=dict)
    
    # For destination steps  
    destination_connector_id = Column(UUID(as_uuid=True), ForeignKey("connectors.id"))
    
    # Validation and preview
    is_valid = Column(Boolean, default=True)
    validation_errors = Column(JSON, default=list)
    preview_data = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    pipeline = relationship("Pipeline", back_populates="steps")
    source_connector = relationship("Connector", foreign_keys=[source_connector_id], back_populates="source_steps")
    destination_connector = relationship("Connector", foreign_keys=[destination_connector_id], back_populates="destination_steps")
    
    __table_args__ = (
        UniqueConstraint('pipeline_id', 'step_order', name='unique_step_order_per_pipeline'),
    )


class PipelineExecution(Base):
    """Pipeline execution history and tracking"""
    __tablename__ = "pipeline_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("pipelines.id"), nullable=False)
    
    # Execution metadata
    execution_number = Column(Integer, nullable=False)  # Sequential execution number
    status = Column(String(20), default=PipelineStatus.RUNNING.value)
    
    # Execution details
    started_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    trigger_type = Column(String(50))  # manual, scheduled, api
    
    # Progress tracking
    total_steps = Column(Integer, default=0)
    completed_steps = Column(Integer, default=0)
    current_step_id = Column(UUID(as_uuid=True))
    
    # Data metrics
    rows_processed = Column(Integer, default=0)
    rows_failed = Column(Integer, default=0)
    data_size_mb = Column(Integer, default=0)
    
    # Error handling
    error_message = Column(Text)
    error_details = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Execution logs and results
    execution_log = Column(JSON, default=list)
    results_summary = Column(JSON, default=dict)
    
    # Relationships
    pipeline = relationship("Pipeline", back_populates="executions")
    started_by_user = relationship("User")
    step_executions = relationship("StepExecution", back_populates="pipeline_execution", cascade="all, delete-orphan")


class StepExecution(Base):
    """Individual step execution details"""
    __tablename__ = "step_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    pipeline_execution_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_executions.id"), nullable=False)
    step_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_steps.id"), nullable=False)
    
    # Execution tracking
    status = Column(String(20), default="pending")
    step_order = Column(Integer, nullable=False)
    
    # Performance metrics
    rows_input = Column(Integer, default=0)
    rows_output = Column(Integer, default=0)
    rows_rejected = Column(Integer, default=0)
    execution_time_ms = Column(Integer, default=0)
    memory_used_mb = Column(Integer, default=0)
    
    # Error handling
    error_message = Column(Text)
    error_details = Column(JSON)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Execution details
    input_sample = Column(JSON)  # Sample of input data
    output_sample = Column(JSON)  # Sample of output data
    transformation_summary = Column(JSON)  # Summary of what was transformed
    
    # Relationships
    pipeline_execution = relationship("PipelineExecution", back_populates="step_executions")
    step = relationship("PipelineStep")


class PipelineTemplate(Base):
    """Reusable pipeline templates"""
    __tablename__ = "pipeline_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Template configuration
    template_config = Column(JSON, nullable=False)
    category = Column(String(100))  # e.g., "data-warehouse", "analytics", "migration"
    tags = Column(JSON, default=list)
    
    # Template metadata
    is_public = Column(Boolean, default=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    rating = Column(Integer, default=0)  # 1-5 star rating
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    creator = relationship("User")
    organization = relationship("Organization")