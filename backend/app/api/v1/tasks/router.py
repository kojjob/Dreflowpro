from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime, timedelta
import numpy as np
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload
from app.core.database import AsyncSessionFactory
from app.models.pipeline import PipelineExecution, ExecutionStatus
from app.models.user import User

from app.workers.celery_app import celery_app
from app.workers import (
    pipeline_tasks,
    data_processing_tasks, 
    report_generation_tasks,
    notification_tasks,
    maintenance_tasks
)
from app.core.deps import get_current_user
from app.schemas.auth import UserProfile

router = APIRouter(prefix="/tasks", tags=["Background Tasks"])


async def _get_processing_stats(session, since_date):
    """Get data processing statistics from database."""
    try:
        # Get aggregated stats for records processing
        stats_query = select(
            func.coalesce(func.sum(PipelineExecution.rows_processed), 0).label('total_processed'),
            func.coalesce(func.sum(PipelineExecution.rows_successful), 0).label('total_successful'),
            func.coalesce(func.sum(PipelineExecution.rows_failed), 0).label('total_failed')
        ).where(PipelineExecution.created_at >= since_date)
        
        result = await session.execute(stats_query)
        row = result.first()
        
        return {
            "total_records_processed": int(row.total_processed) if row.total_processed else 0,
            "successful_records": int(row.total_successful) if row.total_successful else 0,
            "failed_records": int(row.total_failed) if row.total_failed else 0
        }
    except Exception as e:
        return {
            "total_records_processed": 0,
            "successful_records": 0,
            "failed_records": 0,
            "error": str(e)
        }

