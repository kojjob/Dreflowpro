"""
Advanced Data Export API for DReflowPro ETL Platform
Supports multiple export formats and custom templates
"""

import os
import tempfile
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, validator

from app.core.deps import get_current_user, get_db
from app.core.tenant_deps import get_current_tenant
from app.models.user import User
from app.models.tenant import Tenant
from app.services.export_service import DataExportService

router = APIRouter(prefix="/export", tags=["data_export"])

# Pydantic models for request/response
class ExportRequest(BaseModel):
    """Export request model."""
    data_source: str = Field(..., description="Data source to export (pipelines, executions, connectors, users, analytics)")
    format_type: str = Field(..., description="Export format (pdf, excel, csv, json, xml, custom)")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Filtering criteria")
    custom_fields: Optional[List[str]] = Field(None, description="Specific fields to include")
    template_config: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Template configuration")
    
    @validator("data_source")
    def validate_data_source(cls, v):
        allowed_sources = [
            "pipelines", "pipeline_executions", "connectors", "users", 
            "analytics", "audit_logs", "system_metrics"
        ]
        if v not in allowed_sources:
            raise ValueError(f"data_source must be one of: {', '.join(allowed_sources)}")
        return v
    
    @validator("format_type")
    def validate_format_type(cls, v):
        allowed_formats = ["pdf", "excel", "csv", "json", "xml", "custom"]
        if v.lower() not in allowed_formats:
            raise ValueError(f"format_type must be one of: {', '.join(allowed_formats)}")
        return v.lower()

class ExportResponse(BaseModel):
    """Export response model."""
    success: bool
    export_id: str
    message: str
    download_url: Optional[str] = None
    file_info: Optional[Dict[str, Any]] = None

class ExportStatus(BaseModel):
    """Export status model."""
    export_id: str
    status: str  # pending, processing, completed, failed
    progress: Optional[int] = None
    message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    download_url: Optional[str] = None
    file_info: Optional[Dict[str, Any]] = None

# In-memory storage for export jobs (in production, use Redis or database)
export_jobs: Dict[str, Dict[str, Any]] = {}

