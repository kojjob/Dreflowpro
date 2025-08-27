"""
Pipeline Versioning System

This module provides version control for ETL pipelines, allowing rollback,
version comparison, and pipeline evolution tracking.
"""

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..core.database import Base


class PipelineVersion(Base):
    """Pipeline version history model."""
    __tablename__ = "pipeline_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    
    # Version metadata
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    change_notes = Column(Text, nullable=True)  # What changed in this version
    
    # Complete pipeline configuration snapshot
    pipeline_config = Column(JSON, nullable=True)  # Full pipeline config at this version
    steps_config = Column(JSON, nullable=True)  # All steps configuration
    
    # Version status
    is_active = Column(Boolean, default=False)  # Currently active version
    is_published = Column(Boolean, default=False)  # Available for execution
    is_draft = Column(Boolean, default=True)  # Draft version
    
    # Change tracking
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    created_from_version = Column(Integer, nullable=True)  # Version this was created from
    
    # Performance metrics from executions
    avg_execution_time = Column(Integer, nullable=True)  # Average execution time in seconds
    success_rate = Column(Integer, nullable=True)  # Success rate percentage
    execution_count = Column(Integer, default=0)  # Number of times executed
    
    # Rollback information
    is_rollback_safe = Column(Boolean, default=True)  # Can safely rollback to this version
    rollback_notes = Column(Text, nullable=True)  # Notes about rollback considerations
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    deprecated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    pipeline = relationship("ETLPipeline", backref="versions")
    created_by = relationship("User", backref="pipeline_versions")
    executions = relationship("PipelineExecution", backref="version")
    
    # Unique constraint on pipeline_id and version_number
    __table_args__ = (
        {'postgresql_index_args': {'unique': True}, 'index': 'idx_pipeline_version_unique'},
    )


class PipelineVersionComparison(Base):
    """Track comparisons between pipeline versions."""
    __tablename__ = "pipeline_version_comparisons"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"), nullable=False, index=True)
    version_from = Column(Integer, nullable=False)
    version_to = Column(Integer, nullable=False)
    
    # Change details
    changes = Column(JSON, nullable=True)  # Detailed change log
    change_type = Column(String(50), nullable=True)  # major, minor, patch
    
    # Impact analysis
    breaking_changes = Column(Boolean, default=False)
    data_format_changes = Column(Boolean, default=False)
    performance_impact = Column(String(50), nullable=True)  # positive, negative, neutral
    
    compared_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    compared_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    pipeline = relationship("ETLPipeline")
    compared_by = relationship("User")


class PipelineCheckpoint(Base):
    """Save checkpoints for long-running pipelines."""
    __tablename__ = "pipeline_checkpoints"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"), nullable=False, index=True)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_executions.id"), nullable=False, index=True)
    version_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_versions.id"), nullable=False)
    
    # Checkpoint data
    step_index = Column(Integer, nullable=False)  # Which step completed
    checkpoint_data = Column(JSON, nullable=True)  # State data for restart
    rows_processed = Column(Integer, default=0)
    
    # Status
    is_valid = Column(Boolean, default=True)  # Can restart from this checkpoint
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # When checkpoint expires
    
    # Relationships
    pipeline = relationship("ETLPipeline")
    execution = relationship("PipelineExecution")
    version = relationship("PipelineVersion")