from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime

from app.workers.celery_app import celery_app
from app.workers import (
    pipeline_tasks,
    data_processing_tasks, 
    report_generation_tasks,
    notification_tasks,
    maintenance_tasks
)
from app.core.deps import get_current_user
from app.schemas.auth import User

router = APIRouter(prefix="/tasks", tags=["Background Tasks"])

@router.get("/status", response_model=Dict[str, Any])
async def get_tasks_status(current_user: User = Depends(get_current_user)):
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
async def get_task_status(task_id: str, current_user: User = Depends(get_current_user)):
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
async def cancel_task(task_id: str, current_user: User = Depends(get_current_user)):
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
    current_user: User = Depends(get_current_user)
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
async def validate_pipeline(pipeline_id: int, current_user: User = Depends(get_current_user)):
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
async def trigger_cleanup(current_user: User = Depends(get_current_user)):
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
async def trigger_health_check(current_user: User = Depends(get_current_user)):
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
):
    """Get task execution history."""
    
    try:
        # This would typically query a database for task history
        # For now, returning mock data
        
        mock_history = []
        for i in range(limit):
            task_id = f"task_{i + offset}"
            mock_history.append({
                "task_id": task_id,
                "task_name": f"pipeline.execute",
                "status": "completed" if i % 4 != 3 else "failed",
                "started_at": datetime.now().isoformat(),
                "completed_at": datetime.now().isoformat(),
                "duration_seconds": 45.2,
                "user_id": current_user.id
            })
        
        return {
            "tasks": mock_history,
            "total": 500,  # Mock total
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < 500
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task history: {str(e)}")

@router.get("/metrics", response_model=Dict[str, Any])
async def get_task_metrics(current_user: User = Depends(get_current_user)):
    """Get task execution metrics and statistics."""
    
    try:
        # Mock metrics - in production, this would query actual metrics
        return {
            "timestamp": datetime.now().isoformat(),
            "daily_stats": {
                "total_tasks": 156,
                "successful_tasks": 142,
                "failed_tasks": 14,
                "success_rate": 91.0
            },
            "weekly_stats": {
                "total_tasks": 1024,
                "successful_tasks": 945,
                "failed_tasks": 79,
                "success_rate": 92.3
            },
            "task_types": {
                "pipeline_execution": 45,
                "data_processing": 32,
                "report_generation": 28,
                "notifications": 51
            },
            "average_execution_times": {
                "pipeline_execution": 120.5,
                "data_processing": 85.2,
                "report_generation": 180.7,
                "notifications": 5.1
            },
            "queue_performance": {
                "pipelines": {"avg_wait_time": 12.3, "throughput": 0.85},
                "data_processing": {"avg_wait_time": 8.7, "throughput": 1.2},
                "reports": {"avg_wait_time": 45.2, "throughput": 0.35},
                "notifications": {"avg_wait_time": 2.1, "throughput": 5.2}
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task metrics: {str(e)}")