@router.post("/create", response_model=ExportResponse)
async def create_export(
    request: ExportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    current_tenant: Optional[Tenant] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new data export job.
    
    This endpoint accepts export parameters and starts a background job
    to generate the requested export file.
    """
    try:
        # Generate unique export ID
        import uuid
        export_id = str(uuid.uuid4())
        
        # Store job info
        export_jobs[export_id] = {
            "id": export_id,
            "status": "pending",
            "progress": 0,
            "created_at": datetime.utcnow(),
            "user_id": current_user.id,
            "tenant_id": current_tenant.id if current_tenant else None,
            "request": request.dict()
        }
        
        # Start background export job
        background_tasks.add_task(
            process_export_job,
            export_id, 
            request, 
            current_user.id, 
            current_tenant.id if current_tenant else None,
            db
        )
        
        return ExportResponse(
            success=True,
            export_id=export_id,
            message="Export job created successfully. Use the export_id to check status and download.",
            download_url=f"/api/v1/export/{export_id}/download"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create export job: {str(e)}")

@router.get("/{export_id}/status", response_model=ExportStatus)
async def get_export_status(
    export_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get the status of an export job.
    
    Returns current status, progress, and download information if completed.
    """
    if export_id not in export_jobs:
        raise HTTPException(status_code=404, detail="Export job not found")
    
    job = export_jobs[export_id]
    
    # Check if user has access to this export
    if job["user_id"] != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied to this export job")
    
    return ExportStatus(
        export_id=export_id,
        status=job["status"],
        progress=job.get("progress", 0),
        message=job.get("message"),
        created_at=job["created_at"],
        completed_at=job.get("completed_at"),
        download_url=f"/api/v1/export/{export_id}/download" if job["status"] == "completed" else None,
        file_info=job.get("file_info")
    )

@router.get("/{export_id}/download")
async def download_export(
    export_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Download a completed export file.
    
    Returns the generated export file for download.
    """
    if export_id not in export_jobs:
        raise HTTPException(status_code=404, detail="Export job not found")
    
    job = export_jobs[export_id]
    
    # Check if user has access to this export
    if job["user_id"] != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied to this export job")
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Export job not completed yet")
    
    if "file_info" not in job:
        raise HTTPException(status_code=500, detail="Export file information not found")
    
    file_info = job["file_info"]
    file_path = file_info["file_path"]
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Export file not found on disk")
    
    return FileResponse(
        path=file_path,
        filename=file_info["filename"],
        media_type=file_info["content_type"],
        headers={
            "Content-Length": str(file_info["file_size"]),
            "Content-Disposition": f"attachment; filename=\"{file_info['filename']}\""
        }
    )

@router.delete("/{export_id}")
async def delete_export(
    export_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete an export job and its associated file.
    
    Cleans up export job data and removes the generated file from disk.
    """
    if export_id not in export_jobs:
        raise HTTPException(status_code=404, detail="Export job not found")
    
    job = export_jobs[export_id]
    
    # Check if user has access to this export
    if job["user_id"] != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied to this export job")
    
    # Clean up file if it exists
    if "file_info" in job:
        file_path = job["file_info"]["file_path"]
        if os.path.exists(file_path):
            try:
                os.unlink(file_path)
            except Exception:
                pass  # Ignore file deletion errors
    
    # Remove from memory
    del export_jobs[export_id]
    
    return {"success": True, "message": "Export job deleted successfully"}

@router.get("/list")
async def list_exports(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, le=200, description="Maximum number of exports to return"),
    current_user: User = Depends(get_current_user)
):
    """
    List export jobs for the current user.
    
    Returns a list of export jobs with their current status.
    """
    user_exports = []
    
    for export_id, job in export_jobs.items():
        # Filter by user (admins can see all exports)
        if job["user_id"] != current_user.id and not current_user.is_admin:
            continue
        
        # Filter by status if specified
        if status and job["status"] != status:
            continue
        
        user_exports.append({
            "export_id": export_id,
            "status": job["status"],
            "created_at": job["created_at"],
            "completed_at": job.get("completed_at"),
            "data_source": job["request"]["data_source"],
            "format_type": job["request"]["format_type"],
            "file_size": job.get("file_info", {}).get("file_size"),
            "download_url": f"/api/v1/export/{export_id}/download" if job["status"] == "completed" else None
        })
    
    # Sort by creation time (newest first)
    user_exports.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Apply limit
    user_exports = user_exports[:limit]
    
    return {
        "success": True,
        "exports": user_exports,
        "total": len(user_exports)
    }

@router.post("/quick")
async def quick_export(
    data_source: str = Query(..., description="Data source to export"),
    format_type: str = Query("csv", description="Export format"),
    current_user: User = Depends(get_current_user),
    current_tenant: Optional[Tenant] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Quick export for immediate download of small datasets.
    
    This endpoint performs the export synchronously and returns the file directly.
    Use this for small datasets that can be processed quickly.
    """
    try:
        # Validate parameters
        allowed_sources = ["pipelines", "pipeline_executions", "connectors"]
        if data_source not in allowed_sources:
            raise HTTPException(
                status_code=400, 
                detail=f"Quick export only supports: {', '.join(allowed_sources)}"
            )
        
        allowed_formats = ["csv", "json", "xml"]
        if format_type.lower() not in allowed_formats:
            raise HTTPException(
                status_code=400,
                detail=f"Quick export only supports: {', '.join(allowed_formats)}"
            )
        
        # Create export service
        export_service = DataExportService(db, current_user, current_tenant)
        
        # Perform export with limited data (for quick export)
        export_result = await export_service.export_data(
            data_source=data_source,
            format_type=format_type.lower(),
            filters={"limit": 1000}  # Limit for quick export
        )
        
        if not export_result["success"]:
            raise HTTPException(status_code=500, detail="Export failed")
        
        file_info = export_result["file_info"]
        
        return FileResponse(
            path=file_info["file_path"],
            filename=file_info["filename"],
            media_type=file_info["content_type"],
            headers={
                "Content-Length": str(file_info["file_size"]),
                "Content-Disposition": f"attachment; filename=\"{file_info['filename']}\""
            },
            background=BackgroundTasks()  # Cleanup file after response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quick export failed: {str(e)}")

@router.get("/templates")
async def get_export_templates(
    category: Optional[str] = Query(None, description="Filter templates by category"),
    format_type: Optional[str] = Query(None, description="Filter templates by format")
):
    """
    Get available export templates and configurations.
    
    Returns predefined templates for different data sources and formats.
    """
    from app.templates.export_templates import ExportTemplates
    
    if category:
        templates = ExportTemplates.get_template_by_category(category)
        return {
            "success": True,
            "category": category,
            "templates": templates,
            "count": len(templates)
        }
    elif format_type:
        templates = ExportTemplates.get_template_by_format(format_type)
        return {
            "success": True,
            "format_type": format_type,
            "templates": templates,
            "count": len(templates)
        }
    else:
        all_templates = ExportTemplates.get_all_templates()
        
        # Group templates by category
        categories = {}
        for template_id, template in all_templates.items():
            category_name = template.get("category", "general")
            if category_name not in categories:
                categories[category_name] = []
            categories[category_name].append({
                "template_id": template_id,
                **template
            })
        
        return {
            "success": True,
            "templates": all_templates,
            "categories": categories,
            "total_templates": len(all_templates)
        }

@router.post("/template/{template_id}")
async def create_export_from_template(
    template_id: str,
    background_tasks: BackgroundTasks,
    filters: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    current_tenant: Optional[Tenant] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Create export using a predefined template.
    
    This endpoint uses a predefined template and optional custom filters
    to generate an export with optimal settings.
    """
    try:
        from app.templates.export_templates import ExportTemplates
        
        # Get template configuration
        all_templates = ExportTemplates.get_all_templates()
        if template_id not in all_templates:
            raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
        
        template = all_templates[template_id]
        
        # Merge template filters with user-provided filters
        template_filters = template.get("filters", {})
        if filters:
            template_filters.update(filters)
        
        # Create export request from template
        request = ExportRequest(
            data_source=template["data_source"],
            format_type=template["format"],
            filters=template_filters,
            custom_fields=template.get("custom_fields"),
            template_config=template.get("config", {})
        )
        
        # Generate unique export ID
        import uuid
        export_id = str(uuid.uuid4())
        
        # Store job info with template reference
        export_jobs[export_id] = {
            "id": export_id,
            "status": "pending",
            "progress": 0,
            "created_at": datetime.utcnow(),
            "user_id": current_user.id,
            "tenant_id": current_tenant.id if current_tenant else None,
            "template_id": template_id,
            "template_name": template["name"],
            "request": request.dict()
        }
        
        # Start background export job
        background_tasks.add_task(
            process_export_job,
            export_id, 
            request, 
            current_user.id, 
            current_tenant.id if current_tenant else None,
            db
        )
        
        return ExportResponse(
            success=True,
            export_id=export_id,
            message=f"Export job created using template '{template['name']}'. Use the export_id to check status and download.",
            download_url=f"/api/v1/export/{export_id}/download"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create export from template: {str(e)}")

@router.get("/stats")
async def get_export_statistics(
    current_user: User = Depends(get_current_user)
):
    """
    Get export usage statistics for the current user.
    
    Returns statistics about export usage, popular formats, and success rates.
    """
    try:
        # Calculate statistics from export jobs
        user_exports = [
            job for job in export_jobs.values() 
            if job["user_id"] == current_user.id or current_user.is_admin
        ]
        
        if not user_exports:
            return {
                "success": True,
                "statistics": {
                    "total_exports": 0,
                    "completed_exports": 0,
                    "failed_exports": 0,
                    "success_rate": 0.0,
                    "most_popular_format": None,
                    "most_popular_data_source": None,
                    "average_file_size": 0,
                    "exports_by_status": {},
                    "exports_by_format": {},
                    "exports_by_data_source": {},
                    "exports_this_month": 0
                }
            }
        
        # Calculate statistics
        total_exports = len(user_exports)
        completed_exports = sum(1 for job in user_exports if job["status"] == "completed")
        failed_exports = sum(1 for job in user_exports if job["status"] == "failed")
        success_rate = (completed_exports / total_exports * 100) if total_exports > 0 else 0.0
        
        # Format statistics
        format_counts = {}
        data_source_counts = {}
        status_counts = {}
        file_sizes = []
        this_month_count = 0
        current_month = datetime.utcnow().replace(day=1)
        
        for job in user_exports:
            # Count by format
            format_type = job["request"].get("format_type", "unknown")
            format_counts[format_type] = format_counts.get(format_type, 0) + 1
            
            # Count by data source
            data_source = job["request"].get("data_source", "unknown")
            data_source_counts[data_source] = data_source_counts.get(data_source, 0) + 1
            
            # Count by status
            status = job["status"]
            status_counts[status] = status_counts.get(status, 0) + 1
            
            # Collect file sizes
            if "file_info" in job and "file_size" in job["file_info"]:
                file_sizes.append(job["file_info"]["file_size"])
            
            # Count this month
            if job["created_at"] >= current_month:
                this_month_count += 1
        
        # Find most popular format and data source
        most_popular_format = max(format_counts.keys(), key=format_counts.get) if format_counts else None
        most_popular_data_source = max(data_source_counts.keys(), key=data_source_counts.get) if data_source_counts else None
        
        # Calculate average file size
        avg_file_size = sum(file_sizes) / len(file_sizes) if file_sizes else 0
        
        return {
            "success": True,
            "statistics": {
                "total_exports": total_exports,
                "completed_exports": completed_exports,
                "failed_exports": failed_exports,
                "success_rate": round(success_rate, 1),
                "most_popular_format": most_popular_format,
                "most_popular_data_source": most_popular_data_source,
                "average_file_size": int(avg_file_size),
                "exports_by_status": status_counts,
                "exports_by_format": format_counts,
                "exports_by_data_source": data_source_counts,
                "exports_this_month": this_month_count
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get export statistics: {str(e)}")

async def process_export_job(
    export_id: str, 
    request: ExportRequest, 
    user_id: str, 
    tenant_id: Optional[str],
    db: AsyncSession
):
    """
    Background task to process export jobs.
    
    This function runs in the background to generate export files.
    """
    try:
        # Update job status
        export_jobs[export_id]["status"] = "processing"
        export_jobs[export_id]["progress"] = 10
        export_jobs[export_id]["message"] = "Starting export process..."
        
        # Get user and tenant objects
        from sqlalchemy import select
        from app.models.user import User
        from app.models.tenant import Tenant
        
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one()
        
        tenant = None
        if tenant_id:
            tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
            tenant = tenant_result.scalar_one_or_none()
        
        # Create export service
        export_service = DataExportService(db, user, tenant)
        
        # Update progress
        export_jobs[export_id]["progress"] = 30
        export_jobs[export_id]["message"] = "Fetching data..."
        
        # Perform export
        export_result = await export_service.export_data(
            data_source=request.data_source,
            format_type=request.format_type,
            filters=request.filters,
            template_config=request.template_config,
            custom_fields=request.custom_fields
        )
        
        if export_result["success"]:
            # Update job as completed
            export_jobs[export_id]["status"] = "completed"
            export_jobs[export_id]["progress"] = 100
            export_jobs[export_id]["message"] = "Export completed successfully"
            export_jobs[export_id]["completed_at"] = datetime.utcnow()
            export_jobs[export_id]["file_info"] = export_result["file_info"]
        else:
            # Update job as failed
            export_jobs[export_id]["status"] = "failed"
            export_jobs[export_id]["message"] = "Export failed"
        
    except Exception as e:
        # Update job as failed
        export_jobs[export_id]["status"] = "failed"
        export_jobs[export_id]["message"] = f"Export failed: {str(e)}"
        export_jobs[export_id]["progress"] = 0