from celery import Celery
from app.core.config import settings
import os

# Create Celery instance
celery_app = Celery(
    "dreflowpro",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.pipeline_tasks",
        "app.workers.data_processing_tasks",
        "app.workers.report_generation_tasks",
        "app.workers.notification_tasks",
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task routing
    task_routes={
        "app.workers.pipeline_tasks.*": {"queue": "pipelines"},
        "app.workers.data_processing_tasks.*": {"queue": "data_processing"},
        "app.workers.report_generation_tasks.*": {"queue": "reports"},
        "app.workers.notification_tasks.*": {"queue": "notifications"},
    },
    
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Result backend settings
    result_expires=3600,  # 1 hour
    result_backend_transport_options={
        "master_name": "mymaster",
        "visibility_timeout": 3600,
        "retry_on_timeout": True,
    },
    
    # Worker settings
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    
    # Task execution settings
    task_acks_late=True,
    worker_disable_rate_limits=False,
    task_reject_on_worker_lost=True,
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # Security
    worker_hijack_root_logger=False,
    worker_log_color=False,
    
    # Beat schedule for periodic tasks
    beat_schedule={
        "cleanup-expired-tasks": {
            "task": "app.workers.maintenance_tasks.cleanup_expired_tasks",
            "schedule": 3600.0,  # Run every hour
        },
        "health-check": {
            "task": "app.workers.maintenance_tasks.health_check",
            "schedule": 300.0,  # Run every 5 minutes
        },
    },
)

# Auto-discover tasks
celery_app.autodiscover_tasks()

if __name__ == "__main__":
    celery_app.start()