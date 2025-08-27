"""Text file connector for reading delimited text files."""

from typing import Dict, Any, Optional, List
import pandas as pd
import logging
from datetime import datetime
import re

from .file_base_connector import FileBaseConnector

logger = logging.getLogger(__name__)


class TextConnector(FileBaseConnector):
    """Connector for reading delimited text files (TSV, pipe-delimited, etc.)."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Text connector.
        
        Args:
            config: Configuration dictionary with text-specific settings:
                - file_id: Uploaded file ID (or file_path)
                - file_path: Direct path to text file
                - delimiter: Field delimiter (default: '\t' for TSV)
                - encoding: File encoding (default: 'utf-8')
                - quotechar: Quote character (default: None)
                - has_header: Whether file has header row (default: True)
                - skip_rows: Number of rows to skip (default: 0)
                - comment_char: Character indicating comments (default: '#')
                - fixed_width: True if file has fixed-width columns
                - widths: List of column widths for fixed-width files
        """
        super().__init__(config)
        
        # Text-specific options
        self.delimiter = config.get("delimiter", "\t")  # Default to tab-separated
        self.encoding = config.get("encoding", "utf-8")
        self.quotechar = config.get("quotechar", None)
        self.has_header = config.get("has_header", True)
        self.skip_rows = config.get("skip_rows", 0)
        self.comment_char = config.get("comment_char", "#")
        
        # Fixed-width file options
        self.fixed_width = config.get("fixed_width", False)
        self.widths = config.get("widths", None)  # List of column widths
        
        # Additional pandas options
        self.na_values = config.get("na_values", ['', 'NULL', 'null', 'NA', 'na', '#N/A'])
        self.keep_default_na = config.get("keep_default_na", True)
        self.dtype = config.get("dtype", str)  # Read as strings initially for safety
    
    async def _read_dataframe(self, preview_rows: Optional[int] = None) -> pd.DataFrame:
        """Read text file into pandas DataFrame."""
        try:
            if self.fixed_width:
                return self._read_fixed_width(preview_rows)
            else:
                return self._read_delimited(preview_rows)
                
        except UnicodeDecodeError as e:
            # Try alternative encodings
            return self._read_with_fallback_encoding(preview_rows, e)
            
        except Exception as e:
            logger.error(f"Failed to read text file: {str(e)}")
            raise ValueError(f"Text file read error: {str(e)}")
    
    def _read_delimited(self, preview_rows: Optional[int] = None) -> pd.DataFrame:
        """Read delimited text file."""
        read_options = {
            'encoding': self.encoding,
            'delimiter': self.delimiter,
            'na_values': self.na_values,
            'keep_default_na': self.keep_default_na,
            'dtype': self.dtype,
            'skiprows': self.skip_rows,
            'comment': self.comment_char
        }
        
        # Handle quote character
        if self.quotechar:
            read_options['quotechar'] = self.quotechar
        else:
            read_options['quoting'] = 3  # csv.QUOTE_NONE
        
        # Handle header option
        if self.has_header:
            read_options['header'] = 0
        else:
            read_options['header'] = None
        
        # Add preview limit if specified
        if preview_rows:
            read_options['nrows'] = preview_rows
        
        # Read delimited file
        df = pd.read_csv(self.file_path, **read_options)
        
        # If no header, create column names
        if not self.has_header:
            df.columns = [f'column_{i}' for i in range(len(df.columns))]
        
        logger.info(f"Delimited text file read successfully: {len(df)} rows, {len(df.columns)} columns")
        return df
    
    def _read_fixed_width(self, preview_rows: Optional[int] = None) -> pd.DataFrame:
        """Read fixed-width text file."""
        read_options = {
            'encoding': self.encoding,
            'na_values': self.na_values,
            'keep_default_na': self.keep_default_na,
            'dtype': self.dtype,
            'skiprows': self.skip_rows,
            'comment': self.comment_char
        }
        
        # Handle column widths
        if self.widths:
            read_options['widths'] = self.widths
        else:
            # Try to infer column widths from first few lines
            read_options['widths'] = self._infer_column_widths()
        
        # Handle header option
        if self.has_header:
            read_options['header'] = 0
        else:
            read_options['header'] = None
        
        # Add preview limit if specified
        if preview_rows:
            read_options['nrows'] = preview_rows
        
        # Read fixed-width file
        df = pd.read_fwf(self.file_path, **read_options)
        
        # If no header, create column names
        if not self.has_header:
            df.columns = [f'column_{i}' for i in range(len(df.columns))]
        
        logger.info(f"Fixed-width text file read successfully: {len(df)} rows, {len(df.columns)} columns")
        return df
    
    def _read_with_fallback_encoding(self, preview_rows: Optional[int], original_error) -> pd.DataFrame:
        """Try alternative encodings when original fails."""
        alternative_encodings = ['latin1', 'cp1252', 'iso-8859-1', 'utf-16']
        
        for alt_encoding in alternative_encodings:
            try:
                logger.warning(f"Retrying with encoding: {alt_encoding}")
                original_encoding = self.encoding
                self.encoding = alt_encoding
                
                if self.fixed_width:
                    df = self._read_fixed_width(preview_rows)
                else:
                    df = self._read_delimited(preview_rows)
                
                logger.info(f"Successfully read with {alt_encoding} encoding")
                return df
                
            except:
                self.encoding = original_encoding  # Reset encoding
                continue
        
        raise ValueError(f"Failed to read text file with multiple encodings. Original error: {str(original_error)}")
    
    def _infer_column_widths(self) -> List[int]:
        """Infer column widths for fixed-width files."""
        try:
            # Read first few lines to analyze structure
            with open(self.file_path, 'r', encoding=self.encoding) as f:
                lines = []
                for _ in range(10):  # Analyze first 10 lines
                    line = f.readline().rstrip('\n\r')
                    if line and not line.startswith(self.comment_char):
                        lines.append(line)
                
                if not lines:
                    return []
            
            # Find consistent spacing patterns
            max_length = max(len(line) for line in lines)
            
            # Look for columns of spaces that might indicate column boundaries
            space_positions = []
            for pos in range(max_length):
                space_count = sum(1 for line in lines if pos < len(line) and line[pos] == ' ')
                if space_count >= len(lines) * 0.8:  # 80% of lines have space at this position
                    space_positions.append(pos)
            
            # Convert space positions to column widths
            if space_positions:
                widths = []
                start = 0
                for pos in space_positions:
                    if pos > start:
                        widths.append(pos - start)
                        start = pos + 1
                
                # Add final column
                if start < max_length:
                    widths.append(max_length - start)
                
                logger.info(f"Inferred column widths: {widths}")
                return widths
            
            # Fallback: assume equal-width columns
            num_cols = self._estimate_column_count(lines)
            if num_cols > 1:
                col_width = max_length // num_cols
                widths = [col_width] * num_cols
                logger.info(f"Using equal column widths: {widths}")
                return widths
            
            return []
            
        except Exception as e:
            logger.warning(f"Failed to infer column widths: {str(e)}")
            return []
    
    def _estimate_column_count(self, lines: List[str]) -> int:
        """Estimate number of columns in fixed-width file."""
        try:
            # Look for consistent word patterns
            word_counts = []
            for line in lines:
                # Split by multiple spaces (likely column separators)
                words = re.split(r'\s{2,}', line.strip())
                word_counts.append(len(words))
            
            # Return most common word count
            if word_counts:
                from collections import Counter
                return Counter(word_counts).most_common(1)[0][0]
            
            return 1
            
        except Exception:
            return 1
    
    async def get_text_info(self) -> Dict[str, Any]:
        """Get detailed text file information."""
        try:
            # Detect delimiter if not specified or if using default tab
            detected_delimiter = self._detect_delimiter()
            
            # Read preview to analyze structure
            preview_df = await self._read_dataframe(preview_rows=100)
            
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
                "format": "fixed_width" if self.fixed_width else "delimited",
                "delimiter": detected_delimiter,
                "encoding": self.encoding,
                "has_header": self.has_header,
                "comment_char": self.comment_char,
                "row_count": len(preview_df),
                "column_count": len(preview_df.columns),
                "columns": columns_analysis,
                "widths": self.widths if self.fixed_width else None,
                "preview_successful": True
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze text file: {str(e)}")
            return {
                "error": str(e),
                "preview_successful": False
            }
    
    def _detect_delimiter(self) -> str:
        """Detect text file delimiter."""
        if self.fixed_width:
            return "fixed_width"
        
        try:
            # Common delimiters to test
            delimiters = ['\t', '|', ';', ',', ' ', ':', '~']
            
            # Read first few lines
            with open(self.file_path, 'r', encoding=self.encoding) as f:
                sample_lines = []
                for _ in range(10):
                    line = f.readline().strip()
                    if line and not line.startswith(self.comment_char):
                        sample_lines.append(line)
            
            if not sample_lines:
                return self.delimiter
            
            # Count occurrences of each delimiter
            delimiter_scores = {}
            for delimiter in delimiters:
                counts = [line.count(delimiter) for line in sample_lines]
                if counts and all(c == counts[0] and c > 0 for c in counts):
                    # Consistent count across lines
                    delimiter_scores[delimiter] = counts[0]
            
            # Return delimiter with highest consistent count
            if delimiter_scores:
                detected = max(delimiter_scores.keys(), key=lambda k: delimiter_scores[k])
                if detected != self.delimiter:
                    logger.info(f"Detected text delimiter: '{detected}' (repr: {repr(detected)})")
                return detected
            
            # Default to original delimiter
            return self.delimiter
            
        except Exception as e:
            logger.warning(f"Delimiter detection failed: {str(e)}, using original")
            return self.delimiter
    
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
            if clean_series.str.lower().isin(['true', 'false', 'yes', 'no', '1', '0', 'y', 'n']).all():
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
        file_type = "fixed-width text file" if self.fixed_width else f"delimited text file (delimiter: '{self.delimiter}')"
        return f"Preview first 10 rows from {file_type} at {self.file_path or 'uploaded file'}"