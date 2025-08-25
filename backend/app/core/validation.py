"""
Request validation decorators and common validation schemas.
"""
from functools import wraps
from typing import Any, Dict, List, Optional, Callable, Type
from fastapi import HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator, model_validator, ValidationError as PydanticValidationError
import uuid
import logging
from datetime import datetime

from .exceptions import ValidationException
from .validators import ValidatorMixin

logger = logging.getLogger(__name__)


def validate_request_size(max_size_mb: int = 10):
    """Decorator to validate request payload size."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request object in args/kwargs
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if request:
                content_length = request.headers.get("content-length")
                if content_length:
                    try:
                        size_bytes = int(content_length)
                        max_bytes = max_size_mb * 1024 * 1024
                        if size_bytes > max_bytes:
                            raise HTTPException(
                                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                                detail={
                                    "error": "REQUEST_TOO_LARGE",
                                    "message": f"Request size {size_bytes} bytes exceeds maximum allowed size of {max_bytes} bytes",
                                    "details": {
                                        "max_size_mb": max_size_mb,
                                        "request_size_bytes": size_bytes
                                    }
                                }
                            )
                    except (ValueError, TypeError):
                        pass  # Invalid content-length header
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def validate_json_payload():
    """Decorator to validate JSON payload structure and security."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Additional JSON validation can be added here
            # For now, rely on Pydantic model validation
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def validate_user_permissions(required_permissions: List[str]):
    """Decorator to validate user has required permissions."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # TODO: Implement permission checking logic
            # This would integrate with the authentication system
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class CommonValidationSchemas:
    """Common validation schemas used across endpoints."""
    
    class PaginationParams(BaseModel, ValidatorMixin):
        """Standard pagination parameters."""
        page: int = Field(1, ge=1, le=10000, description="Page number (1-based)")
        size: int = Field(20, ge=1, le=100, description="Items per page")
        
        @field_validator('page', 'size')
        @classmethod
        def validate_pagination(cls, v, info):
            if not isinstance(v, int):
                raise ValidationException(
                    f"{info.field_name} must be an integer",
                    field=info.field_name,
                    code=f"{info.field_name.upper()}_INVALID_TYPE"
                )
            return v
    
    class SortParams(BaseModel, ValidatorMixin):
        """Standard sorting parameters."""
        sort_by: Optional[str] = Field(None, max_length=50, description="Field to sort by")
        sort_order: str = Field("desc", description="Sort order: asc or desc")
        
        @field_validator('sort_by')
        @classmethod
        def validate_sort_by(cls, v):
            if v is None:
                return v
            
            # Basic validation - specific endpoints should override with allowed fields
            v = v.strip().lower()
            if not v:
                return None
            
            # Only allow alphanumeric and underscore
            import re
            if not re.match(r'^[a-z0-9_]+$', v):
                raise ValidationException(
                    "Sort field can only contain letters, numbers, and underscores",
                    field="sort_by",
                    code="SORT_FIELD_INVALID_CHARS"
                )
            
            return v
        
        @field_validator('sort_order')
        @classmethod
        def validate_sort_order(cls, v):
            v = v.strip().lower()
            if v not in ['asc', 'desc']:
                raise ValidationException(
                    "Sort order must be 'asc' or 'desc'",
                    field="sort_order",
                    code="SORT_ORDER_INVALID"
                )
            return v
    
    class DateRangeParams(BaseModel, ValidatorMixin):
        """Standard date range parameters."""
        start_date: Optional[datetime] = Field(None, description="Start date (inclusive)")
        end_date: Optional[datetime] = Field(None, description="End date (inclusive)")
        
        @field_validator('start_date', 'end_date')
        @classmethod
        def validate_dates(cls, v, info):
            if v is None:
                return v
            
            # Ensure timezone awareness
            if v.tzinfo is None:
                from datetime import timezone
                v = v.replace(tzinfo=timezone.utc)
            
            # Don't allow dates too far in the future
            max_future = datetime.now().replace(year=datetime.now().year + 10)
            if v > max_future:
                raise ValidationException(
                    f"{info.field_name} cannot be more than 10 years in the future",
                    field=info.field_name,
                    code=f"{info.field_name.upper()}_TOO_FAR_FUTURE"
                )
            
            return v
        
        @model_validator(mode='after')
        def validate_end_after_start(self):
            if self.start_date and self.end_date and self.end_date <= self.start_date:
                raise ValidationException(
                    "End date must be after start date",
                    field="end_date",
                    code="END_DATE_BEFORE_START"
                )
            return self
    
    class FilterParams(BaseModel, ValidatorMixin):
        """Standard filtering parameters."""
        search: Optional[str] = Field(None, max_length=255, description="Search term")
        tags: Optional[List[str]] = Field(None, description="Filter by tags")
        status: Optional[str] = Field(None, max_length=50, description="Filter by status")
        
        @field_validator('search')
        @classmethod
        def validate_search(cls, v):
            if v is None:
                return v
            
            v = cls.sanitize_string_input(v.strip(), max_length=255)
            
            if len(v) < 2:
                raise ValidationException(
                    "Search term must be at least 2 characters long",
                    field="search",
                    code="SEARCH_TOO_SHORT"
                )
            
            return v
        
        @field_validator('tags')
        @classmethod
        def validate_tags(cls, v):
            if v is None:
                return v
            
            if len(v) > 20:
                raise ValidationException(
                    "Too many tags (maximum 20)",
                    field="tags",
                    code="TOO_MANY_TAGS"
                )
            
            validated_tags = []
            for tag in v:
                if not isinstance(tag, str):
                    raise ValidationException(
                        "Tags must be strings",
                        field="tags",
                        code="TAG_NON_STRING"
                    )
                
                tag = tag.strip().lower()
                if not tag:
                    continue
                
                if len(tag) > 50:
                    raise ValidationException(
                        "Tag too long (maximum 50 characters)",
                        field="tags",
                        code="TAG_TOO_LONG"
                    )
                
                import re
                if not re.match(r'^[a-z0-9-_]+$', tag):
                    raise ValidationException(
                        "Tags can only contain lowercase letters, numbers, hyphens, and underscores",
                        field="tags",
                        code="TAG_INVALID_CHARS"
                    )
                
                validated_tags.append(tag)
            
            return list(dict.fromkeys(validated_tags))  # Remove duplicates
        
        @field_validator('status')
        @classmethod
        def validate_status(cls, v):
            if v is None:
                return v
            
            v = v.strip().lower()
            if not v:
                return None
            
            # Basic status validation - specific endpoints should override
            import re
            if not re.match(r'^[a-z_]+$', v):
                raise ValidationException(
                    "Status can only contain lowercase letters and underscores",
                    field="status",
                    code="STATUS_INVALID_CHARS"
                )
            
            return v
    
    class FileUploadParams(BaseModel, ValidatorMixin):
        """File upload validation parameters."""
        max_file_size_mb: int = Field(100, ge=1, le=1000, description="Maximum file size in MB")
        allowed_types: List[str] = Field(
            default=['csv', 'json', 'xlsx', 'txt'],
            description="Allowed file types"
        )
        virus_scan: bool = Field(True, description="Enable virus scanning")
        
        @field_validator('allowed_types')
        @classmethod
        def validate_file_types(cls, v):
            valid_types = ['csv', 'json', 'xlsx', 'xls', 'txt', 'xml', 'pdf']
            
            for file_type in v:
                if file_type.lower() not in valid_types:
                    raise ValidationException(
                        f"Invalid file type '{file_type}'. Valid types: {valid_types}",
                        field="allowed_types",
                        code="FILE_TYPE_INVALID"
                    )
            
            return [ft.lower() for ft in v]
    
    class BulkOperationParams(BaseModel, ValidatorMixin):
        """Bulk operation validation parameters."""
        ids: List[uuid.UUID] = Field(..., min_items=1, max_items=100, description="List of IDs")
        operation: str = Field(..., max_length=50, description="Operation to perform")
        confirm: bool = Field(False, description="Confirmation flag for destructive operations")
        
        @field_validator('ids')
        @classmethod
        def validate_ids_unique(cls, v):
            if len(v) != len(set(v)):
                raise ValidationException(
                    "Duplicate IDs are not allowed",
                    field="ids",
                    code="DUPLICATE_IDS"
                )
            return v
        
        @field_validator('operation')
        @classmethod
        def validate_operation(cls, v):
            v = v.strip().lower()
            valid_operations = ['delete', 'activate', 'deactivate', 'archive', 'export']
            
            if v not in valid_operations:
                raise ValidationException(
                    f"Invalid operation '{v}'. Valid operations: {valid_operations}",
                    field="operation",
                    code="OPERATION_INVALID"
                )
            
            return v
        
        @model_validator(mode='after')
        def validate_confirmation(self):
            destructive_operations = ['delete', 'archive']
            
            if self.operation in destructive_operations and not self.confirm:
                raise ValidationException(
                    f"Confirmation required for '{self.operation}' operation",
                    field="confirm",
                    code="CONFIRMATION_REQUIRED"
                )
            
            return self


class ResponseMetadata(BaseModel):
    """Standard response metadata."""
    request_id: Optional[str] = Field(None, description="Request tracking ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    version: str = Field("v1", description="API version")
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


class ErrorDetail(BaseModel):
    """Detailed error information."""
    field: Optional[str] = Field(None, description="Field that caused the error")
    code: Optional[str] = Field(None, description="Error code for programmatic handling")
    message: str = Field(..., description="Human-readable error message")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional error context")


class ValidationErrorResponse(BaseModel):
    """Structured validation error response."""
    error: str = Field("VALIDATION_ERROR", description="Error type")
    message: str = Field(..., description="General error message")
    details: List[ErrorDetail] = Field(..., description="Detailed validation errors")
    metadata: ResponseMetadata = Field(default_factory=ResponseMetadata, description="Response metadata")


def handle_validation_errors(func: Callable) -> Callable:
    """Decorator to handle Pydantic validation errors and convert to standard format."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except PydanticValidationError as e:
            logger.warning(f"Validation error in {func.__name__}: {e}")
            
            error_details = []
            for error in e.errors():
                field_name = '.'.join(str(loc) for loc in error['loc']) if error['loc'] else None
                error_details.append(ErrorDetail(
                    field=field_name,
                    code=error['type'].upper().replace('.', '_'),
                    message=error['msg'],
                    context={'input': error.get('input')}
                ))
            
            response = ValidationErrorResponse(
                message="Request validation failed",
                details=error_details
            )
            
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=response.dict()
            )
        
        except ValidationException as e:
            logger.warning(f"Custom validation error in {func.__name__}: {e}")
            
            error_details = [ErrorDetail(
                field=e.field,
                code=e.code,
                message=e.message,
                context=e.context
            )]
            
            response = ValidationErrorResponse(
                message="Request validation failed",
                details=error_details
            )
            
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=response.dict()
            )
    
    return wrapper


