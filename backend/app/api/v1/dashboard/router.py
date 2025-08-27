"""
Dashboard API endpoints for overview statistics and metrics.
"""
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.pipeline import ETLPipeline, PipelineExecution, PipelineStatus, ExecutionStatus
from app.models.connector import DataConnector, ConnectorStatus
from app.models.report import GeneratedReport, ReportStatus
from app.schemas.dashboard import DashboardStats, PipelineStats, ConnectorStats, TaskStats, SystemStats, ActivityItem
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    time_range: str = Query("7d", pattern="^(1d|7d|30d|90d)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive dashboard statistics.
    
    Returns key metrics for the dashboard overview including:
    - Pipeline statistics
    - Execution metrics
    - Data connector status
    - Report generation stats
    - System health indicators
    """
    
    try:
        # Calculate time range
        time_ranges = {
            "1d": timedelta(days=1),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30),
            "90d": timedelta(days=90)
        }
        
        start_date = datetime.utcnow() - time_ranges[time_range]
        org_id = current_user.organization_id
        
        # Get pipeline statistics
        pipeline_stats = await _get_pipeline_stats(db, org_id, start_date)
        
        # Get execution statistics
        execution_stats = await _get_execution_stats(db, org_id, start_date)
        
        # Get connector statistics
        connector_stats = await _get_connector_stats(db, org_id)
        
        # Get report statistics
        report_stats = await _get_report_stats(db, org_id, start_date)
        
        # Get task statistics
        task_stats = await _get_task_stats(db, org_id, start_date)
        
        # Get system statistics
        system_stats = await _get_system_stats()
        
        # Get recent activity
        activity_items = await _get_recent_activity(db, org_id)
        
        return DashboardStats(
            pipelines=PipelineStats(
                total=pipeline_stats["total"],
                active=pipeline_stats["active"],
                running=execution_stats.get("running", 0),
                failed=execution_stats["failed"],
                scheduled=pipeline_stats.get("scheduled", 0)
            ),
            connectors=ConnectorStats(
                total=connector_stats["total"],
                connected=connector_stats["active"],
                disconnected=connector_stats["total"] - connector_stats["active"],
                error=0  # TODO: Implement error state tracking
            ),
            tasks=TaskStats(
                total=task_stats["total"],
                completed=task_stats["completed"],
                running=task_stats.get("running", 0),
                failed=task_stats.get("failed", 0),
                pending=task_stats.get("pending", 0)
            ),
            system=SystemStats(
                cpu_usage=system_stats["cpu_usage"],
                memory_usage=system_stats["memory_usage"],
                disk_usage=system_stats["disk_usage"],
                uptime=system_stats["uptime"]
            ),
            recent_activity=activity_items
        )
        
    except Exception as e:
        logger.error(f"Failed to get dashboard stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard statistics")


async def _get_pipeline_stats(db: AsyncSession, org_id: str, start_date: datetime) -> Dict[str, Any]:
    """Get pipeline statistics."""
    
    # Total pipelines
    total_result = await db.execute(
        select(func.count(ETLPipeline.id))
        .where(ETLPipeline.organization_id == org_id)
    )
    total = total_result.scalar() or 0
    
    # Active pipelines
    active_result = await db.execute(
        select(func.count(ETLPipeline.id))
        .where(
            and_(
                ETLPipeline.organization_id == org_id,
                ETLPipeline.status == PipelineStatus.ACTIVE
            )
        )
    )
    active = active_result.scalar() or 0
    
    return {
        "total": total,
        "active": active
    }


async def _get_execution_stats(db: AsyncSession, org_id: str, start_date: datetime) -> Dict[str, Any]:
    """Get execution statistics."""
    
    # Total executions in time range
    total_result = await db.execute(
        select(func.count(PipelineExecution.id))
        .join(ETLPipeline)
        .where(
            and_(
                ETLPipeline.organization_id == org_id,
                PipelineExecution.started_at >= start_date
            )
        )
    )
    total = total_result.scalar() or 0
    
    # Successful executions
    successful_result = await db.execute(
        select(func.count(PipelineExecution.id))
        .join(ETLPipeline)
        .where(
            and_(
                ETLPipeline.organization_id == org_id,
                PipelineExecution.started_at >= start_date,
                PipelineExecution.status == ExecutionStatus.COMPLETED
            )
        )
    )
    successful = successful_result.scalar() or 0
    
    # Failed executions
    failed_result = await db.execute(
        select(func.count(PipelineExecution.id))
        .join(ETLPipeline)
        .where(
            and_(
                ETLPipeline.organization_id == org_id,
                PipelineExecution.started_at >= start_date,
                PipelineExecution.status == ExecutionStatus.FAILED
            )
        )
    )
    failed = failed_result.scalar() or 0
    
    # Calculate success rate
    success_rate = round((successful / total * 100) if total > 0 else 0, 1)
    
    return {
        "total": total,
        "successful": successful,
        "failed": failed,
        "success_rate": success_rate
    }


async def _get_connector_stats(db: AsyncSession, org_id: str) -> Dict[str, Any]:
    """Get data connector statistics."""
    
    # Total connectors
    total_result = await db.execute(
        select(func.count(DataConnector.id))
        .where(DataConnector.organization_id == org_id)
    )
    total = total_result.scalar() or 0
    
    # Active connectors
    active_result = await db.execute(
        select(func.count(DataConnector.id))
        .where(
            and_(
                DataConnector.organization_id == org_id,
                DataConnector.status == ConnectorStatus.ACTIVE
            )
        )
    )
    active = active_result.scalar() or 0
    
    return {
        "total": total,
        "active": active
    }


async def _get_report_stats(db: AsyncSession, org_id: str, start_date: datetime) -> Dict[str, Any]:
    """Get report generation statistics."""
    
    # Total reports in time range
    total_result = await db.execute(
        select(func.count(GeneratedReport.id))
        .where(
            and_(
                GeneratedReport.organization_id == org_id,
                GeneratedReport.created_at >= start_date
            )
        )
    )
    total = total_result.scalar() or 0
    
    # Completed reports
    completed_result = await db.execute(
        select(func.count(GeneratedReport.id))
        .where(
            and_(
                GeneratedReport.organization_id == org_id,
                GeneratedReport.created_at >= start_date,
                GeneratedReport.status == ReportStatus.COMPLETED
            )
        )
    )
    completed = completed_result.scalar() or 0
    
    return {
        "total": total,
        "completed": completed
    }


async def _get_task_stats(db: AsyncSession, org_id: str, start_date: datetime) -> Dict[str, Any]:
    """Get task/background job statistics."""
    # For now, return mock data as we don't have a task tracking system yet
    return {
        "total": 0,
        "completed": 0,
        "running": 0,
        "failed": 0,
        "pending": 0
    }


async def _get_system_stats() -> Dict[str, Any]:
    """Get system performance statistics."""
    import psutil
    import time
    
    # Get system metrics
    cpu_usage = psutil.cpu_percent()
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    boot_time = psutil.boot_time()
    uptime = int(time.time() - boot_time)
    
    return {
        "cpu_usage": round(cpu_usage, 1),
        "memory_usage": round(memory.percent, 1),
        "disk_usage": round(disk.percent, 1),
        "uptime": uptime
    }


async def _get_recent_activity(db: AsyncSession, org_id: str) -> List[ActivityItem]:
    """Get recent activity items."""
    # For now, return sample activity data
    # In a real implementation, this would fetch from an activity log table
    import uuid
    
    activities = []
    
    # Add some recent pipeline executions as activities
    recent_executions = await db.execute(
        select(PipelineExecution, ETLPipeline.name)
        .join(ETLPipeline)
        .where(
            and_(
                ETLPipeline.organization_id == org_id,
                PipelineExecution.started_at >= datetime.utcnow() - timedelta(hours=24)
            )
        )
        .order_by(PipelineExecution.started_at.desc())
        .limit(5)
    )
    
    for execution, pipeline_name in recent_executions:
        status_map = {
            ExecutionStatus.COMPLETED: "success",
            ExecutionStatus.FAILED: "error",
            ExecutionStatus.RUNNING: "info",
            ExecutionStatus.PENDING: "warning"
        }
        
        activities.append(ActivityItem(
            id=str(execution.id),
            type="pipeline_execution",
            message=f"Pipeline '{pipeline_name}' {execution.status.value}",
            timestamp=execution.started_at.isoformat(),
            status=status_map.get(execution.status, "info")
        ))
    
    return activities


def _calculate_health_score(execution_stats: Dict[str, Any], connector_stats: Dict[str, Any]) -> float:
    """Calculate overall system health score."""
    
    # Base score from execution success rate
    execution_score = execution_stats["success_rate"]
    
    # Connector health (percentage of active connectors)
    connector_score = (
        (connector_stats["active"] / connector_stats["total"] * 100) 
        if connector_stats["total"] > 0 else 100
    )
    
    # Weighted average (execution success is more important)
    health_score = (execution_score * 0.7) + (connector_score * 0.3)
    
    return round(health_score, 1)


@router.get("/health")
async def get_dashboard_health(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get system health status for dashboard."""
    
    try:
        # Quick health check
        org_id = current_user.organization_id
        
        # Check if we can query the database
        test_result = await db.execute(select(func.count(ETLPipeline.id)).where(ETLPipeline.organization_id == org_id))
        pipeline_count = test_result.scalar() or 0
        
        return {
            "status": "healthy",
            "database": "connected",
            "pipelines_accessible": pipeline_count >= 0,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Dashboard health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/quick-stats")
async def get_quick_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get quick dashboard statistics for overview cards."""
    
    try:
        org_id = current_user.organization_id
        
        # Quick pipeline count
        pipeline_result = await db.execute(
            select(func.count(ETLPipeline.id))
            .where(ETLPipeline.organization_id == org_id)
        )
        total_pipelines = pipeline_result.scalar() or 0
        
        # Quick execution count (last 24h)
        start_date = datetime.utcnow() - timedelta(days=1)
        execution_result = await db.execute(
            select(func.count(PipelineExecution.id))
            .join(ETLPipeline)
            .where(
                and_(
                    ETLPipeline.organization_id == org_id,
                    PipelineExecution.started_at >= start_date
                )
            )
        )
        recent_executions = execution_result.scalar() or 0
        
        # Quick connector count
        connector_result = await db.execute(
            select(func.count(DataConnector.id))
            .where(DataConnector.organization_id == org_id)
        )
        total_connectors = connector_result.scalar() or 0
        
        # Quick report count (last 7 days)
        report_start = datetime.utcnow() - timedelta(days=7)
        report_result = await db.execute(
            select(func.count(GeneratedReport.id))
            .where(
                and_(
                    GeneratedReport.organization_id == org_id,
                    GeneratedReport.created_at >= report_start
                )
            )
        )
        recent_reports = report_result.scalar() or 0
        
        return {
            "total_pipelines": total_pipelines,
            "recent_executions": recent_executions,
            "total_connectors": total_connectors,
            "recent_reports": recent_reports,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get quick stats: {e}")
        return {
            "total_pipelines": 0,
            "recent_executions": 0,
            "total_connectors": 0,
            "recent_reports": 0,
            "error": "Failed to retrieve quick statistics",
            "timestamp": datetime.utcnow().isoformat()
        }
