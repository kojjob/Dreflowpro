"""
Prometheus metrics service for comprehensive application monitoring.
"""
import time
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
import logging
from prometheus_client import (
    Counter, Histogram, Gauge, CollectorRegistry, 
    generate_latest, CONTENT_TYPE_LATEST, Info,
    start_http_server, REGISTRY
)
from prometheus_client.multiprocess import MultiProcessCollector
import psutil

from app.core.redis import redis_manager
from app.core.cache_manager import cache_manager
from app.core.rate_limiter import rate_limiter

logger = logging.getLogger(__name__)


class PrometheusMetrics:
    """Prometheus metrics collector for the ETL platform."""
    
    def __init__(self, registry: Optional[CollectorRegistry] = None):
        self.registry = registry or REGISTRY
        self.setup_metrics()
        self._last_collection_time = time.time()
        
    def setup_metrics(self):
        """Initialize all Prometheus metrics."""
        
        # API Request Metrics
        self.http_requests_total = Counter(
            'http_requests_total',
            'Total number of HTTP requests',
            ['method', 'endpoint', 'status_code'],
            registry=self.registry
        )
        
        self.http_request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint'],
            buckets=(0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0),
            registry=self.registry
        )
        
        # Authentication Metrics
        self.auth_attempts_total = Counter(
            'auth_attempts_total',
            'Total authentication attempts',
            ['status', 'method'],
            registry=self.registry
        )
        
        self.active_sessions = Gauge(
            'active_sessions_total',
            'Number of active user sessions',
            registry=self.registry
        )
        
        # Rate Limiting Metrics
        self.rate_limit_hits = Counter(
            'rate_limit_hits_total',
            'Total number of rate limit hits',
            ['identifier_type', 'endpoint'],
            registry=self.registry
        )
        
        self.rate_limit_blocks = Counter(
            'rate_limit_blocks_total',
            'Total number of rate limit blocks',
            ['identifier_type', 'endpoint', 'reason'],
            registry=self.registry
        )
        
        # Cache Metrics
        self.cache_operations = Counter(
            'cache_operations_total',
            'Total cache operations',
            ['operation', 'layer', 'result'],
            registry=self.registry
        )
        
        self.cache_hit_ratio = Gauge(
            'cache_hit_ratio',
            'Current cache hit ratio',
            ['layer'],
            registry=self.registry
        )
        
        # Pipeline Metrics
        self.pipeline_executions = Counter(
            'pipeline_executions_total',
            'Total pipeline executions',
            ['pipeline_id', 'status'],
            registry=self.registry
        )
        
        self.pipeline_duration = Histogram(
            'pipeline_duration_seconds',
            'Pipeline execution duration',
            ['pipeline_id'],
            buckets=(1, 5, 10, 30, 60, 300, 600, 1800, 3600),
            registry=self.registry
        )
        
        self.pipeline_records_processed = Counter(
            'pipeline_records_processed_total',
            'Total records processed by pipelines',
            ['pipeline_id', 'stage'],
            registry=self.registry
        )
        
        # Data Quality Metrics
        self.data_quality_checks = Counter(
            'data_quality_checks_total',
            'Total data quality checks performed',
            ['rule_type', 'status'],
            registry=self.registry
        )
        
        self.data_quality_violations = Counter(
            'data_quality_violations_total',
            'Total data quality violations',
            ['rule_type', 'severity'],
            registry=self.registry
        )
        
        # System Metrics
        self.cpu_usage = Gauge(
            'system_cpu_usage_percent',
            'Current CPU usage percentage',
            registry=self.registry
        )
        
        self.memory_usage = Gauge(
            'system_memory_usage_bytes',
            'Current memory usage in bytes',
            registry=self.registry
        )
        
        self.memory_usage_percent = Gauge(
            'system_memory_usage_percent',
            'Current memory usage percentage',
            registry=self.registry
        )
        
        self.disk_usage = Gauge(
            'system_disk_usage_percent',
            'Current disk usage percentage',
            ['mount_point'],
            registry=self.registry
        )
        
        # Database Metrics
        self.database_connections = Gauge(
            'database_connections_active',
            'Number of active database connections',
            registry=self.registry
        )
        
        self.database_query_duration = Histogram(
            'database_query_duration_seconds',
            'Database query duration',
            ['operation'],
            buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
            registry=self.registry
        )
        
        # Redis Metrics
        self.redis_operations = Counter(
            'redis_operations_total',
            'Total Redis operations',
            ['operation', 'status'],
            registry=self.registry
        )
        
        self.redis_connection_pool = Gauge(
            'redis_connection_pool_size',
            'Redis connection pool size',
            ['status'],
            registry=self.registry
        )
        
        self.redis_memory_usage = Gauge(
            'redis_memory_usage_bytes',
            'Redis memory usage in bytes',
            registry=self.registry
        )
        
        # WebSocket Metrics
        self.websocket_connections = Gauge(
            'websocket_connections_active',
            'Number of active WebSocket connections',
            registry=self.registry
        )
        
        self.websocket_messages = Counter(
            'websocket_messages_total',
            'Total WebSocket messages',
            ['direction', 'type'],
            registry=self.registry
        )
        
        # Application Info
        self.app_info = Info(
            'app',
            'Application information',
            registry=self.registry
        )
        
        # Set application info
        self.app_info.info({
            'version': '1.0.0',
            'environment': 'development',
            'python_version': '3.11+',
            'framework': 'FastAPI'
        })
    
    def record_http_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Record HTTP request metrics."""
        self.http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=str(status_code)
        ).inc()
        
        self.http_request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
    
    def record_auth_attempt(self, status: str, method: str):
        """Record authentication attempt."""
        self.auth_attempts_total.labels(status=status, method=method).inc()
    
    def update_active_sessions(self, count: int):
        """Update active sessions count."""
        self.active_sessions.set(count)
    
    def record_rate_limit_hit(self, identifier_type: str, endpoint: str):
        """Record rate limit hit."""
        self.rate_limit_hits.labels(
            identifier_type=identifier_type,
            endpoint=endpoint
        ).inc()
    
    def record_rate_limit_block(self, identifier_type: str, endpoint: str, reason: str):
        """Record rate limit block."""
        self.rate_limit_blocks.labels(
            identifier_type=identifier_type,
            endpoint=endpoint,
            reason=reason
        ).inc()
    
    def record_cache_operation(self, operation: str, layer: str, result: str):
        """Record cache operation."""
        self.cache_operations.labels(
            operation=operation,
            layer=layer,
            result=result
        ).inc()
    
    def update_cache_hit_ratio(self, layer: str, ratio: float):
        """Update cache hit ratio."""
        self.cache_hit_ratio.labels(layer=layer).set(ratio)
    
    def record_pipeline_execution(self, pipeline_id: str, status: str, duration: float):
        """Record pipeline execution."""
        self.pipeline_executions.labels(
            pipeline_id=pipeline_id,
            status=status
        ).inc()
        
        self.pipeline_duration.labels(
            pipeline_id=pipeline_id
        ).observe(duration)
    
    def record_pipeline_records(self, pipeline_id: str, stage: str, count: int):
        """Record pipeline record processing."""
        self.pipeline_records_processed.labels(
            pipeline_id=pipeline_id,
            stage=stage
        ).inc(count)
    
    def record_data_quality_check(self, rule_type: str, status: str):
        """Record data quality check."""
        self.data_quality_checks.labels(
            rule_type=rule_type,
            status=status
        ).inc()
    
    def record_data_quality_violation(self, rule_type: str, severity: str):
        """Record data quality violation."""
        self.data_quality_violations.labels(
            rule_type=rule_type,
            severity=severity
        ).inc()
    
    def record_websocket_connection(self, change: int):
        """Update WebSocket connection count."""
        current = self.websocket_connections._value._value
        self.websocket_connections.set(current + change)
    
    def record_websocket_message(self, direction: str, msg_type: str):
        """Record WebSocket message."""
        self.websocket_messages.labels(
            direction=direction,
            type=msg_type
        ).inc()
    
    async def collect_system_metrics(self):
        """Collect and update system metrics."""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            self.cpu_usage.set(cpu_percent)
            
            # Memory metrics
            memory = psutil.virtual_memory()
            self.memory_usage.set(memory.used)
            self.memory_usage_percent.set(memory.percent)
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            self.disk_usage.labels(mount_point='/').set(disk_percent)
            
            # Cache metrics
            cache_stats = cache_manager.get_hit_ratio()
            if 'hit_ratio' in cache_stats:
                self.update_cache_hit_ratio('overall', cache_stats['hit_ratio'])
            if 'l1_ratio' in cache_stats:
                self.update_cache_hit_ratio('l1', cache_stats['l1_ratio'])
            if 'l2_ratio' in cache_stats:
                self.update_cache_hit_ratio('l2', cache_stats['l2_ratio'])
            
            # Redis metrics
            try:
                redis_info = await redis_manager.info('memory')
                if redis_info and 'used_memory' in redis_info:
                    self.redis_memory_usage.set(redis_info['used_memory'])
                    
                # Redis connection pool status (simulated)
                self.redis_connection_pool.labels(status='active').set(10)
                self.redis_connection_pool.labels(status='idle').set(5)
                
            except Exception as e:
                logger.warning(f"Failed to collect Redis metrics: {e}")
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
    
    async def start_background_collection(self):
        """Start background metrics collection."""
        while True:
            try:
                await self.collect_system_metrics()
                await asyncio.sleep(30)  # Collect every 30 seconds
            except Exception as e:
                logger.error(f"Background metrics collection error: {e}")
                await asyncio.sleep(60)  # Wait longer on error


# Global metrics instance
metrics = PrometheusMetrics()


async def get_metrics_data() -> str:
    """Get Prometheus metrics data."""
    await metrics.collect_system_metrics()
    return generate_latest(metrics.registry)


def start_metrics_server(port: int = 9090):
    """Start Prometheus metrics server."""
    try:
        start_http_server(port)
        logger.info(f"Prometheus metrics server started on port {port}")
    except Exception as e:
        logger.error(f"Failed to start metrics server: {e}")


async def start_background_metrics_collection():
    """Start background metrics collection task."""
    task = asyncio.create_task(metrics.start_background_collection())
    logger.info("Background metrics collection started")
    return task