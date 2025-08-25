"""
AI Insights Service - Advanced analytics and machine learning for ETL pipeline optimization.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import json
import numpy as np
import pandas as pd
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
import asyncio

from app.models.ai_insights import (
    AIInsight, AnomalyDetection, PredictionResult, PatternDiscovery,
    InsightType, InsightSeverity, InsightStatus
)
from app.models.pipeline import ETLPipeline, PipelineExecution, ExecutionStatus
from app.models.user import Organization
from app.models.telemetry import TelemetryMetric, PerformanceSnapshot, ErrorLog, DataQualityMetric
from app.core.redis import redis_manager
from app.core.cache_manager import cache_result
from app.services.analytics_service import analytics_service
from app.services.telemetry_service import TelemetryService
from app.ml.training_service import ml_training_service

logger = logging.getLogger(__name__)


@dataclass
class AnomalyResult:
    """Anomaly detection result."""
    metric_name: str
    current_value: float
    expected_value: float
    anomaly_score: float
    is_anomaly: bool
    severity: InsightSeverity
    description: str
    context: Dict[str, Any] = None


@dataclass
class PredictionResult:
    """Prediction result."""
    prediction_type: str
    predicted_value: float
    confidence_score: float
    prediction_horizon: str
    target_timestamp: datetime
    confidence_interval: Tuple[float, float] = None
    features_used: List[str] = None


@dataclass
class PatternResult:
    """Pattern discovery result."""
    pattern_type: str
    pattern_name: str
    description: str
    confidence_score: float
    pattern_data: Dict[str, Any]
    affected_entities: List[str] = None


class AIInsightsService:
    """Advanced AI insights service with ML capabilities."""
    
    def __init__(self):
        self.cache_ttl = 300  # 5 minutes
        self.anomaly_threshold = 2.5  # Z-score threshold
        self.pattern_min_confidence = 0.7
        self.telemetry_service = None
        
    async def _ensure_telemetry_service(self, db: AsyncSession):
        """Ensure telemetry service is initialized."""
        if self.telemetry_service is None:
            self.telemetry_service = TelemetryService(db)
        
    async def generate_insights(
        self,
        org_id: str,
        time_range: str = "24h",
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """Generate comprehensive AI insights for an organization."""
        
        cache_key = f"ai_insights:{org_id}:{time_range}"
        cached_result = await redis_manager.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Calculate time range
        end_date = datetime.utcnow()
        start_date = self._calculate_start_date(end_date, time_range)
        
        # Run all AI analyses in parallel
        results = await asyncio.gather(
            self.detect_anomalies(org_id, start_date, end_date, db),
            self.generate_predictions(org_id, db),
            self.discover_patterns(org_id, start_date, end_date, db),
            self.generate_optimization_recommendations(org_id, db),
            return_exceptions=True
        )
        
        anomalies = results[0] if not isinstance(results[0], Exception) else []
        predictions = results[1] if not isinstance(results[1], Exception) else []
        patterns = results[2] if not isinstance(results[2], Exception) else []
        recommendations = results[3] if not isinstance(results[3], Exception) else []
        
        # Aggregate insights
        insights = {
            "organization_id": org_id,
            "generated_at": datetime.utcnow().isoformat(),
            "time_range": time_range,
            "summary": {
                "total_insights": len(anomalies) + len(predictions) + len(patterns) + len(recommendations),
                "anomalies_detected": len(anomalies),
                "predictions_generated": len(predictions),
                "patterns_discovered": len(patterns),
                "recommendations_available": len(recommendations)
            },
            "anomalies": anomalies,
            "predictions": predictions,
            "patterns": patterns,
            "recommendations": recommendations,
            "performance_metrics": await self._calculate_ai_performance_metrics(org_id, db)
        }
        
        # Cache the result
        await redis_manager.set(cache_key, json.dumps(insights, default=str), ex=self.cache_ttl)
        
        return insights
    
    async def detect_anomalies(
        self,
        org_id: str,
        start_date: datetime,
        end_date: datetime,
        db: AsyncSession
    ) -> List[AnomalyResult]:
        """Detect anomalies in pipeline performance and data quality using enhanced telemetry."""
        
        await self._ensure_telemetry_service(db)
        
        # Get pipeline executions
        result = await db.execute(
            select(PipelineExecution)
            .join(ETLPipeline)
            .where(
                and_(
                    ETLPipeline.organization_id == org_id,
                    PipelineExecution.started_at.between(start_date, end_date),
                    PipelineExecution.completed_at.isnot(None)
                )
            )
            .options(selectinload(PipelineExecution.pipeline))
        )
        executions = result.scalars().all()
        
        # Get telemetry metrics for the same period
        telemetry_metrics = await self.telemetry_service.get_metrics(
            organization_id=org_id,
            start_time=start_date,
            end_time=end_date,
            limit=10000
        )
        
        # Get performance snapshots
        performance_snapshots = await self.telemetry_service.get_performance_snapshots(
            organization_id=org_id,
            start_time=start_date,
            end_time=end_date,
            limit=5000
        )
        
        if not executions:
            return []
        
        anomalies = []
        
        # Convert to DataFrame for analysis
        execution_data = []
        for exec in executions:
            if exec.started_at and exec.completed_at:
                duration = (exec.completed_at - exec.started_at).total_seconds()
                execution_data.append({
                    'id': str(exec.id),
                    'pipeline_id': str(exec.pipeline_id),
                    'duration': duration,
                    'rows_processed': exec.rows_processed or 0,
                    'rows_failed': exec.rows_failed or 0,
                    'status': exec.status.value,
                    'started_at': exec.started_at,
                    'pipeline_name': exec.pipeline.name if exec.pipeline else 'Unknown'
                })
        
        if not execution_data:
            return anomalies
            
        df = pd.DataFrame(execution_data)
        
        # Process telemetry metrics for enhanced analysis
        telemetry_by_metric = {}
        for metric in telemetry_metrics:
            if metric.metric_name not in telemetry_by_metric:
                telemetry_by_metric[metric.metric_name] = []
            telemetry_by_metric[metric.metric_name].append({
                'value': metric.value,
                'timestamp': metric.timestamp,
                'pipeline_id': metric.pipeline_id,
                'execution_id': metric.execution_id
            })
        
        # Process performance snapshots
        performance_data = []
        for snapshot in performance_snapshots:
            performance_data.append({
                'pipeline_id': snapshot.pipeline_id,
                'execution_id': snapshot.execution_id,
                'cpu_usage': snapshot.cpu_usage_percent,
                'memory_usage': snapshot.memory_usage_mb,
                'rows_per_second': snapshot.rows_per_second,
                'data_quality_score': snapshot.data_quality_score,
                'timestamp': snapshot.snapshot_at
            })
        
        # Enhanced anomaly detection with telemetry data
        
        # 1. Execution duration anomalies
        duration_anomalies = self._detect_statistical_anomalies(
            df['duration'].values,
            "execution_duration",
            "Execution Duration (seconds)"
        )
        
        # 2. Resource usage anomalies from performance snapshots
        if performance_data:
            perf_df = pd.DataFrame(performance_data)
            
            # CPU usage anomalies
            cpu_data = perf_df['cpu_usage'].dropna()
            if len(cpu_data) > 3:
                cpu_anomalies = self._detect_statistical_anomalies(
                    cpu_data.values,
                    "cpu_usage",
                    "CPU Usage (%)",
                    threshold=2.0  # Lower threshold for resource monitoring
                )
                for anomaly_score, value, expected, idx in cpu_anomalies:
                    row = perf_df.iloc[idx]
                    severity = self._calculate_severity(anomaly_score)
                    anomaly = AnomalyResult(
                        metric_name="cpu_usage",
                        current_value=value,
                        expected_value=expected,
                        anomaly_score=anomaly_score,
                        severity=severity,
                        description=f"CPU usage spike detected: {value:.1f}% (expected: {expected:.1f}%)",
                        context={
                            "pipeline_id": str(row['pipeline_id']) if row['pipeline_id'] else None,
                            "execution_id": str(row['execution_id']) if row['execution_id'] else None,
                            "timestamp": row['timestamp'].isoformat() if pd.notna(row['timestamp']) else None
                        }
                    )
                    anomalies.append(anomaly)
            
            # Memory usage anomalies
            memory_data = perf_df['memory_usage'].dropna()
            if len(memory_data) > 3:
                memory_anomalies = self._detect_statistical_anomalies(
                    memory_data.values,
                    "memory_usage",
                    "Memory Usage (MB)",
                    threshold=2.0
                )
                for anomaly_score, value, expected, idx in memory_anomalies:
                    row = perf_df.iloc[idx]
                    severity = self._calculate_severity(anomaly_score)
                    anomaly = AnomalyResult(
                        metric_name="memory_usage",
                        current_value=value,
                        expected_value=expected,
                        anomaly_score=anomaly_score,
                        severity=severity,
                        description=f"Memory usage anomaly: {value:.0f}MB (expected: {expected:.0f}MB)",
                        context={
                            "pipeline_id": str(row['pipeline_id']) if row['pipeline_id'] else None,
                            "execution_id": str(row['execution_id']) if row['execution_id'] else None,
                            "timestamp": row['timestamp'].isoformat() if pd.notna(row['timestamp']) else None
                        }
                    )
                    anomalies.append(anomaly)
            
            # Data quality score anomalies
            quality_data = perf_df['data_quality_score'].dropna()
            if len(quality_data) > 3:
                quality_anomalies = self._detect_statistical_anomalies(
                    quality_data.values,
                    "data_quality_score",
                    "Data Quality Score",
                    threshold=1.5,  # More sensitive to quality drops
                    invert_severity=True  # Lower values are worse for quality
                )
                for anomaly_score, value, expected, idx in quality_anomalies:
                    row = perf_df.iloc[idx]
                    severity = self._calculate_severity(anomaly_score)
                    anomaly = AnomalyResult(
                        metric_name="data_quality_score",
                        current_value=value,
                        expected_value=expected,
                        anomaly_score=anomaly_score,
                        severity=severity,
                        description=f"Data quality degradation: {value:.1f}% (expected: {expected:.1f}%)",
                        context={
                            "pipeline_id": str(row['pipeline_id']) if row['pipeline_id'] else None,
                            "execution_id": str(row['execution_id']) if row['execution_id'] else None,
                            "timestamp": row['timestamp'].isoformat() if pd.notna(row['timestamp']) else None
                        }
                    )
                    anomalies.append(anomaly)
        
        # 3. Custom metric anomalies from telemetry
        for metric_name, metric_data in telemetry_by_metric.items():
            if len(metric_data) > 3:
                values = np.array([m['value'] for m in metric_data])
                metric_anomalies = self._detect_statistical_anomalies(
                    values,
                    metric_name,
                    f"Custom Metric: {metric_name}"
                )
                
                for anomaly_score, value, expected, idx in metric_anomalies:
                    data_point = metric_data[idx]
                    severity = self._calculate_severity(anomaly_score)
                    anomaly = AnomalyResult(
                        metric_name=metric_name,
                        current_value=value,
                        expected_value=expected,
                        anomaly_score=anomaly_score,
                        severity=severity,
                        description=f"Unusual {metric_name}: {value:.2f} (expected: {expected:.2f})",
                        context={
                            "pipeline_id": str(data_point['pipeline_id']) if data_point['pipeline_id'] else None,
                            "execution_id": str(data_point['execution_id']) if data_point['execution_id'] else None,
                            "timestamp": data_point['timestamp'].isoformat() if data_point['timestamp'] else None
                        }
                    )
                    anomalies.append(anomaly)
        
        for anomaly_score, value, expected, idx in duration_anomalies:
            execution = df.iloc[idx]
            severity = self._calculate_severity(anomaly_score)
            
            anomaly = AnomalyResult(
                metric_name="execution_duration",
                current_value=value,
                expected_value=expected,
                anomaly_score=anomaly_score,
                is_anomaly=True,
                severity=severity,
                description=f"Pipeline '{execution['pipeline_name']}' execution took {value:.1f}s, "
                           f"which is {anomaly_score:.1f} standard deviations from normal ({expected:.1f}s)",
                context={
                    "pipeline_id": execution['pipeline_id'],
                    "execution_id": execution['id'],
                    "pipeline_name": execution['pipeline_name']
                }
            )
            anomalies.append(anomaly)
        
        # Anomaly detection for data volume
        if df['rows_processed'].sum() > 0:
            volume_anomalies = self._detect_statistical_anomalies(
                df['rows_processed'].values,
                "data_volume",
                "Rows Processed"
            )
            
            for anomaly_score, value, expected, idx in volume_anomalies:
                execution = df.iloc[idx]
                severity = self._calculate_severity(anomaly_score)
                
                anomaly = AnomalyResult(
                    metric_name="data_volume",
                    current_value=value,
                    expected_value=expected,
                    anomaly_score=anomaly_score,
                    is_anomaly=True,
                    severity=severity,
                    description=f"Pipeline '{execution['pipeline_name']}' processed {int(value)} rows, "
                               f"which is unusual (expected ~{int(expected)} rows)",
                    context={
                        "pipeline_id": execution['pipeline_id'],
                        "execution_id": execution['id'],
                        "pipeline_name": execution['pipeline_name']
                    }
                )
                anomalies.append(anomaly)
        
        # Anomaly detection for error rates
        df['error_rate'] = df['rows_failed'] / df['rows_processed'].replace(0, 1)  # Avoid division by zero
        error_rate_anomalies = self._detect_statistical_anomalies(
            df['error_rate'].values,
            "error_rate",
            "Error Rate"
        )
        
        for anomaly_score, value, expected, idx in error_rate_anomalies:
            if value > 0.1:  # Only flag if error rate > 10%
                execution = df.iloc[idx]
                severity = self._calculate_severity(anomaly_score, base_severity=InsightSeverity.HIGH)
                
                anomaly = AnomalyResult(
                    metric_name="error_rate",
                    current_value=value,
                    expected_value=expected,
                    anomaly_score=anomaly_score,
                    is_anomaly=True,
                    severity=severity,
                    description=f"Pipeline '{execution['pipeline_name']}' has error rate of {value*100:.1f}%, "
                               f"significantly higher than normal ({expected*100:.1f}%)",
                    context={
                        "pipeline_id": execution['pipeline_id'],
                        "execution_id": execution['id'],
                        "pipeline_name": execution['pipeline_name']
                    }
                )
                anomalies.append(anomaly)
        
        # Store anomalies in database for tracking
        await self._store_anomalies(anomalies, org_id, db)
        
        return anomalies
    
    def _detect_statistical_anomalies(
        self,
        data: np.ndarray,
        metric_name: str,
        metric_display_name: str,
        threshold: float = None,
        invert_severity: bool = False
    ) -> List[Tuple[float, float, float, int]]:
        """Detect statistical anomalies using Z-score method.
        
        Args:
            data: Array of numeric data points
            metric_name: Internal metric name
            metric_display_name: Human-readable metric name
            threshold: Z-score threshold for anomaly detection
            invert_severity: If True, lower values are considered worse (for quality scores)
        """
        
        if len(data) < 3:
            return []
        
        threshold = threshold or self.anomaly_threshold
        
        # Calculate mean and standard deviation
        mean_val = np.mean(data)
        std_val = np.std(data)
        
        if std_val == 0:
            return []
        
        # Calculate Z-scores
        z_scores = np.abs((data - mean_val) / std_val)
        
        # Find anomalies
        anomalies = []
        for idx, (z_score, value) in enumerate(zip(z_scores, data)):
            if z_score > threshold:
                anomalies.append((z_score, value, mean_val, idx))
        
        return anomalies
    
    def _calculate_severity(
        self,
        anomaly_score: float,
        base_severity: InsightSeverity = InsightSeverity.MEDIUM
    ) -> InsightSeverity:
        """Calculate severity based on anomaly score."""
        
        if anomaly_score > 4.0:
            return InsightSeverity.CRITICAL
        elif anomaly_score > 3.0:
            return InsightSeverity.HIGH
        elif anomaly_score > 2.0:
            return InsightSeverity.MEDIUM
        else:
            return InsightSeverity.LOW
    
    async def generate_predictions(
        self,
        org_id: str,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Generate predictive insights for pipelines using ML models."""
        
        predictions = []
        
        try:
            # Try ML-based predictions first
            ml_predictions = await self._generate_ml_predictions(org_id, db)
            if ml_predictions:
                predictions.extend(ml_predictions)
            
            # Fallback to statistical predictions if ML not available
            if not ml_predictions:
                predictions.extend(await self._generate_statistical_predictions(org_id, db))
                
        except Exception as e:
            logger.error(f"Error generating predictions: {str(e)}")
            # Fallback to basic statistical predictions
            predictions.extend(await self._generate_statistical_predictions(org_id, db))
        
        return predictions
    
    async def _generate_ml_predictions(
        self,
        org_id: str,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Generate ML-based predictions."""
        
        predictions = []
        
        try:
            # Get recent telemetry data for prediction
            features_df, _ = await ml_training_service.prepare_training_data(db, org_id, days_back=7)
            
            if len(features_df) == 0:
                logger.info("No telemetry data available for ML predictions")
                return predictions
            
            # Make ML predictions
            prediction_result = await ml_training_service.predict_performance(features_df, org_id)
            
            if prediction_result['status'] == 'success':
                ml_preds = prediction_result['predictions']
                
                # Convert ML predictions to insight format
                if 'execution_time' in ml_preds:
                    avg_time = float(np.mean(ml_preds['execution_time']))
                    predictions.append({
                        "prediction_type": "execution_time",
                        "pipeline_id": "organization_wide",
                        "pipeline_name": "All Pipelines",
                        "predicted_value": avg_time,
                        "confidence": 0.85,
                        "time_horizon": "next_7_days",
                        "description": f"Predicted average execution time: {avg_time/60:.1f} minutes",
                        "source": "ml_model"
                    })
                
                if 'failure_probability' in ml_preds:
                    avg_failure_risk = float(np.mean(ml_preds['failure_probability']))
                    predictions.append({
                        "prediction_type": "failure_risk",
                        "pipeline_id": "organization_wide", 
                        "pipeline_name": "All Pipelines",
                        "predicted_value": avg_failure_risk,
                        "confidence": 0.78,
                        "time_horizon": "next_7_days",
                        "description": f"Predicted failure risk: {avg_failure_risk:.1%}",
                        "source": "ml_model"
                    })
                
                if 'cpu_usage' in ml_preds:
                    avg_cpu = float(np.mean(ml_preds['cpu_usage']))
                    predictions.append({
                        "prediction_type": "resource_usage",
                        "pipeline_id": "organization_wide",
                        "pipeline_name": "All Pipelines",
                        "predicted_value": avg_cpu,
                        "confidence": 0.82,
                        "time_horizon": "next_7_days",
                        "description": f"Predicted CPU usage: {avg_cpu:.1f}%",
                        "source": "ml_model"
                    })
                
                logger.info(f"Generated {len(predictions)} ML-based predictions")
            
        except Exception as e:
            logger.error(f"ML prediction failed: {str(e)}")
        
        return predictions
    
    async def _generate_statistical_predictions(
        self,
        org_id: str,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Generate statistical-based predictions as fallback."""
        
        predictions = []
        
        # Get historical execution data
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)  # Last 30 days for prediction
        
        result = await db.execute(
            select(PipelineExecution)
            .join(ETLPipeline)
            .where(
                and_(
                    ETLPipeline.organization_id == org_id,
                    PipelineExecution.started_at.between(start_date, end_date),
                    PipelineExecution.completed_at.isnot(None)
                )
            )
            .options(selectinload(PipelineExecution.pipeline))
        )
        executions = result.scalars().all()
        
        if len(executions) < 5:  # Need minimum data for predictions
            return predictions
        
        # Group by pipeline for individual predictions
        pipeline_data = {}
        for exec in executions:
            pipeline_id = str(exec.pipeline_id)
            if pipeline_id not in pipeline_data:
                pipeline_data[pipeline_id] = {
                    'executions': [],
                    'pipeline_name': exec.pipeline.name if exec.pipeline else 'Unknown'
                }
            
            if exec.started_at and exec.completed_at:
                duration = (exec.completed_at - exec.started_at).total_seconds()
                pipeline_data[pipeline_id]['executions'].append({
                    'duration': duration,
                    'rows_processed': exec.rows_processed or 0,
                    'status': exec.status.value,
                    'timestamp': exec.started_at
                })
        
        # Generate predictions for each pipeline
        for pipeline_id, data in pipeline_data.items():
            if len(data['executions']) >= 5:
                # Predict execution time
                durations = [e['duration'] for e in data['executions']]
                predicted_duration = self._predict_execution_time(durations)
                
                predictions.append({
                    "prediction_type": "execution_time",
                    "pipeline_id": pipeline_id,
                    "pipeline_name": data['pipeline_name'],
                    "predicted_value": predicted_duration,
                    "confidence_score": 0.8,  # Simplified confidence
                    "prediction_horizon": "next_execution",
                    "unit": "seconds",
                    "description": f"Next execution of '{data['pipeline_name']}' predicted to take {predicted_duration:.1f} seconds"
                })
                
                # Predict failure probability
                failure_rate = len([e for e in data['executions'] if e['status'] == 'failed']) / len(data['executions'])
                failure_probability = self._predict_failure_probability(durations, failure_rate)
                
                if failure_probability > 0.2:  # Only show if > 20% chance
                    predictions.append({
                        "prediction_type": "failure_risk",
                        "pipeline_id": pipeline_id,
                        "pipeline_name": data['pipeline_name'],
                        "predicted_value": failure_probability * 100,
                        "confidence_score": 0.7,
                        "prediction_horizon": "next_execution",
                        "unit": "percentage",
                        "description": f"'{data['pipeline_name']}' has {failure_probability*100:.1f}% risk of failure in next execution"
                    })
        
        return predictions
    
    def _predict_execution_time(self, durations: List[float]) -> float:
        """Simple execution time prediction using moving average."""
        # Use weighted moving average with recent executions having more weight
        weights = np.exp(np.linspace(-1, 0, len(durations)))
        weights = weights / weights.sum()
        
        return np.average(durations, weights=weights)
    
    def _predict_failure_probability(self, durations: List[float], historical_failure_rate: float) -> float:
        """Predict failure probability based on duration variance and historical data."""
        duration_std = np.std(durations)
        duration_mean = np.mean(durations)
        
        # Higher variance suggests higher instability
        variance_factor = min(duration_std / duration_mean, 1.0) if duration_mean > 0 else 0
        
        # Combine historical failure rate with variance factor
        predicted_probability = min(historical_failure_rate + (variance_factor * 0.3), 1.0)
        
        return predicted_probability
    
    async def discover_patterns(
        self,
        org_id: str,
        start_date: datetime,
        end_date: datetime,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Discover patterns in pipeline execution and data flow."""
        
        patterns = []
        
        # Get execution data
        result = await db.execute(
            select(PipelineExecution)
            .join(ETLPipeline)
            .where(
                and_(
                    ETLPipeline.organization_id == org_id,
                    PipelineExecution.started_at.between(start_date, end_date)
                )
            )
            .options(selectinload(PipelineExecution.pipeline))
        )
        executions = result.scalars().all()
        
        if len(executions) < 10:  # Need sufficient data
            return patterns
        
        # Convert to DataFrame for pattern analysis
        execution_data = []
        for exec in executions:
            if exec.started_at:
                execution_data.append({
                    'pipeline_id': str(exec.pipeline_id),
                    'pipeline_name': exec.pipeline.name if exec.pipeline else 'Unknown',
                    'status': exec.status.value,
                    'started_at': exec.started_at,
                    'hour': exec.started_at.hour,
                    'day_of_week': exec.started_at.weekday(),
                    'duration': (exec.completed_at - exec.started_at).total_seconds() if exec.completed_at and exec.started_at else 0,
                    'rows_processed': exec.rows_processed or 0
                })
        
        df = pd.DataFrame(execution_data)
        
        # Pattern 1: Time-based execution patterns
        hourly_pattern = self._analyze_temporal_patterns(df, 'hour')
        if hourly_pattern:
            patterns.append(hourly_pattern)
        
        # Pattern 2: Weekly patterns
        weekly_pattern = self._analyze_temporal_patterns(df, 'day_of_week')
        if weekly_pattern:
            patterns.append(weekly_pattern)
        
        # Pattern 3: Pipeline correlation patterns
        correlation_patterns = self._analyze_pipeline_correlations(df)
        patterns.extend(correlation_patterns)
        
        # Pattern 4: Performance degradation patterns
        degradation_pattern = self._analyze_performance_degradation(df)
        if degradation_pattern:
            patterns.append(degradation_pattern)
        
        return patterns
    
    def _analyze_temporal_patterns(self, df: pd.DataFrame, time_column: str) -> Optional[Dict[str, Any]]:
        """Analyze temporal patterns in execution data."""
        
        if len(df) < 20:  # Need sufficient data
            return None
        
        # Group by time dimension
        grouped = df.groupby(time_column).agg({
            'duration': ['mean', 'count'],
            'rows_processed': 'mean'
        }).round(2)
        
        # Find peak times
        execution_counts = grouped[('duration', 'count')]
        peak_time = execution_counts.idxmax()
        peak_count = execution_counts.max()
        average_count = execution_counts.mean()
        
        # Only report if pattern is significant
        if peak_count > average_count * 1.5:
            time_label = self._get_time_label(time_column, peak_time)
            
            return {
                "pattern_type": "temporal",
                "pattern_name": f"Peak Activity Pattern - {time_column.replace('_', ' ').title()}",
                "description": f"Pipeline executions peak at {time_label} with {int(peak_count)} executions "
                              f"({(peak_count/average_count-1)*100:.0f}% above average)",
                "confidence_score": min(peak_count / average_count / 2, 1.0),
                "pattern_data": {
                    "time_dimension": time_column,
                    "peak_time": time_label,
                    "peak_count": int(peak_count),
                    "average_count": round(average_count, 1),
                    "distribution": execution_counts.to_dict()
                }
            }
        
        return None
    
    def _get_time_label(self, time_column: str, time_value: int) -> str:
        """Convert time value to readable label."""
        if time_column == 'hour':
            return f"{time_value}:00"
        elif time_column == 'day_of_week':
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            return days[time_value]
        return str(time_value)
    
    def _analyze_pipeline_correlations(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze correlations between different pipelines."""
        
        patterns = []
        
        # Find pipelines that often run together
        if len(df['pipeline_id'].unique()) < 2:
            return patterns
        
        # Group by time windows (e.g., hourly)
        df['time_window'] = df['started_at'].dt.floor('H')
        
        # Find co-occurrence patterns
        pipeline_cooccurrence = df.groupby('time_window')['pipeline_id'].nunique()
        high_cooccurrence = pipeline_cooccurrence[pipeline_cooccurrence > 1]
        
        if len(high_cooccurrence) > len(pipeline_cooccurrence) * 0.3:  # More than 30% of time windows
            pipeline_names = df['pipeline_name'].unique()
            patterns.append({
                "pattern_type": "correlation",
                "pattern_name": "Pipeline Co-execution Pattern",
                "description": f"Multiple pipelines often execute simultaneously. "
                              f"In {len(high_cooccurrence)} time windows, multiple pipelines ran together.",
                "confidence_score": len(high_cooccurrence) / len(pipeline_cooccurrence),
                "pattern_data": {
                    "co_occurrence_frequency": len(high_cooccurrence),
                    "total_windows": len(pipeline_cooccurrence),
                    "affected_pipelines": pipeline_names.tolist()
                }
            })
        
        return patterns
    
    def _analyze_performance_degradation(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Analyze performance degradation trends."""
        
        if len(df) < 20:
            return None
        
        # Sort by time
        df_sorted = df.sort_values('started_at')
        
        # Calculate rolling average of duration
        window_size = min(10, len(df_sorted) // 4)
        df_sorted['duration_rolling'] = df_sorted['duration'].rolling(window=window_size).mean()
        
        # Check for degradation trend
        recent_avg = df_sorted['duration_rolling'].tail(window_size).mean()
        older_avg = df_sorted['duration_rolling'].head(window_size).mean()
        
        if recent_avg > older_avg * 1.2:  # 20% degradation
            degradation_pct = ((recent_avg - older_avg) / older_avg) * 100
            
            return {
                "pattern_type": "performance_degradation",
                "pattern_name": "Performance Degradation Trend",
                "description": f"Pipeline execution times have increased by {degradation_pct:.1f}% "
                              f"over time (from {older_avg:.1f}s to {recent_avg:.1f}s average)",
                "confidence_score": min(degradation_pct / 100, 1.0),
                "pattern_data": {
                    "degradation_percentage": round(degradation_pct, 1),
                    "older_average": round(older_avg, 1),
                    "recent_average": round(recent_avg, 1),
                    "analysis_window": window_size
                }
            }
        
        return None
    
    async def generate_optimization_recommendations(
        self,
        org_id: str,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Generate optimization recommendations based on ML analysis."""
        
        recommendations = []
        
        try:
            # Try ML-based recommendations first
            ml_recommendations = await self._generate_ml_recommendations(org_id, db)
            if ml_recommendations:
                recommendations.extend(ml_recommendations)
            
            # Always add traditional analytics-based recommendations
            traditional_recommendations = await self._generate_traditional_recommendations(org_id, db)
            recommendations.extend(traditional_recommendations)
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            # Fallback to traditional recommendations only
            recommendations.extend(await self._generate_traditional_recommendations(org_id, db))
        
        # Remove duplicates and sort by priority
        seen_titles = set()
        unique_recommendations = []
        for rec in recommendations:
            if rec['title'] not in seen_titles:
                unique_recommendations.append(rec)
                seen_titles.add(rec['title'])
        
        # Sort by impact priority
        priority_order = {'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3}
        unique_recommendations.sort(key=lambda x: priority_order.get(x['impact'], 4))
        
        return unique_recommendations
    
    async def _generate_ml_recommendations(
        self,
        org_id: str,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Generate ML-based optimization recommendations."""
        
        recommendations = []
        
        try:
            # Get recent telemetry data
            features_df, _ = await ml_training_service.prepare_training_data(db, org_id, days_back=7)
            
            if len(features_df) == 0:
                logger.info("No telemetry data available for ML recommendations")
                return recommendations
            
            # Get ML predictions and recommendations
            prediction_result = await ml_training_service.predict_performance(features_df, org_id)
            
            if prediction_result['status'] == 'success' and 'recommendations' in prediction_result:
                ml_recs = prediction_result['recommendations']
                
                for rec in ml_recs:
                    recommendations.append({
                        "title": rec['title'],
                        "description": rec['description'],
                        "category": rec['category'],
                        "impact": rec['impact'],
                        "effort": rec['effort'],
                        "estimated_improvement": f"Based on ML analysis",
                        "implementation_steps": [
                            "Analyze ML prediction results",
                            "Implement suggested optimization",
                            "Monitor performance impact",
                            "Adjust parameters based on results"
                        ],
                        "source": "ml_model"
                    })
                
                logger.info(f"Generated {len(recommendations)} ML-based recommendations")
            
        except Exception as e:
            logger.error(f"ML recommendations failed: {str(e)}")
        
        return recommendations
    
    async def _generate_traditional_recommendations(
        self,
        org_id: str,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Generate traditional analytics-based recommendations."""
        
        recommendations = []
        
        # Get organization performance metrics
        performance_metrics = await analytics_service.get_dashboard_overview(org_id, "30d", db)
        
        if not performance_metrics:
            return recommendations
        
        perf_data = performance_metrics.get('performance_metrics', {})
        quality_data = performance_metrics.get('quality_metrics', {})
        financial_data = performance_metrics.get('financial_metrics', {})
        
        # Recommendation 1: Success rate optimization
        success_rate = perf_data.get('success_rate', 100)
        if success_rate < 95:
            effort = "Medium" if success_rate < 90 else "Low"
            recommendations.append({
                "title": "Improve Pipeline Reliability",
                "description": f"Current success rate is {success_rate}%. Implement better error handling and validation.",
                "category": "reliability",
                "impact": "High",
                "effort": effort,
                "estimated_improvement": f"+{min(10, 98-success_rate)}% success rate",
                "implementation_steps": [
                    "Add data validation checks",
                    "Implement retry mechanisms",
                    "Add comprehensive error logging",
                    "Set up monitoring alerts"
                ]
            })
        
        # Recommendation 2: Performance optimization
        avg_duration = perf_data.get('average_duration', 0)
        if avg_duration > 300:  # 5 minutes
            recommendations.append({
                "title": "Optimize Pipeline Performance",
                "description": f"Average execution time is {avg_duration/60:.1f} minutes. Consider performance optimizations.",
                "category": "performance",
                "impact": "Medium",
                "effort": "Medium",
                "estimated_improvement": "30-50% faster execution",
                "implementation_steps": [
                    "Analyze slow queries and transformations",
                    "Implement parallel processing where possible",
                    "Add data indexing and caching",
                    "Optimize resource allocation"
                ]
            })
        
        # Recommendation 3: Data quality improvement
        data_quality_score = quality_data.get('data_quality_score', 100)
        if data_quality_score < 95:
            recommendations.append({
                "title": "Enhance Data Quality Monitoring",
                "description": f"Data quality score is {data_quality_score}%. Implement automated quality checks.",
                "category": "quality",
                "impact": "High",
                "effort": "Low",
                "estimated_improvement": f"+{min(5, 98-data_quality_score)}% data quality",
                "implementation_steps": [
                    "Set up automated data profiling",
                    "Implement data quality rules",
                    "Add anomaly detection for data",
                    "Create quality dashboards"
                ]
            })
        
        # Recommendation 4: Cost optimization
        compute_cost = financial_data.get('estimated_compute_cost', 0)
        if compute_cost > 100:  # $100+/month
            recommendations.append({
                "title": "Optimize Compute Costs",
                "description": f"Monthly compute cost is ${compute_cost:.0f}. Optimize resource usage and scheduling.",
                "category": "cost",
                "impact": "Medium",
                "effort": "Medium",
                "estimated_improvement": f"Save $${compute_cost * 0.2:.0f}/month",
                "implementation_steps": [
                    "Implement smart scheduling",
                    "Right-size compute resources",
                    "Use spot instances where appropriate",
                    "Optimize data transfer costs"
                ]
            })
        
        # Recommendation 5: Scaling preparation
        active_pipelines = perf_data.get('active_pipelines', 0)
        if active_pipelines > 10:
            recommendations.append({
                "title": "Prepare for Scale",
                "description": f"With {active_pipelines} active pipelines, consider infrastructure scaling strategies.",
                "category": "scaling",
                "impact": "Medium",
                "effort": "High",
                "estimated_improvement": "Handle 3x more pipelines",
                "implementation_steps": [
                    "Implement auto-scaling",
                    "Set up load balancing",
                    "Consider microservices architecture",
                    "Plan capacity management"
                ]
            })
        
        return recommendations
    
    async def _calculate_ai_performance_metrics(
        self,
        org_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Calculate AI system performance metrics."""
        
        # Get recent insights
        result = await db.execute(
            select(AIInsight)
            .where(
                and_(
                    AIInsight.organization_id == org_id,
                    AIInsight.created_at >= datetime.utcnow() - timedelta(days=7)
                )
            )
        )
        recent_insights = result.scalars().all()
        
        # Calculate metrics
        total_insights = len(recent_insights)
        avg_confidence = np.mean([insight.confidence_score for insight in recent_insights]) if recent_insights else 0
        
        high_confidence_insights = len([i for i in recent_insights if i.confidence_score > 80])
        critical_insights = len([i for i in recent_insights if i.severity == InsightSeverity.CRITICAL])
        
        return {
            "total_insights_generated": total_insights,
            "average_confidence_score": round(avg_confidence, 1),
            "high_confidence_insights": high_confidence_insights,
            "critical_insights_detected": critical_insights,
            "insights_by_type": {
                insight_type.value: len([i for i in recent_insights if i.insight_type == insight_type])
                for insight_type in InsightType
            }
        }
    
    async def _store_anomalies(
        self,
        anomalies: List[AnomalyResult],
        org_id: str,
        db: AsyncSession
    ):
        """Store detected anomalies in the database."""
        
        for anomaly in anomalies:
            # Create AI insight
            insight = AIInsight(
                title=f"Anomaly Detected: {anomaly.metric_name.replace('_', ' ').title()}",
                description=anomaly.description,
                insight_type=InsightType.ANOMALY,
                severity=anomaly.severity,
                confidence_score=min(anomaly.anomaly_score * 20, 100),  # Convert to percentage
                organization_id=org_id,
                pipeline_id=anomaly.context.get('pipeline_id') if anomaly.context else None,
                context_data=anomaly.context or {},
                recommended_actions=[
                    "Investigate root cause",
                    "Check data sources",
                    "Review recent changes"
                ],
                estimated_impact="Performance degradation",
                implementation_effort="low"
            )
            db.add(insight)
            
            # Create anomaly detection record
            anomaly_record = AnomalyDetection(
                organization_id=org_id,
                pipeline_id=anomaly.context.get('pipeline_id') if anomaly.context else None,
                execution_id=anomaly.context.get('execution_id') if anomaly.context else None,
                anomaly_type=anomaly.metric_name,
                anomaly_score=anomaly.anomaly_score,
                threshold=self.anomaly_threshold,
                metric_name=anomaly.metric_name,
                current_value=anomaly.current_value,
                expected_value=anomaly.expected_value,
                deviation=abs(anomaly.current_value - anomaly.expected_value),
                context_data=anomaly.context or {}
            )
            db.add(anomaly_record)
        
        await db.commit()
    
    def _calculate_start_date(self, end_date: datetime, time_range: str) -> datetime:
        """Calculate start date based on time range."""
        if time_range == "1h":
            return end_date - timedelta(hours=1)
        elif time_range == "24h":
            return end_date - timedelta(hours=24)
        elif time_range == "7d":
            return end_date - timedelta(days=7)
        elif time_range == "30d":
            return end_date - timedelta(days=30)
        else:
            return end_date - timedelta(hours=24)


# Global AI insights service instance
ai_insights_service = AIInsightsService()