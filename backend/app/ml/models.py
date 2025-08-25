"""
Machine Learning models for pipeline performance prediction and optimization.

Implements various ML algorithms for:
- Execution time prediction
- Failure prediction
- Resource usage forecasting
- Performance optimization
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
import joblib
import logging

# Scikit-learn imports
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.svm import SVR, SVC
from sklearn.metrics import mean_squared_error, mean_absolute_error, accuracy_score, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.base import BaseEstimator

from .preprocessor import DataPreprocessor, FeatureConfig

logger = logging.getLogger(__name__)


@dataclass
class ModelConfig:
    """Configuration for ML models."""
    model_type: str = 'random_forest'  # random_forest, gradient_boosting, linear, svm
    task_type: str = 'regression'  # regression, classification
    test_size: float = 0.2
    random_state: int = 42
    cross_validation_folds: int = 5
    hyperparameter_tuning: bool = True
    model_params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ModelPerformance:
    """Model performance metrics."""
    task_type: str
    train_score: float
    test_score: float
    cross_val_mean: float
    cross_val_std: float
    feature_importance: Dict[str, float]
    metrics: Dict[str, float] = field(default_factory=dict)


class BaseMLModel(ABC):
    """Base class for all ML models."""
    
    def __init__(self, config: ModelConfig):
        self.config = config
        self.model = None
        self.preprocessor = None
        self.is_trained = False
        self.performance = None
        self.feature_names = []
    
    @abstractmethod
    def _create_model(self) -> BaseEstimator:
        """Create the underlying ML model."""
        pass
    
    @abstractmethod
    def _get_default_params(self) -> Dict[str, Any]:
        """Get default parameters for the model."""
        pass
    
    @abstractmethod
    def _get_param_grid(self) -> Dict[str, List[Any]]:
        """Get parameter grid for hyperparameter tuning."""
        pass
    
    def fit(self, X: pd.DataFrame, y: pd.Series, preprocessor: DataPreprocessor = None) -> 'BaseMLModel':
        """
        Train the model on provided data.
        
        Args:
            X: Feature matrix
            y: Target variable
            preprocessor: Optional fitted preprocessor
        
        Returns:
            Self for method chaining
        """
        logger.info(f"Training {self.__class__.__name__} on {len(X)} samples")
        
        # Prepare data
        if preprocessor is None:
            self.preprocessor = DataPreprocessor()
            X_processed = self.preprocessor.fit_transform(X, y)
        else:
            self.preprocessor = preprocessor
            X_processed = self.preprocessor.transform(X)
        
        self.feature_names = list(X_processed.columns)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_processed, y, 
            test_size=self.config.test_size,
            random_state=self.config.random_state
        )
        
        # Create model
        self.model = self._create_model()
        
        # Hyperparameter tuning
        if self.config.hyperparameter_tuning:
            self.model = self._tune_hyperparameters(X_train, y_train)
        
        # Train final model
        self.model.fit(X_train, y_train)
        
        # Evaluate performance
        self.performance = self._evaluate_model(X_train, X_test, y_train, y_test)
        
        self.is_trained = True
        logger.info(f"Model training completed. Test score: {self.performance.test_score:.4f}")
        
        return self
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Make predictions on new data."""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        X_processed = self.preprocessor.transform(X)
        return self.model.predict(X_processed)
    
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Get prediction probabilities (for classification models)."""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        if not hasattr(self.model, 'predict_proba'):
            raise ValueError("Model does not support probability predictions")
        
        X_processed = self.preprocessor.transform(X)
        return self.model.predict_proba(X_processed)
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance scores."""
        if not self.is_trained or not hasattr(self.model, 'feature_importances_'):
            return {}
        
        importance_scores = self.model.feature_importances_
        return dict(zip(self.feature_names, importance_scores))
    
    def _create_model(self) -> BaseEstimator:
        """Create model based on configuration."""
        params = {**self._get_default_params(), **self.config.model_params}
        
        if self.config.model_type == 'random_forest':
            if self.config.task_type == 'regression':
                return RandomForestRegressor(**params)
            else:
                return RandomForestClassifier(**params)
        
        elif self.config.model_type == 'gradient_boosting':
            return GradientBoostingRegressor(**params)
        
        elif self.config.model_type == 'linear':
            if self.config.task_type == 'regression':
                return LinearRegression(**params)
            else:
                return LogisticRegression(**params)
        
        elif self.config.model_type == 'svm':
            if self.config.task_type == 'regression':
                return SVR(**params)
            else:
                return SVC(**params)
        
        else:
            raise ValueError(f"Unknown model type: {self.config.model_type}")
    
    def _tune_hyperparameters(self, X_train: pd.DataFrame, y_train: pd.Series) -> BaseEstimator:
        """Perform hyperparameter tuning using GridSearchCV."""
        param_grid = self._get_param_grid()
        if not param_grid:
            return self.model
        
        logger.info("Performing hyperparameter tuning...")
        
        grid_search = GridSearchCV(
            self.model,
            param_grid,
            cv=self.config.cross_validation_folds,
            scoring='neg_mean_squared_error' if self.config.task_type == 'regression' else 'accuracy',
            n_jobs=-1,
            verbose=0
        )
        
        grid_search.fit(X_train, y_train)
        
        logger.info(f"Best parameters: {grid_search.best_params_}")
        logger.info(f"Best cross-validation score: {grid_search.best_score_:.4f}")
        
        return grid_search.best_estimator_
    
    def _evaluate_model(self, X_train: pd.DataFrame, X_test: pd.DataFrame, 
                       y_train: pd.Series, y_test: pd.Series) -> ModelPerformance:
        """Evaluate model performance."""
        # Make predictions
        train_pred = self.model.predict(X_train)
        test_pred = self.model.predict(X_test)
        
        # Cross-validation
        cv_scores = cross_val_score(
            self.model, X_train, y_train,
            cv=self.config.cross_validation_folds,
            scoring='neg_mean_squared_error' if self.config.task_type == 'regression' else 'accuracy'
        )
        
        # Calculate metrics
        if self.config.task_type == 'regression':
            train_score = self.model.score(X_train, y_train)  # R² score
            test_score = self.model.score(X_test, y_test)
            
            metrics = {
                'train_mse': mean_squared_error(y_train, train_pred),
                'test_mse': mean_squared_error(y_test, test_pred),
                'train_mae': mean_absolute_error(y_train, train_pred),
                'test_mae': mean_absolute_error(y_test, test_pred),
                'train_rmse': np.sqrt(mean_squared_error(y_train, train_pred)),
                'test_rmse': np.sqrt(mean_squared_error(y_test, test_pred))
            }
        else:
            train_score = accuracy_score(y_train, train_pred)
            test_score = accuracy_score(y_test, test_pred)
            
            metrics = {
                'train_accuracy': train_score,
                'test_accuracy': test_score,
                'test_precision': precision_score(y_test, test_pred, average='weighted', zero_division=0),
                'test_recall': recall_score(y_test, test_pred, average='weighted', zero_division=0),
                'test_f1': f1_score(y_test, test_pred, average='weighted', zero_division=0)
            }
        
        return ModelPerformance(
            task_type=self.config.task_type,
            train_score=train_score,
            test_score=test_score,
            cross_val_mean=cv_scores.mean(),
            cross_val_std=cv_scores.std(),
            feature_importance=self.get_feature_importance(),
            metrics=metrics
        )
    
    def save_model(self, filepath: str):
        """Save the trained model to disk."""
        if not self.is_trained:
            raise ValueError("Model must be trained before saving")
        
        model_data = {
            'model': self.model,
            'preprocessor': self.preprocessor,
            'config': self.config,
            'performance': self.performance,
            'feature_names': self.feature_names,
            'is_trained': self.is_trained
        }
        
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
    
    @classmethod
    def load_model(cls, filepath: str) -> 'BaseMLModel':
        """Load a trained model from disk."""
        model_data = joblib.load(filepath)
        
        instance = cls(model_data['config'])
        instance.model = model_data['model']
        instance.preprocessor = model_data['preprocessor']
        instance.performance = model_data['performance']
        instance.feature_names = model_data['feature_names']
        instance.is_trained = model_data['is_trained']
        
        logger.info(f"Model loaded from {filepath}")
        return instance


