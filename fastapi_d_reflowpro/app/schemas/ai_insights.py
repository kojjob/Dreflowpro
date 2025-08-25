"""
Pydantic schemas for AI Insights API.
"""
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class InsightTypeEnum(str, Enum):
    """Types of AI insights."""
    ANOMALY = "anomaly"
    OPTIMIZATION = "optimization"
    PREDICTION = "prediction"
    PATTERN = "pattern"
    RECOMMENDATION = "recommendation"
    ALERT = "alert"


class InsightSeverityEnum(str, Enum):
    """Severity levels for insights."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AIInsightBase(BaseModel):
    """Base AI insight schema."""
    title: str
    description: str
    insight_type: InsightTypeEnum
    severity: InsightSeverityEnum
    confidence_score: float = Field(ge=0, le=100)


class AIInsightCreate(AIInsightBase):
    """Schema for creating AI insights."""
    context_data: Optional[Dict[str, Any]] = None
    recommended_actions: Optional[List[str]] = None
    estimated_impact: Optional[str] = None
    implementation_effort: Optional[str] = None


class AIInsightResponse(AIInsightBase):
    """Schema for AI insight responses."""
    id: str
    organization_id: str
    pipeline_id: Optional[str] = None
    execution_id: Optional[str] = None
    context_data: Optional[Dict[str, Any]] = None
    recommended_actions: Optional[List[str]] = None
    estimated_impact: Optional[str] = None
    implementation_effort: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnomalyDetectionResponse(BaseModel):
    """Schema for anomaly detection responses."""
    metric_name: str
    current_value: float
    expected_value: float
    anomaly_score: float
    severity: InsightSeverityEnum
    description: str
    context: Optional[Dict[str, Any]] = None
    detected_at: datetime = Field(default_factory=datetime.utcnow)


class PredictionResponse(BaseModel):
    """Schema for prediction responses."""
    prediction_type: str
    pipeline_id: Optional[str] = None
    pipeline_name: Optional[str] = None
    predicted_value: float
    confidence_score: float = Field(ge=0, le=100)
    prediction_horizon: str
    unit: str
    description: str
    confidence_interval: Optional[List[float]] = None
    features_used: Optional[List[str]] = None


class PatternDiscoveryResponse(BaseModel):
    """Schema for pattern discovery responses."""
    pattern_type: str
    pattern_name: str
    description: str
    confidence_score: float = Field(ge=0, le=1)
    pattern_data: Dict[str, Any]
    affected_entities: Optional[List[str]] = None
    discovered_at: datetime = Field(default_factory=datetime.utcnow)


class RecommendationResponse(BaseModel):
    """Schema for recommendation responses."""
    title: str
    description: str
    category: str
    impact: str  # High, Medium, Low
    effort: str  # High, Medium, Low
    estimated_improvement: str
    implementation_steps: List[str]
    estimated_savings: Optional[str] = None


class AIInsightsSummaryResponse(BaseModel):
    """Schema for AI insights summary."""
    organization_id: str
    generated_at: datetime
    time_range: str
    summary: Dict[str, int]
    performance_metrics: Dict[str, Any]


class ComprehensiveInsightsResponse(BaseModel):
    """Schema for comprehensive AI insights response."""
    organization_id: str
    generated_at: datetime
    time_range: str
    summary: Dict[str, int]
    anomalies: List[AnomalyDetectionResponse]
    predictions: List[PredictionResponse]
    patterns: List[PatternDiscoveryResponse]
    recommendations: List[RecommendationResponse]
    performance_metrics: Dict[str, Any]


class PipelineAnalysisResponse(BaseModel):
    """Schema for pipeline-specific analysis."""
    pipeline_id: str
    time_range: str
    analysis_timestamp: datetime
    anomalies: Dict[str, Any]
    predictions: Dict[str, Any]
    patterns: Dict[str, Any]
    overall_health_score: float = Field(ge=0, le=100)
    recommendations: List[str]


class AIPerformanceMetrics(BaseModel):
    """Schema for AI system performance metrics."""
    total_insights_generated: int
    average_confidence_score: float
    high_confidence_insights: int
    critical_insights_detected: int
    insights_by_type: Dict[str, int]


class RealTimeInsightUpdate(BaseModel):
    """Schema for real-time insight updates."""
    type: str = "insights_update"
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WebSocketMessage(BaseModel):
    """Schema for WebSocket messages."""
    type: str
    organization_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class HealthCheckResponse(BaseModel):
    """Schema for AI health check response."""
    ai_service_status: str
    features_available: List[str]
    timestamp: datetime = Field(default_factory=datetime.utcnow)