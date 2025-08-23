from celery import current_task
from app.workers.celery_app import celery_app
from typing import Dict, Any, List, Optional, Union
import pandas as pd
import numpy as np
import logging
import traceback
import asyncio
from datetime import datetime
import io
import json

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name="data.process_file")
def process_uploaded_file(self, file_path: str, file_type: str, processing_options: Dict[str, Any]):
    """Process uploaded data file with validation and preprocessing."""
    
    try:
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "file_reading",
                "progress": 0,
                "message": f"Reading {file_type} file: {file_path}"
            }
        )
        
        # Read file based on type
        df = _read_file_by_type(file_path, file_type, processing_options)
        
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "data_profiling",
                "progress": 25,
                "message": "Analyzing data structure and quality"
            }
        )
        
        # Generate data profile
        profile = _generate_data_profile(df)
        
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "data_validation",
                "progress": 50,
                "message": "Validating data quality"
            }
        )
        
        # Validate data quality
        validation_results = _validate_data_quality(df, processing_options.get("validation_rules", {}))
        
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "data_cleaning",
                "progress": 75,
                "message": "Applying data cleaning rules"
            }
        )
        
        # Apply cleaning rules
        cleaned_df = _apply_cleaning_rules(df, processing_options.get("cleaning_rules", {}))
        
        # Store processed data (temporary storage)
        processed_file_path = _store_processed_data(cleaned_df, file_path)
        
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "completion",
                "progress": 100,
                "message": "File processing completed"
            }
        )
        
        return {
            "status": "completed",
            "original_file": file_path,
            "processed_file": processed_file_path,
            "profile": profile,
            "validation_results": validation_results,
            "row_count": len(cleaned_df),
            "column_count": len(cleaned_df.columns),
            "processing_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"File processing failed: {str(e)}")
        logger.error(traceback.format_exc())
        
        self.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "file_path": file_path,
                "traceback": traceback.format_exc()
            }
        )
        
        raise

@celery_app.task(bind=True, name="data.transform_dataset")
def transform_dataset(self, dataset_id: str, transformations: List[Dict[str, Any]]):
    """Apply series of transformations to a dataset."""
    
    try:
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "initialization",
                "progress": 0,
                "message": f"Loading dataset {dataset_id}"
            }
        )
        
        # Load dataset
        df = _load_dataset(dataset_id)
        original_shape = df.shape
        
        total_transformations = len(transformations)
        
        for i, transform in enumerate(transformations):
            progress = int((i / total_transformations) * 80) + 10  # 10-90% for transformations
            
            self.update_state(
                state="PROGRESS",
                meta={
                    "stage": "transformation",
                    "progress": progress,
                    "message": f"Applying transformation {i+1}/{total_transformations}: {transform.get('name', 'Unknown')}"
                }
            )
            
            df = _apply_transformation(df, transform)
        
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "saving",
                "progress": 95,
                "message": "Saving transformed dataset"
            }
        )
        
        # Save transformed dataset
        transformed_dataset_id = _save_transformed_dataset(df, dataset_id)
        
        return {
            "status": "completed",
            "original_dataset_id": dataset_id,
            "transformed_dataset_id": transformed_dataset_id,
            "original_shape": original_shape,
            "final_shape": df.shape,
            "transformations_applied": len(transformations),
            "transformation_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Dataset transformation failed: {str(e)}")
        
        self.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "dataset_id": dataset_id
            }
        )
        
        raise

@celery_app.task(bind=True, name="data.validate_schema")
def validate_data_schema(self, dataset_id: str, expected_schema: Dict[str, Any]):
    """Validate dataset against expected schema."""
    
    try:
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "loading",
                "progress": 20,
                "message": "Loading dataset for validation"
            }
        )
        
        df = _load_dataset(dataset_id)
        
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "schema_validation",
                "progress": 60,
                "message": "Validating schema compliance"
            }
        )
        
        # Perform schema validation
        validation_result = _validate_schema(df, expected_schema)
        
        return {
            "status": "completed",
            "dataset_id": dataset_id,
            "schema_valid": validation_result["is_valid"],
            "validation_errors": validation_result["errors"],
            "validation_warnings": validation_result["warnings"],
            "schema_compliance_score": validation_result["compliance_score"],
            "validation_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Schema validation failed: {str(e)}")
        
        self.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "dataset_id": dataset_id
            }
        )
        
        raise