class ExecutionTimePredictor(BaseMLModel):
    """Model for predicting pipeline execution time."""
    
    def __init__(self, config: ModelConfig = None):
        if config is None:
            config = ModelConfig(
                model_type='random_forest',
                task_type='regression',
                model_params={'n_estimators': 100, 'random_state': 42}
            )
        super().__init__(config)
    
    def _get_default_params(self) -> Dict[str, Any]:
        if self.config.model_type == 'random_forest':
            return {
                'n_estimators': 100,
                'max_depth': 10,
                'min_samples_split': 5,
                'random_state': self.config.random_state
            }
        elif self.config.model_type == 'gradient_boosting':
            return {
                'n_estimators': 100,
                'learning_rate': 0.1,
                'max_depth': 6,
                'random_state': self.config.random_state
            }
        return {}
    
    def _get_param_grid(self) -> Dict[str, List[Any]]:
        if self.config.model_type == 'random_forest':
            return {
                'n_estimators': [50, 100, 200],
                'max_depth': [5, 10, 15, None],
                'min_samples_split': [2, 5, 10]
            }
        elif self.config.model_type == 'gradient_boosting':
            return {
                'n_estimators': [50, 100, 150],
                'learning_rate': [0.05, 0.1, 0.15],
                'max_depth': [3, 5, 7]
            }
        return {}


