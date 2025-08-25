"""
Advanced Analytics Service for comprehensive data insights and visualization.
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import json
from dataclasses import dataclass
from enum import Enum
import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.orm import selectinload
import logging

from app.models.user import User, Organization
from app.models.pipeline import ETLPipeline, PipelineExecution, ExecutionStatus, PipelineStatus
from app.models.connector import DataConnector, ConnectorStatus
from app.core.database import get_db
from app.core.redis import redis_manager
from app.core.cache_manager import cache_result

logger = logging.getLogger(__name__)


class MetricType(str, Enum):
    """Types of analytics metrics."""
    PERFORMANCE = "performance"
    USAGE = "usage"
    QUALITY = "quality"
    TRENDS = "trends"
    FINANCIAL = "financial"


@dataclass
class AnalyticsMetric:
    """Individual analytics metric."""
    name: str
    value: float
    unit: str
    change_percentage: Optional[float] = None
    trend: Optional[str] = None  # up, down, stable
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


@dataclass
class ChartData:
    """Chart visualization data."""
    chart_type: str  # line, bar, pie, donut, area, scatter
    title: str
    data: List[Dict[str, Any]]
    labels: List[str]
    datasets: List[Dict[str, Any]]
    options: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.options is None:
            self.options = {}


class AnalyticsService:
    """Advanced analytics service with real-time capabilities."""
    
    def __init__(self):
        self.cache_ttl = 300  # 5 minutes cache
        self.real_time_metrics = {}
        
    async def get_dashboard_overview(
        self, 
        org_id: str, 
        time_range: str = "7d",
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get comprehensive dashboard overview."""
        cache_key = f"dashboard_overview:{org_id}:{time_range}"
        
        # Try cache first
        cached_data = await redis_manager.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # Calculate time range
        end_date = datetime.utcnow()
        start_date = self._calculate_start_date(end_date, time_range)
        
        # Get metrics in parallel
        overview_data = await asyncio.gather(
            self._get_performance_metrics(org_id, start_date, end_date, db),
            self._get_usage_metrics(org_id, start_date, end_date, db),
            self._get_quality_metrics(org_id, start_date, end_date, db),
            self._get_financial_metrics(org_id, start_date, end_date, db),
            return_exceptions=True
        )
        
        # Process results
        result = {
            "organization_id": org_id,
            "time_range": time_range,
            "generated_at": datetime.utcnow().isoformat(),
            "performance_metrics": overview_data[0] if not isinstance(overview_data[0], Exception) else {},
            "usage_metrics": overview_data[1] if not isinstance(overview_data[1], Exception) else {},
            "quality_metrics": overview_data[2] if not isinstance(overview_data[2], Exception) else {},
            "financial_metrics": overview_data[3] if not isinstance(overview_data[3], Exception) else {},
        }
        
        # Cache result
        await redis_manager.set(cache_key, json.dumps(result, default=str), ex=self.cache_ttl)
        
        return result
    
    @cache_result(key_prefix="analytics.performance", ttl=300, l2_ttl=1800)
    async def _get_performance_metrics(
        self, 
        org_id: str, 
        start_date: datetime, 
        end_date: datetime,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get pipeline performance metrics."""
        
        # Query pipeline executions
        result = await db.execute(
            select(PipelineExecution)
            .join(ETLPipeline)
            .where(
                and_(
                    ETLPipeline.organization_id == org_id,
                    PipelineExecution.started_at.between(start_date, end_date)
                )
            )
            .options(selectinload(PipelineExecution.pipeline))
        )
        executions = result.scalars().all()
        
        if not executions:
            return {
                "total_executions": 0,
                "success_rate": 0.0,
                "average_duration": 0.0,
                "data_processed_gb": 0.0,
                "active_pipelines": 0
            }
        
        # Calculate metrics
        successful_executions = [e for e in executions if e.status == ExecutionStatus.COMPLETED]
        failed_executions = [e for e in executions if e.status == ExecutionStatus.FAILED]
        
        total_executions = len(executions)
        success_rate = len(successful_executions) / total_executions if total_executions > 0 else 0
        
        # Calculate average duration
        completed_executions = [e for e in executions if e.completed_at and e.started_at]
        if completed_executions:
            durations = [(e.completed_at - e.started_at).total_seconds() for e in completed_executions]
            average_duration = sum(durations) / len(durations)
        else:
            average_duration = 0.0
        
        # Calculate data processed
        total_rows = sum(e.rows_processed or 0 for e in executions)
        # Estimate GB (assuming average row size of 1KB)
        data_processed_gb = (total_rows * 1024) / (1024 ** 3)
        
        # Count active pipelines
        active_pipelines_result = await db.execute(
            select(func.count(ETLPipeline.id))
            .where(
                and_(
                    ETLPipeline.organization_id == org_id,
                    ETLPipeline.status == PipelineStatus.ACTIVE
                )
            )
        )
        active_pipelines = active_pipelines_result.scalar() or 0
        
        return {
            "total_executions": total_executions,
            "successful_executions": len(successful_executions),
            "failed_executions": len(failed_executions),
            "success_rate": round(success_rate * 100, 2),
            "average_duration": round(average_duration, 2),
            "data_processed_gb": round(data_processed_gb, 3),
            "active_pipelines": active_pipelines,
            "performance_trend": await self._calculate_trend(executions, "success_rate")
        }
    
    @cache_result(key_prefix="analytics.usage", ttl=600, l2_ttl=3600)
    async def _get_usage_metrics(
        self, 
        org_id: str, 
        start_date: datetime, 
        end_date: datetime,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get system usage metrics."""
        
        # Pipeline usage
        pipeline_result = await db.execute(
            select(func.count(ETLPipeline.id))
            .where(ETLPipeline.organization_id == org_id)
        )
        total_pipelines = pipeline_result.scalar() or 0
        
        # Connector usage
        connector_result = await db.execute(
            select(func.count(DataConnector.id))
            .where(DataConnector.organization_id == org_id)
        )
        total_connectors = connector_result.scalar() or 0
        
        # User activity
        user_result = await db.execute(
            select(func.count(User.id))
            .where(User.organization_id == org_id, User.is_active == True)
        )
        active_users = user_result.scalar() or 0
        
        # API usage (from cache/logs if available)
        api_calls = await self._get_api_usage_from_cache(org_id, start_date, end_date)
        
        return {
            "total_pipelines": total_pipelines,
            "total_connectors": total_connectors,
            "active_users": active_users,
            "api_calls_count": api_calls,
            "resource_utilization": await self._get_resource_utilization(org_id)
        }
    
    @cache_result(key_prefix="analytics.quality", ttl=300, l2_ttl=1800)
    async def _get_quality_metrics(
        self, 
        org_id: str, 
        start_date: datetime, 
        end_date: datetime,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get data quality metrics."""
        
        # Get pipeline executions with error data
        result = await db.execute(
            select(PipelineExecution)
            .join(ETLPipeline)
            .where(
                and_(
                    ETLPipeline.organization_id == org_id,
                    PipelineExecution.started_at.between(start_date, end_date)
                )
            )
        )
        executions = result.scalars().all()
        
        if not executions:
            return {
                "data_quality_score": 100.0,
                "error_rate": 0.0,
                "data_completeness": 100.0,
                "validation_failures": 0
            }
        
        total_rows = sum(e.rows_processed or 0 for e in executions)
        failed_rows = sum(e.rows_failed or 0 for e in executions)
        
        if total_rows > 0:
            error_rate = (failed_rows / total_rows) * 100
            data_quality_score = max(0, 100 - error_rate)
            data_completeness = ((total_rows - failed_rows) / total_rows) * 100
        else:
            error_rate = 0.0
            data_quality_score = 100.0
            data_completeness = 100.0
        
        validation_failures = len([e for e in executions if e.status == ExecutionStatus.FAILED])
        
        return {
            "data_quality_score": round(data_quality_score, 2),
            "error_rate": round(error_rate, 4),
            "data_completeness": round(data_completeness, 2),
            "validation_failures": validation_failures,
            "total_rows_processed": total_rows,
            "failed_rows": failed_rows
        }
    
    async def _get_financial_metrics(
        self, 
        org_id: str, 
        start_date: datetime, 
        end_date: datetime,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get financial and cost metrics."""
        
        # Get organization for plan info
        org_result = await db.execute(
            select(Organization).where(Organization.id == org_id)
        )
        organization = org_result.scalar_one_or_none()
        
        if not organization:
            return {}
        
        # Calculate compute costs (simplified estimation)
        executions_result = await db.execute(
            select(PipelineExecution)
            .join(ETLPipeline)
            .where(
                and_(
                    ETLPipeline.organization_id == org_id,
                    PipelineExecution.started_at.between(start_date, end_date),
                    PipelineExecution.completed_at.isnot(None)
                )
            )
        )
        executions = executions_result.scalars().all()
        
        # Estimate costs based on execution time and data processed
        total_compute_minutes = 0
        for execution in executions:
            if execution.started_at and execution.completed_at:
                duration = (execution.completed_at - execution.started_at).total_seconds() / 60
                total_compute_minutes += duration
        
        # Cost estimation (example rates)
        compute_cost_per_minute = 0.01  # $0.01 per minute
        storage_cost_estimate = 0.023  # $0.023 per GB per month (S3 standard)
        
        estimated_compute_cost = total_compute_minutes * compute_cost_per_minute
        estimated_storage_cost = 0  # Would need storage data
        
        return {
            "plan_type": organization.plan_type,
            "total_compute_minutes": round(total_compute_minutes, 2),
            "estimated_compute_cost": round(estimated_compute_cost, 2),
            "estimated_storage_cost": estimated_storage_cost,
            "cost_per_execution": round(estimated_compute_cost / len(executions), 4) if executions else 0,
            "usage_efficiency": await self._calculate_usage_efficiency(org_id, executions)
        }
    
    async def get_pipeline_analytics(
        self, 
        pipeline_id: str, 
        org_id: str,
        time_range: str = "30d",
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get detailed analytics for a specific pipeline."""
        
        end_date = datetime.utcnow()
        start_date = self._calculate_start_date(end_date, time_range)
        
        # Get pipeline with executions
        result = await db.execute(
            select(ETLPipeline)
            .where(
                and_(
                    ETLPipeline.id == pipeline_id,
                    ETLPipeline.organization_id == org_id
                )
            )
            .options(selectinload(ETLPipeline.executions))
        )
        pipeline = result.scalar_one_or_none()
        
        if not pipeline:
            raise ValueError("Pipeline not found")
        
        # Filter executions by time range
        executions = [
            e for e in pipeline.executions 
            if e.started_at and start_date <= e.started_at <= end_date
        ]
        
        # Generate analytics
        return {
            "pipeline_id": pipeline_id,
            "pipeline_name": pipeline.name,
            "time_range": time_range,
            "execution_history": await self._get_execution_history_chart(executions),
            "performance_trends": await self._get_performance_trends_chart(executions),
            "success_rate_over_time": await self._get_success_rate_chart(executions),
            "data_volume_chart": await self._get_data_volume_chart(executions),
            "error_analysis": await self._get_error_analysis(executions),
            "recommendations": await self._generate_pipeline_recommendations(pipeline, executions)
        }
    
    async def _get_execution_history_chart(self, executions: List) -> ChartData:
        """Generate execution history chart data."""
        
        # Group executions by day
        daily_counts = {}
        for execution in executions:
            if execution.started_at:
                date_key = execution.started_at.strftime("%Y-%m-%d")
                if date_key not in daily_counts:
                    daily_counts[date_key] = {"completed": 0, "failed": 0, "running": 0}
                
                if execution.status == ExecutionStatus.COMPLETED:
                    daily_counts[date_key]["completed"] += 1
                elif execution.status == ExecutionStatus.FAILED:
                    daily_counts[date_key]["failed"] += 1
                else:
                    daily_counts[date_key]["running"] += 1
        
        # Sort by date
        sorted_dates = sorted(daily_counts.keys())
        
        return ChartData(
            chart_type="bar",
            title="Pipeline Execution History",
            labels=sorted_dates,
            data=[daily_counts[date] for date in sorted_dates],
            datasets=[
                {
                    "label": "Completed",
                    "data": [daily_counts[date]["completed"] for date in sorted_dates],
                    "backgroundColor": "#10B981"
                },
                {
                    "label": "Failed", 
                    "data": [daily_counts[date]["failed"] for date in sorted_dates],
                    "backgroundColor": "#EF4444"
                },
                {
                    "label": "Running",
                    "data": [daily_counts[date]["running"] for date in sorted_dates], 
                    "backgroundColor": "#F59E0B"
                }
            ],
            options={
                "responsive": True,
                "scales": {
                    "y": {"beginAtZero": True}
                }
            }
        )
    
    def _calculate_start_date(self, end_date: datetime, time_range: str) -> datetime:
        """Calculate start date based on time range."""
        if time_range == "1d":
            return end_date - timedelta(days=1)
        elif time_range == "7d":
            return end_date - timedelta(days=7)
        elif time_range == "30d":
            return end_date - timedelta(days=30)
        elif time_range == "90d":
            return end_date - timedelta(days=90)
        else:
            return end_date - timedelta(days=7)
    
    async def _calculate_trend(self, data: List, metric: str) -> str:
        """Calculate trend for a metric."""
        if len(data) < 2:
            return "stable"
        
        # Simple trend calculation based on recent vs older data
        mid_point = len(data) // 2
        recent_avg = len([d for d in data[mid_point:] if hasattr(d, 'status') and d.status == ExecutionStatus.COMPLETED]) / max(1, len(data[mid_point:]))
        older_avg = len([d for d in data[:mid_point] if hasattr(d, 'status') and d.status == ExecutionStatus.COMPLETED]) / max(1, mid_point)
        
        if recent_avg > older_avg * 1.05:
            return "up"
        elif recent_avg < older_avg * 0.95:
            return "down"
        else:
            return "stable"
    
    async def _get_api_usage_from_cache(self, org_id: str, start_date: datetime, end_date: datetime) -> int:
        """Get API usage from cache/logs."""
        # This would integrate with your API monitoring system
        # For now, return a mock value
        return 1500
    
    async def _get_resource_utilization(self, org_id: str) -> Dict[str, float]:
        """Get resource utilization metrics."""
        # This would integrate with your infrastructure monitoring
        return {
            "cpu_usage": 65.2,
            "memory_usage": 78.5,
            "storage_usage": 45.8,
            "network_io": 23.4
        }
    
    async def _calculate_usage_efficiency(self, org_id: str, executions: List) -> float:
        """Calculate usage efficiency score."""
        if not executions:
            return 0.0
        
        successful_executions = [e for e in executions if e.status == ExecutionStatus.COMPLETED]
        return (len(successful_executions) / len(executions)) * 100
    
    async def get_real_time_metrics(self, org_id: str) -> Dict[str, Any]:
        """Get real-time metrics for live dashboard updates."""
        
        # This would integrate with your real-time monitoring system
        metrics = {
            "active_executions": await self._count_active_executions(org_id),
            "queue_length": await self._get_execution_queue_length(org_id),
            "current_throughput": await self._calculate_current_throughput(org_id),
            "system_health": await self._get_system_health_score(org_id),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return metrics
    
    async def _count_active_executions(self, org_id: str) -> int:
        """Count currently running pipeline executions."""
        # Mock implementation - would query actual running processes
        return 3
    
    async def _get_execution_queue_length(self, org_id: str) -> int:
        """Get number of queued pipeline executions.""" 
        # Mock implementation - would check job queue
        return 5
    
    async def _calculate_current_throughput(self, org_id: str) -> float:
        """Calculate current data processing throughput."""
        # Mock implementation - would calculate based on recent activity
        return 125.6  # rows per second
    
    async def _get_system_health_score(self, org_id: str) -> float:
        """Get overall system health score."""
        # Mock implementation - would aggregate various health checks
        return 98.5


# Global analytics service instance
analytics_service = AnalyticsService()