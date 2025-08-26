"""
Dashboard API endpoints for overview statistics and metrics.
"""
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.pipeline import ETLPipeline, PipelineExecution, PipelineStatus, ExecutionStatus
from app.models.connector import DataConnector
from app.models.report import GeneratedReport, ReportStatus
from app.schemas.dashboard import DashboardStats
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
        
        # Calculate overall health score
        health_score = _calculate_health_score(execution_stats, connector_stats)
        
        return DashboardStats(
            total_pipelines=pipeline_stats["total"],
            active_pipelines=pipeline_stats["active"],
            total_executions=execution_stats["total"],
            successful_executions=execution_stats["successful"],
            failed_executions=execution_stats["failed"],
            success_rate=execution_stats["success_rate"],
            total_connectors=connector_stats["total"],
            active_connectors=connector_stats["active"],
            total_reports=report_stats["total"],
            completed_reports=report_stats["completed"],
            health_score=health_score,
            last_updated=datetime.utcnow()
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
    
    # Active connectors (assuming is_active field exists)
    active_result = await db.execute(
        select(func.count(DataConnector.id))
        .where(
            and_(
                DataConnector.organization_id == org_id,
                DataConnector.is_active == True
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
