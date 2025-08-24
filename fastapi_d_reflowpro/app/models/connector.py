from sqlalchemy import Column, String, DateTime, Boolean, Enum, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
import uuid
from ..core.database import Base


class ConnectorType(str, PyEnum):
    """Types of data connectors."""
    FILE_UPLOAD = "file_upload"
    DATABASE = "database"
    API = "api"
    WEBHOOK = "webhook"
    CSV = "csv"
    EXCEL = "excel"
    JSON = "json"


class ConnectorStatus(str, PyEnum):
    """Status of data connectors."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    TESTING = "testing"


class DataConnector(Base):
    """Data connector model for various data sources."""
    __tablename__ = "data_connectors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Enum(ConnectorType), nullable=False, index=True)
    status = Column(Enum(ConnectorStatus), default=ConnectorStatus.INACTIVE, index=True)
    
    # Connection configuration (encrypted in production)
    connection_config = Column(JSON, nullable=True)
    
    # Schema information
    schema_info = Column(JSON, nullable=True)  # Detected columns, types, etc.
    
    # File-specific fields
    file_path = Column(String(500), nullable=True)
    file_size = Column(Integer, nullable=True)
    file_type = Column(String(50), nullable=True, index=True)
    
    # Metadata
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), index=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    last_tested = Column(DateTime(timezone=True), nullable=True)
    last_used = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="connectors")
    created_by = relationship("User")
    pipeline_steps = relationship("PipelineStep", back_populates="source_connector")


class DataPreview(Base):
    """Store data previews for connectors."""
    __tablename__ = "data_previews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connector_id = Column(UUID(as_uuid=True), ForeignKey("data_connectors.id"))
    preview_data = Column(JSON, nullable=False)  # First N rows of data
    row_count = Column(Integer, nullable=True)
    column_info = Column(JSON, nullable=True)  # Column names, types, stats
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    connector = relationship("DataConnector")