from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
from uuid import UUID
import re

from ..core.validators import ValidatorMixin, ValidationError


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


class DatabaseConnectionConfig(BaseModel, ValidatorMixin):
    """Database connection configuration schema."""
    host: str = Field(..., min_length=1, max_length=255, description="Database host")
    port: int = Field(..., ge=1, le=65535, description="Database port")
    database: str = Field(..., min_length=1, max_length=100, description="Database name")
    username: str = Field(..., min_length=1, max_length=100, description="Database username")
    password: Optional[str] = Field(None, max_length=255, description="Database password")
    ssl_mode: Optional[str] = Field("prefer", description="SSL mode")
    min_connections: Optional[int] = Field(1, ge=1, le=50, description="Minimum connection pool size")
    max_connections: Optional[int] = Field(10, ge=1, le=100, description="Maximum connection pool size")
    connection_timeout: Optional[int] = Field(30, ge=1, le=300, description="Connection timeout in seconds")
    
    @field_validator('host')
    @classmethod
    def validate_host(cls, v):
        v = v.strip()
        if not v:
            raise ValidationError("Database host cannot be empty", field="host", code="DB_HOST_EMPTY")
        
        # Allow hostnames, IP addresses, and localhost
        if not re.match(r'^[a-zA-Z0-9.-]+$', v) and v != 'localhost':
            raise ValidationError("Invalid database host format", field="host", code="DB_HOST_INVALID_FORMAT")
        
        return v
    
    @field_validator('database', 'username')
    @classmethod
    def validate_db_identifiers(cls, v, info):
        field_name = info.field_name
        v = v.strip()
        if not v:
            raise ValidationError(f"Database {field_name} cannot be empty", field=field_name, code=f"DB_{field_name.upper()}_EMPTY")
        
        # Database identifiers should be alphanumeric with underscores
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValidationError(
                f"Database {field_name} can only contain letters, numbers, and underscores",
                field=field_name,
                code=f"DB_{field_name.upper()}_INVALID_CHARS"
            )
        
        return v
    
    @field_validator('ssl_mode')
    @classmethod
    def validate_ssl_mode(cls, v):
        if v is None:
            return "prefer"
        
        valid_modes = ['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']
        if v not in valid_modes:
            raise ValidationError(
                f"Invalid SSL mode. Valid modes: {valid_modes}",
                field="ssl_mode", 
                code="DB_SSL_MODE_INVALID"
            )
        
        return v
    
    @model_validator(mode='after')
    def validate_connection_pool(self):
        min_conn = self.min_connections or 1
        max_conn = self.max_connections or 10
        
        if max_conn < min_conn:
            raise ValidationError(
                "Maximum connections must be greater than or equal to minimum connections",
                field="max_connections",
                code="DB_MAX_CONN_TOO_SMALL"
            )
        
        return self


