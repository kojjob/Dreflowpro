"""Excel file connector for reading Excel files (.xlsx, .xls)."""

from typing import Dict, Any, Optional, List
import pandas as pd
import logging
from datetime import datetime

from .file_base_connector import FileBaseConnector

logger = logging.getLogger(__name__)


class ExcelConnector(FileBaseConnector):
    """Connector for reading Excel files."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Excel connector.
        
        Args:
            config: Configuration dictionary with Excel-specific settings:
                - file_id: Uploaded file ID (or file_path)
                - file_path: Direct path to Excel file
                - sheet_name: Sheet name or index to read (default: 0 - first sheet)
                - has_header: Whether sheet has header row (default: True)
                - skip_rows: Number of rows to skip (default: 0)
                - use_cols: Columns to read (None for all)
        """
        super().__init__(config)
        
        # Excel-specific options
        self.sheet_name = config.get("sheet_name", 0)  # First sheet by default
        self.has_header = config.get("has_header", True)
        self.skip_rows = config.get("skip_rows", 0)
        self.use_cols = config.get("use_cols", None)  # None means all columns
        
        # Additional pandas read_excel options
        self.na_values = config.get("na_values", ['', 'NULL', 'null', 'NA', 'na', '#N/A'])
        self.keep_default_na = config.get("keep_default_na", True)
        self.dtype = config.get("dtype", str)  # Read as strings initially for safety
    
    async def _read_dataframe(self, preview_rows: Optional[int] = None) -> pd.DataFrame:
        """Read Excel file into pandas DataFrame."""
        try:
            read_options = {
                'sheet_name': self.sheet_name,
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
            
            # Handle column selection
            if self.use_cols:
                read_options['usecols'] = self.use_cols
            
            # Add preview limit if specified
            if preview_rows:
                read_options['nrows'] = preview_rows
            
            # Read Excel file
            df = pd.read_excel(self.file_path, **read_options)
            
            # If no header, create column names
            if not self.has_header:
                df.columns = [f'column_{i}' for i in range(len(df.columns))]
            
            logger.info(f"Excel file read successfully: {len(df)} rows, {len(df.columns)} columns from sheet '{self.sheet_name}'")
            return df
            
        except FileNotFoundError:
            raise ValueError(f"Excel file not found: {self.file_path}")
            
        except Exception as e:
            logger.error(f"Failed to read Excel file: {str(e)}")
            raise ValueError(f"Excel read error: {str(e)}")
    
    async def get_excel_info(self) -> Dict[str, Any]:
        """Get detailed Excel file information including all sheets."""
        try:
            # Get information about all sheets
            excel_file = pd.ExcelFile(self.file_path)
            sheets_info = []
            
            for sheet_name in excel_file.sheet_names:
                try:
                    # Read first few rows of each sheet
                    sheet_df = pd.read_excel(
                        self.file_path, 
                        sheet_name=sheet_name, 
                        nrows=10,
                        header=0 if self.has_header else None,
                        dtype=str
                    )
                    
                    if not self.has_header and not sheet_df.empty:
                        sheet_df.columns = [f'column_{i}' for i in range(len(sheet_df.columns))]
                    
                    # Analyze columns in this sheet
                    columns_analysis = []
                    for col in sheet_df.columns:
                        col_data = sheet_df[col]
                        
                        # Try to infer data type
                        inferred_type = self._infer_column_type(col_data)
                        
                        columns_analysis.append({
                            "name": str(col),
                            "inferred_type": inferred_type,
                            "null_count": int(col_data.isnull().sum()),
                            "unique_count": int(col_data.nunique()),
                            "sample_values": col_data.dropna().head(3).astype(str).tolist()
                        })
                    
                    sheets_info.append({
                        "sheet_name": sheet_name,
                        "row_count_preview": len(sheet_df),
                        "column_count": len(sheet_df.columns),
                        "columns": columns_analysis,
                        "readable": True
                    })
                    
                except Exception as sheet_error:
                    logger.warning(f"Could not read sheet '{sheet_name}': {sheet_error}")
                    sheets_info.append({
                        "sheet_name": sheet_name,
                        "readable": False,
                        "error": str(sheet_error)
                    })
            
            # Get info for the currently selected sheet
            current_sheet_info = next(
                (sheet for sheet in sheets_info if sheet["sheet_name"] == self.sheet_name),
                sheets_info[0] if sheets_info else None
            )
            
            return {
                "total_sheets": len(excel_file.sheet_names),
                "sheet_names": excel_file.sheet_names,
                "current_sheet": self.sheet_name,
                "has_header": self.has_header,
                "sheets": sheets_info,
                "current_sheet_info": current_sheet_info,
                "preview_successful": True
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze Excel file: {str(e)}")
            return {
                "error": str(e),
                "preview_successful": False
            }
    
    async def get_sheet_names(self) -> List[str]:
        """Get list of all sheet names in the Excel file."""
        try:
            excel_file = pd.ExcelFile(self.file_path)
            return excel_file.sheet_names
        except Exception as e:
            logger.error(f"Failed to get sheet names: {str(e)}")
            return []
    
    async def switch_sheet(self, sheet_name: str) -> bool:
        """Switch to a different sheet in the Excel file."""
        try:
            available_sheets = await self.get_sheet_names()
            if sheet_name in available_sheets:
                self.sheet_name = sheet_name
                logger.info(f"Switched to sheet: {sheet_name}")
                return True
            else:
                logger.warning(f"Sheet '{sheet_name}' not found. Available sheets: {available_sheets}")
                return False
        except Exception as e:
            logger.error(f"Failed to switch sheet: {str(e)}")
            return False
    
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
            
            # Try datetime conversion (Excel often has dates)
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
        return f"Preview first 10 rows from sheet '{self.sheet_name}' in {self.file_path or 'uploaded Excel file'}"