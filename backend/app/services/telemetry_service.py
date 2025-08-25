"""
Telemetry service for collecting and managing operational data.
"""
import asyncio
import psutil
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
import uuid
import logging

from ..models.telemetry import (
    TelemetryMetric, PerformanceSnapshot, ErrorLog, 
    DataQualityMetric, SystemAlert, MetricType, AlertSeverity
)
from ..models.pipeline import ETLPipeline, PipelineExecution, PipelineStep
from ..core.database import get_db

logger = logging.getLogger(__name__)


class TelemetryService:
    """Service for collecting and managing telemetry data."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def record_metric(
        self,
        metric_name: str,
        value: float,
        metric_type: str = MetricType.CUSTOM,
        source_type: str = "system",
        source_id: Optional[uuid.UUID] = None,
        pipeline_id: Optional[uuid.UUID] = None,
        execution_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        unit: Optional[str] = None,
        tags: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None
    ) -> TelemetryMetric:
        """Record a telemetry metric."""
        
        metric = TelemetryMetric(
            metric_name=metric_name,
            metric_type=metric_type,
            source_type=source_type,
            source_id=source_id,
            value=value,
            unit=unit,
            tags=tags or {},
            pipeline_id=pipeline_id,
            execution_id=execution_id,
            organization_id=organization_id,
            timestamp=timestamp or datetime.utcnow()
        )
        
        self.db.add(metric)
        await self.db.commit()
        await self.db.refresh(metric)
        
        logger.debug(f"Recorded metric: {metric_name}={value} {unit or ''}")
        return metric
    
    async def record_performance_snapshot(
        self,
        pipeline_id: Optional[uuid.UUID] = None,
        execution_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        custom_metrics: Optional[Dict[str, Any]] = None
    ) -> PerformanceSnapshot:
        """Record a performance snapshot with system metrics."""
        
        # Collect system metrics
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk_io = psutil.disk_io_counters()
        network_io = psutil.net_io_counters()
        
        # Calculate rates (simplified - in production, would compare with previous snapshot)
        disk_io_rate = 0.0
        network_io_rate = 0.0
        
        if disk_io:
            disk_io_rate = (disk_io.read_bytes + disk_io.write_bytes) / (1024 * 1024)  # MB
        
        if network_io:
            network_io_rate = (network_io.bytes_sent + network_io.bytes_recv) / (1024 * 1024)  # MB
        
        snapshot = PerformanceSnapshot(
            pipeline_id=pipeline_id,
            execution_id=execution_id,
            organization_id=organization_id,
            cpu_usage_percent=cpu_usage,
            memory_usage_mb=memory.used / (1024 * 1024),  # Convert to MB
            disk_io_mb_per_sec=disk_io_rate,
            network_io_mb_per_sec=network_io_rate,
            snapshot_at=datetime.utcnow()
        )
        
        # Add custom metrics if provided
        if custom_metrics:
            if 'rows_processed' in custom_metrics:
                snapshot.rows_processed = custom_metrics['rows_processed']
            if 'rows_per_second' in custom_metrics:
                snapshot.rows_per_second = custom_metrics['rows_per_second']
            if 'errors_count' in custom_metrics:
                snapshot.errors_count = custom_metrics['errors_count']
            if 'warnings_count' in custom_metrics:
                snapshot.warnings_count = custom_metrics['warnings_count']
            if 'data_quality_score' in custom_metrics:
                snapshot.data_quality_score = custom_metrics['data_quality_score']
            if 'completeness_percentage' in custom_metrics:
                snapshot.completeness_percentage = custom_metrics['completeness_percentage']
            if 'accuracy_percentage' in custom_metrics:
                snapshot.accuracy_percentage = custom_metrics['accuracy_percentage']
        
        self.db.add(snapshot)
        await self.db.commit()
        await self.db.refresh(snapshot)
        
        logger.debug(f"Recorded performance snapshot for pipeline {pipeline_id}")
        return snapshot
    
    async def record_error(
        self,
        error_type: str,
        message: str,
        severity: str = AlertSeverity.MEDIUM,
        error_code: Optional[str] = None,
        stack_trace: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        source_type: str = "system",
        source_id: Optional[uuid.UUID] = None,
        component: Optional[str] = None,
        pipeline_id: Optional[uuid.UUID] = None,
        execution_id: Optional[uuid.UUID] = None,
        step_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None
    ) -> ErrorLog:
        """Record an error for analysis."""
        
        error_log = ErrorLog(
            error_type=error_type,
            error_code=error_code,
            severity=severity,
            message=message,
            stack_trace=stack_trace,
            context=context or {},
            source_type=source_type,
            source_id=source_id,
            component=component,
            pipeline_id=pipeline_id,
            execution_id=execution_id,
            step_id=step_id,
            organization_id=organization_id,
            occurred_at=datetime.utcnow()
        )
        
        self.db.add(error_log)
        await self.db.commit()
        await self.db.refresh(error_log)
        
        logger.error(f"Recorded error: {error_type} - {message}")
        
        # Check if we should create an alert for this error
        await self._evaluate_alert_conditions(error_log)
        
        return error_log
    
    async def record_data_quality_metrics(
        self,
        pipeline_id: uuid.UUID,
        execution_id: Optional[uuid.UUID] = None,
        step_id: Optional[uuid.UUID] = None,
        dataset_name: Optional[str] = None,
        completeness_score: Optional[float] = None,
        accuracy_score: Optional[float] = None,
        consistency_score: Optional[float] = None,
        validity_score: Optional[float] = None,
        uniqueness_score: Optional[float] = None,
        timeliness_score: Optional[float] = None,
        total_rows: Optional[int] = None,
        null_rows: Optional[int] = None,
        duplicate_rows: Optional[int] = None,
        invalid_rows: Optional[int] = None,
        column_issues: Optional[Dict[str, Any]] = None,
        schema_violations: Optional[Dict[str, Any]] = None
    ) -> DataQualityMetric:
        """Record data quality metrics."""
        
        # Calculate overall score if individual scores are provided
        overall_score = None
        scores = [completeness_score, accuracy_score, consistency_score, 
                 validity_score, uniqueness_score, timeliness_score]
        valid_scores = [s for s in scores if s is not None]
        
        if valid_scores:
            overall_score = sum(valid_scores) / len(valid_scores)
        
        quality_metric = DataQualityMetric(
            pipeline_id=pipeline_id,
            execution_id=execution_id,
            step_id=step_id,
            dataset_name=dataset_name,
            completeness_score=completeness_score,
            accuracy_score=accuracy_score,
            consistency_score=consistency_score,
            validity_score=validity_score,
            uniqueness_score=uniqueness_score,
            timeliness_score=timeliness_score,
            overall_score=overall_score,
            total_rows=total_rows,
            null_rows=null_rows,
            duplicate_rows=duplicate_rows,
            invalid_rows=invalid_rows,
            column_issues=column_issues or {},
            schema_violations=schema_violations or {},
            measured_at=datetime.utcnow()
        )
        
        self.db.add(quality_metric)
        await self.db.commit()
        await self.db.refresh(quality_metric)
        
        logger.info(f"Recorded data quality metrics for pipeline {pipeline_id}, overall score: {overall_score}")
        return quality_metric
    
    async def create_alert(
        self,
        alert_type: str,
        severity: str,
        title: str,
        description: str,
        source_type: str = "system",
        source_id: Optional[uuid.UUID] = None,
        pipeline_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        conditions: Optional[Dict[str, Any]] = None,
        suggested_actions: Optional[List[str]] = None
    ) -> SystemAlert:
        """Create a system alert."""
        
        alert = SystemAlert(
            alert_type=alert_type,
            severity=severity,
            title=title,
            description=description,
            source_type=source_type,
            source_id=source_id,
            pipeline_id=pipeline_id,
            organization_id=organization_id,
            conditions=conditions or {},
            suggested_actions=suggested_actions or [],
            triggered_at=datetime.utcnow()
        )
        
        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)
        
        logger.warning(f"Created {severity} alert: {title}")
        return alert
    
    async def get_metrics(
        self,
        metric_name: Optional[str] = None,
        metric_type: Optional[str] = None,
        source_type: Optional[str] = None,
        source_id: Optional[uuid.UUID] = None,
        pipeline_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000,
        offset: int = 0
    ) -> List[TelemetryMetric]:
        """Retrieve telemetry metrics based on filters."""
        
        query = select(TelemetryMetric)
        
        # Apply filters
        conditions = []
        if metric_name:
            conditions.append(TelemetryMetric.metric_name == metric_name)
        if metric_type:
            conditions.append(TelemetryMetric.metric_type == metric_type)
        if source_type:
            conditions.append(TelemetryMetric.source_type == source_type)
        if source_id:
            conditions.append(TelemetryMetric.source_id == source_id)
        if pipeline_id:
            conditions.append(TelemetryMetric.pipeline_id == pipeline_id)
        if organization_id:
            conditions.append(TelemetryMetric.organization_id == organization_id)
        if start_time:
            conditions.append(TelemetryMetric.timestamp >= start_time)
        if end_time:
            conditions.append(TelemetryMetric.timestamp <= end_time)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(desc(TelemetryMetric.timestamp)).offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_performance_snapshots(
        self,
        pipeline_id: Optional[uuid.UUID] = None,
        execution_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[PerformanceSnapshot]:
        """Retrieve performance snapshots."""
        
        query = select(PerformanceSnapshot)
        
        conditions = []
        if pipeline_id:
            conditions.append(PerformanceSnapshot.pipeline_id == pipeline_id)
        if execution_id:
            conditions.append(PerformanceSnapshot.execution_id == execution_id)
        if organization_id:
            conditions.append(PerformanceSnapshot.organization_id == organization_id)
        if start_time:
            conditions.append(PerformanceSnapshot.snapshot_at >= start_time)
        if end_time:
            conditions.append(PerformanceSnapshot.snapshot_at <= end_time)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(desc(PerformanceSnapshot.snapshot_at)).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_recent_errors(
        self,
        pipeline_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        severity: Optional[str] = None,
        hours: int = 24,
        limit: int = 100
    ) -> List[ErrorLog]:
        """Get recent errors for analysis."""
        
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        query = select(ErrorLog)
        
        conditions = [ErrorLog.occurred_at >= start_time]
        if pipeline_id:
            conditions.append(ErrorLog.pipeline_id == pipeline_id)
        if organization_id:
            conditions.append(ErrorLog.organization_id == organization_id)
        if severity:
            conditions.append(ErrorLog.severity == severity)
        
        query = query.where(and_(*conditions))
        query = query.order_by(desc(ErrorLog.occurred_at)).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_pipeline_health_score(
        self,
        pipeline_id: uuid.UUID,
        hours: int = 24
    ) -> Dict[str, Any]:
        """Calculate overall health score for a pipeline."""
        
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Get recent performance snapshots
        snapshots = await self.get_performance_snapshots(
            pipeline_id=pipeline_id,
            start_time=start_time
        )
        
        # Get recent errors
        errors = await self.get_recent_errors(
            pipeline_id=pipeline_id,
            hours=hours
        )
        
        # Get recent data quality metrics
        quality_query = select(DataQualityMetric).where(
            and_(
                DataQualityMetric.pipeline_id == pipeline_id,
                DataQualityMetric.measured_at >= start_time
            )
        ).order_by(desc(DataQualityMetric.measured_at)).limit(10)
        
        quality_result = await self.db.execute(quality_query)
        quality_metrics = quality_result.scalars().all()
        
        # Calculate health score components
        performance_score = 100.0
        error_score = 100.0
        quality_score = 100.0
        
        # Performance scoring (based on CPU, memory usage)
        if snapshots:
            avg_cpu = sum(s.cpu_usage_percent or 0 for s in snapshots) / len(snapshots)
            avg_memory = sum(s.memory_usage_mb or 0 for s in snapshots) / len(snapshots)
            
            # Penalize high resource usage
            if avg_cpu > 80:
                performance_score -= (avg_cpu - 80) * 2
            if avg_memory > 1000:  # 1GB
                performance_score -= min(30, (avg_memory - 1000) / 100)
        
        # Error scoring
        if errors:
            critical_errors = len([e for e in errors if e.severity == AlertSeverity.CRITICAL])
            high_errors = len([e for e in errors if e.severity == AlertSeverity.HIGH])
            medium_errors = len([e for e in errors if e.severity == AlertSeverity.MEDIUM])
            
            error_score -= critical_errors * 30
            error_score -= high_errors * 15
            error_score -= medium_errors * 5
        
        # Data quality scoring
        if quality_metrics:
            avg_quality = sum(q.overall_score or 0 for q in quality_metrics) / len(quality_metrics)
            quality_score = avg_quality
        
        # Overall health score
        overall_score = max(0, (performance_score + error_score + quality_score) / 3)
        
        return {
            "overall_score": round(overall_score, 2),
            "performance_score": round(max(0, performance_score), 2),
            "error_score": round(max(0, error_score), 2),
            "quality_score": round(max(0, quality_score), 2),
            "snapshots_analyzed": len(snapshots),
            "errors_found": len(errors),
            "quality_measurements": len(quality_metrics),
            "time_period_hours": hours
        }
    
    async def _evaluate_alert_conditions(self, error_log: ErrorLog):
        """Evaluate if error conditions warrant creating alerts."""
        
        # Check for critical errors
        if error_log.severity == AlertSeverity.CRITICAL:
            await self.create_alert(
                alert_type="critical_error",
                severity=AlertSeverity.CRITICAL,
                title=f"Critical Error in {error_log.source_type}",
                description=f"Critical error occurred: {error_log.message}",
                source_type=error_log.source_type,
                source_id=error_log.source_id,
                pipeline_id=error_log.pipeline_id,
                organization_id=error_log.organization_id,
                conditions={"error_id": str(error_log.id)},
                suggested_actions=[
                    "Check system logs immediately",
                    "Verify pipeline configuration",
                    "Contact system administrator if needed"
                ]
            )
        
        # Check for repeated errors
        if error_log.pipeline_id:
            recent_errors = await self.get_recent_errors(
                pipeline_id=error_log.pipeline_id,
                hours=1
            )
            
            similar_errors = [
                e for e in recent_errors 
                if e.error_type == error_log.error_type and e.component == error_log.component
            ]
            
            if len(similar_errors) >= 3:  # 3 or more similar errors in an hour
                await self.create_alert(
                    alert_type="repeated_error",
                    severity=AlertSeverity.HIGH,
                    title=f"Repeated {error_log.error_type} Errors",
                    description=f"Multiple similar errors detected in {error_log.component or error_log.source_type}",
                    source_type=error_log.source_type,
                    source_id=error_log.source_id,
                    pipeline_id=error_log.pipeline_id,
                    organization_id=error_log.organization_id,
                    conditions={
                        "error_type": error_log.error_type,
                        "count": len(similar_errors),
                        "time_window": "1 hour"
                    },
                    suggested_actions=[
                        "Investigate root cause of recurring issue",
                        "Check system resources and dependencies",
                        "Review recent configuration changes"
                    ]
                )
    
    async def cleanup_old_telemetry(self, days_to_keep: int = 30):
        """Clean up old telemetry data to manage storage."""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        # Clean up old metrics
        await self.db.execute(
            TelemetryMetric.__table__.delete().where(
                TelemetryMetric.timestamp < cutoff_date
            )
        )
        
        # Clean up old snapshots
        await self.db.execute(
            PerformanceSnapshot.__table__.delete().where(
                PerformanceSnapshot.snapshot_at < cutoff_date
            )
        )
        
        # Clean up old resolved errors (keep unresolved ones)
        await self.db.execute(
            ErrorLog.__table__.delete().where(
                and_(
                    ErrorLog.occurred_at < cutoff_date,
                    ErrorLog.is_resolved == True
                )
            )
        )
        
        await self.db.commit()
        logger.info(f"Cleaned up telemetry data older than {days_to_keep} days")


# Global telemetry service instance
telemetry_service = None

async def get_telemetry_service() -> TelemetryService:
    """Get telemetry service instance."""
    global telemetry_service
    if telemetry_service is None:
        db = await anext(get_db())
        telemetry_service = TelemetryService(db)
    return telemetry_service