@celery_app.task(bind=True, name="data.generate_sample")
def generate_data_sample(self, dataset_id: str, sample_config: Dict[str, Any]):
    """Generate representative data sample from large dataset."""
    
    try:
        sample_size = sample_config.get("size", 1000)
        sampling_method = sample_config.get("method", "random")
        
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "loading",
                "progress": 10,
                "message": "Loading source dataset"
            }
        )
        
        df = _load_dataset(dataset_id)
        
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "sampling",
                "progress": 50,
                "message": f"Generating {sampling_method} sample of {sample_size} records"
            }
        )
        
        # Generate sample
        sample_df = _generate_sample(df, sample_size, sampling_method, sample_config)
        
        # Save sample
        sample_id = _save_sample_dataset(sample_df, dataset_id, sample_config)
        
        return {
            "status": "completed",
            "original_dataset_id": dataset_id,
            "sample_dataset_id": sample_id,
            "original_size": len(df),
            "sample_size": len(sample_df),
            "sampling_method": sampling_method,
            "sampling_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Sample generation failed: {str(e)}")
        
        self.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "dataset_id": dataset_id
            }
        )
        
        raise

# Helper Functions

def _read_file_by_type(file_path: str, file_type: str, options: Dict[str, Any]) -> pd.DataFrame:
    """Read file based on its type."""
    
    if file_type.lower() == "csv":
        return pd.read_csv(
            file_path,
            encoding=options.get("encoding", "utf-8"),
            sep=options.get("delimiter", ","),
            header=options.get("header", 0),
            skiprows=options.get("skip_rows", 0),
            nrows=options.get("max_rows")
        )
    elif file_type.lower() in ["xlsx", "xls"]:
        return pd.read_excel(
            file_path,
            sheet_name=options.get("sheet_name", 0),
            header=options.get("header", 0),
            skiprows=options.get("skip_rows", 0),
            nrows=options.get("max_rows")
        )
    elif file_type.lower() == "json":
        return pd.read_json(
            file_path,
            lines=options.get("lines", False),
            orient=options.get("orient", "records")
        )
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