class FileConnectionConfig(BaseModel, ValidatorMixin):
    """File connection configuration schema."""
    file_path: Optional[str] = Field(None, max_length=500, description="Path to file")
    encoding: Optional[str] = Field("utf-8", description="File encoding")
    delimiter: Optional[str] = Field(",", max_length=5, description="CSV delimiter")
    has_header: Optional[bool] = Field(True, description="File has header row")
    sheet_name: Optional[str] = Field(None, max_length=100, description="Excel sheet name")
    skip_rows: Optional[int] = Field(0, ge=0, le=1000, description="Number of rows to skip at start")
    max_rows: Optional[int] = Field(None, ge=1, description="Maximum number of rows to process")
    
    @validator('file_path')
    def validate_file_path(cls, v):
        if v is None:
            return v
        
        v = v.strip()
        if not v:
            return None
        
        # Check for path traversal attempts
        if '..' in v or v.startswith('/'):
            raise ValidationError(
                "File path cannot contain '..' or start with '/'",
                field="file_path",
                code="FILE_PATH_INVALID"
            )
        
        # Check file extension
        allowed_extensions = ['.csv', '.json', '.xls', '.xlsx', '.txt', '.xml']
        if '.' in v:
            ext = '.' + v.split('.')[-1].lower()
            if ext not in allowed_extensions:
                raise ValidationError(
                    f"File extension must be one of: {allowed_extensions}",
                    field="file_path",
                    code="FILE_EXTENSION_INVALID"
                )
        
        return v
    
    @validator('encoding')
    def validate_encoding(cls, v):
        if v is None:
            return "utf-8"
        
        valid_encodings = ['utf-8', 'utf-16', 'ascii', 'latin-1', 'iso-8859-1', 'cp1252']
        if v.lower() not in valid_encodings:
            raise ValidationError(
                f"Invalid encoding. Valid encodings: {valid_encodings}",
                field="encoding",
                code="FILE_ENCODING_INVALID"
            )
        
        return v.lower()
    
    @validator('delimiter')
    def validate_delimiter(cls, v):
        if v is None:
            return ","
        
        if len(v) == 0:
            raise ValidationError("Delimiter cannot be empty", field="delimiter", code="DELIMITER_EMPTY")
        
        if len(v) > 5:
            raise ValidationError("Delimiter too long (max 5 characters)", field="delimiter", code="DELIMITER_TOO_LONG")
        
        return v
    
    @validator('sheet_name')
    def validate_sheet_name(cls, v):
        if v is None:
            return v
        
        v = v.strip()
        if not v:
            return None
        
        # Excel sheet names have restrictions
        invalid_chars = ['/', '\\', '?', '*', '[', ']']
        for char in invalid_chars:
            if char in v:
                raise ValidationError(
                    f"Sheet name cannot contain: {invalid_chars}",
                    field="sheet_name",
                    code="SHEET_NAME_INVALID_CHARS"
                )
        
        return v


class APIConnectionConfig(BaseModel, ValidatorMixin):
    """API connection configuration schema."""
    base_url: str = Field(..., max_length=2048, description="API base URL")
    api_key: Optional[str] = Field(None, max_length=255, description="API key")
    auth_type: Optional[str] = Field("none", description="Authentication type")
    headers: Optional[Dict[str, str]] = Field({}, description="Custom headers")
    timeout: Optional[int] = Field(30, ge=1, le=300, description="Request timeout in seconds")
    retry_attempts: Optional[int] = Field(3, ge=0, le=10, description="Number of retry attempts")
    rate_limit_per_second: Optional[int] = Field(10, ge=1, le=1000, description="Rate limit requests per second")
    
    @validator('base_url')
    def validate_base_url(cls, v):
        return cls.validate_url_format(v, allowed_schemes=['http', 'https'])
    
    @validator('api_key')
    def validate_api_key(cls, v):
        if v is None:
            return v
        
        v = v.strip()
        if not v:
            return None
        
        # Basic API key format validation
        if len(v) < 10:
            raise ValidationError("API key too short (minimum 10 characters)", field="api_key", code="API_KEY_TOO_SHORT")
        
        return v
    
    @validator('auth_type')
    def validate_auth_type(cls, v):
        if v is None:
            return "none"
        
        valid_types = ['none', 'api_key', 'bearer', 'basic', 'oauth2']
        if v.lower() not in valid_types:
            raise ValidationError(
                f"Invalid authentication type. Valid types: {valid_types}",
                field="auth_type",
                code="AUTH_TYPE_INVALID"
            )
        
        return v.lower()
    
    @validator('headers')
    def validate_headers(cls, v):
        if v is None:
            return {}
        
        if not isinstance(v, dict):
            raise ValidationError("Headers must be a dictionary", field="headers", code="HEADERS_INVALID_TYPE")
        
        # Validate header names and values
        for name, value in v.items():
            if not isinstance(name, str) or not isinstance(value, str):
                raise ValidationError("Header names and values must be strings", field="headers", code="HEADERS_NON_STRING")
            
            if not re.match(r'^[a-zA-Z0-9-]+$', name):
                raise ValidationError(
                    f"Invalid header name '{name}'. Only letters, numbers, and hyphens allowed",
                    field="headers",
                    code="HEADER_NAME_INVALID"
                )
            
            if len(value) > 1000:
                raise ValidationError(
                    f"Header value for '{name}' too long (max 1000 characters)",
                    field="headers",
                    code="HEADER_VALUE_TOO_LONG"
                )
        
        return v


