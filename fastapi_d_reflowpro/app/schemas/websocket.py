"""
WebSocket and real-time streaming schemas.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field
from enum import Enum


class MessageType(str, Enum):
    """WebSocket message types."""
    PIPELINE_STATUS = "pipeline_status"
    PIPELINE_PROGRESS = "pipeline_progress"
    DATA_QUALITY_ALERT = "data_quality_alert"
    SYSTEM_NOTIFICATION = "system_notification"
    ANALYTICS_UPDATE = "analytics_update"
    ERROR_NOTIFICATION = "error_notification"
    HEARTBEAT = "heartbeat"


class WebSocketMessage(BaseModel):
    """WebSocket message schema."""
    type: MessageType
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat() if v else None
        }
    }


class StreamingEvent(BaseModel):
    """Server-Sent Events schema."""
    id: Optional[str] = None
    event: str
    data: Union[str, Dict[str, Any]]
    retry: Optional[int] = None


class PipelineStatusUpdate(BaseModel):
    """Pipeline status update message."""
    pipeline_id: str
    status: str = Field(..., description="Current pipeline status")
    progress: int = Field(..., ge=0, le=100, description="Progress percentage")
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    rows_processed: Optional[int] = None
    rows_successful: Optional[int] = None
    rows_failed: Optional[int] = None
    current_step: Optional[str] = None
    estimated_completion: Optional[datetime] = None


class DataQualityAlert(BaseModel):
    """Data quality alert message."""
    alert_id: str
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    title: str
    description: str
    source: str = Field(..., description="Source of the alert (pipeline_id, connector_id, etc.)")
    affected_records: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    details: Optional[Dict[str, Any]] = None
    suggested_actions: Optional[List[str]] = None
    auto_resolution_available: bool = False


class AnalyticsUpdate(BaseModel):
    """Real-time analytics update."""
    metric_name: str
    value: Union[int, float, str]
    change_percentage: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Common analytics metrics
    active_pipelines: Optional[int] = None
    completed_today: Optional[int] = None
    success_rate: Optional[float] = Field(None, ge=0, le=1)
    data_processed_gb: Optional[float] = None
    average_execution_time: Optional[float] = None
    error_count: Optional[int] = None


class SystemNotification(BaseModel):
    """System-wide notification."""
    notification_id: str
    type: str = Field(..., pattern="^(info|warning|error|maintenance)$")
    title: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    priority: int = Field(default=1, ge=1, le=5)
    expires_at: Optional[datetime] = None
    action_required: bool = False
    action_url: Optional[str] = None


class ConnectionStats(BaseModel):
    """WebSocket connection statistics."""
    total_connections: int
    organizations_connected: int
    connections_by_org: Dict[str, int]
    active_users: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WebSocketSubscription(BaseModel):
    """WebSocket subscription request."""
    type: str = Field(..., pattern="^(pipeline|analytics|notifications|all)$")
    pipeline_id: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


class StreamingMetrics(BaseModel):
    """Streaming performance metrics."""
    messages_sent: int = 0
    messages_failed: int = 0
    average_latency_ms: float = 0.0
    peak_concurrent_connections: int = 0
    uptime_seconds: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)