class FailurePredictor(BaseMLModel):
    """Model for predicting pipeline failures."""
    
    def __init__(self, config: ModelConfig = None):
        if config is None:
            config = ModelConfig(
                model_type='random_forest',
                task_type='classification',
                model_params={'n_estimators': 100, 'random_state': 42, 'class_weight': 'balanced'}
            )
        super().__init__(config)
    
    def _get_default_params(self) -> Dict[str, Any]:
        if self.config.model_type == 'random_forest':
            return {
                'n_estimators': 100,
                'max_depth': 10,
                'min_samples_split': 5,
                'class_weight': 'balanced',
                'random_state': self.config.random_state
            }
        elif self.config.model_type == 'logistic':
            return {
                'class_weight': 'balanced',
                'random_state': self.config.random_state
            }
        return {}
    
    def _get_param_grid(self) -> Dict[str, List[Any]]:
        if self.config.model_type == 'random_forest':
            return {
                'n_estimators': [50, 100, 200],
                'max_depth': [5, 10, 15],
                'min_samples_split': [2, 5, 10]
            }
        return {}


class ResourceUsagePredictor(BaseMLModel):
    """Model for predicting CPU and memory usage."""
    
    def __init__(self, resource_type: str = 'cpu', config: ModelConfig = None):
        self.resource_type = resource_type  # 'cpu' or 'memory'
        
        if config is None:
            config = ModelConfig(
                model_type='random_forest',
                task_type='regression',
                model_params={'n_estimators': 100, 'random_state': 42}
            )
        super().__init__(config)
    
    def _get_default_params(self) -> Dict[str, Any]:
        if self.config.model_type == 'random_forest':
            return {
                'n_estimators': 100,
                'max_depth': 8,
                'min_samples_split': 5,
                'random_state': self.config.random_state
            }
        return {}
    
    def _get_param_grid(self) -> Dict[str, List[Any]]:
        if self.config.model_type == 'random_forest':
            return {
                'n_estimators': [50, 100, 150],
                'max_depth': [5, 8, 12],
                'min_samples_split': [2, 5, 8]
            }
        return {}