class ConnectorCreate(BaseModel, ValidatorMixin):
    """Schema for creating a new connector."""
    name: str = Field(..., min_length=1, max_length=255, description="Connector name")
    description: Optional[str] = Field(None, max_length=1000, description="Connector description")
    type: ConnectorType = Field(..., description="Connector type")
    connection_config: Optional[Dict[str, Any]] = Field({}, description="Connection configuration")
    tags: Optional[List[str]] = Field(None, description="Connector tags")
    is_sensitive: Optional[bool] = Field(False, description="Whether connector contains sensitive data")
    
    model_config = ConfigDict(use_enum_values=True)
    
    @validator('name')
    def validate_name(cls, v):
        v = cls.sanitize_string_input(v.strip(), max_length=255)
        
        if not re.match(r'^[a-zA-Z0-9\s_-]+$', v):
            raise ValidationError(
                "Connector name can only contain letters, numbers, spaces, underscores, and hyphens",
                field="name",
                code="CONNECTOR_NAME_INVALID_CHARS"
            )
        
        return v
    
    @validator('description')
    def validate_description(cls, v):
        if v is None:
            return v
        return cls.sanitize_string_input(v.strip(), max_length=1000)
    
    @validator('connection_config')
    def validate_connection_config(cls, v, values):
        if v is None:
            return {}
        
        v = cls.validate_json_data(v)
        
        # Type-specific validation
        connector_type = values.get('type')
        if connector_type == ConnectorType.DATABASE:
            return cls.validate_database_connection(v)
        elif connector_type in [ConnectorType.FILE_UPLOAD, ConnectorType.CSV, ConnectorType.EXCEL, ConnectorType.JSON]:
            return cls.validate_file_upload(v)
        
        return v
    
    @validator('tags')
    def validate_tags(cls, v):
        if v is None:
            return v
        
        if len(v) > 20:
            raise ValidationError("Too many tags (maximum 20)", field="tags", code="TOO_MANY_TAGS")
        
        validated_tags = []
        for tag in v:
            if not isinstance(tag, str):
                raise ValidationError("Tags must be strings", field="tags", code="TAG_NON_STRING")
            
            tag = tag.strip().lower()
            if not tag:
                continue
            
            if len(tag) > 50:
                raise ValidationError("Tag too long (maximum 50 characters)", field="tags", code="TAG_TOO_LONG")
            
            if not re.match(r'^[a-z0-9-_]+$', tag):
                raise ValidationError(
                    "Tags can only contain lowercase letters, numbers, hyphens, and underscores",
                    field="tags",
                    code="TAG_INVALID_CHARS"
                )
            
            validated_tags.append(tag)
        
        # Remove duplicates while preserving order
        return list(dict.fromkeys(validated_tags))


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


class ConnectorTestRequest(BaseModel, ValidatorMixin):
    """Schema for testing a connector connection."""
    connection_config: Dict[str, Any] = Field(..., description="Connection configuration to test")
    test_type: Optional[str] = Field("connection", description="Type of test to perform")
    timeout_seconds: Optional[int] = Field(30, ge=5, le=120, description="Test timeout in seconds")
    
    @validator('connection_config')
    def validate_connection_config(cls, v):
        return cls.validate_json_data(v)
    
    @validator('test_type')
    def validate_test_type(cls, v):
        valid_types = ['connection', 'schema', 'data_preview', 'performance']
        if v not in valid_types:
            raise ValidationError(
                f"Invalid test type. Valid types: {valid_types}",
                field="test_type",
                code="TEST_TYPE_INVALID"
            )
        return v


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