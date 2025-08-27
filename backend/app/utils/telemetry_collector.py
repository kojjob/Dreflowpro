"""
Telemetry collector utilities for real-time data collection during pipeline execution.
"""
import asyncio
import time
import threading
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid
import logging
import psutil

from ..services.telemetry_service import TelemetryService
from ..models.telemetry import MetricType, AlertSeverity

logger = logging.getLogger(__name__)


class TelemetryCollector:
    """Real-time telemetry collector for pipeline execution."""
    
    def __init__(self, telemetry_service: TelemetryService):
        self.telemetry_service = telemetry_service
        self.active_collections = {}  # execution_id -> collection_data
        self.collection_threads = {}  # execution_id -> thread
        
    def start_collection(
        self,
        execution_id: uuid.UUID,
        pipeline_id: uuid.UUID,
        organization_id: Optional[uuid.UUID] = None,
        collection_interval: int = 5  # seconds
    ):
        """Start collecting telemetry for a pipeline execution."""
        
        if str(execution_id) in self.active_collections:
            logger.warning(f"Collection already active for execution {execution_id}")
            return
        
        collection_data = {
            'execution_id': execution_id,
            'pipeline_id': pipeline_id,
            'organization_id': organization_id,
            'start_time': datetime.utcnow(),
            'collection_interval': collection_interval,
            'metrics': {},
            'performance_snapshots': [],
            'error_count': 0,
            'warning_count': 0,
            'rows_processed': 0,
            'last_snapshot': None,
            'is_active': True
        }
        
        self.active_collections[str(execution_id)] = collection_data
        
        # Start collection thread
        thread = threading.Thread(
            target=self._collection_worker,
            args=(str(execution_id),),
            daemon=True
        )
        self.collection_threads[str(execution_id)] = thread
        thread.start()
        
        logger.info(f"Started telemetry collection for execution {execution_id}")
    
    def stop_collection(self, execution_id: uuid.UUID):
        """Stop collecting telemetry for a pipeline execution."""
        
        exec_id_str = str(execution_id)
        if exec_id_str not in self.active_collections:
            logger.warning(f"No active collection for execution {execution_id}")
            return
        
        # Mark as inactive
        self.active_collections[exec_id_str]['is_active'] = False
        
        # Wait for thread to finish
        if exec_id_str in self.collection_threads:
            thread = self.collection_threads[exec_id_str]
            thread.join(timeout=10)  # Wait up to 10 seconds
            del self.collection_threads[exec_id_str]
        
        # Generate final summary
        asyncio.create_task(self._generate_final_summary(exec_id_str))
        
        # Clean up
        del self.active_collections[exec_id_str]
        
        logger.info(f"Stopped telemetry collection for execution {execution_id}")
    
    def record_metric(
        self,
        execution_id: uuid.UUID,
        metric_name: str,
        value: float,
        metric_type: str = MetricType.CUSTOM,
        unit: Optional[str] = None,
        tags: Optional[Dict[str, Any]] = None
    ):
        """Record a custom metric during execution."""
        
        exec_id_str = str(execution_id)
        if exec_id_str not in self.active_collections:
            logger.warning(f"No active collection for execution {execution_id}")
            return
        
        collection_data = self.active_collections[exec_id_str]
        
        # Store metric for batch recording
        if metric_name not in collection_data['metrics']:
            collection_data['metrics'][metric_name] = []
        
        collection_data['metrics'][metric_name].append({
            'value': value,
            'metric_type': metric_type,
            'unit': unit,
            'tags': tags or {},
            'timestamp': datetime.utcnow()
        })
    
    def record_data_processed(self, execution_id: uuid.UUID, rows: int):
        """Record data processing progress."""
        
        exec_id_str = str(execution_id)
        if exec_id_str in self.active_collections:
            self.active_collections[exec_id_str]['rows_processed'] += rows
    
    def record_error(
        self,
        execution_id: uuid.UUID,
        error_type: str,
        message: str,
        severity: str = AlertSeverity.MEDIUM,
        context: Optional[Dict[str, Any]] = None
    ):
        """Record an error during execution."""
        
        exec_id_str = str(execution_id)
        if exec_id_str not in self.active_collections:
            logger.warning(f"No active collection for execution {execution_id}")
            return
        
        collection_data = self.active_collections[exec_id_str]
        collection_data['error_count'] += 1
        
        # Record error asynchronously
        asyncio.create_task(
            self.telemetry_service.record_error(
                error_type=error_type,
                message=message,
                severity=severity,
                context=context,
                source_type="pipeline_execution",
                source_id=execution_id,
                pipeline_id=collection_data['pipeline_id'],
                execution_id=execution_id,
                organization_id=collection_data['organization_id']
            )
        )
    
    def record_warning(self, execution_id: uuid.UUID, message: str):
        """Record a warning during execution."""
        
        exec_id_str = str(execution_id)
        if exec_id_str in self.active_collections:
            self.active_collections[exec_id_str]['warning_count'] += 1
    
    def _collection_worker(self, execution_id_str: str):
        """Background worker for collecting system metrics."""
        
        collection_data = self.active_collections[execution_id_str]
        
        while collection_data['is_active']:
            try:
                # Collect system metrics
                self._collect_system_metrics(execution_id_str)
                
                # Sleep for collection interval
                time.sleep(collection_data['collection_interval'])
                
            except Exception as e:
                logger.error(f"Error in telemetry collection worker: {e}")
                time.sleep(1)  # Brief pause before continuing
    
    def _collect_system_metrics(self, execution_id_str: str):
        """Collect system performance metrics."""
        
        collection_data = self.active_collections[execution_id_str]
        
        try:
            # Get system metrics
            cpu_usage = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk_io = psutil.disk_io_counters()
            network_io = psutil.net_io_counters()
            
            # Calculate rates (simplified - compare with last snapshot)
            disk_rate = 0.0
            network_rate = 0.0
            rows_per_second = 0.0
            
            current_time = datetime.utcnow()
            
            if collection_data['last_snapshot']:
                last_time = collection_data['last_snapshot']['timestamp']
                time_diff = (current_time - last_time).total_seconds()
                
                if time_diff > 0:
                    # Calculate rows per second
                    last_rows = collection_data['last_snapshot'].get('rows_processed', 0)
                    current_rows = collection_data['rows_processed']
                    rows_per_second = (current_rows - last_rows) / time_diff
                    
                    # Disk I/O rate (simplified)
                    if disk_io:
                        disk_rate = (disk_io.read_bytes + disk_io.write_bytes) / (1024 * 1024 * time_diff)
                    
                    # Network I/O rate (simplified)
                    if network_io:
                        network_rate = (network_io.bytes_sent + network_io.bytes_recv) / (1024 * 1024 * time_diff)
            
            # Create performance snapshot
            snapshot_data = {
                'pipeline_id': collection_data['pipeline_id'],
                'execution_id': collection_data['execution_id'],
                'organization_id': collection_data['organization_id'],
                'cpu_usage': cpu_usage,
                'memory_usage': memory.used / (1024 * 1024),  # MB
                'disk_io_rate': disk_rate,
                'network_io_rate': network_rate,
                'rows_processed': collection_data['rows_processed'],
                'rows_per_second': rows_per_second,
                'errors_count': collection_data['error_count'],
                'warnings_count': collection_data['warning_count'],
                'timestamp': current_time
            }
            
            # Store snapshot
            collection_data['performance_snapshots'].append(snapshot_data)
            collection_data['last_snapshot'] = snapshot_data
            
            # Record performance snapshot asynchronously
            asyncio.create_task(
                self.telemetry_service.record_performance_snapshot(
                    pipeline_id=collection_data['pipeline_id'],
                    execution_id=collection_data['execution_id'],
                    organization_id=collection_data['organization_id'],
                    custom_metrics={
                        'rows_processed': collection_data['rows_processed'],
                        'rows_per_second': rows_per_second,
                        'errors_count': collection_data['error_count'],
                        'warnings_count': collection_data['warning_count']
                    }
                )
            )
            
            # Record individual metrics
            asyncio.create_task(
                self._record_individual_metrics(collection_data, snapshot_data)
            )
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    async def _record_individual_metrics(self, collection_data: Dict, snapshot_data: Dict):
        """Record individual telemetry metrics."""
        
        base_params = {
            'pipeline_id': collection_data['pipeline_id'],
            'execution_id': collection_data['execution_id'],
            'organization_id': collection_data['organization_id'],
            'source_type': 'pipeline_execution',
            'source_id': collection_data['execution_id']
        }
        
        # Record system metrics
        await self.telemetry_service.record_metric(
            metric_name="cpu_usage_percent",
            value=snapshot_data['cpu_usage'],
            metric_type=MetricType.PERFORMANCE,
            unit="percent",
            **base_params
        )
        
        await self.telemetry_service.record_metric(
            metric_name="memory_usage_mb",
            value=snapshot_data['memory_usage'],
            metric_type=MetricType.RESOURCE,
            unit="MB",
            **base_params
        )
        
        await self.telemetry_service.record_metric(
            metric_name="rows_per_second",
            value=snapshot_data['rows_per_second'],
            metric_type=MetricType.BUSINESS,
            unit="rows/sec",
            **base_params
        )
        
        # Record custom metrics that were collected
        for metric_name, metric_values in collection_data['metrics'].items():
            for metric_data in metric_values[-1:]:  # Only record latest values to avoid duplicates
                await self.telemetry_service.record_metric(
                    metric_name=metric_name,
                    value=metric_data['value'],
                    metric_type=metric_data['metric_type'],
                    unit=metric_data['unit'],
                    tags=metric_data['tags'],
                    timestamp=metric_data['timestamp'],
                    **base_params
                )
        
        # Clear recorded metrics to prevent re-recording
        collection_data['metrics'] = {}
    
    async def _generate_final_summary(self, execution_id_str: str):
        """Generate final execution summary."""
        
        try:
            collection_data = self.active_collections.get(execution_id_str)
            if not collection_data:
                return
            
            end_time = datetime.utcnow()
            total_duration = (end_time - collection_data['start_time']).total_seconds()
            
            # Calculate summary metrics
            avg_cpu = 0
            avg_memory = 0
            peak_cpu = 0
            peak_memory = 0
            
            snapshots = collection_data['performance_snapshots']
            if snapshots:
                cpu_values = [s['cpu_usage'] for s in snapshots if s['cpu_usage'] is not None]
                memory_values = [s['memory_usage'] for s in snapshots if s['memory_usage'] is not None]
                
                if cpu_values:
                    avg_cpu = sum(cpu_values) / len(cpu_values)
                    peak_cpu = max(cpu_values)
                
                if memory_values:
                    avg_memory = sum(memory_values) / len(memory_values)
                    peak_memory = max(memory_values)
            
            # Record summary metrics
            base_params = {
                'pipeline_id': collection_data['pipeline_id'],
                'execution_id': collection_data['execution_id'],
                'organization_id': collection_data['organization_id'],
                'source_type': 'execution_summary',
                'source_id': collection_data['execution_id']
            }
            
            await self.telemetry_service.record_metric(
                metric_name="execution_duration_seconds",
                value=total_duration,
                metric_type=MetricType.PERFORMANCE,
                unit="seconds",
                **base_params
            )
            
            await self.telemetry_service.record_metric(
                metric_name="total_rows_processed",
                value=collection_data['rows_processed'],
                metric_type=MetricType.BUSINESS,
                unit="rows",
                **base_params
            )
            
            await self.telemetry_service.record_metric(
                metric_name="total_errors",
                value=collection_data['error_count'],
                metric_type=MetricType.ERROR,
                unit="count",
                **base_params
            )
            
            await self.telemetry_service.record_metric(
                metric_name="average_cpu_usage",
                value=avg_cpu,
                metric_type=MetricType.PERFORMANCE,
                unit="percent",
                **base_params
            )
            
            await self.telemetry_service.record_metric(
                metric_name="peak_memory_usage",
                value=peak_memory,
                metric_type=MetricType.RESOURCE,
                unit="MB",
                **base_params
            )
            
            logger.info(f"Generated final telemetry summary for execution {execution_id_str}")
            
        except Exception as e:
            logger.error(f"Error generating final telemetry summary: {e}")


# Global telemetry collector instance
_telemetry_collector = None

def get_telemetry_collector(telemetry_service: TelemetryService) -> TelemetryCollector:
    """Get or create telemetry collector instance."""
    global _telemetry_collector
    if _telemetry_collector is None:
        _telemetry_collector = TelemetryCollector(telemetry_service)
    return _telemetry_collector