"""Real data transformation operations for ETL/ELT pipelines."""

import pandas as pd
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import re

logger = logging.getLogger(__name__)


class DataTransformations:
    """Real data transformation operations for ETL/ELT pipelines."""
    
    @staticmethod
    def join_data(
        left_data: List[Dict[str, Any]], 
        right_data: List[Dict[str, Any]], 
        join_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Perform JOIN operations on two datasets.
        
        Args:
            left_data: Left dataset
            right_data: Right dataset 
            join_config: Join configuration with keys:
                - left_on: Column name in left dataset
                - right_on: Column name in right dataset
                - how: Join type ('inner', 'left', 'right', 'outer')
                - suffix: Suffix for duplicate columns
        """
        start_time = datetime.now()
        
        try:
            # Convert to DataFrames
            left_df = pd.DataFrame(left_data)
            right_df = pd.DataFrame(right_data)
            
            # Extract join parameters
            left_on = join_config.get("left_on")
            right_on = join_config.get("right_on", left_on)
            how = join_config.get("how", "inner")
            suffix = join_config.get("suffix", ("_left", "_right"))
            
            # Perform the join
            if left_on and right_on:
                joined_df = pd.merge(
                    left_df, right_df,
                    left_on=left_on, right_on=right_on,
                    how=how, suffixes=suffix
                )
            else:
                # If no join keys specified, cross join
                left_df['_key'] = 1
                right_df['_key'] = 1
                joined_df = pd.merge(left_df, right_df, on='_key', how='outer', suffixes=suffix)
                joined_df = joined_df.drop('_key', axis=1)
            
            # Convert back to list of dicts
            result_data = joined_df.to_dict('records')
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"JOIN operation completed: {len(left_data)} + {len(right_data)} → {len(result_data)} records in {execution_time:.2f}s")
            
            return {
                "status": "success",
                "data": result_data,
                "original_left_count": len(left_data),
                "original_right_count": len(right_data),
                "result_count": len(result_data),
                "join_type": how,
                "execution_time_seconds": execution_time,
                "join_keys": {"left": left_on, "right": right_on}
            }
            
        except Exception as e:
            logger.error(f"JOIN operation failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "data": [],
                "execution_time_seconds": (datetime.now() - start_time).total_seconds()
            }
    
    @staticmethod
    def deduplicate_data(
        data: List[Dict[str, Any]], 
        dedup_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Remove duplicate records from dataset.
        
        Args:
            data: Input dataset
            dedup_config: Deduplication configuration with keys:
                - columns: Columns to use for duplicate detection
                - keep: Which duplicate to keep ('first', 'last', False for remove all)
                - strategy: 'exact' or 'fuzzy' matching
        """
        start_time = datetime.now()
        original_count = len(data)
        
        try:
            # Convert to DataFrame
            df = pd.DataFrame(data)
            
            # Extract dedup parameters
            columns = dedup_config.get("columns", None)  # None means all columns
            keep = dedup_config.get("keep", "first")
            strategy = dedup_config.get("strategy", "exact")
            
            if strategy == "exact":
                # Standard pandas duplicate removal
                if columns:
                    # Ensure columns exist
                    available_columns = [col for col in columns if col in df.columns]
                    if not available_columns:
                        available_columns = list(df.columns)
                else:
                    available_columns = None
                
                deduplicated_df = df.drop_duplicates(subset=available_columns, keep=keep)
                
            elif strategy == "fuzzy":
                # Fuzzy deduplication (simplified implementation)
                # This is a basic example - real fuzzy matching would use more sophisticated algorithms
                deduplicated_df = df.copy()
                
                if columns:
                    for col in columns:
                        if col in df.columns and df[col].dtype == 'object':
                            # Simple fuzzy matching for string columns
                            df[col] = df[col].astype(str).str.lower().str.strip()
                
                deduplicated_df = df.drop_duplicates(subset=columns, keep=keep)
            else:
                # Default to exact matching
                deduplicated_df = df.drop_duplicates(keep=keep)
            
            # Convert back to list of dicts
            result_data = deduplicated_df.to_dict('records')
            
            execution_time = (datetime.now() - start_time).total_seconds()
            duplicates_removed = original_count - len(result_data)
            
            logger.info(f"DEDUPLICATE operation completed: {original_count} → {len(result_data)} records ({duplicates_removed} duplicates removed) in {execution_time:.2f}s")
            
            return {
                "status": "success",
                "data": result_data,
                "original_count": original_count,
                "result_count": len(result_data),
                "duplicates_removed": duplicates_removed,
                "dedup_strategy": strategy,
                "dedup_columns": columns,
                "execution_time_seconds": execution_time
            }
            
        except Exception as e:
            logger.error(f"DEDUPLICATE operation failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "data": data,  # Return original data on error
                "execution_time_seconds": (datetime.now() - start_time).total_seconds()
            }
    
    @staticmethod
    def validate_data(
        data: List[Dict[str, Any]], 
        validation_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate data against defined rules and constraints.
        
        Args:
            data: Input dataset
            validation_config: Validation configuration with keys:
                - rules: List of validation rules
                - action: 'filter' (remove invalid), 'flag' (mark invalid), 'report' (report only)
                - strict: Boolean, if True fails on any validation error
        """
        start_time = datetime.now()
        original_count = len(data)
        
        try:
            # Convert to DataFrame
            df = pd.DataFrame(data)
            
            # Extract validation parameters
            rules = validation_config.get("rules", [])
            action = validation_config.get("action", "report")
            strict = validation_config.get("strict", False)
            
            validation_results = []
            invalid_rows = set()
            
            # Apply validation rules
            for rule in rules:
                rule_name = rule.get("name", "unnamed_rule")
                rule_type = rule.get("type")
                rule_config = rule.get("config", {})
                
                if rule_type == "not_null":
                    # Check for null values
                    columns = rule_config.get("columns", [])
                    for col in columns:
                        if col in df.columns:
                            null_mask = df[col].isnull()
                            null_count = null_mask.sum()
                            if null_count > 0:
                                invalid_indices = df[null_mask].index.tolist()
                                invalid_rows.update(invalid_indices)
                                validation_results.append({
                                    "rule": rule_name,
                                    "type": "not_null",
                                    "column": col,
                                    "invalid_count": null_count,
                                    "invalid_indices": invalid_indices
                                })
                
                elif rule_type == "data_type":
                    # Check data types
                    columns = rule_config.get("columns", [])
                    expected_type = rule_config.get("expected_type")
                    
                    for col in columns:
                        if col in df.columns and expected_type:
                            try:
                                if expected_type == "numeric":
                                    invalid_mask = ~pd.to_numeric(df[col], errors='coerce').notna()
                                elif expected_type == "date":
                                    invalid_mask = ~pd.to_datetime(df[col], errors='coerce').notna()
                                elif expected_type == "email":
                                    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                                    invalid_mask = ~df[col].astype(str).str.match(email_pattern, na=False)
                                else:
                                    continue  # Skip unknown types
                                
                                invalid_count = invalid_mask.sum()
                                if invalid_count > 0:
                                    invalid_indices = df[invalid_mask].index.tolist()
                                    invalid_rows.update(invalid_indices)
                                    validation_results.append({
                                        "rule": rule_name,
                                        "type": "data_type",
                                        "column": col,
                                        "expected_type": expected_type,
                                        "invalid_count": invalid_count,
                                        "invalid_indices": invalid_indices
                                    })
                            except Exception as rule_error:
                                logger.warning(f"Rule {rule_name} failed: {str(rule_error)}")
                
                elif rule_type == "range":
                    # Check value ranges
                    column = rule_config.get("column")
                    min_val = rule_config.get("min")
                    max_val = rule_config.get("max")
                    
                    if column in df.columns:
                        invalid_mask = pd.Series([False] * len(df))
                        
                        if min_val is not None:
                            invalid_mask |= (df[column] < min_val)
                        if max_val is not None:
                            invalid_mask |= (df[column] > max_val)
                        
                        invalid_count = invalid_mask.sum()
                        if invalid_count > 0:
                            invalid_indices = df[invalid_mask].index.tolist()
                            invalid_rows.update(invalid_indices)
                            validation_results.append({
                                "rule": rule_name,
                                "type": "range",
                                "column": column,
                                "min": min_val,
                                "max": max_val,
                                "invalid_count": invalid_count,
                                "invalid_indices": invalid_indices
                            })
                
                elif rule_type == "unique":
                    # Check uniqueness
                    columns = rule_config.get("columns", [])
                    for col in columns:
                        if col in df.columns:
                            duplicate_mask = df.duplicated(subset=[col], keep=False)
                            duplicate_count = duplicate_mask.sum()
                            if duplicate_count > 0:
                                invalid_indices = df[duplicate_mask].index.tolist()
                                invalid_rows.update(invalid_indices)
                                validation_results.append({
                                    "rule": rule_name,
                                    "type": "unique",
                                    "column": col,
                                    "duplicate_count": duplicate_count,
                                    "invalid_indices": invalid_indices
                                })
            
            # Apply action based on validation results
            if action == "filter":
                # Remove invalid rows
                valid_df = df.drop(index=list(invalid_rows))
                result_data = valid_df.to_dict('records')
            elif action == "flag":
                # Add validation flag column
                df['_validation_status'] = 'valid'
                df.loc[list(invalid_rows), '_validation_status'] = 'invalid'
                result_data = df.to_dict('records')
            else:  # action == "report"
                # Keep all data, just report issues
                result_data = df.to_dict('records')
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # Check strict mode
            if strict and len(invalid_rows) > 0:
                raise ValueError(f"Strict validation failed: {len(invalid_rows)} invalid records found")
            
            logger.info(f"VALIDATE operation completed: {original_count} records, {len(invalid_rows)} invalid, {len(validation_results)} rule violations in {execution_time:.2f}s")
            
            return {
                "status": "success",
                "data": result_data,
                "original_count": original_count,
                "result_count": len(result_data),
                "invalid_count": len(invalid_rows),
                "validation_results": validation_results,
                "action": action,
                "strict_mode": strict,
                "execution_time_seconds": execution_time
            }
            
        except Exception as e:
            logger.error(f"VALIDATE operation failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "data": data,  # Return original data on error
                "execution_time_seconds": (datetime.now() - start_time).total_seconds()
            }
    
    @staticmethod
    def aggregate_data(
        data: List[Dict[str, Any]], 
        agg_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Perform aggregation operations on dataset.
        
        Args:
            data: Input dataset
            agg_config: Aggregation configuration with keys:
                - group_by: Columns to group by
                - aggregations: Dict of column -> aggregation function
        """
        start_time = datetime.now()
        
        try:
            # Convert to DataFrame
            df = pd.DataFrame(data)
            
            # Extract aggregation parameters
            group_by = agg_config.get("group_by", [])
            aggregations = agg_config.get("aggregations", {})
            
            if group_by and aggregations:
                # Group by aggregation
                agg_df = df.groupby(group_by).agg(aggregations).reset_index()
                
                # Flatten column names if multi-level
                if isinstance(agg_df.columns, pd.MultiIndex):
                    agg_df.columns = ['_'.join(col).strip() if col[1] else col[0] for col in agg_df.columns]
            
            elif aggregations:
                # Global aggregation without grouping - manual approach for more control
                agg_data = {}
                for column, funcs in aggregations.items():
                    if column in df.columns:
                        if isinstance(funcs, list):
                            # Multiple functions for one column
                            for func in funcs:
                                key = f"{column}_{func}"
                                try:
                                    if func == "sum":
                                        agg_data[key] = df[column].sum()
                                    elif func == "mean":
                                        agg_data[key] = df[column].mean()
                                    elif func == "count":
                                        agg_data[key] = df[column].count()
                                    elif func == "max":
                                        agg_data[key] = df[column].max()
                                    elif func == "min":
                                        agg_data[key] = df[column].min()
                                    elif func == "std":
                                        agg_data[key] = df[column].std()
                                    else:
                                        # Fallback to pandas agg
                                        agg_data[key] = df[column].agg(func)
                                except Exception as e:
                                    logger.warning(f"Aggregation {func} failed for column {column}: {e}")
                        else:
                            # Single function for one column
                            key = f"{column}_{funcs}" if funcs != "count" else f"{column}_count"
                            try:
                                if funcs == "sum":
                                    agg_data[key] = df[column].sum()
                                elif funcs == "mean":
                                    agg_data[key] = df[column].mean()
                                elif funcs == "count":
                                    agg_data[key] = df[column].count()
                                elif funcs == "max":
                                    agg_data[key] = df[column].max()
                                elif funcs == "min":
                                    agg_data[key] = df[column].min()
                                elif funcs == "std":
                                    agg_data[key] = df[column].std()
                                else:
                                    # Fallback to pandas agg
                                    agg_data[key] = df[column].agg(funcs)
                            except Exception as e:
                                logger.warning(f"Aggregation {funcs} failed for column {column}: {e}")
                
                agg_df = pd.DataFrame([agg_data]) if agg_data else pd.DataFrame()
            
            else:
                # No aggregation specified, return original data
                agg_df = df
            
            result_data = agg_df.to_dict('records')
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"AGGREGATE operation completed: {len(data)} → {len(result_data)} records in {execution_time:.2f}s")
            
            return {
                "status": "success",
                "data": result_data,
                "original_count": len(data),
                "result_count": len(result_data),
                "group_by": group_by,
                "aggregations": aggregations,
                "execution_time_seconds": execution_time
            }
            
        except Exception as e:
            logger.error(f"AGGREGATE operation failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "data": data,
                "execution_time_seconds": (datetime.now() - start_time).total_seconds()
            }