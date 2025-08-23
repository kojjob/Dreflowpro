from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
from uuid import UUID


class ConnectorType(str, Enum):
    """Types of data connectors."""
    FILE_UPLOAD = "file_upload"
    DATABASE = "database"
    API = "api"
    WEBHOOK = "webhook"
    CSV = "csv"
    EXCEL = "excel"
    JSON = "json"


class ConnectorStatus(str, Enum):
    """Status of data connectors."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    TESTING = "testing"


class DatabaseConnectionConfig(BaseModel):
    """Database connection configuration schema."""
    host: str = Field(..., description="Database host")
    port: int = Field(..., description="Database port")
    database: str = Field(..., description="Database name")
    username: str = Field(..., description="Database username")
    password: Optional[str] = Field(None, description="Database password")
    ssl_mode: Optional[str] = Field("prefer", description="SSL mode")
    min_connections: Optional[int] = Field(1, description="Minimum connection pool size")
    max_connections: Optional[int] = Field(10, description="Maximum connection pool size")


class FileConnectionConfig(BaseModel):
    """File connection configuration schema."""
    file_path: Optional[str] = Field(None, description="Path to file")
    encoding: Optional[str] = Field("utf-8", description="File encoding")
    delimiter: Optional[str] = Field(",", description="CSV delimiter")
    has_header: Optional[bool] = Field(True, description="File has header row")
    sheet_name: Optional[str] = Field(None, description="Excel sheet name")


class APIConnectionConfig(BaseModel):
    """API connection configuration schema."""
    base_url: str = Field(..., description="API base URL")
    api_key: Optional[str] = Field(None, description="API key")
    auth_type: Optional[str] = Field("none", description="Authentication type")
    headers: Optional[Dict[str, str]] = Field({}, description="Custom headers")
    timeout: Optional[int] = Field(30, description="Request timeout in seconds")


class ConnectorCreate(BaseModel):
    """Schema for creating a new connector."""
    name: str = Field(..., min_length=1, max_length=255, description="Connector name")
    description: Optional[str] = Field(None, description="Connector description")
    type: ConnectorType = Field(..., description="Connector type")
    connection_config: Optional[Dict[str, Any]] = Field({}, description="Connection configuration")
    
    model_config = ConfigDict(use_enum_values=True)


class ConnectorUpdate(BaseModel):
    """Schema for updating an existing connector."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Connector name")
    description: Optional[str] = Field(None, description="Connector description")
    status: Optional[ConnectorStatus] = Field(None, description="Connector status")
    connection_config: Optional[Dict[str, Any]] = Field(None, description="Connection configuration")
    
    model_config = ConfigDict(use_enum_values=True)


class ConnectorResponse(BaseModel):
    """Schema for connector response."""
    id: UUID
    name: str
    description: Optional[str]
    type: ConnectorType
    status: ConnectorStatus
    connection_config: Optional[Dict[str, Any]]
    schema_info: Optional[Dict[str, Any]]
    file_path: Optional[str]
    file_size: Optional[int]
    file_type: Optional[str]
    last_tested: Optional[datetime]
    last_used: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class ConnectorList(BaseModel):
    """Schema for connector list response."""
    connectors: List[ConnectorResponse]
    total: int
    page: int
    size: int
    pages: int


class ConnectorTestRequest(BaseModel):
    """Schema for testing a connector connection."""
    connection_config: Dict[str, Any] = Field(..., description="Connection configuration to test")


class ConnectorTestResponse(BaseModel):
    """Schema for connector test response."""
    success: bool
    message: str
    connection_time_ms: Optional[float] = None
    schema_preview: Optional[Dict[str, Any]] = None
    sample_data: Optional[List[Dict[str, Any]]] = None


class DataPreviewResponse(BaseModel):
    """Schema for data preview response."""
    id: UUID
    connector_id: UUID
    preview_data: List[Dict[str, Any]]
    row_count: Optional[int]
    column_info: Optional[Dict[str, Any]]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)