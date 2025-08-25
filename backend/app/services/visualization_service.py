"""Data visualization service for generating charts and insights."""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Union
import logging
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class VisualizationService:
    """Service for generating data visualizations and insights."""
    
    @staticmethod
    def analyze_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyze DataFrame and generate comprehensive insights.
        
        Args:
            df: DataFrame to analyze
            
        Returns:
            Dictionary with analysis results and visualization data
        """
        try:
            analysis = {
                "basic_stats": VisualizationService._get_basic_statistics(df),
                "column_analysis": VisualizationService._analyze_columns(df),
                "data_quality": VisualizationService._assess_data_quality(df),
                "visualizations": VisualizationService._generate_visualizations(df)
            }
            
            return {
                "success": True,
                "analysis": analysis
            }
            
        except Exception as e:
            logger.error(f"DataFrame analysis failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def _get_basic_statistics(df: pd.DataFrame) -> Dict[str, Any]:
        """Get basic statistics about the DataFrame."""
        return {
            "row_count": len(df),
            "column_count": len(df.columns),
            "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
            "duplicate_count": int(df.duplicated().sum()),
            "total_null_count": int(df.isnull().sum().sum()),
            "columns": list(df.columns),
            "data_types": df.dtypes.astype(str).to_dict()
        }
    
    @staticmethod
    def _analyze_columns(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze each column in detail."""
        columns_analysis = []
        
        for col in df.columns:
            col_data = df[col]
            col_info = {
                "name": col,
                "dtype": str(col_data.dtype),
                "null_count": int(col_data.isnull().sum()),
                "null_percentage": float(col_data.isnull().sum() / len(df) * 100),
                "unique_count": int(col_data.nunique()),
                "unique_percentage": float(col_data.nunique() / len(df) * 100) if len(df) > 0 else 0,
                "sample_values": col_data.dropna().head(5).astype(str).tolist()
            }
            
            # Type-specific analysis
            if pd.api.types.is_numeric_dtype(col_data):
                col_info.update(VisualizationService._analyze_numeric_column(col_data))
            elif pd.api.types.is_datetime64_any_dtype(col_data):
                col_info.update(VisualizationService._analyze_datetime_column(col_data))
            else:
                col_info.update(VisualizationService._analyze_categorical_column(col_data))
            
            columns_analysis.append(col_info)
        
        return columns_analysis
    
    @staticmethod
    def _analyze_numeric_column(series: pd.Series) -> Dict[str, Any]:
        """Analyze numeric column."""
        try:
            clean_series = series.dropna()
            if clean_series.empty:
                return {"analysis_type": "numeric", "error": "No non-null values"}
            
            stats = clean_series.describe()
            
            return {
                "analysis_type": "numeric",
                "min": float(stats['min']),
                "max": float(stats['max']),
                "mean": float(stats['mean']),
                "median": float(stats['50%']),
                "std": float(stats['std']),
                "q1": float(stats['25%']),
                "q3": float(stats['75%']),
                "outliers_count": VisualizationService._count_outliers(clean_series),
                "is_integer": all(clean_series == clean_series.astype(int)) if not clean_series.empty else False
            }
            
        except Exception as e:
            logger.warning(f"Numeric column analysis failed: {str(e)}")
            return {"analysis_type": "numeric", "error": str(e)}
    
    @staticmethod
    def _analyze_datetime_column(series: pd.Series) -> Dict[str, Any]:
        """Analyze datetime column."""
        try:
            clean_series = series.dropna()
            if clean_series.empty:
                return {"analysis_type": "datetime", "error": "No non-null values"}
            
            return {
                "analysis_type": "datetime",
                "min_date": clean_series.min().isoformat(),
                "max_date": clean_series.max().isoformat(),
                "date_range_days": (clean_series.max() - clean_series.min()).days,
                "most_common_year": clean_series.dt.year.mode().iloc[0] if not clean_series.empty else None,
                "most_common_month": clean_series.dt.month.mode().iloc[0] if not clean_series.empty else None
            }
            
        except Exception as e:
            logger.warning(f"Datetime column analysis failed: {str(e)}")
            return {"analysis_type": "datetime", "error": str(e)}
    
    @staticmethod
    def _analyze_categorical_column(series: pd.Series) -> Dict[str, Any]:
        """Analyze categorical/text column."""
        try:
            clean_series = series.dropna()
            if clean_series.empty:
                return {"analysis_type": "categorical", "error": "No non-null values"}
            
            value_counts = clean_series.value_counts()
            
            return {
                "analysis_type": "categorical",
                "most_frequent_value": str(value_counts.index[0]),
                "most_frequent_count": int(value_counts.iloc[0]),
                "least_frequent_value": str(value_counts.index[-1]) if len(value_counts) > 1 else None,
                "least_frequent_count": int(value_counts.iloc[-1]) if len(value_counts) > 1 else None,
                "avg_length": float(clean_series.astype(str).str.len().mean()),
                "max_length": int(clean_series.astype(str).str.len().max()),
                "min_length": int(clean_series.astype(str).str.len().min())
            }
            
        except Exception as e:
            logger.warning(f"Categorical column analysis failed: {str(e)}")
            return {"analysis_type": "categorical", "error": str(e)}
    
    @staticmethod
    def _assess_data_quality(df: pd.DataFrame) -> Dict[str, Any]:
        """Assess overall data quality."""
        try:
            total_cells = len(df) * len(df.columns)
            null_cells = df.isnull().sum().sum()
            duplicate_rows = df.duplicated().sum()
            
            # Quality score (0-100)
            null_penalty = (null_cells / total_cells) * 50 if total_cells > 0 else 0
            duplicate_penalty = (duplicate_rows / len(df)) * 30 if len(df) > 0 else 0
            
            quality_score = max(0, 100 - null_penalty - duplicate_penalty)
            
            # Identify quality issues
            issues = []
            if null_penalty > 10:
                issues.append(f"High missing data rate: {null_penalty:.1f}%")
            if duplicate_penalty > 5:
                issues.append(f"High duplicate rate: {duplicate_penalty:.1f}%")
            
            # Check for potential issues
            for col in df.columns:
                if df[col].nunique() == 1:
                    issues.append(f"Column '{col}' has only one unique value")
                elif df[col].dtype == 'object' and df[col].str.len().var() > 1000:
                    issues.append(f"Column '{col}' has highly variable text lengths")
            
            return {
                "quality_score": round(quality_score, 1),
                "completeness_percentage": round((1 - null_cells / total_cells) * 100, 1) if total_cells > 0 else 100,
                "uniqueness_percentage": round((1 - duplicate_rows / len(df)) * 100, 1) if len(df) > 0 else 100,
                "issues": issues,
                "recommendations": VisualizationService._generate_recommendations(df, issues)
            }
            
        except Exception as e:
            logger.warning(f"Data quality assessment failed: {str(e)}")
            return {"error": str(e)}
    
    @staticmethod
    def _generate_recommendations(df: pd.DataFrame, issues: List[str]) -> List[str]:
        """Generate data quality recommendations."""
        recommendations = []
        
        if any("missing data" in issue for issue in issues):
            recommendations.append("Consider using data imputation or filtering out incomplete records")
        
        if any("duplicate" in issue for issue in issues):
            recommendations.append("Use DEDUPLICATE transformation to remove duplicate records")
        
        if any("one unique value" in issue for issue in issues):
            recommendations.append("Consider removing constant columns as they don't add value")
        
        # General recommendations
        if len(df) > 10000:
            recommendations.append("For large datasets, consider sampling for faster processing")
        
        return recommendations
    
    @staticmethod
    def _generate_visualizations(df: pd.DataFrame) -> Dict[str, Any]:
        """Generate visualization data for different chart types."""
        try:
            visualizations = {}
            
            # Limit data size for visualization
            sample_df = df.sample(min(1000, len(df))) if len(df) > 1000 else df
            
            # 1. Column null counts (bar chart)
            null_counts = df.isnull().sum()
            if null_counts.sum() > 0:
                visualizations["null_counts"] = {
                    "type": "bar",
                    "title": "Missing Values by Column",
                    "data": {
                        "labels": null_counts.index.tolist(),
                        "values": null_counts.values.tolist()
                    }
                }
            
            # 2. Data type distribution (pie chart)
            type_counts = df.dtypes.value_counts()
            visualizations["data_types"] = {
                "type": "pie",
                "title": "Column Data Types",
                "data": {
                    "labels": [str(dtype) for dtype in type_counts.index],
                    "values": type_counts.values.tolist()
                }
            }
            
            # 3. Numeric column histograms
            numeric_columns = df.select_dtypes(include=[np.number]).columns
            if len(numeric_columns) > 0:
                for col in numeric_columns[:3]:  # Limit to first 3 numeric columns
                    col_data = sample_df[col].dropna()
                    if not col_data.empty:
                        hist_data = VisualizationService._create_histogram_data(col_data)
                        visualizations[f"histogram_{col}"] = {
                            "type": "histogram",
                            "title": f"Distribution of {col}",
                            "column": col,
                            "data": hist_data
                        }
            
            # 4. Categorical column value counts
            categorical_columns = df.select_dtypes(include=['object']).columns
            for col in categorical_columns[:3]:  # Limit to first 3 categorical columns
                col_data = sample_df[col].dropna()
                if not col_data.empty:
                    value_counts = col_data.value_counts().head(10)  # Top 10 values
                    visualizations[f"value_counts_{col}"] = {
                        "type": "bar",
                        "title": f"Top Values in {col}",
                        "column": col,
                        "data": {
                            "labels": value_counts.index.tolist(),
                            "values": value_counts.values.tolist()
                        }
                    }
            
            # 5. Correlation heatmap for numeric columns
            if len(numeric_columns) > 1:
                corr_matrix = sample_df[numeric_columns].corr()
                visualizations["correlation_matrix"] = {
                    "type": "heatmap",
                    "title": "Correlation Matrix",
                    "data": {
                        "columns": corr_matrix.columns.tolist(),
                        "values": corr_matrix.values.tolist()
                    }
                }
            
            return visualizations
            
        except Exception as e:
            logger.warning(f"Visualization generation failed: {str(e)}")
            return {"error": str(e)}
    
    @staticmethod
    def _create_histogram_data(series: pd.Series, bins: int = 20) -> Dict[str, Any]:
        """Create histogram data for a numeric series."""
        try:
            counts, bin_edges = np.histogram(series, bins=bins)
            
            # Create bin labels
            bin_labels = []
            for i in range(len(bin_edges) - 1):
                bin_labels.append(f"{bin_edges[i]:.2f}-{bin_edges[i+1]:.2f}")
            
            return {
                "labels": bin_labels,
                "values": counts.tolist(),
                "bin_edges": bin_edges.tolist()
            }
            
        except Exception as e:
            logger.warning(f"Histogram creation failed: {str(e)}")
            return {"labels": [], "values": []}
    
    @staticmethod
    def _count_outliers(series: pd.Series) -> int:
        """Count outliers using IQR method."""
        try:
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = series[(series < lower_bound) | (series > upper_bound)]
            return len(outliers)
            
        except Exception:
            return 0
    
    @staticmethod
    def compare_dataframes(
        df_before: pd.DataFrame, 
        df_after: pd.DataFrame, 
        transformation_name: str = "Transformation"
    ) -> Dict[str, Any]:
        """
        Compare two DataFrames and generate before/after visualization.
        
        Args:
            df_before: DataFrame before transformation
            df_after: DataFrame after transformation
            transformation_name: Name of the transformation applied
            
        Returns:
            Comparison results with visualization data
        """
        try:
            comparison = {
                "transformation": transformation_name,
                "before": VisualizationService._get_basic_statistics(df_before),
                "after": VisualizationService._get_basic_statistics(df_after),
                "changes": {},
                "visualizations": {}
            }
            
            # Calculate changes
            comparison["changes"] = {
                "row_count_change": len(df_after) - len(df_before),
                "column_count_change": len(df_after.columns) - len(df_before.columns),
                "null_count_change": df_after.isnull().sum().sum() - df_before.isnull().sum().sum(),
                "duplicate_count_change": df_after.duplicated().sum() - df_before.duplicated().sum()
            }
            
            # Before/after comparison charts
            comparison["visualizations"]["row_count_comparison"] = {
                "type": "bar",
                "title": f"{transformation_name} - Row Count Change",
                "data": {
                    "labels": ["Before", "After"],
                    "values": [len(df_before), len(df_after)]
                }
            }
            
            comparison["visualizations"]["null_count_comparison"] = {
                "type": "bar",
                "title": f"{transformation_name} - Null Count Change",
                "data": {
                    "labels": ["Before", "After"],
                    "values": [df_before.isnull().sum().sum(), df_after.isnull().sum().sum()]
                }
            }
            
            return {
                "success": True,
                "comparison": comparison
            }
            
        except Exception as e:
            logger.error(f"DataFrame comparison failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def generate_summary_report(analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a summary report from analysis results."""
        try:
            if not analysis_results.get("success"):
                return {"success": False, "error": "Invalid analysis results"}
            
            analysis = analysis_results["analysis"]
            basic_stats = analysis["basic_stats"]
            data_quality = analysis["data_quality"]
            
            # Generate executive summary
            summary = {
                "dataset_overview": f"Dataset contains {basic_stats['row_count']:,} rows and {basic_stats['column_count']} columns",
                "data_quality_score": data_quality["quality_score"],
                "key_insights": [],
                "recommendations": data_quality.get("recommendations", [])
            }
            
            # Generate key insights
            if basic_stats["duplicate_count"] > 0:
                summary["key_insights"].append(f"Found {basic_stats['duplicate_count']:,} duplicate rows")
            
            if basic_stats["total_null_count"] > 0:
                summary["key_insights"].append(f"Found {basic_stats['total_null_count']:,} missing values")
            
            # Column-specific insights
            numeric_cols = [col for col in analysis["column_analysis"] if col["analysis_type"] == "numeric"]
            categorical_cols = [col for col in analysis["column_analysis"] if col["analysis_type"] == "categorical"]
            datetime_cols = [col for col in analysis["column_analysis"] if col["analysis_type"] == "datetime"]
            
            summary["key_insights"].append(f"Dataset has {len(numeric_cols)} numeric, {len(categorical_cols)} categorical, and {len(datetime_cols)} datetime columns")
            
            return {
                "success": True,
                "summary": summary
            }
            
        except Exception as e:
            logger.error(f"Summary report generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }