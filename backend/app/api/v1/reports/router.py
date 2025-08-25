from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from datetime import datetime
import os
import mimetypes
from urllib.parse import quote

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.report import ReportType, ReportStatus, ReportFormat
from app.services.reports_service import reports_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/", response_model=Dict[str, Any])
async def list_reports(
    report_type: Optional[ReportType] = Query(None, description="Filter by report type"),
    status: Optional[ReportStatus] = Query(None, description="Filter by report status"),
    limit: int = Query(50, ge=1, le=100, description="Number of reports to return"),
    offset: int = Query(0, ge=0, description="Number of reports to skip"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List reports for the current user."""
    
    try:
        result = await reports_service.list_reports(
            session=session,
            user_id=str(current_user.id),
            organization_id=str(current_user.organization_id) if current_user.organization_id else None,
            report_type=report_type,
            status=status,
            limit=limit,
            offset=offset
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Failed to list reports: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve reports")


@router.get("/statistics", response_model=Dict[str, Any])
async def get_report_statistics(
    days: int = Query(30, ge=1, le=365, description="Number of days to include in statistics"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get report statistics for dashboard."""
    
    try:
        stats = await reports_service.get_report_statistics(
            session=session,
            user_id=str(current_user.id),
            organization_id=str(current_user.organization_id) if current_user.organization_id else None,
            days=days
        )
        
        return {
            "success": True,
            "data": stats
        }
        
    except Exception as e:
        logger.error(f"Failed to get report statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve report statistics")


@router.get("/{report_id}", response_model=Dict[str, Any])
async def get_report(
    report_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific report by ID."""
    
    try:
        report = await reports_service.get_report_by_id(
            session=session,
            report_id=report_id,
            user_id=str(current_user.id),
            organization_id=str(current_user.organization_id) if current_user.organization_id else None
        )
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return {
            "success": True,
            "data": report.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve report")


@router.post("/", response_model=Dict[str, Any])
async def create_report(
    title: str,
    description: str,
    report_type: ReportType,
    format: ReportFormat,
    dataset_id: Optional[str] = None,
    pipeline_id: Optional[str] = None,
    generation_config: Optional[Dict[str, Any]] = None,
    schedule_config: Optional[Dict[str, Any]] = None,
    generate_immediately: bool = True,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new report."""
    
    try:
        # Validate that either dataset_id or pipeline_id is provided
        if not dataset_id and not pipeline_id:
            raise HTTPException(
                status_code=400, 
                detail="Either dataset_id or pipeline_id must be provided"
            )
        
        # Create report record
        report = await reports_service.create_report(
            session=session,
            title=title,
            description=description,
            report_type=report_type,
            format=format,
            user_id=str(current_user.id),
            organization_id=str(current_user.organization_id) if current_user.organization_id else None,
            dataset_id=dataset_id,
            pipeline_id=pipeline_id,
            generation_config=generation_config,
            schedule_config=schedule_config
        )
        
        response_data = {
            "report": report.to_dict(),
            "message": "Report created successfully"
        }
        
        # Start generation if requested
        if generate_immediately and not schedule_config:
            generation_result = await reports_service.generate_report(
                session=session,
                report_id=str(report.id),
                user_id=str(current_user.id),
                organization_id=str(current_user.organization_id) if current_user.organization_id else None
            )
            response_data["generation"] = generation_result
        
        return {
            "success": True,
            "data": response_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create report: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create report")


@router.post("/{report_id}/generate", response_model=Dict[str, Any])
async def generate_report(
    report_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate an existing report."""
    
    try:
        result = await reports_service.generate_report(
            session=session,
            report_id=report_id,
            user_id=str(current_user.id),
            organization_id=str(current_user.organization_id) if current_user.organization_id else None
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to generate report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate report")


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download a generated report file."""
    
    try:
        # Get report
        report = await reports_service.get_report_by_id(
            session=session,
            report_id=report_id,
            user_id=str(current_user.id),
            organization_id=str(current_user.organization_id) if current_user.organization_id else None
        )
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        if not report.is_ready:
            raise HTTPException(
                status_code=400, 
                detail=f"Report is not ready for download. Status: {report.status.value}"
            )
        
        if report.is_expired:
            raise HTTPException(status_code=410, detail="Report has expired")
        
        if not os.path.exists(report.file_path):
            raise HTTPException(status_code=404, detail="Report file not found")
        
        # Increment download count
        report.increment_download_count()
        await session.commit()
        
        # Determine content type
        content_type, _ = mimetypes.guess_type(report.file_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Prepare filename for download
        safe_filename = quote(report.file_name or f"report_{report_id}.{report.format.value}")
        
        logger.info(f"Serving report download: {report_id} to user {current_user.id}")
        
        return FileResponse(
            path=report.file_path,
            filename=safe_filename,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download report")


@router.delete("/{report_id}", response_model=Dict[str, Any])
async def delete_report(
    report_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a report."""
    
    try:
        success = await reports_service.delete_report(
            session=session,
            report_id=report_id,
            user_id=str(current_user.id),
            organization_id=str(current_user.organization_id) if current_user.organization_id else None
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return {
            "success": True,
            "message": "Report deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete report")


@router.post("/{report_id}/share", response_model=Dict[str, Any])
async def share_report(
    report_id: str,
    shared_with: List[str],  # List of email addresses or user IDs
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Share a report with other users."""
    
    try:
        # Get report
        report = await reports_service.get_report_by_id(
            session=session,
            report_id=report_id,
            user_id=str(current_user.id),
            organization_id=str(current_user.organization_id) if current_user.organization_id else None
        )
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Update shared list
        current_shared = report.shared_with or []
        updated_shared = list(set(current_shared + shared_with))
        report.shared_with = updated_shared
        
        await session.commit()
        
        logger.info(f"Report {report_id} shared with {len(shared_with)} users")
        
        return {
            "success": True,
            "message": f"Report shared with {len(shared_with)} users",
            "data": {
                "shared_with": updated_shared
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to share report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to share report")


@router.post("/batch", response_model=Dict[str, Any])
async def batch_generate_reports_endpoint(
    report_requests: List[Dict[str, Any]],
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate multiple reports in batch."""
    
    try:
        # Validate and create report records
        created_reports = []
        
        for request in report_requests:
            report = await reports_service.create_report(
                session=session,
                title=request.get("title", "Batch Report"),
                description=request.get("description", "Generated via batch request"),
                report_type=ReportType(request.get("report_type", "executive")),
                format=ReportFormat(request.get("format", "pdf")),
                user_id=str(current_user.id),
                organization_id=str(current_user.organization_id) if current_user.organization_id else None,
                dataset_id=request.get("dataset_id"),
                pipeline_id=request.get("pipeline_id"),
                generation_config=request.get("generation_config", {})
            )
            created_reports.append(report)
        
        # Start batch generation
        from app.workers.report_generation_tasks import batch_generate_reports
        
        batch_requests = []
        for i, report in enumerate(created_reports):
            batch_requests.append({
                "type": report.report_type.value,
                "dataset_id": report.dataset_id or str(report.pipeline_id),
                "config": report.generation_config,
                "report_id": str(report.id)
            })
        
        task = batch_generate_reports.delay(batch_requests)
        
        # Update reports with task ID
        for report in created_reports:
            report.task_id = task.id
            report.status = ReportStatus.GENERATING
        
        await session.commit()
        
        return {
            "success": True,
            "data": {
                "batch_task_id": task.id,
                "report_count": len(created_reports),
                "reports": [report.to_dict() for report in created_reports],
                "message": "Batch report generation started"
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to start batch report generation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start batch report generation")


# Internal endpoint for updating report status (called by Celery tasks)
@router.patch("/{report_id}/status", response_model=Dict[str, Any])
async def update_report_status(
    report_id: str,
    status: ReportStatus,
    file_path: Optional[str] = None,
    file_size: Optional[int] = None,
    file_name: Optional[str] = None,
    generation_results: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
    session: AsyncSession = Depends(get_db)
):
    """Update report generation status (internal endpoint)."""
    
    try:
        success = await reports_service.update_report_status(
            session=session,
            report_id=report_id,
            status=status,
            file_path=file_path,
            file_size=file_size,
            file_name=file_name,
            generation_results=generation_results,
            error_message=error_message
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return {
            "success": True,
            "message": "Report status updated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update report status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update report status")


@router.post("/cleanup", response_model=Dict[str, Any])
async def cleanup_expired_reports(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clean up expired reports (admin only)."""
    
    try:
        # Check if user is admin (you might want to implement proper role checking)
        if current_user.role.value != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await reports_service.cleanup_expired_reports(session)
        
        return {
            "success": True,
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cleanup expired reports: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cleanup expired reports")