"""
Analytics and insights schemas for advanced data visualization.
"""
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum


class MetricType(str, Enum):
    """Types of analytics metrics."""
    PERFORMANCE = "performance"
    USAGE = "usage"
    QUALITY = "quality"
    TRENDS = "trends"
    FINANCIAL = "financial"


class TimeRange(str, Enum):
    """Time range options for analytics."""
    ONE_DAY = "1d"
    SEVEN_DAYS = "7d"
    THIRTY_DAYS = "30d"
    NINETY_DAYS = "90d"


class ChartType(str, Enum):
    """Chart visualization types."""
    LINE = "line"
    BAR = "bar"
    AREA = "area"
    PIE = "pie"
    DONUT = "donut"
    SCATTER = "scatter"
    HEATMAP = "heatmap"


class TrendDirection(str, Enum):
    """Trend direction indicators."""
    UP = "up"
    DOWN = "down"
    STABLE = "stable"


class ExportFormat(str, Enum):
    """Export format options."""
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"


class AnalyticsMetric(BaseModel):
    """Individual analytics metric."""
    name: str
    value: Union[int, float, str]
    unit: str = ""
    change_percentage: Optional[float] = None
    trend: Optional[TrendDirection] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat() if v else None
        }
    }


class ChartDataset(BaseModel):
    """Chart dataset configuration."""
    label: str
    data: List[Union[int, float]]
    backgroundColor: Optional[Union[str, List[str]]] = None
    borderColor: Optional[str] = None
    fill: Optional[bool] = None
    tension: Optional[float] = None


class ChartData(BaseModel):
    """Chart visualization data."""
    chart_type: ChartType
    title: str
    labels: List[str]
    datasets: List[ChartDataset]
    options: Optional[Dict[str, Any]] = None


class PerformanceMetrics(BaseModel):
    """Pipeline performance metrics."""
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    success_rate: float = Field(0.0, ge=0, le=100)
    average_duration: float = 0.0
    data_processed_gb: float = 0.0
    active_pipelines: int = 0
    performance_trend: Optional[TrendDirection] = None


class UsageMetrics(BaseModel):
    """System usage metrics."""
    total_pipelines: int = 0
    total_connectors: int = 0
    active_users: int = 0
    api_calls_count: int = 0
    resource_utilization: Optional[Dict[str, float]] = None


class QualityMetrics(BaseModel):
    """Data quality metrics."""
    data_quality_score: float = Field(100.0, ge=0, le=100)
    error_rate: float = Field(0.0, ge=0)
    data_completeness: float = Field(100.0, ge=0, le=100)
    validation_failures: int = 0
    total_rows_processed: int = 0
    failed_rows: int = 0


class FinancialMetrics(BaseModel):
    """Financial and cost metrics."""
    plan_type: str = "free"
    total_compute_minutes: float = 0.0
    estimated_compute_cost: float = 0.0
    estimated_storage_cost: float = 0.0
    cost_per_execution: float = 0.0
    usage_efficiency: float = 0.0


class AnalyticsDashboard(BaseModel):
    """Complete analytics dashboard data."""
    organization_id: str
    time_range: str
    generated_at: datetime
    performance_metrics: PerformanceMetrics
    usage_metrics: UsageMetrics
    quality_metrics: QualityMetrics
    financial_metrics: FinancialMetrics
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat() if v else None
        }
    }


class ExecutionHistoryPoint(BaseModel):
    """Single point in execution history."""
    date: str
    completed: int = 0
    failed: int = 0
    running: int = 0


class ErrorAnalysis(BaseModel):
    """Pipeline error analysis."""
    total_errors: int = 0
    error_categories: Dict[str, int] = {}
    most_common_error: Optional[str] = None
    error_trend: Optional[TrendDirection] = None
    recent_errors: List[str] = []


class PipelineRecommendation(BaseModel):
    """Pipeline optimization recommendation."""
    type: str = Field(..., description="Type of recommendation")
    priority: str = Field(..., pattern="^(low|medium|high|critical)$")
    title: str
    description: str
    impact: str = Field(..., description="Expected impact description")
    effort: str = Field(..., pattern="^(low|medium|high)$")
    action_items: List[str] = []


class PipelineAnalytics(BaseModel):
    """Detailed analytics for a specific pipeline."""
    pipeline_id: str
    pipeline_name: str
    time_range: str
    execution_history: ChartData
    performance_trends: Optional[ChartData] = None
    success_rate_over_time: Optional[ChartData] = None
    data_volume_chart: Optional[ChartData] = None
    error_analysis: Optional[ErrorAnalysis] = None
    recommendations: List[PipelineRecommendation] = []


class MetricFilter(BaseModel):
    """Filter options for metrics."""
    metric_type: Optional[MetricType] = None
    pipeline_ids: Optional[List[str]] = None
    connector_ids: Optional[List[str]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    status_filter: Optional[List[str]] = None
    
    @validator('date_to')
    def validate_date_range(cls, v, values):
        if v and values.get('date_from') and v < values['date_from']:
            raise ValueError('date_to must be after date_from')
        return v


class AnalyticsExportRequest(BaseModel):
    """Request for exporting analytics data."""
    format: ExportFormat
    time_range: TimeRange = TimeRange.THIRTY_DAYS
    metrics_included: List[MetricType] = Field(default_factory=lambda: [MetricType.PERFORMANCE, MetricType.USAGE])
    pipeline_ids: Optional[List[str]] = None
    include_charts: bool = True
    include_recommendations: bool = True
    recipient_email: Optional[str] = None


class RealTimeMetrics(BaseModel):
    """Real-time dashboard metrics."""
    active_executions: int = 0
    queue_length: int = 0
    current_throughput: float = 0.0
    system_health: float = Field(100.0, ge=0, le=100)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat() if v else None
        }
    }


class ComparisonMetrics(BaseModel):
    """Comparison metrics between time periods."""
    current_period: Dict[str, Any]
    previous_period: Dict[str, Any]
    changes: Dict[str, float]  # Percentage changes
    significant_changes: List[str]  # List of metrics with significant changes


class TrendAnalysis(BaseModel):
    """Trend analysis for metrics."""
    metric_name: str
    trend_direction: TrendDirection
    confidence_score: float = Field(ge=0, le=1)
    projected_value: Optional[float] = None
    trend_factors: List[str] = []


class DataQualityAlert(BaseModel):
    """Data quality alert."""
    alert_id: str
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    title: str
    description: str
    source: str
    affected_records: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    auto_resolution_available: bool = False
    suggested_actions: List[str] = []
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat() if v else None
        }
    }


class SystemHealthMetrics(BaseModel):
    """System health and performance metrics."""
    overall_health_score: float = Field(100.0, ge=0, le=100)
    component_health: Dict[str, float]
    resource_utilization: Dict[str, float]
    active_alerts: List[DataQualityAlert] = []
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat() if v else None
        }
    }


class AnalyticsQuery(BaseModel):
    """Custom analytics query."""
    query_name: str
    description: Optional[str] = None
    metrics: List[str]
    filters: Optional[MetricFilter] = None
    time_range: TimeRange = TimeRange.SEVEN_DAYS
    group_by: Optional[List[str]] = None
    sort_by: Optional[str] = None
    limit: Optional[int] = Field(None, gt=0, le=1000)


class QueryResult(BaseModel):
    """Result of a custom analytics query."""
    query_name: str
    executed_at: datetime = Field(default_factory=datetime.utcnow)
    execution_time_ms: float
    total_records: int
    data: List[Dict[str, Any]]
    aggregations: Optional[Dict[str, Any]] = None
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat() if v else None
        }
    }