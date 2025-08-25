"""
Telemetry and performance monitoring models.
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Text, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from enum import Enum

from ..core.database import Base


class MetricType(str, Enum):
    """Types of telemetry metrics."""
    PERFORMANCE = "performance"
    RESOURCE = "resource"
    BUSINESS = "business"
    ERROR = "error"
    CUSTOM = "custom"


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TelemetryMetric(Base):
    """Store telemetry metrics for pipelines and system components."""
    __tablename__ = "telemetry_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Identification
    metric_name = Column(String(255), nullable=False, index=True)
    metric_type = Column(String(50), nullable=False, index=True)
    source_type = Column(String(100), nullable=False)  # pipeline, connector, system, etc.
    source_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Metric data
    value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=True)
    tags = Column(JSON, nullable=True)  # Additional metadata
    
    # Context
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"), nullable=True, index=True)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_executions.id"), nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    
    # Timestamps
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    pipeline = relationship("ETLPipeline", back_populates="telemetry_metrics")
    execution = relationship("PipelineExecution", back_populates="telemetry_metrics")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_telemetry_pipeline_timestamp', 'pipeline_id', 'timestamp'),
        Index('idx_telemetry_metric_timestamp', 'metric_name', 'timestamp'),
        Index('idx_telemetry_source_timestamp', 'source_type', 'source_id', 'timestamp'),
        Index('idx_telemetry_org_timestamp', 'organization_id', 'timestamp'),
    )


class PerformanceSnapshot(Base):
    """Periodic performance snapshots for trend analysis."""
    __tablename__ = "performance_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Context
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"), nullable=True, index=True)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_executions.id"), nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    
    # Performance metrics
    cpu_usage_percent = Column(Float, nullable=True)
    memory_usage_mb = Column(Float, nullable=True)
    disk_io_mb_per_sec = Column(Float, nullable=True)
    network_io_mb_per_sec = Column(Float, nullable=True)
    
    # Pipeline-specific metrics
    rows_processed = Column(Integer, nullable=True)
    rows_per_second = Column(Float, nullable=True)
    errors_count = Column(Integer, nullable=True, default=0)
    warnings_count = Column(Integer, nullable=True, default=0)
    
    # Quality metrics
    data_quality_score = Column(Float, nullable=True)
    completeness_percentage = Column(Float, nullable=True)
    accuracy_percentage = Column(Float, nullable=True)
    
    # Timestamps
    snapshot_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    pipeline = relationship("ETLPipeline")
    execution = relationship("PipelineExecution")
    
    # Indexes
    __table_args__ = (
        Index('idx_perf_snapshot_pipeline_time', 'pipeline_id', 'snapshot_at'),
        Index('idx_perf_snapshot_execution_time', 'execution_id', 'snapshot_at'),
    )


class ErrorLog(Base):
    """Detailed error logging for AI analysis."""
    __tablename__ = "error_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Error classification
    error_type = Column(String(100), nullable=False, index=True)
    error_code = Column(String(50), nullable=True, index=True)
    severity = Column(String(20), nullable=False, index=True)
    
    # Error details
    message = Column(Text, nullable=False)
    stack_trace = Column(Text, nullable=True)
    context = Column(JSON, nullable=True)  # Additional context data
    
    # Source information
    source_type = Column(String(100), nullable=False)  # pipeline, connector, transformation, etc.
    source_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    component = Column(String(255), nullable=True)  # specific component that failed
    
    # Pipeline context
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"), nullable=True, index=True)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_executions.id"), nullable=True, index=True)
    step_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_steps.id"), nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    
    # Resolution tracking
    is_resolved = Column(Boolean, nullable=False, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Timestamps
    occurred_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    pipeline = relationship("ETLPipeline")
    execution = relationship("PipelineExecution")
    step = relationship("PipelineStep")


class DataQualityMetric(Base):
    """Data quality measurements for AI insights."""
    __tablename__ = "data_quality_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Context
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"), nullable=False, index=True)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_executions.id"), nullable=True, index=True)
    step_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_steps.id"), nullable=True, index=True)
    dataset_name = Column(String(255), nullable=True, index=True)
    
    # Quality dimensions
    completeness_score = Column(Float, nullable=True)  # 0-100
    accuracy_score = Column(Float, nullable=True)      # 0-100
    consistency_score = Column(Float, nullable=True)   # 0-100
    validity_score = Column(Float, nullable=True)      # 0-100
    uniqueness_score = Column(Float, nullable=True)    # 0-100
    timeliness_score = Column(Float, nullable=True)    # 0-100
    
    # Overall score
    overall_score = Column(Float, nullable=True)       # 0-100
    
    # Detailed metrics
    total_rows = Column(Integer, nullable=True)
    null_rows = Column(Integer, nullable=True)
    duplicate_rows = Column(Integer, nullable=True)
    invalid_rows = Column(Integer, nullable=True)
    
    # Column-specific issues
    column_issues = Column(JSON, nullable=True)  # Dict of column -> issue counts
    schema_violations = Column(JSON, nullable=True)  # Schema validation issues
    
    # Timestamps
    measured_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    pipeline = relationship("ETLPipeline")
    execution = relationship("PipelineExecution")
    step = relationship("PipelineStep")


class SystemAlert(Base):
    """System-generated alerts for monitoring."""
    __tablename__ = "system_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Alert details
    alert_type = Column(String(100), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Source information
    source_type = Column(String(100), nullable=False)
    source_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Context
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"), nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    
    # Alert metadata
    conditions = Column(JSON, nullable=True)  # Conditions that triggered the alert
    suggested_actions = Column(ARRAY(String), nullable=True)  # Recommended actions
    
    # Status tracking
    is_acknowledged = Column(Boolean, nullable=False, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    is_resolved = Column(Boolean, nullable=False, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Timestamps
    triggered_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    pipeline = relationship("ETLPipeline")