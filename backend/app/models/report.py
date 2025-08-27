from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, Boolean, ForeignKey, Enum as SQLEnum, Float
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
    next_run_at = Column(DateTime)  # Next scheduled run time
    last_run_at = Column(DateTime)  # Last scheduled run time

    # Timestamps and ownership
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    generated_at = Column(DateTime)  # When report was successfully generated
    expires_at = Column(DateTime)  # When report file should be deleted

    # User and organization
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)

    # Access control
    is_public = Column(Boolean, default=False)  # Whether report is publicly accessible
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


class TemplateCategory(enum.Enum):
    EXECUTIVE = "executive"
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    MARKETING = "marketing"
    CUSTOM = "custom"


class TemplateBrandingOptions(Base):
    __tablename__ = "template_branding_options"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey("report_templates.id"), nullable=False)
    
    # Branding configuration
    primary_color = Column(String(7), default="#1f2937")  # Hex color
    secondary_color = Column(String(7), default="#3b82f6")  # Hex color
    accent_color = Column(String(7), default="#10b981")  # Hex color
    logo_url = Column(String(500))
    company_name = Column(String(255))
    font_family = Column(String(100), default="Inter")
    
    # Layout preferences
    header_height = Column(Integer, default=80)
    footer_height = Column(Integer, default=60)
    margin_top = Column(Integer, default=20)
    margin_bottom = Column(Integer, default=20)
    margin_left = Column(Integer, default=20)
    margin_right = Column(Integer, default=20)
    
    # Style configuration
    border_radius = Column(Integer, default=8)
    shadow_style = Column(String(50), default="medium")
    chart_palette = Column(JSON)  # Array of colors for charts
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ReportTemplate(Base):
    __tablename__ = "report_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Template configuration
    report_type = Column(SQLEnum(ReportType), nullable=False)
    category = Column(SQLEnum(TemplateCategory), default=TemplateCategory.CUSTOM)
    template_config = Column(JSON, nullable=False)  # Template structure and settings
    
    # Enhanced template structure
    sections = Column(JSON)  # Array of section configurations
    layout_config = Column(JSON)  # Layout and positioning
    data_mappings = Column(JSON)  # How data maps to template sections
    conditional_logic = Column(JSON)  # Rules for conditional content
    
    # Visual customization
    theme_config = Column(JSON)  # Theme and styling configuration
    branding_enabled = Column(Boolean, default=True)
    
    # Advanced features
    is_collaborative = Column(Boolean, default=False)  # Multi-user editing
    version = Column(Integer, default=1)
    parent_template_id = Column(UUID(as_uuid=True), ForeignKey("report_templates.id"))  # Template inheritance
    
    # Customization options
    is_system_template = Column(Boolean, default=False)  # Built-in vs user-created
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)  # Available to all users in org
    
    # Template marketplace features
    rating = Column(Float, default=0.0)
    download_count = Column(Integer, default=0)
    tags = Column(JSON)  # Array of tags for categorization
    
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
    branding_options = relationship("TemplateBrandingOptions", backref="template", cascade="all, delete-orphan")
    child_templates = relationship("ReportTemplate", remote_side=[parent_template_id])
    
    def __repr__(self):
        return f"<ReportTemplate(id={self.id}, name='{self.name}', type={self.report_type.value})>"

    def increment_usage(self):
        """Increment usage counter and update last used timestamp."""
        if self.usage_count is None:
            self.usage_count = 0
        self.usage_count += 1
        self.last_used_at = datetime.utcnow()

    def create_version(self, user_id: UUID, changes: dict):
        """Create a new version of this template."""
        self.version += 1
        self.updated_at = datetime.utcnow()
        # Log changes for version control
        return {
            "version": self.version,
            "changes": changes,
            "updated_by": str(user_id),
            "timestamp": self.updated_at.isoformat()
        }

    def validate_structure(self):
        """Validate template structure and configuration."""
        errors = []
        
        if not self.sections or not isinstance(self.sections, list):
            errors.append("Template must have at least one section")
        
        if not self.template_config:
            errors.append("Template configuration is required")
        
        # Validate data mappings
        if self.data_mappings:
            for mapping in self.data_mappings:
                if not mapping.get('source_field') or not mapping.get('target_field'):
                    errors.append("Invalid data mapping configuration")
        
        return errors

    def get_section_by_id(self, section_id: str):
        """Get a specific section by ID."""
        if not self.sections:
            return None
        return next((s for s in self.sections if s.get('id') == section_id), None)

    def add_section(self, section_config: dict):
        """Add a new section to the template."""
        if not self.sections:
            self.sections = []
        
        section_config['id'] = str(uuid.uuid4())
        section_config['order'] = len(self.sections)
        self.sections.append(section_config)

    def remove_section(self, section_id: str):
        """Remove a section from the template."""
        if not self.sections:
            return False
        
        self.sections = [s for s in self.sections if s.get('id') != section_id]
        # Reorder remaining sections
        for i, section in enumerate(self.sections):
            section['order'] = i
        return True

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "report_type": self.report_type.value,
            "category": self.category.value if self.category else None,
            "template_config": self.template_config,
            "sections": self.sections or [],
            "layout_config": self.layout_config or {},
            "data_mappings": self.data_mappings or [],
            "conditional_logic": self.conditional_logic or [],
            "theme_config": self.theme_config or {},
            "branding_enabled": self.branding_enabled,
            "is_collaborative": self.is_collaborative,
            "version": self.version,
            "parent_template_id": str(self.parent_template_id) if self.parent_template_id else None,
            "is_system_template": self.is_system_template,
            "is_active": self.is_active,
            "is_public": self.is_public,
            "rating": self.rating or 0.0,
            "download_count": self.download_count or 0,
            "tags": self.tags or [],
            "usage_count": self.usage_count or 0,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "user_id": str(self.user_id) if self.user_id else None,
            "organization_id": str(self.organization_id) if self.organization_id else None
        }