"""File handling service for ETL platform."""

import os
import tempfile
import uuid
from typing import Dict, Any, Optional, List, BinaryIO
from datetime import datetime, timedelta
import logging
import hashlib
import pandas as pd
from pathlib import Path
import mimetypes
import json

logger = logging.getLogger(__name__)

# File type configurations
ALLOWED_EXTENSIONS = {
    'csv': ['text/csv', 'application/csv'],
    'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    'xls': ['application/vnd.ms-excel'],
    'json': ['application/json', 'text/json'],
    'txt': ['text/plain'],
    'tsv': ['text/tab-separated-values']
}

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
TEMP_FILE_CLEANUP_HOURS = 24


class FileHandler:
    """Handle file upload, validation, and processing operations."""
    
    def __init__(self, temp_dir: Optional[str] = None):
        """Initialize file handler with temporary directory."""
        self.temp_dir = temp_dir or tempfile.gettempdir()
        self.uploaded_files_dir = Path(self.temp_dir) / "dreflowpro_uploads"
        self.uploaded_files_dir.mkdir(exist_ok=True)
        
        # File metadata storage (in production, use database)
        self._file_metadata = {}
    
    def validate_file(self, filename: str, content_type: str, file_size: int) -> Dict[str, Any]:
        """
        Validate uploaded file.
        
        Args:
            filename: Name of the uploaded file
            content_type: MIME type of the file
            file_size: Size of the file in bytes
            
        Returns:
            Validation result with status and details
        """
        try:
            # Check file size
            if file_size > MAX_FILE_SIZE:
                return {
                    "valid": False,
                    "error": f"File size ({file_size / 1024 / 1024:.1f}MB) exceeds maximum allowed size ({MAX_FILE_SIZE / 1024 / 1024}MB)"
                }
            
            # Get file extension
            file_ext = Path(filename).suffix.lower().lstrip('.')
            
            # Check if extension is allowed
            if file_ext not in ALLOWED_EXTENSIONS:
                return {
                    "valid": False,
                    "error": f"File type '.{file_ext}' is not supported. Allowed types: {', '.join(ALLOWED_EXTENSIONS.keys())}"
                }
            
            # Check MIME type
            allowed_mimes = ALLOWED_EXTENSIONS[file_ext]
            if content_type not in allowed_mimes:
                # Try to detect MIME type from filename
                detected_mime, _ = mimetypes.guess_type(filename)
                if detected_mime not in allowed_mimes:
                    logger.warning(f"MIME type mismatch: expected {allowed_mimes}, got {content_type}")
                    # Don't fail on MIME mismatch, just log warning
            
            return {
                "valid": True,
                "file_type": file_ext,
                "size_mb": round(file_size / 1024 / 1024, 2)
            }
            
        except Exception as e:
            logger.error(f"File validation error: {str(e)}")
            return {
                "valid": False,
                "error": f"Validation error: {str(e)}"
            }
    
    async def save_uploaded_file(
        self, 
        file_content: BinaryIO, 
        filename: str, 
        content_type: str
    ) -> Dict[str, Any]:
        """
        Save uploaded file to temporary storage.
        
        Args:
            file_content: File content stream
            filename: Original filename
            content_type: MIME type
            
        Returns:
            File information including file_id and metadata
        """
        try:
            # Generate unique file ID
            file_id = str(uuid.uuid4())
            
            # Read file content
            file_data = file_content.read()
            file_size = len(file_data)
            
            # Validate file
            validation = self.validate_file(filename, content_type, file_size)
            if not validation["valid"]:
                return {
                    "success": False,
                    "error": validation["error"]
                }
            
            # Create file hash for deduplication
            file_hash = hashlib.md5(file_data).hexdigest()
            
            # Save file to disk
            file_ext = Path(filename).suffix.lower()
            saved_filename = f"{file_id}{file_ext}"
            file_path = self.uploaded_files_dir / saved_filename
            
            with open(file_path, 'wb') as f:
                f.write(file_data)
            
            # Store metadata
            metadata = {
                "file_id": file_id,
                "original_filename": filename,
                "saved_filename": saved_filename,
                "file_path": str(file_path),
                "content_type": content_type,
                "file_type": validation["file_type"],
                "file_size": file_size,
                "file_hash": file_hash,
                "upload_time": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(hours=TEMP_FILE_CLEANUP_HOURS)).isoformat()
            }
            
            self._file_metadata[file_id] = metadata
            
            logger.info(f"File uploaded successfully: {filename} -> {file_id}")
            
            return {
                "success": True,
                "file_id": file_id,
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"File upload error: {str(e)}")
            return {
                "success": False,
                "error": f"Upload failed: {str(e)}"
            }
    
    def get_file_metadata(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get metadata for uploaded file."""
        return self._file_metadata.get(file_id)
    
    def get_file_path(self, file_id: str) -> Optional[str]:
        """Get file path for uploaded file."""
        metadata = self.get_file_metadata(file_id)
        if metadata:
            file_path = metadata["file_path"]
            if os.path.exists(file_path):
                return file_path
        return None
    
    def delete_file(self, file_id: str) -> bool:
        """Delete uploaded file and metadata."""
        try:
            metadata = self.get_file_metadata(file_id)
            if metadata:
                file_path = metadata["file_path"]
                if os.path.exists(file_path):
                    os.remove(file_path)
                
                del self._file_metadata[file_id]
                logger.info(f"File deleted: {file_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"File deletion error: {str(e)}")
            return False
    
    def cleanup_expired_files(self) -> Dict[str, Any]:
        """Clean up expired temporary files."""
        try:
            current_time = datetime.now()
            expired_files = []
            
            for file_id, metadata in list(self._file_metadata.items()):
                expires_at = datetime.fromisoformat(metadata["expires_at"])
                if current_time > expires_at:
                    if self.delete_file(file_id):
                        expired_files.append(file_id)
            
            logger.info(f"Cleanup completed: {len(expired_files)} expired files removed")
            
            return {
                "success": True,
                "files_deleted": len(expired_files),
                "file_ids": expired_files
            }
            
        except Exception as e:
            logger.error(f"Cleanup error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def read_file_data(
        self, 
        file_id: str, 
        preview_rows: Optional[int] = None,
        **read_options
    ) -> Dict[str, Any]:
        """
        Read and parse uploaded file data.
        
        Args:
            file_id: Unique file identifier
            preview_rows: Number of rows to preview (None for all)
            **read_options: Additional options for file reading
            
        Returns:
            Parsed file data and metadata
        """
        try:
            metadata = self.get_file_metadata(file_id)
            if not metadata:
                return {
                    "success": False,
                    "error": "File not found"
                }
            
            file_path = metadata["file_path"]
            if not os.path.exists(file_path):
                return {
                    "success": False,
                    "error": "File not accessible"
                }
            
            file_type = metadata["file_type"]
            
            # Read data based on file type
            if file_type == 'csv':
                df = self._read_csv(file_path, preview_rows, **read_options)
            elif file_type in ['xlsx', 'xls']:
                df = self._read_excel(file_path, preview_rows, **read_options)
            elif file_type == 'json':
                df = self._read_json(file_path, preview_rows, **read_options)
            elif file_type in ['txt', 'tsv']:
                df = self._read_text(file_path, preview_rows, **read_options)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported file type: {file_type}"
                }
            
            # Get basic statistics
            data_info = self._analyze_dataframe(df)
            
            # Convert to records for JSON serialization
            if preview_rows:
                preview_data = df.head(preview_rows).to_dict('records')
            else:
                preview_data = df.to_dict('records')
            
            return {
                "success": True,
                "file_id": file_id,
                "file_metadata": metadata,
                "data_info": data_info,
                "preview_data": preview_data,
                "full_data": df.to_dict('records') if len(df) <= 1000 else None  # Only include full data for small files
            }
            
        except Exception as e:
            logger.error(f"File reading error: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to read file: {str(e)}"
            }
    
    def _read_csv(self, file_path: str, preview_rows: Optional[int], **options) -> pd.DataFrame:
        """Read CSV file."""
        read_options = {
            'encoding': options.get('encoding', 'utf-8'),
            'delimiter': options.get('delimiter', ','),
            'quotechar': options.get('quotechar', '"'),
            'na_values': options.get('na_values', ['', 'NULL', 'null', 'NA', 'na']),
            'keep_default_na': True,
            'dtype': str  # Read everything as string initially
        }
        
        if preview_rows:
            read_options['nrows'] = preview_rows
        
        return pd.read_csv(file_path, **read_options)
    
    def _read_excel(self, file_path: str, preview_rows: Optional[int], **options) -> pd.DataFrame:
        """Read Excel file."""
        read_options = {
            'sheet_name': options.get('sheet_name', 0),  # First sheet by default
            'header': options.get('header', 0),
            'na_values': options.get('na_values', ['', 'NULL', 'null', 'NA', 'na']),
            'keep_default_na': True,
            'dtype': str  # Read everything as string initially
        }
        
        if preview_rows:
            read_options['nrows'] = preview_rows
        
        return pd.read_excel(file_path, **read_options)
    
    def _read_json(self, file_path: str, preview_rows: Optional[int], **options) -> pd.DataFrame:
        """Read JSON file."""
        orient = options.get('orient', 'records')  # Default to records format
        
        if orient == 'records':
            df = pd.read_json(file_path, orient='records')
        else:
            # For other orientations, read and convert
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            df = pd.DataFrame(data)
        
        if preview_rows:
            df = df.head(preview_rows)
        
        return df
    
    def _read_text(self, file_path: str, preview_rows: Optional[int], **options) -> pd.DataFrame:
        """Read text file (tab-delimited or custom separator)."""
        separator = options.get('separator', '\t')
        encoding = options.get('encoding', 'utf-8')
        
        read_options = {
            'encoding': encoding,
            'delimiter': separator,
            'na_values': ['', 'NULL', 'null', 'NA', 'na'],
            'keep_default_na': True,
            'dtype': str
        }
        
        if preview_rows:
            read_options['nrows'] = preview_rows
        
        return pd.read_csv(file_path, **read_options)
    
    def _analyze_dataframe(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze dataframe and return basic statistics."""
        try:
            # Try to infer better data types
            df_analyzed = df.copy()
            
            # Attempt to convert columns to appropriate types
            for col in df_analyzed.columns:
                if df_analyzed[col].dtype == 'object':
                    # Try numeric conversion
                    numeric_df = pd.to_numeric(df_analyzed[col], errors='coerce')
                    if not numeric_df.isna().all():
                        # If more than 80% can be converted to numeric, treat as numeric
                        if (numeric_df.notna().sum() / len(df_analyzed)) > 0.8:
                            df_analyzed[col] = numeric_df
                        continue
                    
                    # Try datetime conversion
                    try:
                        datetime_df = pd.to_datetime(df_analyzed[col], errors='coerce', infer_datetime_format=True)
                        if not datetime_df.isna().all():
                            # If more than 50% can be converted to datetime, treat as datetime
                            if (datetime_df.notna().sum() / len(df_analyzed)) > 0.5:
                                df_analyzed[col] = datetime_df
                                continue
                    except:
                        pass
            
            # Generate analysis
            columns_info = []
            for col in df_analyzed.columns:
                col_data = df_analyzed[col]
                col_info = {
                    "name": col,
                    "dtype": str(col_data.dtype),
                    "null_count": int(col_data.isnull().sum()),
                    "null_percentage": float(col_data.isnull().sum() / len(df_analyzed) * 100),
                    "unique_count": int(col_data.nunique()),
                    "sample_values": col_data.dropna().head(5).tolist()
                }
                
                # Add type-specific statistics
                if pd.api.types.is_numeric_dtype(col_data):
                    col_info.update({
                        "min": float(col_data.min()) if not col_data.isna().all() else None,
                        "max": float(col_data.max()) if not col_data.isna().all() else None,
                        "mean": float(col_data.mean()) if not col_data.isna().all() else None,
                        "std": float(col_data.std()) if not col_data.isna().all() else None
                    })
                elif pd.api.types.is_datetime64_any_dtype(col_data):
                    col_info.update({
                        "min_date": col_data.min().isoformat() if not col_data.isna().all() else None,
                        "max_date": col_data.max().isoformat() if not col_data.isna().all() else None
                    })
                
                columns_info.append(col_info)
            
            return {
                "row_count": len(df_analyzed),
                "column_count": len(df_analyzed.columns),
                "columns": columns_info,
                "memory_usage_mb": round(df_analyzed.memory_usage(deep=True).sum() / 1024 / 1024, 2),
                "total_null_count": int(df_analyzed.isnull().sum().sum()),
                "duplicate_count": int(df_analyzed.duplicated().sum())
            }
            
        except Exception as e:
            logger.error(f"DataFrame analysis error: {str(e)}")
            return {
                "row_count": len(df),
                "column_count": len(df.columns),
                "columns": [{"name": col, "dtype": str(df[col].dtype)} for col in df.columns],
                "error": str(e)
            }


# Global file handler instance
file_handler = FileHandler()