def _generate_data_profile(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate comprehensive data profile."""
    
    profile = {
        "shape": df.shape,
        "columns": list(df.columns),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "memory_usage": df.memory_usage(deep=True).sum(),
        "null_counts": df.isnull().sum().to_dict(),
        "null_percentages": (df.isnull().sum() / len(df) * 100).to_dict(),
        "duplicate_rows": df.duplicated().sum(),
        "numeric_summary": {},
        "categorical_summary": {}
    }
    
    # Numeric columns analysis
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        profile["numeric_summary"][col] = {
            "min": float(df[col].min()) if not pd.isna(df[col].min()) else None,
            "max": float(df[col].max()) if not pd.isna(df[col].max()) else None,
            "mean": float(df[col].mean()) if not pd.isna(df[col].mean()) else None,
            "median": float(df[col].median()) if not pd.isna(df[col].median()) else None,
            "std": float(df[col].std()) if not pd.isna(df[col].std()) else None,
            "zeros": int((df[col] == 0).sum()),
            "unique_count": int(df[col].nunique())
        }
    
    # Categorical columns analysis
    categorical_cols = df.select_dtypes(include=["object", "category"]).columns
    for col in categorical_cols:
        value_counts = df[col].value_counts().head(10)
        profile["categorical_summary"][col] = {
            "unique_count": int(df[col].nunique()),
            "most_frequent": value_counts.to_dict(),
            "avg_length": float(df[col].astype(str).str.len().mean()) if len(df[col].dropna()) > 0 else 0
        }
    
    return profile

def _validate_data_quality(df: pd.DataFrame, rules: Dict[str, Any]) -> Dict[str, Any]:
    """Validate data quality based on rules."""
    
    issues = []
    warnings = []
    
    # Check for high null percentages
    null_threshold = rules.get("null_threshold", 50)
    high_null_cols = df.columns[df.isnull().sum() / len(df) * 100 > null_threshold]
    if len(high_null_cols) > 0:
        issues.append(f"High null percentage in columns: {list(high_null_cols)}")
    
    # Check for duplicates
    duplicate_threshold = rules.get("duplicate_threshold", 10)
    duplicate_percentage = df.duplicated().sum() / len(df) * 100
    if duplicate_percentage > duplicate_threshold:
        warnings.append(f"High duplicate percentage: {duplicate_percentage:.2f}%")
    
    # Check for data consistency
    for col in df.columns:
        if df[col].dtype == "object":
            # Check for mixed case issues
            unique_lower = df[col].str.lower().nunique()
            unique_original = df[col].nunique()
            if unique_lower < unique_original:
                warnings.append(f"Mixed case values detected in column: {col}")
    
    return {
        "total_issues": len(issues),
        "total_warnings": len(warnings),
        "issues": issues,
        "warnings": warnings,
        "quality_score": max(0, 100 - len(issues) * 10 - len(warnings) * 5)
    }

def _apply_cleaning_rules(df: pd.DataFrame, rules: Dict[str, Any]) -> pd.DataFrame:
    """Apply data cleaning rules."""
    
    cleaned_df = df.copy()
    
    # Remove duplicates
    if rules.get("remove_duplicates", False):
        cleaned_df = cleaned_df.drop_duplicates()
    
    # Handle missing values
    if "missing_value_strategy" in rules:
        strategy = rules["missing_value_strategy"]
        if strategy == "drop":
            cleaned_df = cleaned_df.dropna()
        elif strategy == "forward_fill":
            cleaned_df = cleaned_df.fillna(method="ffill")
        elif strategy == "backward_fill":
            cleaned_df = cleaned_df.fillna(method="bfill")
        elif strategy == "mean":
            numeric_cols = cleaned_df.select_dtypes(include=[np.number]).columns
            cleaned_df[numeric_cols] = cleaned_df[numeric_cols].fillna(cleaned_df[numeric_cols].mean())
    
    # Standardize text case
    if rules.get("standardize_case", False):
        text_cols = cleaned_df.select_dtypes(include=["object"]).columns
        for col in text_cols:
            cleaned_df[col] = cleaned_df[col].str.lower().str.strip()
    
    return cleaned_df

def _apply_transformation(df: pd.DataFrame, transform: Dict[str, Any]) -> pd.DataFrame:
    """Apply a single transformation to dataframe."""
    
    transform_type = transform.get("type")
    
    if transform_type == "filter":
        # Apply filtering conditions
        condition = transform.get("condition")
        return df.query(condition) if condition else df
    
    elif transform_type == "aggregate":
        # Apply aggregation
        group_by = transform.get("group_by", [])
        agg_functions = transform.get("aggregations", {})
        return df.groupby(group_by).agg(agg_functions).reset_index()
    
    elif transform_type == "sort":
        # Sort data
        columns = transform.get("columns", [])
        ascending = transform.get("ascending", True)
        return df.sort_values(columns, ascending=ascending)
    
    elif transform_type == "rename":
        # Rename columns
        column_mapping = transform.get("column_mapping", {})
        return df.rename(columns=column_mapping)
    
    elif transform_type == "drop":
        # Drop columns
        columns_to_drop = transform.get("columns", [])
        return df.drop(columns=columns_to_drop, errors="ignore")
    
    elif transform_type == "create_column":
        # Create new column
        new_col_name = transform.get("column_name")
        expression = transform.get("expression")
        df[new_col_name] = df.eval(expression)
        return df
    
    else:
        logger.warning(f"Unknown transformation type: {transform_type}")
        return df

def _load_dataset(dataset_id: str) -> pd.DataFrame:
    """Load dataset from storage."""
    # This would typically load from database or file system
    # For now, returning empty dataframe
    return pd.DataFrame()

def _store_processed_data(df: pd.DataFrame, original_path: str) -> str:
    """Store processed data and return new path."""
    # This would save to appropriate storage
    processed_path = original_path.replace(".csv", "_processed.csv")
    df.to_csv(processed_path, index=False)
    return processed_path

def _save_transformed_dataset(df: pd.DataFrame, original_dataset_id: str) -> str:
    """Save transformed dataset and return new ID."""
    new_id = f"{original_dataset_id}_transformed_{int(datetime.now().timestamp())}"
    # Save logic would go here
    return new_id

def _save_sample_dataset(df: pd.DataFrame, original_dataset_id: str, config: Dict[str, Any]) -> str:
    """Save sample dataset and return new ID."""
    sample_id = f"{original_dataset_id}_sample_{int(datetime.now().timestamp())}"
    # Save logic would go here
    return sample_id

def _validate_schema(df: pd.DataFrame, expected_schema: Dict[str, Any]) -> Dict[str, Any]:
    """Validate dataframe against expected schema."""
    
    errors = []
    warnings = []
    
    # Check required columns
    required_columns = expected_schema.get("required_columns", [])
    missing_columns = set(required_columns) - set(df.columns)
    if missing_columns:
        errors.append(f"Missing required columns: {list(missing_columns)}")
    
    # Check data types
    expected_types = expected_schema.get("column_types", {})
    for col, expected_type in expected_types.items():
        if col in df.columns:
            actual_type = str(df[col].dtype)
            if expected_type not in actual_type:
                warnings.append(f"Column {col} has type {actual_type}, expected {expected_type}")
    
    is_valid = len(errors) == 0
    compliance_score = max(0, 100 - len(errors) * 20 - len(warnings) * 5)
    
    return {
        "is_valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "compliance_score": compliance_score
    }

def _generate_sample(df: pd.DataFrame, size: int, method: str, config: Dict[str, Any]) -> pd.DataFrame:
    """Generate sample from dataframe."""
    
    if method == "random":
        return df.sample(n=min(size, len(df)), random_state=42)
    elif method == "systematic":
        step = len(df) // size
        return df.iloc[::max(1, step)].head(size)
    elif method == "stratified":
        # Stratified sampling based on specified column
        strata_column = config.get("strata_column")
        if strata_column and strata_column in df.columns:
            return df.groupby(strata_column).apply(
                lambda x: x.sample(min(len(x), size // df[strata_column].nunique()))
            ).reset_index(drop=True)
    
    # Default to random sampling
    return df.sample(n=min(size, len(df)), random_state=42)