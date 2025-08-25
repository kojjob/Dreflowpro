"""
Custom exception classes for domain-specific errors.
"""
from typing import Any, Dict, Optional, Union
from fastapi import HTTPException, status


class BaseCustomException(Exception):
    """Base class for all custom exceptions."""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None
    ):
        self.message = message
        self.details = details or {}
        self.error_code = error_code
        super().__init__(self.message)


class ValidationException(BaseCustomException):
    """Raised when data validation fails."""
    
    def __init__(
        self,
        message: str = "Validation failed",
        field: Optional[str] = None,
        value: Any = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.field = field
        self.value = value
        details = details or {}
        if field:
            details["field"] = field
        if value is not None:
            details["value"] = str(value)
        
        super().__init__(
            message=message,
            details=details,
            error_code="VALIDATION_ERROR"
        )


class AuthenticationException(BaseCustomException):
    """Raised when authentication fails."""
    
    def __init__(
        self,
        message: str = "Authentication failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            details=details,
            error_code="AUTHENTICATION_ERROR"
        )


class AuthorizationException(BaseCustomException):
    """Raised when authorization fails."""
    
    def __init__(
        self,
        message: str = "Access denied",
        required_permission: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        if required_permission:
            details["required_permission"] = required_permission
        
        super().__init__(
            message=message,
            details=details,
            error_code="AUTHORIZATION_ERROR"
        )


class ResourceNotFoundException(BaseCustomException):
    """Raised when a requested resource is not found."""
    
    def __init__(
        self,
        resource_type: str = "Resource",
        resource_id: Optional[Union[str, int]] = None,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        if not message:
            if resource_id:
                message = f"{resource_type} with ID {resource_id} not found"
            else:
                message = f"{resource_type} not found"
        
        details = details or {}
        details.update({
            "resource_type": resource_type,
            "resource_id": str(resource_id) if resource_id else None
        })
        
        super().__init__(
            message=message,
            details=details,
            error_code="RESOURCE_NOT_FOUND"
        )


class ResourceConflictException(BaseCustomException):
    """Raised when a resource conflict occurs."""
    
    def __init__(
        self,
        message: str = "Resource conflict",
        conflicting_field: Optional[str] = None,
        conflicting_value: Any = None,
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        if conflicting_field:
            details["conflicting_field"] = conflicting_field
        if conflicting_value is not None:
            details["conflicting_value"] = str(conflicting_value)
        
        super().__init__(
            message=message,
            details=details,
            error_code="RESOURCE_CONFLICT"
        )


class ConnectorException(BaseCustomException):
    """Raised when connector operations fail."""
    
    def __init__(
        self,
        message: str,
        connector_type: Optional[str] = None,
        connector_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        if connector_type:
            details["connector_type"] = connector_type
        if connector_id:
            details["connector_id"] = connector_id
        
        super().__init__(
            message=message,
            details=details,
            error_code="CONNECTOR_ERROR"
        )


class PipelineException(BaseCustomException):
    """Raised when pipeline operations fail."""
    
    def __init__(
        self,
        message: str,
        pipeline_id: Optional[int] = None,
        stage: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        if pipeline_id:
            details["pipeline_id"] = pipeline_id
        if stage:
            details["stage"] = stage
        
        super().__init__(
            message=message,
            details=details,
            error_code="PIPELINE_ERROR"
        )


class DataProcessingException(BaseCustomException):
    """Raised when data processing fails."""
    
    def __init__(
        self,
        message: str,
        operation: Optional[str] = None,
        row_number: Optional[int] = None,
        column: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        if operation:
            details["operation"] = operation
        if row_number is not None:
            details["row_number"] = row_number
        if column:
            details["column"] = column
        
        super().__init__(
            message=message,
            details=details,
            error_code="DATA_PROCESSING_ERROR"
        )


class ExternalServiceException(BaseCustomException):
    """Raised when external service calls fail."""
    
    def __init__(
        self,
        message: str,
        service_name: Optional[str] = None,
        status_code: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        if service_name:
            details["service_name"] = service_name
        if status_code:
            details["status_code"] = status_code
        
        super().__init__(
            message=message,
            details=details,
            error_code="EXTERNAL_SERVICE_ERROR"
        )


class ConfigurationException(BaseCustomException):
    """Raised when configuration errors occur."""
    
    def __init__(
        self,
        message: str,
        config_key: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        if config_key:
            details["config_key"] = config_key
        
        super().__init__(
            message=message,
            details=details,
            error_code="CONFIGURATION_ERROR"
        )


class RateLimitException(BaseCustomException):
    """Raised when rate limits are exceeded."""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        limit: Optional[int] = None,
        reset_time: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        if limit:
            details["limit"] = limit
        if reset_time:
            details["reset_time"] = reset_time
        
        super().__init__(
            message=message,
            details=details,
            error_code="RATE_LIMIT_EXCEEDED"
        )


class FileProcessingException(BaseCustomException):
    """Raised when file processing fails."""
    
    def __init__(
        self,
        message: str,
        filename: Optional[str] = None,
        file_type: Optional[str] = None,
        line_number: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        if filename:
            details["filename"] = filename
        if file_type:
            details["file_type"] = file_type
        if line_number is not None:
            details["line_number"] = line_number
        
        super().__init__(
            message=message,
            details=details,
            error_code="FILE_PROCESSING_ERROR"
        )


class DatabaseException(BaseCustomException):
    """Raised when database operations fail."""
    
    def __init__(
        self,
        message: str,
        operation: Optional[str] = None,
        table: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        if operation:
            details["operation"] = operation
        if table:
            details["table"] = table
        
        super().__init__(
            message=message,
            details=details,
            error_code="DATABASE_ERROR"
        )


# HTTP Exception converters
def to_http_exception(exc: BaseCustomException) -> HTTPException:
    """Convert custom exception to HTTP exception."""
    
    status_code_map = {
        "VALIDATION_ERROR": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "AUTHENTICATION_ERROR": status.HTTP_401_UNAUTHORIZED,
        "AUTHORIZATION_ERROR": status.HTTP_403_FORBIDDEN,
        "RESOURCE_NOT_FOUND": status.HTTP_404_NOT_FOUND,
        "RESOURCE_CONFLICT": status.HTTP_409_CONFLICT,
        "RATE_LIMIT_EXCEEDED": status.HTTP_429_TOO_MANY_REQUESTS,
        "CONFIGURATION_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "DATABASE_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "EXTERNAL_SERVICE_ERROR": status.HTTP_502_BAD_GATEWAY,
    }
    
    # Default to 400 for client errors, 500 for server errors
    default_status = status.HTTP_400_BAD_REQUEST
    if exc.error_code and any(code in exc.error_code for code in ["DATABASE", "CONFIGURATION", "EXTERNAL_SERVICE"]):
        default_status = status.HTTP_500_INTERNAL_SERVER_ERROR
    
    status_code = status_code_map.get(exc.error_code, default_status)
    
    return HTTPException(
        status_code=status_code,
        detail={
            "error": exc.error_code or "UNKNOWN_ERROR",
            "message": exc.message,
            "details": exc.details
        }
    )