class PerformanceOptimizer:
    """
    Optimizer for pipeline performance using ML predictions.
    
    Combines multiple models to provide comprehensive optimization recommendations.
    """
    
    def __init__(self):
        self.execution_time_model = None
        self.failure_model = None
        self.cpu_model = None
        self.memory_model = None
        self.models_trained = False
    
    def train_models(self, data: pd.DataFrame, targets: Dict[str, pd.Series]):
        """
        Train all optimization models.
        
        Args:
            data: Feature data (telemetry and pipeline data)
            targets: Dictionary of target variables for different models
        """
        logger.info("Training performance optimization models...")
        
        # Shared preprocessor for consistency
        preprocessor = DataPreprocessor()
        
        # Train execution time predictor
        if 'execution_time' in targets:
            self.execution_time_model = ExecutionTimePredictor()
            self.execution_time_model.fit(data, targets['execution_time'], preprocessor)
            logger.info("✓ Execution time predictor trained")
        
        # Train failure predictor
        if 'failure_prediction' in targets:
            self.failure_model = FailurePredictor()
            self.failure_model.fit(data, targets['failure_prediction'], preprocessor)
            logger.info("✓ Failure predictor trained")
        
        # Train resource usage predictors
        if 'cpu_usage' in targets:
            self.cpu_model = ResourceUsagePredictor('cpu')
            self.cpu_model.fit(data, targets['cpu_usage'], preprocessor)
            logger.info("✓ CPU usage predictor trained")
        
        if 'memory_usage' in targets:
            self.memory_model = ResourceUsagePredictor('memory')
            self.memory_model.fit(data, targets['memory_usage'], preprocessor)
            logger.info("✓ Memory usage predictor trained")
        
        self.models_trained = True
        logger.info("All optimization models trained successfully")
    
    def predict_performance(self, pipeline_data: pd.DataFrame) -> Dict[str, Any]:
        """
        Predict comprehensive performance metrics for pipeline configurations.
        
        Args:
            pipeline_data: Pipeline configuration and historical data
        
        Returns:
            Dictionary of performance predictions
        """
        if not self.models_trained:
            raise ValueError("Models must be trained before making predictions")
        
        predictions = {}
        
        if self.execution_time_model:
            predictions['execution_time'] = self.execution_time_model.predict(pipeline_data)
        
        if self.failure_model:
            failure_proba = self.failure_model.predict_proba(pipeline_data)
            predictions['failure_probability'] = failure_proba[:, 1]  # Probability of failure
            predictions['failure_prediction'] = self.failure_model.predict(pipeline_data)
        
        if self.cpu_model:
            predictions['cpu_usage'] = self.cpu_model.predict(pipeline_data)
        
        if self.memory_model:
            predictions['memory_usage'] = self.memory_model.predict(pipeline_data)
        
        return predictions
    
    def generate_optimization_recommendations(self, pipeline_data: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Generate optimization recommendations based on predictions.
        
        Args:
            pipeline_data: Current pipeline configuration data
        
        Returns:
            List of optimization recommendations
        """
        if not self.models_trained:
            return []
        
        predictions = self.predict_performance(pipeline_data)
        recommendations = []
        
        # High execution time recommendations
        if 'execution_time' in predictions:
            avg_time = np.mean(predictions['execution_time'])
            if avg_time > 3600:  # More than 1 hour
                recommendations.append({
                    'type': 'performance',
                    'priority': 'high',
                    'title': 'Optimize Pipeline Execution Time',
                    'description': f'Predicted execution time is {avg_time/3600:.1f} hours. Consider parallelization or data chunking.',
                    'impact': 'High',
                    'effort': 'Medium',
                    'category': 'execution_optimization'
                })
        
        # High failure risk recommendations
        if 'failure_probability' in predictions:
            max_failure_risk = np.max(predictions['failure_probability'])
            if max_failure_risk > 0.3:  # More than 30% failure risk
                recommendations.append({
                    'type': 'reliability',
                    'priority': 'critical',
                    'title': 'Reduce Pipeline Failure Risk',
                    'description': f'High failure probability detected ({max_failure_risk:.1%}). Review error handling and data validation.',
                    'impact': 'Critical',
                    'effort': 'High',
                    'category': 'failure_prevention'
                })
        
        # Resource usage recommendations
        if 'cpu_usage' in predictions:
            avg_cpu = np.mean(predictions['cpu_usage'])
            if avg_cpu > 80:  # High CPU usage
                recommendations.append({
                    'type': 'resource',
                    'priority': 'medium',
                    'title': 'Optimize CPU Usage',
                    'description': f'Predicted high CPU usage ({avg_cpu:.1f}%). Consider optimizing algorithms or scaling resources.',
                    'impact': 'Medium',
                    'effort': 'Medium',
                    'category': 'resource_optimization'
                })
        
        if 'memory_usage' in predictions:
            avg_memory = np.mean(predictions['memory_usage'])
            if avg_memory > 8000:  # More than 8GB
                recommendations.append({
                    'type': 'resource',
                    'priority': 'medium',
                    'title': 'Optimize Memory Usage',
                    'description': f'Predicted high memory usage ({avg_memory/1000:.1f}GB). Consider batch processing or memory optimization.',
                    'impact': 'Medium',
                    'effort': 'Medium',
                    'category': 'resource_optimization'
                })
        
        return sorted(recommendations, key=lambda x: {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}[x['priority']])
    
    def get_model_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary of all trained models."""
        summary = {}
        
        if self.execution_time_model and self.execution_time_model.performance:
            summary['execution_time'] = {
                'test_score': self.execution_time_model.performance.test_score,
                'test_rmse': self.execution_time_model.performance.metrics.get('test_rmse', 0)
            }
        
        if self.failure_model and self.failure_model.performance:
            summary['failure_prediction'] = {
                'test_accuracy': self.failure_model.performance.test_score,
                'test_f1': self.failure_model.performance.metrics.get('test_f1', 0)
            }
        
        if self.cpu_model and self.cpu_model.performance:
            summary['cpu_usage'] = {
                'test_score': self.cpu_model.performance.test_score,
                'test_rmse': self.cpu_model.performance.metrics.get('test_rmse', 0)
            }
        
        if self.memory_model and self.memory_model.performance:
            summary['memory_usage'] = {
                'test_score': self.memory_model.performance.test_score,
                'test_rmse': self.memory_model.performance.metrics.get('test_rmse', 0)
            }
        
        return summary
    
    def save_models(self, base_path: str):
        """Save all trained models."""
        if self.execution_time_model:
            self.execution_time_model.save_model(f"{base_path}/execution_time_model.joblib")
        
        if self.failure_model:
            self.failure_model.save_model(f"{base_path}/failure_model.joblib")
        
        if self.cpu_model:
            self.cpu_model.save_model(f"{base_path}/cpu_model.joblib")
        
        if self.memory_model:
            self.memory_model.save_model(f"{base_path}/memory_model.joblib")
        
        logger.info(f"All models saved to {base_path}")
    
    def load_models(self, base_path: str):
        """Load all trained models."""
        import os
        
        try:
            if os.path.exists(f"{base_path}/execution_time_model.joblib"):
                self.execution_time_model = ExecutionTimePredictor.load_model(f"{base_path}/execution_time_model.joblib")
            
            if os.path.exists(f"{base_path}/failure_model.joblib"):
                self.failure_model = FailurePredictor.load_model(f"{base_path}/failure_model.joblib")
            
            if os.path.exists(f"{base_path}/cpu_model.joblib"):
                self.cpu_model = ResourceUsagePredictor.load_model(f"{base_path}/cpu_model.joblib")
            
            if os.path.exists(f"{base_path}/memory_model.joblib"):
                self.memory_model = ResourceUsagePredictor.load_model(f"{base_path}/memory_model.joblib")
            
            self.models_trained = True
            logger.info(f"Models loaded from {base_path}")
        
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise