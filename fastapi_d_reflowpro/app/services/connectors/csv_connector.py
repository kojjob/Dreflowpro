"""CSV file connector for reading CSV files."""

from typing import Dict, Any, Optional
import pandas as pd
import logging
from datetime import datetime

from .file_base_connector import FileBaseConnector

logger = logging.getLogger(__name__)


class CSVConnector(FileBaseConnector):
    """Connector for reading CSV files."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize CSV connector.
        
        Args:
            config: Configuration dictionary with CSV-specific settings:
                - file_id: Uploaded file ID (or file_path)
                - file_path: Direct path to CSV file
                - delimiter: CSV delimiter (default: ',')
                - encoding: File encoding (default: 'utf-8')
                - quotechar: Quote character (default: '"')
                - has_header: Whether file has header row (default: True)
                - skip_rows: Number of rows to skip (default: 0)
        """
        super().__init__(config)
        
        # CSV-specific options
        self.delimiter = config.get("delimiter", ",")
        self.encoding = config.get("encoding", "utf-8")
        self.quotechar = config.get("quotechar", '"')
        self.has_header = config.get("has_header", True)
        self.skip_rows = config.get("skip_rows", 0)
        
        # Additional pandas read_csv options
        self.na_values = config.get("na_values", ['', 'NULL', 'null', 'NA', 'na', '#N/A'])
        self.keep_default_na = config.get("keep_default_na", True)
        self.dtype = config.get("dtype", str)  # Read as strings initially for safety
    
    async def _read_dataframe(self, preview_rows: Optional[int] = None) -> pd.DataFrame:
        """Read CSV file into pandas DataFrame."""
        try:
            read_options = {
                'encoding': self.encoding,
                'delimiter': self.delimiter,
                'quotechar': self.quotechar,
                'na_values': self.na_values,
                'keep_default_na': self.keep_default_na,
                'dtype': self.dtype,
                'skiprows': self.skip_rows
            }
            
            # Handle header option
            if self.has_header:
                read_options['header'] = 0
            else:
                read_options['header'] = None
            
            # Add preview limit if specified
            if preview_rows:
                read_options['nrows'] = preview_rows
            
            # Read CSV file
            df = pd.read_csv(self.file_path, **read_options)
            
            # If no header, create column names
            if not self.has_header:
                df.columns = [f'column_{i}' for i in range(len(df.columns))]
            
            logger.info(f"CSV file read successfully: {len(df)} rows, {len(df.columns)} columns")
            return df
            
        except UnicodeDecodeError as e:
            # Try alternative encodings
            alternative_encodings = ['latin1', 'cp1252', 'iso-8859-1']
            for alt_encoding in alternative_encodings:
                try:
                    logger.warning(f"Retrying with encoding: {alt_encoding}")
                    read_options['encoding'] = alt_encoding
                    df = pd.read_csv(self.file_path, **read_options)
                    
                    if not self.has_header:
                        df.columns = [f'column_{i}' for i in range(len(df.columns))]
                    
                    logger.info(f"CSV file read with {alt_encoding} encoding: {len(df)} rows, {len(df.columns)} columns")
                    return df
                except:
                    continue
            
            raise ValueError(f"Failed to read CSV file with multiple encodings. Original error: {str(e)}")
            
        except pd.errors.EmptyDataError:
            logger.warning("CSV file is empty")
            return pd.DataFrame()
            
        except Exception as e:
            logger.error(f"Failed to read CSV file: {str(e)}")
            raise ValueError(f"CSV read error: {str(e)}")
    
    async def get_csv_info(self) -> Dict[str, Any]:
        """Get detailed CSV file information."""
        try:
            # Read first few rows to analyze structure
            preview_df = await self._read_dataframe(preview_rows=100)
            
            # Detect delimiter if not specified
            detected_delimiter = self._detect_delimiter() if self.delimiter == "," else self.delimiter
            
            # Analyze columns
            columns_analysis = []
            for col in preview_df.columns:
                col_data = preview_df[col]
                
                # Try to infer data type
                inferred_type = self._infer_column_type(col_data)
                
                columns_analysis.append({
                    "name": str(col),
                    "inferred_type": inferred_type,
                    "null_count": int(col_data.isnull().sum()),
                    "unique_count": int(col_data.nunique()),
                    "sample_values": col_data.dropna().head(5).astype(str).tolist()
                })
            
            return {
                "delimiter": detected_delimiter,
                "encoding": self.encoding,
                "has_header": self.has_header,
                "row_count": len(preview_df),
                "column_count": len(preview_df.columns),
                "columns": columns_analysis,
                "preview_successful": True
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze CSV: {str(e)}")
            return {
                "error": str(e),
                "preview_successful": False
            }
    
    def _detect_delimiter(self) -> str:
        """Detect CSV delimiter by analyzing first few lines."""
        try:
            # Common delimiters to test
            delimiters = [',', ';', '\t', '|', ':']
            
            # Read first few lines
            with open(self.file_path, 'r', encoding=self.encoding) as f:
                sample_lines = [f.readline().strip() for _ in range(5)]
            
            # Count occurrences of each delimiter
            delimiter_counts = {}
            for delimiter in delimiters:
                total_count = sum(line.count(delimiter) for line in sample_lines if line)
                # Check consistency - same count in each line indicates delimiter
                if sample_lines:
                    first_line_count = sample_lines[0].count(delimiter)
                    consistent = all(line.count(delimiter) == first_line_count for line in sample_lines if line)
                    if consistent and total_count > 0:
                        delimiter_counts[delimiter] = total_count
            
            # Return delimiter with highest consistent count
            if delimiter_counts:
                detected = max(delimiter_counts.keys(), key=lambda k: delimiter_counts[k])
                logger.info(f"Detected CSV delimiter: '{detected}'")
                return detected
            
            # Default to comma
            return ','
            
        except Exception as e:
            logger.warning(f"Delimiter detection failed: {str(e)}, using comma")
            return ','
    
    def _infer_column_type(self, series: pd.Series) -> str:
        """Infer the data type of a pandas Series."""
        try:
            # Remove null values for analysis
            clean_series = series.dropna()
            
            if clean_series.empty:
                return "string"
            
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
            if clean_series.str.lower().isin(['true', 'false', 'yes', 'no', '1', '0']).all():
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
        return f"Preview first 10 rows from {self.file_path or 'uploaded CSV file'}"