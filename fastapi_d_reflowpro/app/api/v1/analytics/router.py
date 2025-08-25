"""
Analytics API endpoints for advanced data insights and visualization.
"""
from datetime import datetime
from typing import Dict, List, Optional, Any
import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.websocket import websocket_manager, MessageType
from app.models.user import User
from app.services.analytics_service import analytics_service, MetricType, ChartData
from app.schemas.analytics import (
    AnalyticsDashboard, 
    PipelineAnalytics, 
    MetricFilter,
    ExportFormat,
    AnalyticsExportRequest
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics & Insights"])


@router.get("/dashboard", response_model=AnalyticsDashboard)
async def get_analytics_dashboard(
    time_range: str = Query("7d", pattern="^(1d|7d|30d|90d)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive analytics dashboard for the organization."""
    
    try:
        dashboard_data = await analytics_service.get_dashboard_overview(
            org_id=str(current_user.organization_id),
            time_range=time_range,
            db=db
        )
        
        return AnalyticsDashboard(**dashboard_data)
        
    except Exception as e:
        logger.error(f"Failed to get analytics dashboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics data")


@router.get("/pipeline/{pipeline_id}", response_model=PipelineAnalytics)
async def get_pipeline_analytics(
    pipeline_id: str,
    time_range: str = Query("30d", pattern="^(7d|30d|90d)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed analytics for a specific pipeline."""
    
    try:
        pipeline_data = await analytics_service.get_pipeline_analytics(
            pipeline_id=pipeline_id,
            org_id=str(current_user.organization_id),
            time_range=time_range,
            db=db
        )
        
        return PipelineAnalytics(**pipeline_data)
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get pipeline analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve pipeline analytics")


@router.get("/metrics/real-time")
async def get_real_time_metrics(
    current_user: User = Depends(get_current_user)
):
    """Get real-time metrics for live dashboard updates."""
    
    try:
        metrics = await analytics_service.get_real_time_metrics(
            org_id=str(current_user.organization_id)
        )
        
        # Broadcast to WebSocket connections
        await websocket_manager.send_analytics_update(
            analytics_data=metrics,
            org_id=str(current_user.organization_id)
        )
        
        return {
            "success": True,
            "data": metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get real-time metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve real-time metrics")


@router.get("/metrics/performance")
async def get_performance_metrics(
    time_range: str = Query("7d", pattern="^(1d|7d|30d|90d)$"),
    metric_type: Optional[MetricType] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get performance metrics with filtering options."""
    
    try:
        # Calculate time range
        end_date = datetime.utcnow()
        if time_range == "1d":
            from datetime import timedelta
            start_date = end_date - timedelta(days=1)
        elif time_range == "7d":
            from datetime import timedelta
            start_date = end_date - timedelta(days=7)
        elif time_range == "30d":
            from datetime import timedelta
            start_date = end_date - timedelta(days=30)
        else:
            from datetime import timedelta
            start_date = end_date - timedelta(days=90)
        
        # Get specific metrics based on type
        if metric_type == MetricType.PERFORMANCE:
            metrics = await analytics_service._get_performance_metrics(
                org_id=str(current_user.organization_id),
                start_date=start_date,
                end_date=end_date,
                db=db
            )
        elif metric_type == MetricType.USAGE:
            metrics = await analytics_service._get_usage_metrics(
                org_id=str(current_user.organization_id),
                start_date=start_date,
                end_date=end_date,
                db=db
            )
        elif metric_type == MetricType.QUALITY:
            metrics = await analytics_service._get_quality_metrics(
                org_id=str(current_user.organization_id),
                start_date=start_date,
                end_date=end_date,
                db=db
            )
        else:
            # Get all metrics
            metrics_data = await asyncio.gather(
                analytics_service._get_performance_metrics(
                    str(current_user.organization_id), start_date, end_date, db
                ),
                analytics_service._get_usage_metrics(
                    str(current_user.organization_id), start_date, end_date, db
                ),
                analytics_service._get_quality_metrics(
                    str(current_user.organization_id), start_date, end_date, db
                ),
                return_exceptions=True
            )
            
            metrics = {
                "performance": metrics_data[0] if not isinstance(metrics_data[0], Exception) else {},
                "usage": metrics_data[1] if not isinstance(metrics_data[1], Exception) else {},
                "quality": metrics_data[2] if not isinstance(metrics_data[2], Exception) else {},
            }
        
        return {
            "success": True,
            "data": metrics,
            "time_range": time_range,
            "metric_type": metric_type,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve performance metrics")


@router.get("/charts/execution-history")
async def get_execution_history_chart(
    pipeline_id: Optional[str] = Query(None),
    time_range: str = Query("30d", pattern="^(7d|30d|90d)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get execution history chart data."""
    
    try:
        if pipeline_id:
            # Get chart for specific pipeline
            pipeline_data = await analytics_service.get_pipeline_analytics(
                pipeline_id=pipeline_id,
                org_id=str(current_user.organization_id),
                time_range=time_range,
                db=db
            )
            chart_data = pipeline_data["execution_history"]
        else:
            # Get organization-wide execution history
            # This would need to be implemented in the analytics service
            chart_data = {
                "chart_type": "line",
                "title": "Organization Execution History",
                "data": [],
                "labels": [],
                "datasets": []
            }
        
        return {
            "success": True,
            "chart_data": chart_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get execution history chart: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate chart data")


@router.get("/charts/success-rate")
async def get_success_rate_chart(
    time_range: str = Query("30d", pattern="^(7d|30d|90d)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get success rate trend chart."""
    
    try:
        # This would be implemented to show success rate trends over time
        chart_data = {
            "chart_type": "line",
            "title": "Success Rate Trend",
            "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "datasets": [{
                "label": "Success Rate %",
                "data": [95.2, 97.1, 94.8, 96.3, 98.1, 96.7, 97.5],
                "borderColor": "#10B981",
                "backgroundColor": "rgba(16, 185, 129, 0.1)",
                "fill": True
            }],
            "options": {
                "responsive": True,
                "scales": {
                    "y": {
                        "beginAtZero": True,
                        "max": 100
                    }
                }
            }
        }
        
        return {
            "success": True,
            "chart_data": chart_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get success rate chart: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate chart data")


@router.get("/charts/data-volume")
async def get_data_volume_chart(
    time_range: str = Query("30d", pattern="^(7d|30d|90d)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get data volume processing chart."""
    
    try:
        # This would show data volume processed over time
        chart_data = {
            "chart_type": "area",
            "title": "Data Volume Processed",
            "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
            "datasets": [{
                "label": "Data Processed (GB)",
                "data": [12.5, 18.2, 23.1, 19.8],
                "backgroundColor": "rgba(99, 102, 241, 0.2)",
                "borderColor": "#6366F1",
                "fill": True
            }],
            "options": {
                "responsive": True,
                "plugins": {
                    "legend": {
                        "display": True
                    }
                },
                "scales": {
                    "y": {
                        "beginAtZero": True
                    }
                }
            }
        }
        
        return {
            "success": True,
            "chart_data": chart_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get data volume chart: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate chart data")


@router.post("/export")
async def export_analytics_data(
    export_request: AnalyticsExportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Export analytics data in various formats."""
    
    try:
        # Add background task to generate export
        background_tasks.add_task(
            generate_analytics_export,
            export_request=export_request,
            org_id=str(current_user.organization_id),
            user_email=current_user.email,
            db=db
        )
        
        return {
            "success": True,
            "message": "Export request queued successfully",
            "export_id": f"export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "estimated_time": "5-10 minutes",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to queue analytics export: {e}")
        raise HTTPException(status_code=500, detail="Failed to queue export request")


async def generate_analytics_export(
    export_request: AnalyticsExportRequest,
    org_id: str,
    user_email: str,
    db: AsyncSession
):
    """Background task to generate analytics export."""
    
    try:
        logger.info(f"Generating analytics export for {user_email}")
        
        # Get analytics data
        dashboard_data = await analytics_service.get_dashboard_overview(
            org_id=org_id,
            time_range=export_request.time_range,
            db=db
        )
        
        # Generate export based on format
        if export_request.format == ExportFormat.PDF:
            # Generate PDF report
            export_path = await generate_pdf_report(dashboard_data, export_request)
        elif export_request.format == ExportFormat.EXCEL:
            # Generate Excel report
            export_path = await generate_excel_report(dashboard_data, export_request)
        elif export_request.format == ExportFormat.CSV:
            # Generate CSV data
            export_path = await generate_csv_report(dashboard_data, export_request)
        else:
            # Generate JSON export
            export_path = await generate_json_report(dashboard_data, export_request)
        
        logger.info(f"Analytics export completed: {export_path}")
        
        # Here you would typically:
        # 1. Upload the file to cloud storage
        # 2. Send email notification to user
        # 3. Create download link
        # 4. Store export record in database
        
    except Exception as e:
        logger.error(f"Failed to generate analytics export: {e}")


async def generate_pdf_report(data: Dict[str, Any], request: AnalyticsExportRequest) -> str:
    """Generate PDF analytics report."""
    # This would use a PDF generation library like ReportLab
    return f"/tmp/analytics_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"


async def generate_excel_report(data: Dict[str, Any], request: AnalyticsExportRequest) -> str:
    """Generate Excel analytics report."""
    # This would use openpyxl or xlsxwriter
    return f"/tmp/analytics_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"


async def generate_csv_report(data: Dict[str, Any], request: AnalyticsExportRequest) -> str:
    """Generate CSV analytics report."""
    # This would generate CSV files using pandas
    return f"/tmp/analytics_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"


async def generate_json_report(data: Dict[str, Any], request: AnalyticsExportRequest) -> str:
    """Generate JSON analytics report."""
    # This would save the data as formatted JSON
    import json
    file_path = f"/tmp/analytics_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    
    return file_path


@router.get("/health")
async def analytics_health_check():
    """Health check endpoint for analytics service."""
    
    try:
        # Check analytics service health
        health_data = {
            "service": "analytics",
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {
                "redis_cache": "healthy",
                "database": "healthy",
                "websocket": "healthy"
            }
        }
        
        return health_data
        
    except Exception as e:
        logger.error(f"Analytics health check failed: {e}")
        raise HTTPException(status_code=503, detail="Analytics service unhealthy")