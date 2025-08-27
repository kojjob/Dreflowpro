"""
Dashboard schemas for API responses.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class PipelineStats(BaseModel):
    """Pipeline statistics."""
    total: int = Field(..., description="Total number of pipelines")
    active: int = Field(..., description="Number of active pipelines")
    running: int = Field(..., description="Number of running pipelines")
    failed: int = Field(..., description="Number of failed pipelines")
    scheduled: int = Field(..., description="Number of scheduled pipelines")


class ConnectorStats(BaseModel):
    """Connector statistics."""
    total: int = Field(..., description="Total number of connectors")
    connected: int = Field(..., description="Number of connected connectors")
    disconnected: int = Field(..., description="Number of disconnected connectors")
    error: int = Field(..., description="Number of connectors in error state")


class TaskStats(BaseModel):
    """Task statistics."""
    total: int = Field(..., description="Total number of tasks")
    completed: int = Field(..., description="Number of completed tasks")
    running: int = Field(..., description="Number of running tasks")
    failed: int = Field(..., description="Number of failed tasks")
    pending: int = Field(..., description="Number of pending tasks")


class SystemStats(BaseModel):
    """System statistics."""
    cpu_usage: float = Field(..., description="CPU usage percentage")
    memory_usage: float = Field(..., description="Memory usage percentage")
    disk_usage: float = Field(..., description="Disk usage percentage")
    uptime: int = Field(..., description="System uptime in seconds")


class ActivityItem(BaseModel):
    """Recent activity item."""
    id: str = Field(..., description="Activity item ID")
    type: str = Field(..., description="Activity type")
    message: str = Field(..., description="Activity message")
    timestamp: str = Field(..., description="Activity timestamp")
    status: str = Field(..., description="Activity status")


class DashboardStats(BaseModel):
    """Dashboard statistics response model."""
    
    pipelines: PipelineStats = Field(..., description="Pipeline statistics")
    connectors: ConnectorStats = Field(..., description="Connector statistics")
    tasks: TaskStats = Field(..., description="Task statistics")
    system: SystemStats = Field(..., description="System statistics")
    recent_activity: List[ActivityItem] = Field(..., description="Recent activity items")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DashboardHealth(BaseModel):
    """Dashboard health status response."""
    
    status: str = Field(..., description="Overall health status")
    database: str = Field(..., description="Database connection status")
    pipelines_accessible: bool = Field(..., description="Whether pipelines can be accessed")
    timestamp: str = Field(..., description="Health check timestamp")
    error: Optional[str] = Field(None, description="Error message if unhealthy")


class DashboardMetric(BaseModel):
    """Individual dashboard metric."""
    
    name: str = Field(..., description="Metric name")
    value: float = Field(..., description="Metric value")
    unit: str = Field(..., description="Metric unit")
    trend: Optional[str] = Field(None, description="Trend direction (up/down/stable)")
    change_percentage: Optional[float] = Field(None, description="Percentage change from previous period")
    
    
class DashboardChart(BaseModel):
    """Dashboard chart data."""
    
    title: str = Field(..., description="Chart title")
    type: str = Field(..., description="Chart type (line/bar/pie/etc)")
    data: Dict[str, Any] = Field(..., description="Chart data")
    labels: List[str] = Field(..., description="Chart labels")
    
    
class DashboardOverview(BaseModel):
    """Comprehensive dashboard overview."""
    
    stats: DashboardStats
    metrics: List[DashboardMetric]
    charts: List[DashboardChart]
    alerts: List[Dict[str, Any]] = Field(default_factory=list, description="System alerts")
    recommendations: List[str] = Field(default_factory=list, description="System recommendations")
