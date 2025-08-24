"""Base file connector for reading various file formats."""

from abc import abstractmethod
from typing import Dict, Any, List, AsyncGenerator, Optional
import pandas as pd
import logging
from datetime import datetime

from .base_connector import BaseConnector
from ..file_handler import file_handler

logger = logging.getLogger(__name__)


class FileBaseConnector(BaseConnector):
    """Base class for file-based connectors."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize file connector.
        
        Args:
            config: Configuration dictionary with file-specific settings
        """
        super().__init__(config)
        self.file_id = config.get("file_id")
        self.file_path = config.get("file_path")
        self.read_options = config.get("read_options", {})
        
        # If file_id provided, get file path from file handler
        if self.file_id and not self.file_path:
            self.file_path = file_handler.get_file_path(self.file_id)
            if not self.file_path:
                raise ValueError(f"File not found for file_id: {self.file_id}")
    
    async def connect(self) -> bool:
        """Test file accessibility."""
        try:
            if self.file_id:
                # Check if file exists in file handler
                metadata = file_handler.get_file_metadata(self.file_id)
                return metadata is not None and file_handler.get_file_path(self.file_id) is not None
            elif self.file_path:
                # Check if file path exists
                import os
                return os.path.exists(self.file_path)
            else:
                return False
                
        except Exception as e:
            logger.error(f"File connection test failed: {str(e)}")
            return False
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test file connection and return details."""
        try:
            start_time = datetime.now()
            
            if not await self.connect():
                return {
                    "status": "error",
                    "error": "File not accessible or not found"
                }
            
            # Try to read a sample of the file
            sample_data = await self._read_sample()
            
            connection_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "status": "success",
                "file_accessible": True,
                "sample_row_count": len(sample_data) if sample_data else 0,
                "columns": list(sample_data[0].keys()) if sample_data else [],
                "connection_time_seconds": connection_time,
                "file_metadata": file_handler.get_file_metadata(self.file_id) if self.file_id else None
            }
            
        except Exception as e:
            logger.error(f"File connection test failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def get_schema_info(self) -> Dict[str, Any]:
        """Get file structure information."""
        try:
            if self.file_id:
                # Use file handler to analyze file
                file_data = file_handler.read_file_data(self.file_id, preview_rows=100)
                if not file_data["success"]:
                    return {
                        "columns": [],
                        "row_count": 0,
                        "error": file_data["error"]
                    }
                
                data_info = file_data["data_info"]
                
                # Convert to schema format similar to database connectors
                columns = []
                for col_info in data_info["columns"]:
                    columns.append({
                        "column_name": col_info["name"],
                        "data_type": self._map_pandas_type_to_sql(col_info["dtype"]),
                        "is_nullable": col_info["null_count"] > 0,
                        "null_count": col_info["null_count"],
                        "null_percentage": col_info["null_percentage"],
                        "unique_count": col_info["unique_count"],
                        "sample_values": col_info["sample_values"][:3]  # Limit sample values
                    })
                
                return {
                    "columns": columns,
                    "row_count": data_info["row_count"],
                    "column_count": data_info["column_count"],
                    "memory_usage_mb": data_info.get("memory_usage_mb", 0),
                    "duplicate_count": data_info.get("duplicate_count", 0),
                    "total_null_count": data_info.get("total_null_count", 0)
                }
            else:
                # Read file directly
                sample_df = await self._read_dataframe(preview_rows=100)
                
                columns = []
                for col in sample_df.columns:
                    col_data = sample_df[col]
                    columns.append({
                        "column_name": col,
                        "data_type": self._map_pandas_type_to_sql(str(col_data.dtype)),
                        "is_nullable": col_data.isnull().any(),
                        "null_count": int(col_data.isnull().sum()),
                        "unique_count": int(col_data.nunique()),
                        "sample_values": col_data.dropna().head(3).tolist()
                    })
                
                return {
                    "columns": columns,
                    "row_count": len(sample_df),
                    "column_count": len(sample_df.columns)
                }
                
        except Exception as e:
            logger.error(f"Schema info retrieval failed: {str(e)}")
            return {
                "columns": [],
                "row_count": 0,
                "error": str(e)
            }
    
    async def extract_data(
        self, 
        query_config: Dict[str, Any], 
        batch_size: int = 1000,
        limit: Optional[int] = None
    ) -> AsyncGenerator[pd.DataFrame, None]:
        """Extract data from file in batches."""
        try:
            # Read the entire file (for files, we typically read all at once)
            if self.file_id:
                file_data = file_handler.read_file_data(self.file_id)
                if not file_data["success"]:
                    raise ValueError(f"Failed to read file: {file_data['error']}")
                
                # Convert to DataFrame
                df = pd.DataFrame(file_data["preview_data"])
            else:
                df = await self._read_dataframe()
            
            # Apply any filtering from query_config
            df = await self._apply_query_filters(df, query_config)
            
            # Apply limit if specified
            if limit:
                df = df.head(limit)
            
            # Yield data in batches
            total_rows = len(df)
            for start_idx in range(0, total_rows, batch_size):
                end_idx = min(start_idx + batch_size, total_rows)
                batch_df = df.iloc[start_idx:end_idx].copy()
                
                if not batch_df.empty:
                    yield batch_df
                    
        except Exception as e:
            logger.error(f"Data extraction failed: {str(e)}")
            raise
    
    async def load_data(
        self, 
        data: pd.DataFrame, 
        load_config: Dict[str, Any], 
        mode: str = "append"
    ) -> Dict[str, Any]:
        """File connectors typically don't support loading - this is for export connectors."""
        return {
            "status": "error",
            "error": "File connectors do not support data loading. Use export connectors for file output."
        }
    
    async def disconnect(self) -> bool:
        """Disconnect (no-op for file connectors)."""
        return True
    
    @abstractmethod
    async def _read_dataframe(self, preview_rows: Optional[int] = None) -> pd.DataFrame:
        """Read file content into a pandas DataFrame."""
        pass
    
    async def _read_sample(self, sample_size: int = 10) -> List[Dict[str, Any]]:
        """Read a small sample of the file for testing."""
        try:
            sample_df = await self._read_dataframe(preview_rows=sample_size)
            return sample_df.to_dict('records')
        except Exception as e:
            logger.error(f"Failed to read file sample: {str(e)}")
            return []
    
    async def _apply_query_filters(
        self, 
        df: pd.DataFrame, 
        query_config: Dict[str, Any]
    ) -> pd.DataFrame:
        """Apply query filters to DataFrame."""
        try:
            # Apply column selection
            columns = query_config.get("columns")
            if columns:
                available_columns = [col for col in columns if col in df.columns]
                if available_columns:
                    df = df[available_columns]
            
            # Apply row filtering
            where_clause = query_config.get("where")
            if where_clause:
                # Simple where clause parsing (can be extended)
                # For now, support basic column = value filters
                try:
                    df = df.query(where_clause)
                except Exception as query_error:
                    logger.warning(f"Failed to apply where clause '{where_clause}': {query_error}")
            
            # Apply ordering
            order_by = query_config.get("order_by")
            if order_by and order_by in df.columns:
                ascending = query_config.get("order_direction", "asc").lower() == "asc"
                df = df.sort_values(order_by, ascending=ascending)
            
            return df
            
        except Exception as e:
            logger.error(f"Failed to apply query filters: {str(e)}")
            return df  # Return original DataFrame on error
    
    def _map_pandas_type_to_sql(self, pandas_type: str) -> str:
        """Map pandas data types to SQL-like types."""
        type_mapping = {
            'object': 'TEXT',
            'int64': 'INTEGER',
            'int32': 'INTEGER',
            'float64': 'FLOAT',
            'float32': 'FLOAT',
            'bool': 'BOOLEAN',
            'datetime64[ns]': 'TIMESTAMP',
            'timedelta64[ns]': 'INTERVAL'
        }
        
        return type_mapping.get(pandas_type.lower(), 'TEXT')