class SecurityValidation:
    """Security-focused validation utilities."""
    
    @staticmethod
    def validate_no_sql_injection(value: str, field_name: str = "input") -> str:
        """Basic SQL injection pattern detection."""
        if not isinstance(value, str):
            return value
        
        # Basic SQL injection patterns
        suspicious_patterns = [
            r"'.*--", r'".*--', r'/\*.*\*/', r'union\s+select', r'drop\s+table',
            r'delete\s+from', r'insert\s+into', r'update\s+.*set', r'exec\s*\(',
            r'sp_\w+', r'xp_\w+', r'<script', r'javascript:', r'vbscript:'
        ]
        
        import re
        value_lower = value.lower()
        for pattern in suspicious_patterns:
            if re.search(pattern, value_lower):
                raise ValidationException(
                    f"Input contains potentially dangerous content",
                    field=field_name,
                    code="SECURITY_VIOLATION_DETECTED"
                )
        
        return value
    
    @staticmethod
    def validate_no_path_traversal(value: str, field_name: str = "path") -> str:
        """Path traversal attack detection."""
        if not isinstance(value, str):
            return value
        
        dangerous_patterns = ['../', '..\\', '%2e%2e', '%252e%252e']
        value_lower = value.lower()
        
        for pattern in dangerous_patterns:
            if pattern in value_lower:
                raise ValidationException(
                    f"Path contains traversal patterns",
                    field=field_name,
                    code="PATH_TRAVERSAL_DETECTED"
                )
        
        return value
    
    @staticmethod
    def validate_safe_redirect_url(url: str, allowed_domains: List[str] = None) -> str:
        """Validate redirect URLs to prevent open redirects."""
        if not url:
            return url
        
        import re
        from urllib.parse import urlparse
        
        # Basic URL validation
        if not re.match(r'^https?://', url):
            # Relative URLs are generally safe
            if url.startswith('/') and not url.startswith('//'):
                return url
            
            raise ValidationException(
                "Invalid redirect URL format",
                field="redirect_url",
                code="REDIRECT_URL_INVALID_FORMAT"
            )
        
        # Parse URL and validate domain
        parsed = urlparse(url)
        if allowed_domains:
            if parsed.netloc not in allowed_domains:
                raise ValidationException(
                    f"Redirect domain not allowed. Allowed domains: {allowed_domains}",
                    field="redirect_url",
                    code="REDIRECT_DOMAIN_NOT_ALLOWED"
                )
        
        return url