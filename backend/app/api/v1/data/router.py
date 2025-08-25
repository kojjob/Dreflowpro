"""Data operations API endpoints for file upload and analysis."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from typing import Dict, Any, Optional, List
import logging
import pandas as pd
import numpy as np
from datetime import datetime

from ....core.deps import get_current_user
from ....models.user import User
from ....services.file_handler import file_handler
from ....services.visualization_service import VisualizationService
from ....services.transformations.data_transformations import DataTransformations
from ....services.connectors import CSVConnector, ExcelConnector, JSONConnector, TextConnector

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/data", tags=["data"])


def convert_numpy_types(data):
    """Convert numpy types to Python native types for JSON serialization."""
    if isinstance(data, dict):
        return {key: convert_numpy_types(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_numpy_types(item) for item in data]
    elif isinstance(data, np.integer):
        return int(data)
    elif isinstance(data, np.floating):
        return float(data)
    elif isinstance(data, np.bool_):
        return bool(data)
    elif isinstance(data, np.ndarray):
        return data.tolist()
    elif pd.isna(data):
        return None
    else:
        return data


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    file_type: Optional[str] = Form(None),
    preview_rows: int = Form(100),
    current_user: User = Depends(get_current_user)
):
    """Upload a file and get preview with analysis."""
    try:
        # Save uploaded file
        upload_result = await file_handler.save_uploaded_file(
            file.file,
            file.filename,
            file.content_type
        )
        
        if not upload_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=upload_result["error"]
            )
        
        file_id = upload_result["file_id"]
        metadata = upload_result["metadata"]
        
        # Read and analyze file data
        file_data = file_handler.read_file_data(
            file_id,
            preview_rows=preview_rows
        )
        
        if not file_data["success"]:
            # Clean up uploaded file
            file_handler.delete_file(file_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read file: {file_data['error']}"
            )
        
        # Generate visualizations
        if file_data["preview_data"]:
            df = pd.DataFrame(file_data["preview_data"])
            viz_result = VisualizationService.analyze_dataframe(df)
            
            if viz_result["success"]:
                file_data["visualizations"] = viz_result["analysis"]["visualizations"]
                file_data["data_quality"] = viz_result["analysis"]["data_quality"]
                file_data["column_analysis"] = viz_result["analysis"]["column_analysis"]
        
        return {
            "success": True,
            "file_id": file_id,
            "file_info": metadata,
            "data_analysis": convert_numpy_types(file_data),
            "message": f"File '{file.filename}' uploaded and analyzed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )


@router.get("/files/{file_id}")
async def get_file_info(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get information about an uploaded file."""
    try:
        metadata = file_handler.get_file_metadata(file_id)
        if not metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        return {
            "success": True,
            "file_info": metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get file info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/files/{file_id}/analyze")
async def analyze_file(
    file_id: str,
    preview_rows: int = Query(100, ge=1, le=10000),
    current_user: User = Depends(get_current_user)
):
    """Analyze uploaded file and generate insights."""
    try:
        # Check if file exists
        metadata = file_handler.get_file_metadata(file_id)
        if not metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Read file data
        file_data = file_handler.read_file_data(file_id, preview_rows=preview_rows)
        if not file_data["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=file_data["error"]
            )
        
        # Generate detailed analysis
        if file_data["preview_data"]:
            df = pd.DataFrame(file_data["preview_data"])
            analysis_result = VisualizationService.analyze_dataframe(df)
            
            if not analysis_result["success"]:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Analysis failed: {analysis_result['error']}"
                )
            
            # Generate summary report
            summary = VisualizationService.generate_summary_report(analysis_result)
            
            return {
                "success": True,
                "file_id": file_id,
                "analysis": convert_numpy_types(analysis_result["analysis"]),
                "summary": convert_numpy_types(summary.get("summary", {})),
                "analyzed_rows": len(df)
            }
        else:
            return {
                "success": True,
                "file_id": file_id,
                "message": "File is empty or could not be read"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/files/{file_id}/transform")
async def transform_file_data(
    file_id: str,
    transformation_config: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Apply transformation to file data and return results with visualization."""
    try:
        # Check if file exists
        metadata = file_handler.get_file_metadata(file_id)
        if not metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Read file data
        file_data = file_handler.read_file_data(file_id)
        if not file_data["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=file_data["error"]
            )
        
        if not file_data["preview_data"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data available for transformation"
            )
        
        # Convert to DataFrame
        original_df = pd.DataFrame(file_data["preview_data"])
        
        # Apply transformation
        transformation_type = transformation_config.get("type")
        transform_config = transformation_config.get("config", {})
        
        if transformation_type == "join":
            # For join, we need two datasets - for demo, we'll duplicate the data
            result = DataTransformations.join_data(
                file_data["preview_data"],
                file_data["preview_data"][:10],  # Use first 10 rows as right dataset
                transform_config
            )
        elif transformation_type == "deduplicate":
            result = DataTransformations.deduplicate_data(
                file_data["preview_data"],
                transform_config
            )
        elif transformation_type == "validate":
            result = DataTransformations.validate_data(
                file_data["preview_data"],
                transform_config
            )
        elif transformation_type == "aggregate":
            result = DataTransformations.aggregate_data(
                file_data["preview_data"],
                transform_config
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported transformation type: {transformation_type}"
            )
        
        if result["status"] != "success":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transformation failed: {result.get('error', 'Unknown error')}"
            )
        
        # Create DataFrame from transformed data
        transformed_df = pd.DataFrame(result["data"])
        
        # Generate before/after comparison
        comparison = VisualizationService.compare_dataframes(
            original_df,
            transformed_df,
            transformation_type.upper()
        )
        
        # Convert numpy types to Python native types for JSON serialization
        serializable_result = convert_numpy_types(result)
        serializable_comparison = convert_numpy_types(comparison.get("comparison", {}))
        
        return {
            "success": True,
            "file_id": file_id,
            "transformation": transformation_type,
            "result": serializable_result,
            "comparison": serializable_comparison,
            "transformed_data": convert_numpy_types(result["data"][:100])  # Return first 100 rows
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Data transformation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/files/{file_id}/preview")
async def preview_file_data(
    file_id: str,
    rows: int = Query(50, ge=1, le=1000),
    columns: Optional[List[str]] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get a preview of file data."""
    try:
        # Check if file exists
        metadata = file_handler.get_file_metadata(file_id)
        if not metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Read file data
        file_data = file_handler.read_file_data(file_id, preview_rows=rows)
        if not file_data["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=file_data["error"]
            )
        
        preview_data = file_data["preview_data"]
        
        # Filter columns if specified
        if columns and preview_data:
            df = pd.DataFrame(preview_data)
            available_columns = [col for col in columns if col in df.columns]
            if available_columns:
                df = df[available_columns]
                preview_data = df.to_dict('records')
        
        return {
            "success": True,
            "file_id": file_id,
            "file_info": metadata,
            "data_info": convert_numpy_types(file_data["data_info"]),
            "preview_data": convert_numpy_types(preview_data),
            "total_rows": file_data["data_info"]["row_count"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File preview failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete an uploaded file."""
    try:
        success = file_handler.delete_file(file_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        return {
            "success": True,
            "message": f"File {file_id} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File deletion failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/files/{file_id}/connect")
async def create_file_connector(
    file_id: str,
    connector_config: Dict[str, Any] = {},
    current_user: User = Depends(get_current_user)
):
    """Create a connector for the uploaded file."""
    try:
        # Check if file exists
        metadata = file_handler.get_file_metadata(file_id)
        if not metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        file_type = metadata["file_type"]
        
        # Create appropriate connector
        connector_config.update({
            "file_id": file_id,
            "file_path": metadata["file_path"]
        })
        
        if file_type == "csv":
            connector = CSVConnector(connector_config)
        elif file_type in ["xlsx", "xls"]:
            connector = ExcelConnector(connector_config)
        elif file_type == "json":
            connector = JSONConnector(connector_config)
        elif file_type in ["txt", "tsv"]:
            connector = TextConnector(connector_config)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file_type}"
            )
        
        # Test the connection
        connection_result = await connector.test_connection()
        
        if connection_result["status"] != "success":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Connection test failed: {connection_result.get('error', 'Unknown error')}"
            )
        
        # Get schema info
        schema_info = await connector.get_schema_info()
        
        return {
            "success": True,
            "file_id": file_id,
            "connector_type": file_type,
            "connection_test": connection_result,
            "schema_info": schema_info,
            "message": f"File connector created successfully for {file_type.upper()} file"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File connector creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/cleanup")
async def cleanup_expired_files():
    """Clean up expired temporary files."""
    try:
        cleanup_result = file_handler.cleanup_expired_files()
        
        return {
            "success": cleanup_result["success"],
            "files_deleted": cleanup_result.get("files_deleted", 0),
            "message": f"Cleanup completed: {cleanup_result.get('files_deleted', 0)} files removed"
        }
        
    except Exception as e:
        logger.error(f"Cleanup failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats."""
    return {
        "success": True,
        "formats": {
            "csv": {
                "description": "Comma-separated values",
                "extensions": [".csv"],
                "mime_types": ["text/csv", "application/csv"]
            },
            "excel": {
                "description": "Excel spreadsheets",
                "extensions": [".xlsx", ".xls"],
                "mime_types": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"]
            },
            "json": {
                "description": "JSON data files",
                "extensions": [".json"],
                "mime_types": ["application/json", "text/json"]
            },
            "text": {
                "description": "Delimited text files",
                "extensions": [".txt", ".tsv"],
                "mime_types": ["text/plain", "text/tab-separated-values"]
            }
        }
    }