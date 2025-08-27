"""
Data preprocessing pipeline for ML models.

Handles feature extraction, normalization, and preparation of telemetry data
for machine learning algorithms.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.feature_selection import SelectKBest, f_regression
import logging

logger = logging.getLogger(__name__)


@dataclass
class FeatureConfig:
    """Configuration for feature engineering."""
    window_size: int = 24  # Hours to look back for time-series features
    aggregation_intervals: List[str] = None  # ['1h', '6h', '24h']
    include_categorical: bool = True
    include_temporal: bool = True
    include_statistical: bool = True
    max_features: Optional[int] = None
    
    def __post_init__(self):
        if self.aggregation_intervals is None:
            self.aggregation_intervals = ['1h', '6h', '24h']


class DataPreprocessor:
    """
    Comprehensive data preprocessing pipeline for telemetry and pipeline data.
    
    Features:
    - Time-series feature extraction
    - Statistical aggregations
    - Categorical encoding
    - Missing value handling
    - Feature scaling and normalization
    - Feature selection
    """
    
    def __init__(self, config: FeatureConfig = None):
        self.config = config or FeatureConfig()
        self.scalers = {}
        self.encoders = {}
        self.imputers = {}
        self.feature_selector = None
        self.feature_names = []
        self.is_fitted = False
    
    def fit(self, data: pd.DataFrame, target: Optional[pd.Series] = None) -> 'DataPreprocessor':
        """
        Fit the preprocessor on training data.
        
        Args:
            data: Input telemetry and pipeline data
            target: Target variable for supervised learning (optional)
        
        Returns:
            Self for method chaining
        """
        logger.info(f"Fitting preprocessor on {len(data)} samples")
        
        # Create features
        features_df = self._extract_features(data)
        
        # Handle missing values
        self._fit_imputers(features_df)
        features_df = self._apply_imputers(features_df)
        
        # Encode categorical variables
        categorical_cols = features_df.select_dtypes(include=['object', 'category']).columns
        for col in categorical_cols:
            if self.config.include_categorical:
                encoder = LabelEncoder()
                encoder.fit(features_df[col].astype(str))
                self.encoders[col] = encoder
        
        # Scale numerical features
        numerical_cols = features_df.select_dtypes(include=[np.number]).columns
        for col in numerical_cols:
            scaler = StandardScaler()
            scaler.fit(features_df[[col]])
            self.scalers[col] = scaler
        
        # Feature selection
        if target is not None and self.config.max_features:
            processed_features = self.transform(data, fit_mode=True)
            self.feature_selector = SelectKBest(
                score_func=f_regression,
                k=min(self.config.max_features, processed_features.shape[1])
            )
            self.feature_selector.fit(processed_features, target)
        
        self.is_fitted = True
        logger.info("Preprocessor fitting completed")
        return self
    
    def transform(self, data: pd.DataFrame, fit_mode: bool = False) -> pd.DataFrame:
        """
        Transform data using fitted preprocessor.
        
        Args:
            data: Input data to transform
            fit_mode: Whether this is called during fitting (affects feature selection)
        
        Returns:
            Transformed feature matrix
        """
        if not self.is_fitted and not fit_mode:
            raise ValueError("Preprocessor must be fitted before transform")
        
        # Extract features
        features_df = self._extract_features(data)
        
        # Handle missing values
        if fit_mode:
            features_df = self._apply_imputers(features_df)
        else:
            features_df = self._apply_imputers(features_df)
        
        # Encode categorical variables
        for col, encoder in self.encoders.items():
            if col in features_df.columns:
                features_df[col] = encoder.transform(features_df[col].astype(str))
        
        # Scale numerical features
        for col, scaler in self.scalers.items():
            if col in features_df.columns:
                features_df[col] = scaler.transform(features_df[[col]]).flatten()
        
        # Apply feature selection
        if self.feature_selector is not None and not fit_mode:
            features_df = pd.DataFrame(
                self.feature_selector.transform(features_df),
                columns=[features_df.columns[i] for i in self.feature_selector.get_support(indices=True)],
                index=features_df.index
            )
        
        return features_df
    
    def fit_transform(self, data: pd.DataFrame, target: Optional[pd.Series] = None) -> pd.DataFrame:
        """Fit preprocessor and transform data in one step."""
        return self.fit(data, target).transform(data, fit_mode=True)
    
    def _extract_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Extract comprehensive features from telemetry data.
        
        Args:
            data: Raw telemetry data with columns like:
                - timestamp, pipeline_id, execution_id
                - cpu_usage_percent, memory_usage_mb
                - rows_processed, errors_count
                - execution_duration, etc.
        
        Returns:
            Feature matrix with engineered features
        """
        features = []
        
        # Ensure timestamp is datetime
        if 'timestamp' in data.columns:
            data['timestamp'] = pd.to_datetime(data['timestamp'])
        elif 'created_at' in data.columns:
            data['timestamp'] = pd.to_datetime(data['created_at'])
        elif 'snapshot_at' in data.columns:
            data['timestamp'] = pd.to_datetime(data['snapshot_at'])
        
        # Group by execution or pipeline for feature extraction
        groupby_col = 'execution_id' if 'execution_id' in data.columns else 'pipeline_id'
        
        for group_id, group_data in data.groupby(groupby_col):
            group_features = self._extract_group_features(group_data, group_id)
            features.append(group_features)
        
        features_df = pd.DataFrame(features)
        self.feature_names = list(features_df.columns)
        
        logger.info(f"Extracted {len(features_df.columns)} features from {len(data)} records")
        return features_df
    
    def _extract_group_features(self, group_data: pd.DataFrame, group_id: Any) -> Dict[str, Any]:
        """Extract features for a single pipeline execution or group."""
        features = {'group_id': group_id}
        
        # Basic statistical features
        if self.config.include_statistical:
            numerical_cols = group_data.select_dtypes(include=[np.number]).columns
            for col in numerical_cols:
                if col in group_data.columns and not group_data[col].isna().all():
                    values = group_data[col].dropna()
                    if len(values) > 0:
                        features.update({
                            f'{col}_mean': values.mean(),
                            f'{col}_std': values.std(),
                            f'{col}_min': values.min(),
                            f'{col}_max': values.max(),
                            f'{col}_median': values.median(),
                            f'{col}_q75': values.quantile(0.75),
                            f'{col}_q25': values.quantile(0.25),
                            f'{col}_sum': values.sum(),
                            f'{col}_count': len(values)
                        })
                        
                        # Rate of change features
                        if len(values) > 1:
                            features[f'{col}_trend'] = np.polyfit(range(len(values)), values, 1)[0]
                            features[f'{col}_volatility'] = values.std() / values.mean() if values.mean() != 0 else 0
        
        # Temporal features
        if self.config.include_temporal and 'timestamp' in group_data.columns:
            timestamps = pd.to_datetime(group_data['timestamp'])
            if len(timestamps) > 0:
                duration = (timestamps.max() - timestamps.min()).total_seconds()
                features.update({
                    'duration_seconds': duration,
                    'start_hour': timestamps.min().hour,
                    'start_day_of_week': timestamps.min().dayofweek,
                    'start_month': timestamps.min().month,
                    'data_points_count': len(timestamps)
                })
        
        # Pipeline-specific features
        if 'rows_processed' in group_data.columns:
            rows = group_data['rows_processed'].dropna()
            if len(rows) > 0:
                features['total_rows_processed'] = rows.sum()
                features['processing_rate'] = rows.sum() / max(features.get('duration_seconds', 1), 1)
        
        if 'errors_count' in group_data.columns:
            errors = group_data['errors_count'].dropna()
            if len(errors) > 0:
                features['total_errors'] = errors.sum()
                features['error_rate'] = errors.sum() / max(features.get('total_rows_processed', 1), 1)
        
        # Resource utilization patterns
        if 'cpu_usage_percent' in group_data.columns and 'memory_usage_mb' in group_data.columns:
            cpu = group_data['cpu_usage_percent'].dropna()
            memory = group_data['memory_usage_mb'].dropna()
            if len(cpu) > 0 and len(memory) > 0:
                # Resource efficiency score
                features['resource_efficiency'] = (
                    features.get('total_rows_processed', 0) / 
                    (cpu.mean() + memory.mean() / 1000)  # Normalize memory to GB
                ) if (cpu.mean() + memory.mean()) > 0 else 0
        
        # Data quality features
        quality_cols = [col for col in group_data.columns if 'quality' in col.lower()]
        for col in quality_cols:
            values = group_data[col].dropna()
            if len(values) > 0:
                features[f'{col}_avg'] = values.mean()
                features[f'{col}_min'] = values.min()
        
        # Categorical features
        if self.config.include_categorical:
            categorical_cols = group_data.select_dtypes(include=['object', 'category']).columns
            for col in categorical_cols:
                if col != 'group_id' and col in group_data.columns:
                    # Most common category
                    mode_val = group_data[col].mode()
                    if len(mode_val) > 0:
                        features[f'{col}_mode'] = mode_val.iloc[0]
                    
                    # Category diversity
                    features[f'{col}_unique_count'] = group_data[col].nunique()
        
        # Fill any NaN values with 0
        for key, value in features.items():
            if pd.isna(value):
                features[key] = 0
        
        return features
    
    def _fit_imputers(self, features_df: pd.DataFrame):
        """Fit imputers for missing value handling."""
        numerical_cols = features_df.select_dtypes(include=[np.number]).columns
        categorical_cols = features_df.select_dtypes(include=['object', 'category']).columns
        
        if len(numerical_cols) > 0:
            self.imputers['numerical'] = SimpleImputer(strategy='median')
            self.imputers['numerical'].fit(features_df[numerical_cols])
        
        if len(categorical_cols) > 0:
            self.imputers['categorical'] = SimpleImputer(strategy='most_frequent')
            self.imputers['categorical'].fit(features_df[categorical_cols])
    
    def _apply_imputers(self, features_df: pd.DataFrame) -> pd.DataFrame:
        """Apply fitted imputers to handle missing values."""
        features_df = features_df.copy()
        
        if 'numerical' in self.imputers:
            numerical_cols = features_df.select_dtypes(include=[np.number]).columns
            if len(numerical_cols) > 0:
                imputed_values = self.imputers['numerical'].transform(features_df[numerical_cols])
                features_df[numerical_cols] = imputed_values
        
        if 'categorical' in self.imputers:
            categorical_cols = features_df.select_dtypes(include=['object', 'category']).columns
            if len(categorical_cols) > 0:
                imputed_values = self.imputers['categorical'].transform(features_df[categorical_cols])
                features_df[categorical_cols] = imputed_values
        
        return features_df
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance scores if feature selection was applied."""
        if self.feature_selector is None:
            return {}
        
        selected_features = [
            self.feature_names[i] for i in self.feature_selector.get_support(indices=True)
        ]
        scores = self.feature_selector.scores_[self.feature_selector.get_support()]
        
        return dict(zip(selected_features, scores))
    
    def get_feature_info(self) -> Dict[str, Any]:
        """Get information about extracted features and preprocessing steps."""
        return {
            'total_features': len(self.feature_names),
            'feature_names': self.feature_names,
            'selected_features': list(self.get_feature_importance().keys()) if self.feature_selector else self.feature_names,
            'scalers_fitted': list(self.scalers.keys()),
            'encoders_fitted': list(self.encoders.keys()),
            'config': self.config
        }


def create_target_variables(data: pd.DataFrame) -> Dict[str, pd.Series]:
    """
    Create target variables for different ML tasks.
    
    Args:
        data: Pipeline execution data
    
    Returns:
        Dictionary of target variables for different prediction tasks
    """
    targets = {}
    
    # Execution time prediction (regression)
    if 'execution_duration' in data.columns:
        targets['execution_time'] = data['execution_duration']
    elif 'created_at' in data.columns and 'updated_at' in data.columns:
        start_times = pd.to_datetime(data['created_at'])
        end_times = pd.to_datetime(data['updated_at'])
        targets['execution_time'] = (end_times - start_times).dt.total_seconds()
    
    # Failure prediction (binary classification)
    if 'status' in data.columns:
        targets['failure_prediction'] = (data['status'].isin(['failed', 'error'])).astype(int)
    
    # Performance category (multi-class classification)
    if 'execution_time' in targets:
        # Categorize execution times into performance buckets
        exec_times = targets['execution_time']
        q25, q75 = exec_times.quantile([0.25, 0.75])
        
        performance_labels = []
        for time_val in exec_times:
            if time_val <= q25:
                performance_labels.append('fast')
            elif time_val <= q75:
                performance_labels.append('normal')
            else:
                performance_labels.append('slow')
        
        targets['performance_category'] = pd.Series(performance_labels, index=data.index)
    
    # Resource usage prediction (regression)
    if 'cpu_usage_percent' in data.columns:
        targets['cpu_usage'] = data['cpu_usage_percent']
    
    if 'memory_usage_mb' in data.columns:
        targets['memory_usage'] = data['memory_usage_mb']
    
    # Data quality score (regression)
    if 'data_quality_score' in data.columns:
        targets['data_quality'] = data['data_quality_score']
    
    logger.info(f"Created {len(targets)} target variables: {list(targets.keys())}")
    return targets