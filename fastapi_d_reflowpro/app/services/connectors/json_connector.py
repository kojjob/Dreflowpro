"""JSON file connector for reading JSON files."""

from typing import Dict, Any, Optional, List, Union
import pandas as pd
import json
import logging
from datetime import datetime

from .file_base_connector import FileBaseConnector

logger = logging.getLogger(__name__)


class JSONConnector(FileBaseConnector):
    """Connector for reading JSON files."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize JSON connector.
        
        Args:
            config: Configuration dictionary with JSON-specific settings:
                - file_id: Uploaded file ID (or file_path)
                - file_path: Direct path to JSON file
                - orient: Data orientation ('records', 'index', 'values', 'columns')
                - encoding: File encoding (default: 'utf-8')
                - lines: True if JSON file contains one JSON object per line
                - normalize_nested: Flatten nested JSON structures
        """
        super().__init__(config)
        
        # JSON-specific options
        self.orient = config.get("orient", "records")  # Default to records format
        self.encoding = config.get("encoding", "utf-8")
        self.lines = config.get("lines", False)  # True for JSON Lines format
        self.normalize_nested = config.get("normalize_nested", True)
        
        # Nested JSON handling
        self.max_level = config.get("max_level", None)  # Max nesting level to flatten
        self.sep = config.get("sep", ".")  # Separator for flattened column names
    
    async def _read_dataframe(self, preview_rows: Optional[int] = None) -> pd.DataFrame:
        """Read JSON file into pandas DataFrame."""
        try:
            if self.lines:
                # Handle JSON Lines format (one JSON object per line)
                df = self._read_json_lines(preview_rows)
            else:
                # Handle standard JSON format
                df = self._read_standard_json(preview_rows)
            
            logger.info(f"JSON file read successfully: {len(df)} rows, {len(df.columns)} columns")
            return df
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {str(e)}")
            
        except Exception as e:
            logger.error(f"Failed to read JSON file: {str(e)}")
            raise ValueError(f"JSON read error: {str(e)}")
    
    def _read_standard_json(self, preview_rows: Optional[int] = None) -> pd.DataFrame:
        """Read standard JSON file."""
        # Try pandas read_json first (fastest for standard formats)
        try:
            df = pd.read_json(self.file_path, orient=self.orient, encoding=self.encoding)
            
            # Apply preview limit if specified
            if preview_rows:
                df = df.head(preview_rows)
            
            # Normalize nested structures if requested
            if self.normalize_nested and not df.empty:
                df = self._normalize_nested_data(df)
            
            return df
            
        except ValueError:
            # If pandas fails, try manual parsing
            return self._read_json_manual(preview_rows)
    
    def _read_json_lines(self, preview_rows: Optional[int] = None) -> pd.DataFrame:
        """Read JSON Lines format file."""
        records = []
        
        with open(self.file_path, 'r', encoding=self.encoding) as f:
            for i, line in enumerate(f):
                if preview_rows and i >= preview_rows:
                    break
                
                line = line.strip()
                if line:
                    try:
                        record = json.loads(line)
                        records.append(record)
                    except json.JSONDecodeError as e:
                        logger.warning(f"Skipping invalid JSON line {i+1}: {e}")
                        continue
        
        if not records:
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.json_normalize(records) if self.normalize_nested else pd.DataFrame(records)
        return df
    
    def _read_json_manual(self, preview_rows: Optional[int] = None) -> pd.DataFrame:
        """Manually parse JSON file when pandas fails."""
        with open(self.file_path, 'r', encoding=self.encoding) as f:
            data = json.load(f)
        
        # Handle different data structures
        if isinstance(data, list):
            # List of records
            if preview_rows:
                data = data[:preview_rows]
            
            if self.normalize_nested:
                df = pd.json_normalize(data, max_level=self.max_level, sep=self.sep)
            else:
                df = pd.DataFrame(data)
                
        elif isinstance(data, dict):
            # Dictionary - could be various formats
            if self.orient == 'records' and 'data' in data:
                # Common format: {"data": [records]}
                records = data['data']
                if preview_rows:
                    records = records[:preview_rows]
                
                if self.normalize_nested:
                    df = pd.json_normalize(records, max_level=self.max_level, sep=self.sep)
                else:
                    df = pd.DataFrame(records)
                    
            elif all(isinstance(v, (list, dict)) for v in data.values()):
                # Column-oriented data: {"col1": [values], "col2": [values]}
                df = pd.DataFrame(data)
                if preview_rows:
                    df = df.head(preview_rows)
                    
            else:
                # Single record
                if self.normalize_nested:
                    df = pd.json_normalize([data], max_level=self.max_level, sep=self.sep)
                else:
                    df = pd.DataFrame([data])
        else:
            raise ValueError(f"Unsupported JSON structure: {type(data)}")
        
        return df
    
    def _normalize_nested_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize nested JSON structures in DataFrame."""
        try:
            # Check if any columns contain nested data
            nested_columns = []
            for col in df.columns:
                sample_values = df[col].dropna().head(5)
                if any(isinstance(val, (dict, list)) for val in sample_values):
                    nested_columns.append(col)
            
            if not nested_columns:
                return df
            
            # Normalize the entire DataFrame if nested data is found
            records = df.to_dict('records')
            normalized_df = pd.json_normalize(records, max_level=self.max_level, sep=self.sep)
            
            logger.info(f"Normalized {len(nested_columns)} nested columns")
            return normalized_df
            
        except Exception as e:
            logger.warning(f"Failed to normalize nested data: {str(e)}")
            return df
    
    async def get_json_info(self) -> Dict[str, Any]:
        """Get detailed JSON file information."""
        try:
            # Read a preview to analyze structure
            preview_df = await self._read_dataframe(preview_rows=100)
            
            # Analyze the raw JSON structure
            with open(self.file_path, 'r', encoding=self.encoding) as f:
                if self.lines:
                    # For JSON Lines, read first few lines
                    sample_lines = [f.readline().strip() for _ in range(5)]
                    raw_structure = [json.loads(line) for line in sample_lines if line]
                else:
                    # For standard JSON, load the structure
                    raw_data = json.load(f)
                    raw_structure = raw_data
            
            # Analyze columns
            columns_analysis = []
            for col in preview_df.columns:
                col_data = preview_df[col]
                
                # Check if column contains nested data
                sample_values = col_data.dropna().head(5)
                has_nested = any(isinstance(val, (dict, list)) for val in sample_values)
                
                # Try to infer data type
                inferred_type = self._infer_column_type(col_data)
                
                columns_analysis.append({
                    "name": str(col),
                    "inferred_type": inferred_type,
                    "has_nested_data": has_nested,
                    "null_count": int(col_data.isnull().sum()),
                    "unique_count": int(col_data.nunique()),
                    "sample_values": [str(v) for v in col_data.dropna().head(3).tolist()]
                })
            
            return {
                "format": "json_lines" if self.lines else "standard_json",
                "encoding": self.encoding,
                "orient": self.orient,
                "normalized": self.normalize_nested,
                "row_count": len(preview_df),
                "column_count": len(preview_df.columns),
                "columns": columns_analysis,
                "raw_structure_type": type(raw_structure).__name__,
                "preview_successful": True
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze JSON file: {str(e)}")
            return {
                "error": str(e),
                "preview_successful": False
            }
    
    def _infer_column_type(self, series: pd.Series) -> str:
        """Infer the data type of a pandas Series."""
        try:
            # Remove null values for analysis
            clean_series = series.dropna()
            
            if clean_series.empty:
                return "string"
            
            # Check for nested data first
            if any(isinstance(val, (dict, list)) for val in clean_series.head(3)):
                return "nested"
            
            # Try numeric conversion
            try:
                numeric_series = pd.to_numeric(clean_series, errors='coerce')
                if not numeric_series.isna().any():
                    # Check if integer
                    if (numeric_series == numeric_series.astype(int)).all():
                        return "integer"
                    else:
                        return "float"
            except:
                pass
            
            # Try boolean conversion
            if clean_series.astype(str).str.lower().isin(['true', 'false']).all():
                return "boolean"
            
            # Try datetime conversion
            try:
                datetime_series = pd.to_datetime(clean_series, errors='coerce', infer_datetime_format=True)
                if not datetime_series.isna().any():
                    return "datetime"
            except:
                pass
            
            # Default to string
            return "string"
            
        except Exception:
            return "string"
    
    def get_connection_test_query(self) -> str:
        """Return a test query for this connector."""
        return f"Preview first 10 rows from {self.file_path or 'uploaded JSON file'}"