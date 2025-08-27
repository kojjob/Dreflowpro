"""
Dashboard schemas for API responses.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    """Dashboard statistics response model."""
    
    # Pipeline metrics
    total_pipelines: int = Field(..., description="Total number of pipelines")
    active_pipelines: int = Field(..., description="Number of active pipelines")
    
    # Execution metrics
    total_executions: int = Field(..., description="Total executions in time period")
    successful_executions: int = Field(..., description="Number of successful executions")
    failed_executions: int = Field(..., description="Number of failed executions")
    success_rate: float = Field(..., description="Execution success rate percentage")
    
    # Connector metrics
    total_connectors: int = Field(..., description="Total number of data connectors")
    active_connectors: int = Field(..., description="Number of active connectors")
    
    # Report metrics
    total_reports: int = Field(..., description="Total reports generated in time period")
    completed_reports: int = Field(..., description="Number of completed reports")
    
    # System health
    health_score: float = Field(..., description="Overall system health score (0-100)")
    
    # Metadata
    last_updated: datetime = Field(..., description="When these stats were last calculated")
    
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
