#!/usr/bin/env python3
"""
Celery worker entry point for DReflowPro ETL/ELT SaaS platform.

This script starts Celery workers with optimized configuration for
different types of background tasks including:
- Pipeline execution (ETL/ELT operations)
- Data processing and validation
- Report generation (PDF, PowerPoint, Excel)
- Notification delivery
- System maintenance

Usage:
    # Start all workers
    python celery_worker.py

    # Start specific queue workers
    celery -A celery_worker worker -Q pipelines --loglevel=info
    celery -A celery_worker worker -Q data_processing --loglevel=info
    celery -A celery_worker worker -Q reports --loglevel=info
    celery -A celery_worker worker -Q notifications --loglevel=info

    # Start Celery Beat scheduler
    celery -A celery_worker beat --loglevel=info

    # Monitor with Flower
    celery -A celery_worker flower
"""

import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.workers.celery_app import celery_app
from app.core.config import settings
import logging

# Configure logging for Celery workers
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/var/log/dreflowpro/celery.log') if os.path.exists('/var/log/dreflowpro') else logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Configure Celery for production
celery_app.conf.update(
    # Worker configuration
    worker_pool='prefork',  # Use prefork pool for CPU-bound tasks
    worker_concurrency=4,   # Adjust based on CPU cores
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    worker_disable_rate_limits=False,
    
    # Task routing and queues
    task_default_queue='default',
    task_default_exchange='default',
    task_default_routing_key='default',
    
    # Result backend configuration
    result_expires=3600,  # Results expire after 1 hour
    result_compression='gzip',
    
    # Monitoring and logging
    worker_send_task_events=True,
    task_send_sent_event=True,
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
    
    # Security
    worker_hijack_root_logger=False,
    worker_log_color=False,
    
    # Performance optimizations
    task_compression='gzip',
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    
    # Error handling
    task_reject_on_worker_lost=True,
    task_acks_late=True,
)

# Task autodiscovery
celery_app.autodiscover_tasks([
    'app.workers.pipeline_tasks',
    'app.workers.data_processing_tasks',
    'app.workers.report_generation_tasks',
    'app.workers.notification_tasks',
    'app.workers.maintenance_tasks',
])

if __name__ == '__main__':
    logger.info("Starting DReflowPro Celery worker...")
    logger.info(f"Redis URL: {settings.REDIS_URL}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    
    # Start worker with appropriate configuration
    celery_app.start()