from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.core.database import Base


class ReportType(enum.Enum):
    EXECUTIVE = "executive"
    ANALYST = "analyst"
    PRESENTATION = "presentation"
    DASHBOARD_EXPORT = "dashboard_export"
    CUSTOM = "custom"


class ReportStatus(enum.Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ReportFormat(enum.Enum):
    PDF = "pdf"
    EXCEL = "excel"
    POWERPOINT = "powerpoint"
    CSV = "csv"
    JSON = "json"


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Report metadata
    report_type = Column(SQLEnum(ReportType), nullable=False)
    format = Column(SQLEnum(ReportFormat), nullable=False)
    status = Column(SQLEnum(ReportStatus), default=ReportStatus.PENDING, nullable=False)
    
    # File information
    file_path = Column(String(500))
    file_size = Column(Integer)  # Size in bytes
    file_name = Column(String(255))
    
    # Generation details
    dataset_id = Column(String(255))  # Reference to the dataset used
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("etl_pipelines.id"))
    task_id = Column(String(255))  # Celery task ID
    
    # Configuration and results
    generation_config = Column(JSON)  # Configuration used for generation
    generation_results = Column(JSON)  # Results metadata (insights count, charts, etc.)
    error_message = Column(Text)
    
    # Scheduling
    is_scheduled = Column(Boolean, default=False)
    schedule_config = Column(JSON)  # Cron expression, frequency, etc.
    
    # Timestamps and ownership
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    generated_at = Column(DateTime)  # When report was successfully generated
    expires_at = Column(DateTime)  # When report file should be deleted
    
    # User and organization
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    # Access control
    shared_with = Column(JSON)  # List of user IDs or email addresses
    download_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="generated_reports")
    organization = relationship("Organization", back_populates="generated_reports")
    pipeline = relationship("ETLPipeline", back_populates="generated_reports")
    
    def __repr__(self):
        return f"<GeneratedReport(id={self.id}, title='{self.title}', type={self.report_type.value}, status={self.status.value})>"

    @property
    def is_ready(self) -> bool:
        """Check if report is ready for download."""
        return self.status == ReportStatus.COMPLETED and self.file_path is not None

    @property
    def is_expired(self) -> bool:
        """Check if report has expired."""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at

    def increment_download_count(self):
        """Increment download counter."""
        if self.download_count is None:
            self.download_count = 0
        self.download_count += 1

    def increment_view_count(self):
        """Increment view counter."""
        if self.view_count is None:
            self.view_count = 0
        self.view_count += 1

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "report_type": self.report_type.value,
            "format": self.format.value,
            "status": self.status.value,
            "file_name": self.file_name,
            "file_size": self.file_size,
            "dataset_id": self.dataset_id,
            "pipeline_id": str(self.pipeline_id) if self.pipeline_id else None,
            "task_id": self.task_id,
            "generation_config": self.generation_config,
            "generation_results": self.generation_results,
            "error_message": self.error_message,
            "is_scheduled": self.is_scheduled,
            "schedule_config": self.schedule_config,
            "next_run_at": self.next_run_at.isoformat() if self.next_run_at else None,
            "last_run_at": self.last_run_at.isoformat() if self.last_run_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "generated_at": self.generated_at.isoformat() if self.generated_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "user_id": str(self.user_id),
            "organization_id": str(self.organization_id),
            "is_public": self.is_public,
            "shared_with": self.shared_with or [],
            "download_count": self.download_count or 0,
            "view_count": self.view_count or 0,
            "is_ready": self.is_ready,
            "is_expired": self.is_expired
        }


class ReportTemplate(Base):
    __tablename__ = "report_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Template configuration
    report_type = Column(SQLEnum(ReportType), nullable=False)
    template_config = Column(JSON, nullable=False)  # Template structure and settings
    
    # Customization options
    is_system_template = Column(Boolean, default=False)  # Built-in vs user-created
    is_active = Column(Boolean, default=True)
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime)
    
    # Timestamps and ownership
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # User and organization (null for system templates)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    
    # Relationships
    user = relationship("User", back_populates="report_templates")
    organization = relationship("Organization", back_populates="report_templates")
    
    def __repr__(self):
        return f"<ReportTemplate(id={self.id}, name='{self.name}', type={self.report_type.value})>"

    def increment_usage(self):
        """Increment usage counter and update last used timestamp."""
        if self.usage_count is None:
            self.usage_count = 0
        self.usage_count += 1
        self.last_used_at = datetime.utcnow()

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "report_type": self.report_type.value,
            "template_config": self.template_config,
            "is_system_template": self.is_system_template,
            "is_active": self.is_active,
            "usage_count": self.usage_count or 0,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "user_id": str(self.user_id) if self.user_id else None,
            "organization_id": str(self.organization_id) if self.organization_id else None
        }