@router.get("/status", response_model=Dict[str, Any])
async def get_tasks_status(current_user: UserProfile = Depends(get_current_user)):
    """Get overall status of background task system."""
    
    try:
        # Get Celery worker stats
        stats = celery_app.control.inspect().stats()
        active_tasks = celery_app.control.inspect().active()
        scheduled_tasks = celery_app.control.inspect().scheduled()
        
        # Get queue lengths
        queue_lengths = {}
        for queue_name in ["pipelines", "data_processing", "reports", "notifications"]:
            try:
                queue_length = celery_app.control.inspect().active_queues()
                queue_lengths[queue_name] = len(queue_length.get(queue_name, []))
            except:
                queue_lengths[queue_name] = 0
        
        return {
            "status": "healthy" if stats else "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "workers": {
                "active_workers": len(stats) if stats else 0,
                "worker_stats": stats or {},
                "active_tasks": active_tasks or {},
                "scheduled_tasks": scheduled_tasks or {}
            },
            "queues": queue_lengths,
            "system_info": {
                "broker_url": celery_app.conf.broker_url,
                "result_backend": celery_app.conf.result_backend,
                "task_routes": celery_app.conf.task_routes
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task status: {str(e)}")

@router.get("/task/{task_id}", response_model=Dict[str, Any])
async def get_task_status(task_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Get status of a specific task."""
    
    try:
        task_result = celery_app.AsyncResult(task_id)
        
        return {
            "task_id": task_id,
            "status": task_result.status,
            "result": task_result.result if task_result.ready() else None,
            "info": task_result.info,
            "successful": task_result.successful(),
            "failed": task_result.failed(),
            "ready": task_result.ready(),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task {task_id}: {str(e)}")

@router.delete("/task/{task_id}")
async def cancel_task(task_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Cancel a running or pending task."""
    
    try:
        celery_app.control.revoke(task_id, terminate=True, signal='SIGKILL')
        
        return {
            "message": f"Task {task_id} has been cancelled",
            "task_id": task_id,
            "cancelled_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel task {task_id}: {str(e)}")

# Pipeline Tasks Endpoints

@router.post("/pipelines/execute", response_model=Dict[str, Any])
async def execute_pipeline(
    pipeline_id: int,
    execution_params: Optional[Dict[str, Any]] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """Execute a data pipeline in background."""
    
    try:
        task = pipeline_tasks.execute_pipeline.delay(pipeline_id, execution_params)
        
        return {
            "message": "Pipeline execution started",
            "task_id": task.id,
            "pipeline_id": pipeline_id,
            "status": "queued",
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start pipeline execution: {str(e)}")

@router.post("/pipelines/{pipeline_id}/validate", response_model=Dict[str, Any])
async def validate_pipeline(pipeline_id: int, current_user: UserProfile = Depends(get_current_user)):
    """Validate pipeline configuration."""
    
    try:
        task = pipeline_tasks.validate_pipeline.delay(pipeline_id)
        
        return {
            "message": "Pipeline validation started",
            "task_id": task.id,
            "pipeline_id": pipeline_id,
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start pipeline validation: {str(e)}")

@router.post("/pipelines/{pipeline_id}/test", response_model=Dict[str, Any])
async def test_pipeline(
    pipeline_id: int,
    sample_size: int = 100,
    current_user: UserProfile = Depends(get_current_user)
):
    """Run pipeline test with sample data."""
    
    try:
        task = pipeline_tasks.test_pipeline.delay(pipeline_id, sample_size)
        
        return {
            "message": "Pipeline test started",
            "task_id": task.id,
            "pipeline_id": pipeline_id,
            "sample_size": sample_size,
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start pipeline test: {str(e)}")

# Data Processing Tasks Endpoints

@router.post("/data/process-file", response_model=Dict[str, Any])
async def process_file(
    file_path: str,
    file_type: str,
    processing_options: Optional[Dict[str, Any]] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """Process uploaded data file."""
    
    try:
        task = data_processing_tasks.process_uploaded_file.delay(
            file_path, file_type, processing_options or {}
        )
        
        return {
            "message": "File processing started",
            "task_id": task.id,
            "file_path": file_path,
            "file_type": file_type,
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start file processing: {str(e)}")

@router.post("/data/{dataset_id}/transform", response_model=Dict[str, Any])
async def transform_dataset(
    dataset_id: str,
    transformations: List[Dict[str, Any]],
    current_user: UserProfile = Depends(get_current_user)
):
    """Apply transformations to dataset."""
    
    try:
        task = data_processing_tasks.transform_dataset.delay(dataset_id, transformations)
        
        return {
            "message": "Dataset transformation started",
            "task_id": task.id,
            "dataset_id": dataset_id,
            "transformation_count": len(transformations),
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start dataset transformation: {str(e)}")

@router.post("/data/{dataset_id}/validate-schema", response_model=Dict[str, Any])
async def validate_schema(
    dataset_id: str,
    expected_schema: Dict[str, Any],
    current_user: UserProfile = Depends(get_current_user)
):
    """Validate dataset against expected schema."""
    
    try:
        task = data_processing_tasks.validate_data_schema.delay(dataset_id, expected_schema)
        
        return {
            "message": "Schema validation started",
            "task_id": task.id,
            "dataset_id": dataset_id,
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start schema validation: {str(e)}")

# Report Generation Tasks Endpoints

@router.post("/reports/executive", response_model=Dict[str, Any])
async def generate_executive_report(
    dataset_id: str,
    report_config: Optional[Dict[str, Any]] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """Generate executive-level PDF report."""
    
    try:
        task = report_generation_tasks.generate_executive_report.delay(
            dataset_id, report_config or {}
        )
        
        return {
            "message": "Executive report generation started",
            "task_id": task.id,
            "dataset_id": dataset_id,
            "report_type": "executive",
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start executive report generation: {str(e)}")

@router.post("/reports/analyst", response_model=Dict[str, Any])
async def generate_analyst_report(
    dataset_id: str,
    report_config: Optional[Dict[str, Any]] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """Generate detailed analyst report."""
    
    try:
        task = report_generation_tasks.generate_analyst_report.delay(
            dataset_id, report_config or {}
        )
        
        return {
            "message": "Analyst report generation started",
            "task_id": task.id,
            "dataset_id": dataset_id,
            "report_type": "analyst",
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start analyst report generation: {str(e)}")

@router.post("/reports/presentation", response_model=Dict[str, Any])
async def generate_presentation(
    dataset_id: str,
    presentation_config: Optional[Dict[str, Any]] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """Generate PowerPoint presentation."""
    
    try:
        task = report_generation_tasks.generate_presentation.delay(
            dataset_id, presentation_config or {}
        )
        
        return {
            "message": "Presentation generation started",
            "task_id": task.id,
            "dataset_id": dataset_id,
            "presentation_type": presentation_config.get("type", "business"),
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start presentation generation: {str(e)}")

@router.post("/reports/dashboard-export", response_model=Dict[str, Any])
async def export_dashboard(
    dashboard_id: str,
    export_config: Optional[Dict[str, Any]] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """Export dashboard to static format."""
    
    try:
        task = report_generation_tasks.generate_dashboard_export.delay(
            dashboard_id, export_config or {}
        )
        
        return {
            "message": "Dashboard export started",
            "task_id": task.id,
            "dashboard_id": dashboard_id,
            "export_format": export_config.get("format", "pdf"),
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start dashboard export: {str(e)}")

@router.post("/reports/batch", response_model=Dict[str, Any])
async def batch_generate_reports(
    report_requests: List[Dict[str, Any]],
    current_user: UserProfile = Depends(get_current_user)
):
    """Generate multiple reports in batch."""
    
    try:
        task = report_generation_tasks.batch_generate_reports.delay(report_requests)
        
        return {
            "message": "Batch report generation started",
            "task_id": task.id,
            "report_count": len(report_requests),
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start batch report generation: {str(e)}")

# Notification Tasks Endpoints

@router.post("/notifications/email", response_model=Dict[str, Any])
async def send_email(
    recipient: str,
    subject: str,
    content: Dict[str, Any],
    current_user: UserProfile = Depends(get_current_user)
):
    """Send email notification."""
    
    try:
        task = notification_tasks.send_email_notification.delay(recipient, subject, content)
        
        return {
            "message": "Email notification queued",
            "task_id": task.id,
            "recipient": recipient,
            "subject": subject,
            "queued_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue email notification: {str(e)}")

@router.post("/notifications/maintenance", response_model=Dict[str, Any])
async def send_maintenance_notification(
    maintenance_details: Dict[str, Any],
    current_user: UserProfile = Depends(get_current_user)
):
    """Send system maintenance notification to all users."""
    
    try:
        task = notification_tasks.send_system_maintenance_notification.delay(maintenance_details)
        
        return {
            "message": "Maintenance notification started",
            "task_id": task.id,
            "maintenance_start": maintenance_details.get("start_time"),
            "queued_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send maintenance notification: {str(e)}")

# Maintenance Tasks Endpoints

@router.post("/maintenance/cleanup", response_model=Dict[str, Any])
async def trigger_cleanup(current_user: UserProfile = Depends(get_current_user)):
    """Trigger system cleanup manually."""
    
    try:
        task = maintenance_tasks.cleanup_expired_tasks.delay()
        
        return {
            "message": "System cleanup started",
            "task_id": task.id,
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start system cleanup: {str(e)}")

@router.post("/maintenance/health-check", response_model=Dict[str, Any])
async def trigger_health_check(current_user: UserProfile = Depends(get_current_user)):
    """Trigger comprehensive health check."""
    
    try:
        task = maintenance_tasks.health_check.delay()
        
        return {
            "message": "Health check started",
            "task_id": task.id,
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start health check: {str(e)}")

@router.post("/maintenance/backup", response_model=Dict[str, Any])
async def trigger_backup(
    backup_config: Optional[Dict[str, Any]] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """Trigger data backup."""
    
    try:
        task = maintenance_tasks.backup_user_data.delay(backup_config or {})
        
        return {
            "message": "Data backup started",
            "task_id": task.id,
            "backup_type": backup_config.get("type", "incremental") if backup_config else "incremental",
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start data backup: {str(e)}")

@router.post("/maintenance/optimize-database", response_model=Dict[str, Any])
async def trigger_database_optimization(
    optimization_config: Optional[Dict[str, Any]] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """Trigger database optimization."""
    
    try:
        task = maintenance_tasks.optimize_database.delay(optimization_config or {})
        
        return {
            "message": "Database optimization started",
            "task_id": task.id,
            "started_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start database optimization: {str(e)}")

# Batch Operations

@router.get("/history", response_model=Dict[str, Any])
async def get_task_history(
    limit: int = 50,
    offset: int = 0,
    status_filter: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """Get task execution history."""
    
    try:
        async with AsyncSessionFactory() as session:
            # Build query for task history from pipeline executions
            query = select(PipelineExecution).options(
                selectinload(PipelineExecution.pipeline),
                selectinload(PipelineExecution.started_by)
            ).order_by(desc(PipelineExecution.created_at))
            
            # Apply status filter if provided
            if status_filter:
                if status_filter.lower() == 'completed':
                    query = query.where(PipelineExecution.status == ExecutionStatus.COMPLETED)
                elif status_filter.lower() == 'failed':
                    query = query.where(PipelineExecution.status == ExecutionStatus.FAILED)
                elif status_filter.lower() == 'running':
                    query = query.where(PipelineExecution.status == ExecutionStatus.RUNNING)
                elif status_filter.lower() == 'pending':
                    query = query.where(PipelineExecution.status == ExecutionStatus.PENDING)
            
            # Get total count for pagination
            count_query = select(func.count(PipelineExecution.id))
            if status_filter:
                if status_filter.lower() == 'completed':
                    count_query = count_query.where(PipelineExecution.status == ExecutionStatus.COMPLETED)
                elif status_filter.lower() == 'failed':
                    count_query = count_query.where(PipelineExecution.status == ExecutionStatus.FAILED)
                elif status_filter.lower() == 'running':
                    count_query = count_query.where(PipelineExecution.status == ExecutionStatus.RUNNING)
                elif status_filter.lower() == 'pending':
                    count_query = count_query.where(PipelineExecution.status == ExecutionStatus.PENDING)
            
            total_result = await session.execute(count_query)
            total_count = total_result.scalar() or 0
            
            # Apply pagination
            query = query.offset(offset).limit(limit)
            
            # Execute query
            result = await session.execute(query)
            executions = result.scalars().all()
            
            # Convert to task history format
            task_history = []
            for execution in executions:
                duration_seconds = None
                if execution.started_at and execution.completed_at:
                    duration_seconds = (execution.completed_at - execution.started_at).total_seconds()
                
                # Map execution status to task status
                task_status = "unknown"
                if execution.status == ExecutionStatus.COMPLETED:
                    task_status = "completed"
                elif execution.status == ExecutionStatus.FAILED:
                    task_status = "failed"
                elif execution.status == ExecutionStatus.RUNNING:
                    task_status = "running"
                elif execution.status == ExecutionStatus.PENDING:
                    task_status = "pending"
                elif execution.status == ExecutionStatus.CANCELLED:
                    task_status = "cancelled"
                
                task_history.append({
                    "task_id": str(execution.id),
                    "task_name": f"pipeline.execute.{execution.pipeline.name if execution.pipeline else 'unknown'}",
                    "status": task_status,
                    "started_at": execution.started_at.isoformat() if execution.started_at else None,
                    "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
                    "duration_seconds": round(duration_seconds, 2) if duration_seconds else None,
                    "user_id": execution.started_by_id,
                    "pipeline_id": str(execution.pipeline_id),
                    "rows_processed": execution.rows_processed,
                    "rows_successful": execution.rows_successful,
                    "rows_failed": execution.rows_failed,
                    "error_log": execution.error_log[:200] + "..." if execution.error_log and len(execution.error_log) > 200 else execution.error_log,
                    "trigger_type": execution.trigger_type
                })
            
            return {
                "tasks": task_history,
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total_count,
                "status_filter": status_filter
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task history: {str(e)}")

@router.get("/metrics", response_model=Dict[str, Any])
async def get_task_metrics(current_user: UserProfile = Depends(get_current_user)):
    """Get task execution metrics and statistics."""
    
    try:
        async with AsyncSessionFactory() as session:
            now = datetime.now()
            day_ago = now - timedelta(days=1)
            week_ago = now - timedelta(days=7)
            
            # Daily stats
            daily_query = select(
                func.count(PipelineExecution.id).label('total'),
                func.count().filter(PipelineExecution.status == ExecutionStatus.COMPLETED).label('completed'),
                func.count().filter(PipelineExecution.status == ExecutionStatus.FAILED).label('failed'),
                func.count().filter(PipelineExecution.status == ExecutionStatus.RUNNING).label('running'),
                func.count().filter(PipelineExecution.status == ExecutionStatus.PENDING).label('pending')
            ).where(PipelineExecution.created_at >= day_ago)
            
            daily_result = await session.execute(daily_query)
            daily_row = daily_result.first()
            
            daily_total = daily_row.total or 0
            daily_completed = daily_row.completed or 0
            daily_failed = daily_row.failed or 0
            daily_running = daily_row.running or 0
            daily_pending = daily_row.pending or 0
            daily_success_rate = (daily_completed / daily_total * 100) if daily_total > 0 else 0
            
            # Weekly stats
            weekly_query = select(
                func.count(PipelineExecution.id).label('total'),
                func.count().filter(PipelineExecution.status == ExecutionStatus.COMPLETED).label('completed'),
                func.count().filter(PipelineExecution.status == ExecutionStatus.FAILED).label('failed'),
                func.count().filter(PipelineExecution.status == ExecutionStatus.RUNNING).label('running'),
                func.count().filter(PipelineExecution.status == ExecutionStatus.PENDING).label('pending')
            ).where(PipelineExecution.created_at >= week_ago)
            
            weekly_result = await session.execute(weekly_query)
            weekly_row = weekly_result.first()
            
            weekly_total = weekly_row.total or 0
            weekly_completed = weekly_row.completed or 0
            weekly_failed = weekly_row.failed or 0
            weekly_running = weekly_row.running or 0
            weekly_pending = weekly_row.pending or 0
            weekly_success_rate = (weekly_completed / weekly_total * 100) if weekly_total > 0 else 0
            
            # Task types (based on trigger type)
            task_types_query = select(
                PipelineExecution.trigger_type,
                func.count(PipelineExecution.id).label('count')
            ).where(
                PipelineExecution.created_at >= day_ago
            ).group_by(PipelineExecution.trigger_type)
            
            task_types_result = await session.execute(task_types_query)
            task_types_raw = task_types_result.fetchall()
            
            task_types = {}
            for row in task_types_raw:
                trigger_type = row.trigger_type or 'manual'
                if trigger_type == 'manual':
                    task_types['pipeline_execution'] = row.count
                elif trigger_type == 'scheduled':
                    task_types['scheduled_tasks'] = row.count
                elif trigger_type == 'webhook':
                    task_types['webhook_triggers'] = row.count
                else:
                    task_types[trigger_type] = row.count
            
            # Average execution times
            execution_times_query = select(
                PipelineExecution.trigger_type,
                func.avg(
                    func.extract(
                        'epoch',
                        PipelineExecution.completed_at - PipelineExecution.started_at
                    )
                ).label('avg_duration')
            ).where(
                and_(
                    PipelineExecution.started_at.isnot(None),
                    PipelineExecution.completed_at.isnot(None),
                    PipelineExecution.created_at >= week_ago
                )
            ).group_by(PipelineExecution.trigger_type)
            
            exec_times_result = await session.execute(execution_times_query)
            exec_times_raw = exec_times_result.fetchall()
            
            average_execution_times = {}
            for row in exec_times_raw:
                trigger_type = row.trigger_type or 'manual'
                avg_seconds = row.avg_duration or 0
                
                if trigger_type == 'manual':
                    average_execution_times['pipeline_execution'] = round(avg_seconds, 1)
                elif trigger_type == 'scheduled':
                    average_execution_times['scheduled_tasks'] = round(avg_seconds, 1)
                elif trigger_type == 'webhook':
                    average_execution_times['webhook_triggers'] = round(avg_seconds, 1)
                else:
                    average_execution_times[trigger_type] = round(avg_seconds, 1)
            
            # Calculate queue performance metrics (simplified)
            # In a real implementation, this would come from Celery monitoring
            queue_performance = {}
            for task_type in ['pipelines', 'data_processing', 'reports', 'notifications']:
                # Calculate throughput as tasks per hour
                task_count = task_types.get(f"{task_type}_tasks", task_types.get(task_type, daily_total // 4))
                throughput = round(task_count / 24, 2)  # tasks per hour over last 24h
                
                # Estimate average wait time based on throughput and queue size
                estimated_queue_size = max(1, int(throughput * 0.1))  # 10% of hourly throughput
                avg_wait_time = round(estimated_queue_size / max(throughput, 0.1) * 60, 1)  # minutes
                
                queue_performance[task_type] = {
                    "avg_wait_time": avg_wait_time,
                    "throughput": throughput
                }
            
            return {
                "timestamp": now.isoformat(),
                "daily_stats": {
                    "total_tasks": daily_total,
                    "successful_tasks": daily_completed,
                    "failed_tasks": daily_failed,
                    "running_tasks": daily_running,
                    "pending_tasks": daily_pending,
                    "success_rate": round(daily_success_rate, 1)
                },
                "weekly_stats": {
                    "total_tasks": weekly_total,
                    "successful_tasks": weekly_completed,
                    "failed_tasks": weekly_failed,
                    "running_tasks": weekly_running,
                    "pending_tasks": weekly_pending,
                    "success_rate": round(weekly_success_rate, 1)
                },
                "task_types": task_types,
                "average_execution_times": average_execution_times,
                "queue_performance": queue_performance,
                "data_processing_stats": await _get_processing_stats(session, day_ago)
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task metrics: {str(e)}")