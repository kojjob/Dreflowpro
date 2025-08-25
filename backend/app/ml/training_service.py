"""
ML Training Service for DReflowPro.

Handles training, validation, and management of machine learning models
for pipeline performance optimization and prediction.
"""
import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from .models import PerformanceOptimizer, ModelConfig
from .preprocessor import DataPreprocessor, create_target_variables, FeatureConfig
from ..services.telemetry_service import TelemetryService
from ..core.database import get_db

logger = logging.getLogger(__name__)


class MLTrainingService:
    """
    Service for training and managing ML models for pipeline optimization.
    
    Features:
    - Automated model training on telemetry data
    - Model performance monitoring
    - Automated retraining based on data drift
    - Model versioning and rollback
    """
    
    def __init__(self, models_path: str = "models"):
        self.models_path = Path(models_path)
        self.models_path.mkdir(exist_ok=True)
        
        # TelemetryService will be initialized per request with db session
        self.telemetry_service = None
        self.performance_optimizer = PerformanceOptimizer()
        self.current_model_version = None
        self.model_metadata = {}
        
        # Training configuration
        self.min_samples_for_training = 100
        self.retrain_days_threshold = 7
        self.performance_degradation_threshold = 0.1
    
    async def prepare_training_data(self, 
                                  db: AsyncSession, 
                                  org_id: str, 
                                  days_back: int = 30) -> tuple[pd.DataFrame, Dict[str, pd.Series]]:
        """
        Prepare training data from telemetry and pipeline execution data.
        
        Args:
            db: Database session
            org_id: Organization ID to filter data
            days_back: Number of days to look back for training data
        
        Returns:
            Tuple of (features_df, targets_dict)
        """
        logger.info(f"Preparing training data for org {org_id}, {days_back} days back")
        
        # Initialize telemetry service with db session
        if self.telemetry_service is None:
            self.telemetry_service = TelemetryService(db)
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_back)
        
        try:
            # Get telemetry metrics
            metrics_data = await self.telemetry_service.get_metrics(
                db, org_id, start_date, end_date
            )
            
            # Get performance snapshots
            snapshots_data = await self.telemetry_service.get_performance_snapshots(
                db, org_id, start_date, end_date
            )
            
            # Get error logs for failure prediction
            error_data = await self.telemetry_service.get_error_logs(
                db, org_id, start_date, end_date
            )
            
            # Convert to DataFrames
            features_data = []
            
            # Process telemetry metrics
            for metric in metrics_data:
                features_data.append({
                    'timestamp': metric.timestamp,
                    'pipeline_id': str(metric.pipeline_id) if metric.pipeline_id else 'unknown',
                    'execution_id': str(metric.execution_id) if metric.execution_id else 'unknown',
                    'metric_name': metric.metric_name,
                    'metric_type': metric.metric_type,
                    'value': metric.value,
                    'unit': metric.unit,
                    'source_type': metric.source_type,
                    'organization_id': str(metric.organization_id) if metric.organization_id else org_id
                })
            
            # Process performance snapshots
            for snapshot in snapshots_data:
                features_data.append({
                    'timestamp': snapshot.snapshot_at,
                    'pipeline_id': str(snapshot.pipeline_id) if snapshot.pipeline_id else 'unknown',
                    'execution_id': str(snapshot.execution_id) if snapshot.execution_id else 'unknown',
                    'cpu_usage_percent': snapshot.cpu_usage_percent,
                    'memory_usage_mb': snapshot.memory_usage_mb,
                    'disk_io_mb_per_sec': snapshot.disk_io_mb_per_sec,
                    'network_io_mb_per_sec': snapshot.network_io_mb_per_sec,
                    'rows_processed': snapshot.rows_processed,
                    'rows_per_second': snapshot.rows_per_second,
                    'errors_count': snapshot.errors_count,
                    'warnings_count': snapshot.warnings_count,
                    'data_quality_score': snapshot.data_quality_score,
                    'completeness_percentage': snapshot.completeness_percentage,
                    'accuracy_percentage': snapshot.accuracy_percentage,
                    'organization_id': str(snapshot.organization_id) if snapshot.organization_id else org_id
                })
            
            if not features_data:
                logger.warning("No training data found")
                return pd.DataFrame(), {}
            
            features_df = pd.DataFrame(features_data)
            logger.info(f"Created feature matrix with {len(features_df)} records")
            
            # Create target variables
            targets = self._create_synthetic_targets(features_df)
            
            return features_df, targets
            
        except Exception as e:
            logger.error(f"Error preparing training data: {str(e)}")
            return pd.DataFrame(), {}
    
    def _create_synthetic_targets(self, features_df: pd.DataFrame) -> Dict[str, pd.Series]:
        """
        Create synthetic target variables from feature data for training.
        
        This creates realistic targets based on the feature patterns.
        """
        targets = {}
        
        if len(features_df) == 0:
            return targets
        
        # Group by execution_id to create execution-level targets
        execution_groups = features_df.groupby('execution_id')
        target_data = []
        
        for execution_id, group in execution_groups:
            if len(group) == 0:
                continue
            
            # Calculate execution time from timestamps
            timestamps = pd.to_datetime(group['timestamp'])
            if len(timestamps) > 1:
                execution_time = (timestamps.max() - timestamps.min()).total_seconds()
            else:
                execution_time = 300  # Default 5 minutes for single point
            
            # Calculate average resource usage
            cpu_usage = group['cpu_usage_percent'].mean() if 'cpu_usage_percent' in group.columns else 50.0
            memory_usage = group['memory_usage_mb'].mean() if 'memory_usage_mb' in group.columns else 1000.0
            
            # Determine failure based on error patterns
            errors_count = group['errors_count'].sum() if 'errors_count' in group.columns else 0
            failure = 1 if errors_count > 5 else 0  # Failed if more than 5 errors
            
            # Calculate data quality
            data_quality = group['data_quality_score'].mean() if 'data_quality_score' in group.columns else 85.0
            
            target_data.append({
                'execution_id': execution_id,
                'execution_time': execution_time,
                'cpu_usage': cpu_usage,
                'memory_usage': memory_usage,
                'failure_prediction': failure,
                'data_quality': data_quality
            })
        
        if target_data:
            targets_df = pd.DataFrame(target_data)
            targets = {
                'execution_time': targets_df['execution_time'],
                'cpu_usage': targets_df['cpu_usage'],
                'memory_usage': targets_df['memory_usage'],
                'failure_prediction': targets_df['failure_prediction'],
                'data_quality': targets_df['data_quality']
            }
            
            logger.info(f"Created {len(targets)} target variables with {len(targets_df)} samples")
        
        return targets
    
    async def train_models(self, 
                          db: AsyncSession, 
                          org_id: str, 
                          force_retrain: bool = False) -> Dict[str, Any]:
        """
        Train ML models for performance optimization.
        
        Args:
            db: Database session
            org_id: Organization ID
            force_retrain: Force retraining even if recent model exists
        
        Returns:
            Training results and model performance metrics
        """
        logger.info(f"Starting model training for organization {org_id}")
        
        try:
            # Check if retraining is needed
            if not force_retrain and not await self._should_retrain(org_id):
                logger.info("Model retraining not needed, using existing models")
                return {'status': 'skipped', 'reason': 'recent_model_exists'}
            
            # Prepare training data
            features_df, targets = await self.prepare_training_data(db, org_id)
            
            if len(features_df) < self.min_samples_for_training:
                logger.warning(f"Insufficient training data: {len(features_df)} samples")
                return {
                    'status': 'failed',
                    'reason': 'insufficient_data',
                    'samples': len(features_df),
                    'required': self.min_samples_for_training
                }
            
            # Train models
            training_start = datetime.utcnow()
            self.performance_optimizer.train_models(features_df, targets)
            training_duration = (datetime.utcnow() - training_start).total_seconds()
            
            # Get model performance
            performance_summary = self.performance_optimizer.get_model_performance_summary()
            
            # Save models
            model_version = f"v{int(training_start.timestamp())}"
            model_path = self.models_path / org_id / model_version
            model_path.mkdir(parents=True, exist_ok=True)
            
            self.performance_optimizer.save_models(str(model_path))
            
            # Update metadata
            self.model_metadata[org_id] = {
                'version': model_version,
                'trained_at': training_start,
                'training_duration': training_duration,
                'training_samples': len(features_df),
                'performance': performance_summary,
                'model_path': str(model_path)
            }
            
            self.current_model_version = model_version
            
            logger.info(f"Model training completed in {training_duration:.1f}s")
            logger.info(f"Model performance: {performance_summary}")
            
            return {
                'status': 'success',
                'version': model_version,
                'training_duration': training_duration,
                'training_samples': len(features_df),
                'performance': performance_summary,
                'model_path': str(model_path)
            }
            
        except Exception as e:
            logger.error(f"Model training failed: {str(e)}")
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    async def predict_performance(self, 
                                 pipeline_data: pd.DataFrame, 
                                 org_id: str) -> Dict[str, Any]:
        """
        Make performance predictions using trained models.
        
        Args:
            pipeline_data: Pipeline configuration and feature data
            org_id: Organization ID
        
        Returns:
            Performance predictions and recommendations
        """
        try:
            # Load models if needed
            if not self.performance_optimizer.models_trained:
                await self._load_latest_models(org_id)
            
            if not self.performance_optimizer.models_trained:
                logger.warning("No trained models available for predictions")
                return {
                    'status': 'no_models',
                    'message': 'No trained models available. Please train models first.'
                }
            
            # Make predictions
            predictions = self.performance_optimizer.predict_performance(pipeline_data)
            
            # Generate recommendations
            recommendations = self.performance_optimizer.generate_optimization_recommendations(pipeline_data)
            
            return {
                'status': 'success',
                'predictions': predictions,
                'recommendations': recommendations,
                'model_version': self.current_model_version
            }
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    async def get_model_status(self, org_id: str) -> Dict[str, Any]:
        """Get status information about trained models."""
        try:
            # Check for existing models
            org_models_path = self.models_path / org_id
            if not org_models_path.exists():
                return {
                    'status': 'no_models',
                    'trained': False,
                    'message': 'No models found for this organization'
                }
            
            # Get latest model metadata
            metadata = self.model_metadata.get(org_id, {})
            if not metadata:
                # Try to load from latest model directory
                model_dirs = [d for d in org_models_path.iterdir() if d.is_dir() and d.name.startswith('v')]
                if model_dirs:
                    latest_dir = max(model_dirs, key=lambda x: int(x.name[1:]))  # Sort by version number
                    metadata = {
                        'version': latest_dir.name,
                        'model_path': str(latest_dir),
                        'trained_at': datetime.fromtimestamp(int(latest_dir.name[1:])),
                        'loaded_from_disk': True
                    }
            
            if metadata:
                return {
                    'status': 'available',
                    'trained': True,
                    'version': metadata['version'],
                    'trained_at': metadata['trained_at'],
                    'training_duration': metadata.get('training_duration'),
                    'training_samples': metadata.get('training_samples'),
                    'performance': metadata.get('performance', {}),
                    'days_since_training': (datetime.utcnow() - metadata['trained_at']).days
                }
            
            return {
                'status': 'unknown',
                'trained': False,
                'message': 'Model status could not be determined'
            }
            
        except Exception as e:
            logger.error(f"Error getting model status: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def _should_retrain(self, org_id: str) -> bool:
        """Check if models should be retrained based on age and performance."""
        metadata = self.model_metadata.get(org_id)
        if not metadata:
            return True  # No existing models
        
        # Check age
        days_since_training = (datetime.utcnow() - metadata['trained_at']).days
        if days_since_training > self.retrain_days_threshold:
            logger.info(f"Model is {days_since_training} days old, retraining needed")
            return True
        
        # Check performance degradation (would need validation data)
        # For now, just use age-based retraining
        
        return False
    
    async def _load_latest_models(self, org_id: str):
        """Load the latest trained models for an organization."""
        try:
            org_models_path = self.models_path / org_id
            if not org_models_path.exists():
                logger.warning(f"No models directory found for org {org_id}")
                return
            
            # Find latest model version
            model_dirs = [d for d in org_models_path.iterdir() if d.is_dir() and d.name.startswith('v')]
            if not model_dirs:
                logger.warning(f"No model versions found for org {org_id}")
                return
            
            latest_dir = max(model_dirs, key=lambda x: int(x.name[1:]))
            logger.info(f"Loading models from {latest_dir}")
            
            # Load models
            self.performance_optimizer.load_models(str(latest_dir))
            self.current_model_version = latest_dir.name
            
            logger.info(f"Successfully loaded models version {self.current_model_version}")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
    
    async def cleanup_old_models(self, org_id: str, keep_versions: int = 3):
        """Clean up old model versions, keeping only the most recent ones."""
        try:
            org_models_path = self.models_path / org_id
            if not org_models_path.exists():
                return
            
            # Get all model directories
            model_dirs = [d for d in org_models_path.iterdir() if d.is_dir() and d.name.startswith('v')]
            
            if len(model_dirs) <= keep_versions:
                return  # Nothing to clean up
            
            # Sort by version and keep only the latest ones
            sorted_dirs = sorted(model_dirs, key=lambda x: int(x.name[1:]), reverse=True)
            dirs_to_remove = sorted_dirs[keep_versions:]
            
            for dir_path in dirs_to_remove:
                import shutil
                shutil.rmtree(dir_path)
                logger.info(f"Removed old model version: {dir_path.name}")
            
            logger.info(f"Cleaned up {len(dirs_to_remove)} old model versions")
            
        except Exception as e:
            logger.error(f"Error cleaning up old models: {str(e)}")


# Global training service instance
ml_training_service = MLTrainingService()