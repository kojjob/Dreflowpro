from sqlalchemy import Column, String, DateTime, Float, Boolean, Enum, ForeignKey, Text, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
import uuid
from ..core.database import Base


class InsightType(str, PyEnum):
    """Types of AI insights."""
    ANOMALY = "anomaly"
    OPTIMIZATION = "optimization"
    PREDICTION = "prediction"
    PATTERN = "pattern"
    RECOMMENDATION = "recommendation"
    ALERT = "alert"


class InsightSeverity(str, PyEnum):
    """Severity levels for insights."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InsightStatus(str, PyEnum):
    """Status of insights."""
    ACTIVE = "active"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"
    IN_PROGRESS = "in_progress"


class AIInsight(Base):
    """AI-generated insights model."""
    __tablename__ = "ai_insights"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    insight_type = Column(Enum(InsightType), nullable=False, index=True)
    severity = Column(Enum(InsightSeverity), nullable=False, index=True)
    status = Column(Enum(InsightStatus), default=InsightStatus.ACTIVE, index=True)
    
    # Confidence score (0-100)
    confidence_score = Column(Float, nullable=False)
    
    # Context data
    context_data = Column(JSON, nullable=True)  # Additional context information
    
    # Relations
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), index=True)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"), nullable=True, index=True)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_executions.id"), nullable=True, index=True)
    
    # Recommendations
    recommended_actions = Column(JSON, nullable=True)  # List of recommended actions
    estimated_impact = Column(String(100), nullable=True)  # Impact description
    implementation_effort = Column(String(50), nullable=True)  # low, medium, high
    
    # Tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    organization = relationship("Organization")
    pipeline = relationship("ETLPipeline")
    execution = relationship("PipelineExecution")


class AIModel(Base):
    """AI Model tracking and versioning."""
    __tablename__ = "ai_models"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    model_type = Column(String(100), nullable=False)  # anomaly_detection, prediction, etc.
    version = Column(String(50), nullable=False)
    
    # Model metadata
    accuracy = Column(Float, nullable=True)
    training_data_size = Column(Integer, nullable=True)
    feature_count = Column(Integer, nullable=True)
    
    # Configuration
    model_config = Column(JSON, nullable=True)
    hyperparameters = Column(JSON, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    
    # Timestamps
    trained_at = Column(DateTime(timezone=True), nullable=True)
    deployed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AnomalyDetection(Base):
    """Anomaly detection results."""
    __tablename__ = "anomaly_detections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Context
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), index=True)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"), nullable=True, index=True)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_executions.id"), nullable=True, index=True)
    
    # Anomaly details
    anomaly_type = Column(String(100), nullable=False)  # performance, data_quality, volume, etc.
    anomaly_score = Column(Float, nullable=False)  # Higher = more anomalous
    threshold = Column(Float, nullable=False)  # Threshold used for detection
    
    # Metrics
    metric_name = Column(String(100), nullable=False)
    current_value = Column(Float, nullable=False)
    expected_value = Column(Float, nullable=True)
    deviation = Column(Float, nullable=True)  # How much it deviates from normal
    
    # Additional data
    context_data = Column(JSON, nullable=True)
    
    # Timestamps
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    organization = relationship("Organization")
    pipeline = relationship("ETLPipeline")
    execution = relationship("PipelineExecution")


class PredictionResult(Base):
    """AI prediction results."""
    __tablename__ = "prediction_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Context
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), index=True)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"), nullable=True, index=True)
    
    # Prediction details
    prediction_type = Column(String(100), nullable=False)  # execution_time, failure_risk, cost, etc.
    predicted_value = Column(Float, nullable=False)
    confidence_interval_lower = Column(Float, nullable=True)
    confidence_interval_upper = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=False)
    
    # Time context
    prediction_horizon = Column(String(50), nullable=False)  # 1h, 1d, 1w, etc.
    target_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    # Model used
    model_id = Column(UUID(as_uuid=True), ForeignKey("ai_models.id"), index=True)
    
    # Additional data
    features_used = Column(JSON, nullable=True)
    prediction_data = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    organization = relationship("Organization")
    pipeline = relationship("ETLPipeline")
    model = relationship("AIModel")


class PatternDiscovery(Base):
    """Discovered patterns in data/workflows."""
    __tablename__ = "pattern_discoveries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Context
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), index=True)
    
    # Pattern details
    pattern_type = Column(String(100), nullable=False)  # temporal, seasonal, correlation, etc.
    pattern_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Pattern strength/significance
    confidence_score = Column(Float, nullable=False)
    statistical_significance = Column(Float, nullable=True)
    
    # Pattern data
    pattern_data = Column(JSON, nullable=False)  # Detailed pattern information
    affected_entities = Column(JSON, nullable=True)  # Pipelines, connectors affected
    
    # Time context
    discovery_period_start = Column(DateTime(timezone=True), nullable=True)
    discovery_period_end = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    
    # Timestamps
    discovered_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    organization = relationship("Organization")