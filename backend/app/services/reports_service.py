from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.orm import selectinload
import os
import uuid
import shutil

from app.models.report import GeneratedReport, ReportTemplate, ReportType, ReportStatus, ReportFormat
from app.models.user import User
from app.models.pipeline import ETLPipeline
from app.workers.report_generation_tasks import (
    generate_executive_report,
    generate_analyst_report, 
    generate_presentation,
    generate_dashboard_export,
    batch_generate_reports
)
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class ReportsService:
    """Service for managing reports and report generation."""
    
    def __init__(self):
        self.report_storage_path = getattr(settings, 'REPORT_STORAGE_PATH', '/tmp/reports')
        self.ensure_storage_directory()
    
    def ensure_storage_directory(self):
        """Ensure report storage directory exists."""
        os.makedirs(self.report_storage_path, exist_ok=True)
    
    async def list_reports(
        self,
        session: AsyncSession,
        user_id: str,
        organization_id: Optional[str],
        report_type: Optional[ReportType] = None,
        status: Optional[ReportStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """List reports for a user/organization."""
        
        try:
            # Build query filters
            filters = [
                GeneratedReport.user_id == user_id
            ]

            # Add organization filter if provided
            if organization_id is not None:
                filters.append(GeneratedReport.organization_id == organization_id)
            else:
                filters.append(GeneratedReport.organization_id.is_(None))
            
            if report_type:
                filters.append(GeneratedReport.report_type == report_type)
                
            if status:
                filters.append(GeneratedReport.status == status)
            
            # Get total count
            count_query = select(func.count(GeneratedReport.id)).where(and_(*filters))
            total_result = await session.execute(count_query)
            total_count = total_result.scalar()
            
            # Get reports with pagination
            query = (
                select(GeneratedReport)
                .options(
                    selectinload(GeneratedReport.user),
                    selectinload(GeneratedReport.pipeline)
                )
                .where(and_(*filters))
                .order_by(desc(GeneratedReport.created_at))
                .limit(limit)
                .offset(offset)
            )
            
            result = await session.execute(query)
            reports = result.scalars().all()
            
            return {
                "reports": [report.to_dict() for report in reports],
                "total_count": total_count,
                "page_size": limit,
                "offset": offset,
                "has_more": offset + limit < total_count
            }
            
        except Exception as e:
            logger.error(f"Failed to list reports: {str(e)}")
            raise
    
    async def get_report_by_id(
        self,
        session: AsyncSession,
        report_id: str,
        user_id: str,
        organization_id: Optional[str]
    ) -> Optional[GeneratedReport]:
        """Get a specific report by ID."""
        
        try:
            # Build query filters
            filters = [
                GeneratedReport.id == report_id,
                GeneratedReport.user_id == user_id
            ]

            # Add organization filter if provided
            if organization_id is not None:
                filters.append(GeneratedReport.organization_id == organization_id)
            else:
                filters.append(GeneratedReport.organization_id.is_(None))

            query = (
                select(GeneratedReport)
                .options(
                    selectinload(GeneratedReport.user),
                    selectinload(GeneratedReport.pipeline)
                )
                .where(and_(*filters))
            )
            
            result = await session.execute(query)
            report = result.scalars().first()
            
            if report:
                # Increment view count
                report.increment_view_count()
                await session.commit()
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to get report {report_id}: {str(e)}")
            raise
    
    async def create_report(
        self,
        session: AsyncSession,
        title: str,
        description: str,
        report_type: ReportType,
        format: ReportFormat,
        user_id: str,
        organization_id: Optional[str],
        dataset_id: Optional[str] = None,
        pipeline_id: Optional[str] = None,
        generation_config: Optional[Dict[str, Any]] = None,
        schedule_config: Optional[Dict[str, Any]] = None
    ) -> GeneratedReport:
        """Create a new report record."""
        
        try:
            report = GeneratedReport(
                title=title,
                description=description,
                report_type=report_type,
                format=format,
                user_id=user_id,
                organization_id=organization_id,
                dataset_id=dataset_id,
                pipeline_id=pipeline_id,
                generation_config=generation_config or {},
                is_scheduled=schedule_config is not None,
                schedule_config=schedule_config
            )
            
            # Set expiration (30 days from creation by default)
            report.expires_at = datetime.utcnow() + timedelta(days=30)
            
            session.add(report)
            await session.commit()
            await session.refresh(report)
            
            logger.info(f"Created report {report.id} for user {user_id}")
            return report
            
        except Exception as e:
            logger.error(f"Failed to create report: {str(e)}")
            await session.rollback()
            raise
    
    async def generate_report(
        self,
        session: AsyncSession,
        report_id: str,
        user_id: str,
        organization_id: Optional[str]
    ) -> Dict[str, Any]:
        """Start report generation process."""
        
        try:
            # Get report record
            report = await self.get_report_by_id(session, report_id, user_id, organization_id)
            if not report:
                raise ValueError(f"Report {report_id} not found")
            
            # Update status to generating
            report.status = ReportStatus.GENERATING
            await session.commit()
            
            # Start appropriate Celery task based on report type
            if report.report_type == ReportType.EXECUTIVE:
                task = generate_executive_report.delay(
                    report.dataset_id or str(report.pipeline_id),
                    report.generation_config,
                    str(report.id),
                    user_id
                )
            elif report.report_type == ReportType.ANALYST:
                task = generate_analyst_report.delay(
                    report.dataset_id or str(report.pipeline_id),
                    report.generation_config,
                    str(report.id),
                    user_id
                )
            elif report.report_type == ReportType.PRESENTATION:
                task = generate_presentation.delay(
                    report.dataset_id or str(report.pipeline_id),
                    report.generation_config,
                    str(report.id),
                    user_id
                )
            elif report.report_type == ReportType.DASHBOARD_EXPORT:
                task = generate_dashboard_export.delay(
                    report.dataset_id or "dashboard",
                    report.generation_config,
                    str(report.id),
                    user_id
                )
            else:
                raise ValueError(f"Unsupported report type: {report.report_type}")
            
            # Update report with task ID
            report.task_id = task.id
            await session.commit()
            
            logger.info(f"Started generation for report {report_id} with task {task.id}")
            
            return {
                "report_id": str(report.id),
                "task_id": task.id,
                "status": "generating",
                "message": "Report generation started"
            }
            
        except Exception as e:
            logger.error(f"Failed to generate report {report_id}: {str(e)}")
            # Update report status to failed
            if 'report' in locals():
                report.status = ReportStatus.FAILED
                report.error_message = str(e)
                await session.commit()
            raise
    
    async def update_report_status(
        self,
        session: AsyncSession,
        report_id: str,
        status: ReportStatus,
        file_path: Optional[str] = None,
        file_size: Optional[int] = None,
        file_name: Optional[str] = None,
        generation_results: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ) -> bool:
        """Update report generation status."""
        
        try:
            query = select(GeneratedReport).where(GeneratedReport.id == report_id)
            result = await session.execute(query)
            report = result.scalars().first()
            
            if not report:
                logger.error(f"Report {report_id} not found for status update")
                return False
            
            report.status = status
            
            if file_path:
                report.file_path = file_path
            if file_size:
                report.file_size = file_size
            if file_name:
                report.file_name = file_name
            if generation_results:
                report.generation_results = generation_results
            if error_message:
                report.error_message = error_message
            
            if status == ReportStatus.COMPLETED:
                report.generated_at = datetime.utcnow()
            
            await session.commit()
            
            logger.info(f"Updated report {report_id} status to {status.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update report status: {str(e)}")
            await session.rollback()
            return False
    
    async def delete_report(
        self,
        session: AsyncSession,
        report_id: str,
        user_id: str,
        organization_id: Optional[str]
    ) -> bool:
        """Delete a report and its associated files."""
        
        try:
            # Get report
            report = await self.get_report_by_id(session, report_id, user_id, organization_id)
            if not report:
                logger.warning(f"Report {report_id} not found for deletion")
                return False
            
            # Delete associated file if it exists
            if report.file_path and os.path.exists(report.file_path):
                try:
                    os.remove(report.file_path)
                    logger.info(f"Deleted report file: {report.file_path}")
                except OSError as e:
                    logger.warning(f"Failed to delete report file {report.file_path}: {str(e)}")
            
            # Delete database record
            await session.delete(report)
            await session.commit()
            
            logger.info(f"Deleted report {report_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete report {report_id}: {str(e)}")
            await session.rollback()
            return False
    
    async def get_report_statistics(
        self,
        session: AsyncSession,
        user_id: str,
        organization_id: Optional[str],
        days: int = 30
    ) -> Dict[str, Any]:
        """Get report statistics for dashboard."""
        
        try:
            # Date range filter
            since_date = datetime.utcnow() - timedelta(days=days)
            
            base_filters = [
                GeneratedReport.user_id == user_id,
                GeneratedReport.created_at >= since_date
            ]

            # Add organization filter if provided
            if organization_id is not None:
                base_filters.append(GeneratedReport.organization_id == organization_id)
            else:
                base_filters.append(GeneratedReport.organization_id.is_(None))
            
            # Total reports
            total_query = select(func.count(GeneratedReport.id)).where(and_(*base_filters))
            total_result = await session.execute(total_query)
            total_reports = total_result.scalar() or 0
            
            # Reports by status
            status_query = (
                select(GeneratedReport.status, func.count(GeneratedReport.id))
                .where(and_(*base_filters))
                .group_by(GeneratedReport.status)
            )
            status_result = await session.execute(status_query)
            status_counts = dict(status_result.all())
            
            # Reports by type
            type_query = (
                select(GeneratedReport.report_type, func.count(GeneratedReport.id))
                .where(and_(*base_filters))
                .group_by(GeneratedReport.report_type)
            )
            type_result = await session.execute(type_query)
            type_counts = dict(type_result.all())
            
            # Recent activity
            recent_query = (
                select(GeneratedReport)
                .where(and_(*base_filters))
                .order_by(desc(GeneratedReport.created_at))
                .limit(5)
            )
            recent_result = await session.execute(recent_query)
            recent_reports = [report.to_dict() for report in recent_result.scalars().all()]
            
            # Total downloads
            downloads_query = (
                select(func.sum(GeneratedReport.download_count))
                .where(and_(*base_filters))
            )
            downloads_result = await session.execute(downloads_query)
            total_downloads = downloads_result.scalar() or 0
            
            return {
                "period_days": days,
                "total_reports": total_reports,
                "completed_reports": status_counts.get(ReportStatus.COMPLETED, 0),
                "pending_reports": status_counts.get(ReportStatus.PENDING, 0) + status_counts.get(ReportStatus.GENERATING, 0),
                "failed_reports": status_counts.get(ReportStatus.FAILED, 0),
                "total_downloads": total_downloads,
                "reports_by_status": {status.value: count for status, count in status_counts.items()},
                "reports_by_type": {report_type.value: count for report_type, count in type_counts.items()},
                "recent_reports": recent_reports
            }
            
        except Exception as e:
            logger.error(f"Failed to get report statistics: {str(e)}")
            raise
    
    def get_report_file_path(self, report: GeneratedReport) -> str:
        """Generate file path for report storage."""
        date_path = report.created_at.strftime('%Y/%m/%d')
        filename = f"{report.id}_{report.title.replace(' ', '_')}.{report.format.value}"
        return os.path.join(self.report_storage_path, date_path, filename)
    
    async def cleanup_expired_reports(self, session: AsyncSession) -> Dict[str, Any]:
        """Clean up expired reports."""
        
        try:
            # Find expired reports
            expired_query = (
                select(GeneratedReport)
                .where(
                    and_(
                        GeneratedReport.expires_at <= datetime.utcnow(),
                        GeneratedReport.file_path.isnot(None)
                    )
                )
            )
            
            result = await session.execute(expired_query)
            expired_reports = result.scalars().all()
            
            cleaned_count = 0
            failed_count = 0
            
            for report in expired_reports:
                try:
                    # Delete file
                    if os.path.exists(report.file_path):
                        os.remove(report.file_path)
                    
                    # Clear file info but keep report record
                    report.file_path = None
                    report.file_size = None
                    report.status = ReportStatus.CANCELLED
                    
                    cleaned_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to clean up expired report {report.id}: {str(e)}")
                    failed_count += 1
            
            await session.commit()
            
            logger.info(f"Cleaned up {cleaned_count} expired reports, {failed_count} failed")
            
            return {
                "cleaned_count": cleaned_count,
                "failed_count": failed_count,
                "total_expired": len(expired_reports)
            }
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired reports: {str(e)}")
            await session.rollback()
            raise


# Global instance
reports_service = ReportsService()