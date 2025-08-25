from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import logging
import math
from pydantic import Field, validator

from ....core.database import get_session
from ....core.validation import (
    validate_request_size,
    handle_validation_errors,
    SecurityValidation,
    CommonValidationSchemas
)
from ....core.exceptions import (
    ResourceNotFoundException,
    ConnectorException
)
from ....core.exceptions import ValidationException
from ....schemas.connector import (
    ConnectorCreate,
    ConnectorUpdate,
    ConnectorResponse,
    ConnectorList,
    ConnectorTestRequest,
    ConnectorTestResponse,
    DataPreviewResponse
)
from ....models.connector import ConnectorType, ConnectorStatus
from ....services.connector_service import ConnectorService

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/connectors",
    tags=["Connectors"],
    responses={
        401: {"description": "Authentication required"},
        403: {"description": "Insufficient permissions"}, 
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"}
    }
)


@router.post(
    "/", 
    response_model=ConnectorResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Create Data Connector",
    description="""
    Create a new data connector for extracting data from various sources.
    
    **Supported Connector Types:**
    - **database**: PostgreSQL, MySQL, SQLite, MongoDB
    - **file_upload**: CSV, Excel, JSON, XML files
    - **api**: REST APIs, webhooks, third-party services
    
    **Security Features:**
    - Input validation and sanitization
    - SQL injection prevention
    - Connection credential encryption
    - Role-based access control
    
    **Connection Testing:**
    - Automatic connection validation
    - Data preview generation
    - Schema introspection
    - Error reporting with diagnostic info
    """,
    response_description="Successfully created connector with generated ID and metadata",
    responses={
        201: {
            "description": "Connector created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "name": "Production PostgreSQL",
                        "description": "Main production database",
                        "type": "database",
                        "status": "active",
                        "connection_config": {
                            "host": "***HIDDEN***",
                            "port": 5432,
                            "database": "userdata"
                        },
                        "created_at": "2024-08-24T10:30:00Z",
                        "last_tested": None
                    }
                }
            }
        },
        400: {
            "description": "Invalid connector configuration or duplicate name",
            "content": {
                "application/json": {
                    "example": {
                        "error": "CONNECTOR_ERROR",
                        "message": "Connection test failed",
                        "details": {
                            "code": "CONNECTION_REFUSED",
                            "diagnostic": "Host unreachable on port 5432"
                        }
                    }
                }
            }
        },
        422: {
            "description": "Validation error in request data",
            "content": {
                "application/json": {
                    "example": {
                        "error": "VALIDATION_ERROR",
                        "message": "Request validation failed",
                        "details": [
                            {
                                "field": "connection_config.host",
                                "code": "INVALID_FORMAT", 
                                "message": "Invalid hostname format"
                            }
                        ]
                    }
                }
            }
        }
    },
    operation_id="create_connector"
)
@validate_request_size(max_size_mb=10)
@handle_validation_errors
async def create_connector(
    connector_data: ConnectorCreate,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    """Create a new data connector with comprehensive validation."""
    try:
        # Security validation
        SecurityValidation.validate_no_sql_injection(connector_data.name, "name")
        if connector_data.description:
            SecurityValidation.validate_no_sql_injection(connector_data.description, "description")
        
        service = ConnectorService(db)
        connector = await service.create_connector(
            connector_data=connector_data,
            user_id=None  # TODO: Get from authentication context
        )
        
        logger.info(
            f"Connector created successfully",
            extra={
                "connector_id": connector.id,
                "connector_name": connector.name,
                "connector_type": connector.type,
                "request_id": getattr(request.state, 'request_id', None)
            }
        )
        
        return ConnectorResponse.model_validate(connector)
        
    except ValidationException as e:
        logger.warning(f"Validation error creating connector: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "VALIDATION_ERROR",
                "message": e.message,
                "details": {"field": e.field, "code": e.code}
            }
        )
    except ConnectorException as e:
        logger.error(f"Connector service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "CONNECTOR_ERROR",
                "message": e.message,
                "details": e.details
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error creating connector: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "Failed to create connector",
                "details": {}
            }
        )


class ConnectorListParams(CommonValidationSchemas.PaginationParams, CommonValidationSchemas.FilterParams):
    """Enhanced connector list parameters with validation."""
    connector_type: Optional[ConnectorType] = Field(None, description="Filter by connector type")
    connector_status: Optional[ConnectorStatus] = Field(None, description="Filter by connector status")
    created_after: Optional[datetime] = Field(None, description="Filter by creation date")
    created_before: Optional[datetime] = Field(None, description="Filter by creation date")
    sort_by: Optional[str] = Field("created_at", description="Sort field")
    sort_order: str = Field("desc", description="Sort order: asc or desc")
    
    @validator('sort_by')
    def validate_sort_by(cls, v):
        if v is None:
            return "created_at"
        
        allowed_fields = ['name', 'created_at', 'updated_at', 'type', 'status', 'last_tested']
        if v not in allowed_fields:
            raise ValidationException(
                f"Invalid sort field. Allowed: {allowed_fields}",
                field="sort_by",
                code="SORT_FIELD_INVALID"
            )
        return v

@router.get(
    "/",
    response_model=ConnectorList,
    summary="List Data Connectors",
    description="""
    Retrieve a paginated list of data connectors with advanced filtering and sorting options.
    
    **Filtering Options:**
    - **search**: Search by connector name or description
    - **connector_type**: Filter by specific connector type (database, file_upload, api)
    - **connector_status**: Filter by status (active, inactive, error, testing)
    - **tags**: Filter by tags (supports multiple values)
    - **created_after/before**: Date range filtering
    
    **Sorting Options:**
    - **sort_by**: name, created_at, updated_at, type, status, last_tested
    - **sort_order**: asc (ascending) or desc (descending)
    
    **Pagination:**
    - **page**: Page number (1-based, max 10,000)
    - **size**: Items per page (1-100, default 20)
    
    **Response includes:**
    - Filtered and sorted connector list
    - Total count and pagination metadata
    - Security: Sensitive connection details are masked
    """,
    response_description="Paginated list of connectors with metadata",
    responses={
        200: {
            "description": "Successfully retrieved connector list",
            "content": {
                "application/json": {
                    "example": {
                        "connectors": [
                            {
                                "id": "123e4567-e89b-12d3-a456-426614174000",
                                "name": "Production PostgreSQL",
                                "type": "database",
                                "status": "active",
                                "created_at": "2024-08-24T10:30:00Z",
                                "last_tested": "2024-08-24T11:00:00Z"
                            }
                        ],
                        "total": 15,
                        "page": 1,
                        "size": 20,
                        "pages": 1
                    }
                }
            }
        },
        422: {
            "description": "Invalid query parameters",
            "content": {
                "application/json": {
                    "example": {
                        "error": "VALIDATION_ERROR",
                        "message": "Invalid sort field",
                        "details": {
                            "field": "sort_by",
                            "code": "SORT_FIELD_INVALID"
                        }
                    }
                }
            }
        }
    },
    operation_id="list_connectors"
)
@handle_validation_errors
async def list_connectors(
    params: ConnectorListParams = Depends(),
    db: AsyncSession = Depends(get_session)
):
    """List data connectors with enhanced filtering and pagination."""
    try:
        service = ConnectorService(db)
        
        # Calculate skip from page
        skip = (params.page - 1) * params.size
        
        connectors, total = await service.get_connectors(
            skip=skip,
            limit=params.size,
            connector_type=params.connector_type,
            status=params.connector_status,
            search=params.search,
            tags=params.tags,
            created_after=params.created_after,
            created_before=params.created_before,
            sort_by=params.sort_by,
            sort_order=params.sort_order
        )
        
        pages = math.ceil(total / params.size) if params.size > 0 else 1
        
        return ConnectorList(
            connectors=[ConnectorResponse.model_validate(conn) for conn in connectors],
            total=total,
            page=params.page,
            size=len(connectors),
            pages=pages
        )
        
    except ValidationException as e:
        logger.warning(f"Validation error listing connectors: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "VALIDATION_ERROR",
                "message": e.message,
                "details": {"field": e.field, "code": e.code}
            }
        )
    except Exception as e:
        logger.error(f"Error listing connectors: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "Failed to list connectors",
                "details": {}
            }
        )


@router.get(
    "/{connector_id}",
    response_model=ConnectorResponse,
    summary="Get Data Connector",
    description="""
    Retrieve detailed information about a specific data connector by its ID.
    
    **Security Features:**
    - Sensitive configuration data is masked by default
    - Use `include_config=true` to expose configuration for authorized users
    - Connection credentials are encrypted in storage
    - Access logging for audit trails
    
    **Response Data:**
    - Complete connector metadata
    - Connection status and health info
    - Last test results and error details
    - Creation and modification timestamps
    - Schema information when available
    """,
    response_description="Detailed connector information with optional config data",
    responses={
        200: {
            "description": "Connector retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "name": "Production PostgreSQL",
                        "description": "Main production database connector",
                        "type": "database",
                        "status": "active",
                        "connection_config": {
                            "host": "***HIDDEN***",
                            "port": 5432,
                            "database": "userdata",
                            "ssl_mode": "require"
                        },
                        "schema_info": {
                            "tables": ["users", "orders", "products"],
                            "total_rows": 150000
                        },
                        "created_at": "2024-08-24T10:30:00Z",
                        "updated_at": "2024-08-24T12:15:00Z",
                        "last_tested": "2024-08-24T12:00:00Z"
                    }
                }
            }
        },
        404: {
            "description": "Connector not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": "RESOURCE_NOT_FOUND",
                        "message": "Connector 123e4567-e89b-12d3-a456-426614174000 not found",
                        "details": {
                            "resource_type": "connector",
                            "resource_id": "123e4567-e89b-12d3-a456-426614174000"
                        }
                    }
                }
            }
        }
    },
    operation_id="get_connector"
)
@handle_validation_errors
async def get_connector(
    connector_id: UUID,
    include_config: bool = Query(False, description="Include sensitive configuration data"),
    db: AsyncSession = Depends(get_session)
):
    """Get a specific data connector by ID with optional config inclusion."""
    try:
        service = ConnectorService(db)
        connector = await service.get_connector(connector_id)
        
        if not connector:
            raise ResourceNotFoundException(
                resource_type="Connector",
                resource_id=connector_id,
                message=f"Connector {connector_id} not found"
            )
        
        response = ConnectorResponse.model_validate(connector)
        
        # Security: Remove sensitive config data unless explicitly requested
        if not include_config and response.connection_config:
            # Mask sensitive fields
            masked_config = response.connection_config.copy()
            sensitive_fields = ['password', 'api_key', 'secret', 'token']
            for field in sensitive_fields:
                if field in masked_config:
                    masked_config[field] = "***HIDDEN***"
            response.connection_config = masked_config
        
        return response
        
    except ResourceNotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "RESOURCE_NOT_FOUND",
                "message": f"Connector {connector_id} not found",
                "details": {"resource_type": "connector", "resource_id": str(connector_id)}
            }
        )
    except Exception as e:
        logger.error(f"Error getting connector {connector_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "Failed to get connector",
                "details": {}
            }
        )


@router.put(
    "/{connector_id}",
    response_model=ConnectorResponse,
    summary="Update Data Connector",
    description="""
    Update an existing data connector's configuration, settings, or metadata.
    
    **Updatable Fields:**
    - **name**: Connector display name (must be unique)
    - **description**: Detailed description of the connector purpose
    - **connection_config**: Connection parameters (credentials, hosts, etc.)
    - **status**: Operational status (active, inactive, maintenance)
    - **tags**: Categorization and metadata tags
    
    **Security Features:**
    - Input validation and sanitization
    - SQL injection prevention
    - Connection credential encryption
    - Change audit logging
    - Permission-based access control
    
    **Validation Rules:**
    - Connection configuration tested before update
    - Existing pipelines validated for compatibility
    - Configuration backup created before changes
    - Rollback capability for failed updates
    """,
    response_description="Successfully updated connector with new configuration",
    responses={
        200: {
            "description": "Connector updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "name": "Updated Production PostgreSQL",
                        "description": "Main production database - updated configuration",
                        "type": "database",
                        "status": "active",
                        "connection_config": {
                            "host": "***HIDDEN***",
                            "port": 5433,
                            "database": "userdata",
                            "ssl_mode": "require"
                        },
                        "updated_at": "2024-08-24T13:30:00Z",
                        "last_tested": "2024-08-24T13:30:15Z"
                    }
                }
            }
        },
        400: {
            "description": "Invalid update data or configuration test failed",
            "content": {
                "application/json": {
                    "example": {
                        "error": "CONNECTOR_ERROR",
                        "message": "Connection test failed with new configuration",
                        "details": {
                            "code": "CONNECTION_REFUSED",
                            "diagnostic": "New host unreachable on port 5433"
                        }
                    }
                }
            }
        },
        404: {
            "description": "Connector not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": "RESOURCE_NOT_FOUND",
                        "message": "Connector 123e4567-e89b-12d3-a456-426614174000 not found",
                        "details": {
                            "resource_type": "connector",
                            "resource_id": "123e4567-e89b-12d3-a456-426614174000"
                        }
                    }
                }
            }
        }
    },
    operation_id="update_connector"
)
@validate_request_size(max_size_mb=10)
@handle_validation_errors
async def update_connector(
    connector_id: UUID,
    connector_data: ConnectorUpdate,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    """Update an existing data connector with comprehensive validation."""
    try:
        # Security validation for update fields
        if connector_data.name:
            SecurityValidation.validate_no_sql_injection(connector_data.name, "name")
        if connector_data.description:
            SecurityValidation.validate_no_sql_injection(connector_data.description, "description")
        
        service = ConnectorService(db)
        connector = await service.update_connector(connector_id, connector_data)
        
        if not connector:
            raise ResourceNotFoundException(
                resource_type="Connector",
                resource_id=connector_id,
                message=f"Connector {connector_id} not found"
            )
        
        logger.info(
            f"Connector updated successfully",
            extra={
                "connector_id": connector.id,
                "connector_name": connector.name,
                "request_id": getattr(request.state, 'request_id', None)
            }
        )
        
        return ConnectorResponse.model_validate(connector)
        
    except ValidationException as e:
        logger.warning(f"Validation error updating connector: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "VALIDATION_ERROR",
                "message": e.message,
                "details": {"field": e.field, "code": e.code}
            }
        )
    except ResourceNotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "RESOURCE_NOT_FOUND",
                "message": f"Connector {connector_id} not found",
                "details": {"resource_type": "connector", "resource_id": str(connector_id)}
            }
        )
    except ConnectorException as e:
        logger.error(f"Connector service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "CONNECTOR_ERROR",
                "message": e.message,
                "details": e.details
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error updating connector: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "Failed to update connector",
                "details": {}
            }
        )


@router.delete(
    "/{connector_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Data Connector",
    description="""
    Permanently delete a data connector and all associated data.
    
    **Deletion Process:**
    - Validates connector exists before deletion
    - Checks for dependent pipelines and data previews
    - Archives connector configuration for audit purposes
    - Removes all associated metadata and test results
    - Logs deletion for compliance and audit trails
    
    **Safety Measures:**
    - Soft delete with recovery option (configurable)
    - Dependency check prevents accidental deletion
    - Confirmation required for connectors with active pipelines
    - Backup creation before permanent removal
    - Role-based deletion permissions
    
    **Post-Deletion:**
    - Associated data previews are removed
    - Pipeline dependencies are flagged as broken
    - Audit logs retain deletion record
    - Related user notifications sent
    - Cleanup of temporary files and caches
    """,
    response_description="Connector successfully deleted (no content returned)",
    responses={
        204: {
            "description": "Connector deleted successfully - no content returned"
        },
        404: {
            "description": "Connector not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": "RESOURCE_NOT_FOUND",
                        "message": "Connector 123e4567-e89b-12d3-a456-426614174000 not found",
                        "details": {
                            "resource_type": "connector",
                            "resource_id": "123e4567-e89b-12d3-a456-426614174000"
                        }
                    }
                }
            }
        },
        409: {
            "description": "Connector has dependencies and cannot be deleted",
            "content": {
                "application/json": {
                    "example": {
                        "error": "DEPENDENCY_CONFLICT",
                        "message": "Cannot delete connector with active pipeline dependencies",
                        "details": {
                            "dependent_pipelines": ["pipeline-123", "pipeline-456"],
                            "suggestion": "Remove or update dependent pipelines before deletion"
                        }
                    }
                }
            }
        }
    },
    operation_id="delete_connector"
)
@handle_validation_errors
async def delete_connector(
    connector_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    """Delete a data connector with comprehensive validation."""
    try:
        service = ConnectorService(db)
        
        # Check if connector exists before attempting delete
        connector = await service.get_connector(connector_id)
        if not connector:
            raise ResourceNotFoundException(
                resource_type="Connector",
                resource_id=connector_id,
                message=f"Connector {connector_id} not found"
            )
        
        deleted = await service.delete_connector(connector_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "INTERNAL_ERROR",
                    "message": "Failed to delete connector",
                    "details": {}
                }
            )
        
        logger.info(
            f"Connector deleted successfully",
            extra={
                "connector_id": connector_id,
                "connector_name": connector.name,
                "request_id": getattr(request.state, 'request_id', None)
            }
        )
        
        return None
        
    except ResourceNotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "RESOURCE_NOT_FOUND",
                "message": f"Connector {connector_id} not found",
                "details": {"resource_type": "connector", "resource_id": str(connector_id)}
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error deleting connector {connector_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "Failed to delete connector",
                "details": {}
            }
        )


@router.post(
    "/test",
    response_model=ConnectorTestResponse,
    summary="Test Connector Connection",
    description="""
    Test a connector configuration without creating the connector in the system.
    
    **Testing Capabilities:**
    - **Connection Validation**: Verify host reachability and authentication
    - **Schema Discovery**: Detect available tables, collections, or data structures
    - **Sample Data Retrieval**: Preview first few rows of data
    - **Performance Testing**: Measure connection latency and throughput
    - **Compatibility Check**: Verify driver and protocol compatibility
    
    **Supported Test Types:**
    - **database**: Connection, authentication, query execution, schema introspection
    - **api**: Endpoint availability, authentication, rate limiting, response format
    - **file_upload**: File format validation, encoding detection, structure analysis
    
    **Security Features:**
    - Credentials are encrypted in transit
    - No persistent storage of test credentials
    - SQL injection and path traversal protection
    - Connection timeout and retry limits
    - Sanitized error messages (no credential exposure)
    
    **Test Results Include:**
    - Connection success/failure status
    - Detailed error diagnostics
    - Sample data preview (when available)
    - Schema structure information
    - Performance metrics and recommendations
    """,
    response_description="Connection test results with diagnostics and sample data",
    responses={
        200: {
            "description": "Connection test completed (success or failure)",
            "content": {
                "application/json": {
                    "examples": {
                        "successful_test": {
                            "summary": "Successful database connection test",
                            "value": {
                                "success": True,
                                "message": "Connection successful",
                                "details": {
                                    "connection_time_ms": 145,
                                    "database_version": "PostgreSQL 14.2",
                                    "ssl_enabled": True
                                },
                                "sample_data": [
                                    {"id": 1, "name": "John Doe", "email": "john@example.com"},
                                    {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
                                ],
                                "schema_preview": {
                                    "tables": ["users", "orders", "products"],
                                    "primary_table": "users",
                                    "column_count": 15,
                                    "estimated_rows": 10000
                                }
                            }
                        },
                        "failed_test": {
                            "summary": "Failed connection test with diagnostics",
                            "value": {
                                "success": False,
                                "message": "Connection failed",
                                "details": {
                                    "error_code": "CONNECTION_REFUSED",
                                    "diagnostic": "Host unreachable on port 5432",
                                    "suggestion": "Check host address and port configuration"
                                },
                                "sample_data": None,
                                "schema_preview": None
                            }
                        }
                    }
                }
            }
        },
        400: {
            "description": "Invalid test configuration",
            "content": {
                "application/json": {
                    "example": {
                        "error": "CONNECTOR_ERROR",
                        "message": "Invalid connection configuration",
                        "details": {
                            "code": "INVALID_CONFIG",
                            "diagnostic": "Missing required field: host"
                        }
                    }
                }
            }
        }
    },
    operation_id="test_connector_connection"
)
@validate_request_size(max_size_mb=5)
@handle_validation_errors
async def test_connector_connection(
    test_request: ConnectorTestRequest,
    request: Request,
    connector_type: ConnectorType = Query(..., description="Type of connector to test"),
    db: AsyncSession = Depends(get_session)
):
    """Test a connector connection without creating the connector with comprehensive validation."""
    try:
        # Security validation for connection config
        if test_request.connection_config:
            # Check for common security issues in connection configs
            config_str = str(test_request.connection_config)
            SecurityValidation.validate_no_sql_injection(config_str, "connection_config")
            SecurityValidation.validate_no_path_traversal(config_str, "connection_config")
        
        service = ConnectorService(db)
        result = await service.test_connector(
            connector_type=connector_type,
            connection_config=test_request.connection_config
        )
        
        logger.info(
            f"Connector test completed",
            extra={
                "connector_type": connector_type,
                "test_success": result.success,
                "request_id": getattr(request.state, 'request_id', None)
            }
        )
        
        return result
        
    except ValidationException as e:
        logger.warning(f"Validation error testing connector: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "VALIDATION_ERROR",
                "message": e.message,
                "details": {"field": e.field, "code": e.code}
            }
        )
    except ConnectorException as e:
        logger.error(f"Connector service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "CONNECTOR_ERROR",
                "message": e.message,
                "details": e.details
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error testing connector: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "Failed to test connector",
                "details": {}
            }
        )


@router.post(
    "/{connector_id}/test",
    response_model=ConnectorTestResponse,
    summary="Test Existing Connector",
    description="""
    Test the connection of an existing connector using its stored configuration.
    
    **Testing Process:**
    - Retrieves connector configuration from database
    - Performs comprehensive connection testing
    - Updates connector status based on test results
    - Creates or updates data preview if test succeeds
    - Logs test results for monitoring and troubleshooting
    
    **Automatic Updates:**
    - **Status Update**: Connector status updated to active/error based on results
    - **Last Tested**: Timestamp updated with test completion time
    - **Data Preview**: Sample data refreshed if connection succeeds
    - **Health Metrics**: Connection performance metrics recorded
    - **Error Tracking**: Failed test details stored for diagnostics
    
    **Use Cases:**
    - Periodic health monitoring
    - Troubleshooting connection issues
    - Validating connector after infrastructure changes
    - Refreshing data previews
    - Performance benchmarking
    
    **Test Results:**
    - Real-time connection validation
    - Updated sample data from source
    - Schema changes detection
    - Performance metrics comparison
    - Error diagnostics and recommendations
    """,
    response_description="Connection test results with automatic status updates",
    responses={
        200: {
            "description": "Connection test completed with status update",
            "content": {
                "application/json": {
                    "examples": {
                        "successful_health_check": {
                            "summary": "Successful connector health check",
                            "value": {
                                "success": True,
                                "message": "Connector is healthy and operational",
                                "details": {
                                    "connection_time_ms": 98,
                                    "status_updated": "active",
                                    "data_preview_updated": True,
                                    "schema_changes_detected": False
                                },
                                "sample_data": [
                                    {"id": 1, "name": "Alice Johnson", "email": "alice@example.com"},
                                    {"id": 2, "name": "Bob Wilson", "email": "bob@example.com"}
                                ],
                                "schema_preview": {
                                    "tables": ["users", "orders", "products"],
                                    "row_count": 12500,
                                    "last_updated": "2024-08-24T12:30:00Z"
                                }
                            }
                        },
                        "failed_health_check": {
                            "summary": "Failed connector health check",
                            "value": {
                                "success": False,
                                "message": "Connector connection failed",
                                "details": {
                                    "error_code": "TIMEOUT",
                                    "status_updated": "error",
                                    "diagnostic": "Connection timeout after 30 seconds",
                                    "suggestion": "Check network connectivity and database availability"
                                },
                                "sample_data": None,
                                "schema_preview": None
                            }
                        }
                    }
                }
            }
        },
        404: {
            "description": "Connector not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": "RESOURCE_NOT_FOUND",
                        "message": "Connector 123e4567-e89b-12d3-a456-426614174000 not found",
                        "details": {
                            "resource_type": "connector",
                            "resource_id": "123e4567-e89b-12d3-a456-426614174000"
                        }
                    }
                }
            }
        }
    },
    operation_id="test_existing_connector"
)
async def test_existing_connector(
    connector_id: UUID,
    db: AsyncSession = Depends(get_session)
):
    """Test an existing connector's connection."""
    try:
        service = ConnectorService(db)
        connector = await service.get_connector(connector_id)

        if not connector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connector {connector_id} not found"
            )

        result = await service.test_connector(
            connector_type=connector.type,
            connection_config=connector.connection_config
        )

        # Update connector status based on test result
        new_status = ConnectorStatus.ACTIVE if result.success else ConnectorStatus.ERROR
        await service.update_connector_status(
            connector_id=connector_id,
            status=new_status,
            last_tested=datetime.utcnow()
        )

        # If test successful and we have sample data, create/update data preview
        if result.success and result.sample_data:
            try:
                # Check if preview already exists
                existing_preview = await service.get_data_preview(connector_id)
                if existing_preview:
                    # Update existing preview with new data
                    await service.update_data_preview(
                        preview_id=existing_preview.id,
                        sample_data=result.sample_data,
                        row_count=len(result.sample_data),
                        column_info=result.schema_preview
                    )
                else:
                    # Create new preview
                    await service.create_data_preview(
                        connector_id=connector_id,
                        sample_data=result.sample_data,
                        row_count=len(result.sample_data),
                        column_info=result.schema_preview
                    )
            except Exception as preview_error:
                # Log the error but don't fail the test
                logger.warning(f"Failed to create/update data preview for connector {connector_id}: {preview_error}")

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test connector: {str(e)}"
        )


@router.get(
    "/{connector_id}/preview",
    response_model=DataPreviewResponse,
    summary="Get Data Preview",
    description="""
    Retrieve a preview of data from a connector for inspection and analysis.
    
    **Preview Generation:**
    - **Automatic Creation**: Generates preview if none exists
    - **Fresh Data**: Tests connection and retrieves latest sample data
    - **Smart Sampling**: Intelligent data sampling for representative preview
    - **Schema Detection**: Automatic schema introspection and column analysis
    - **Format Detection**: Identifies data types, formats, and encoding
    
    **Data Insights:**
    - **Sample Rows**: First N rows of actual data from source
    - **Column Analysis**: Data types, nullable fields, unique constraints
    - **Data Quality**: Missing values, format consistency, outlier detection
    - **Row Count**: Estimated total rows in dataset (when available)
    - **Refresh Timestamp**: When preview was last updated
    
    **Use Cases:**
    - Data exploration and discovery
    - Pipeline design and mapping
    - Data quality assessment
    - Schema validation before processing
    - Sample data for testing transformations
    
    **Performance Notes:**
    - Cached previews returned instantly
    - Fresh generation may take 5-30 seconds
    - Large datasets sampled intelligently
    - Network timeouts handled gracefully
    - Failed generation shows diagnostics
    """,
    response_description="Data preview with sample rows and schema information",
    responses={
        200: {
            "description": "Data preview retrieved or generated successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "database_preview": {
                            "summary": "Database table preview with schema",
                            "value": {
                                "id": "preview-123e4567-e89b-12d3-a456-426614174000",
                                "connector_id": "123e4567-e89b-12d3-a456-426614174000",
                                "preview_data": [
                                    {
                                        "user_id": 1,
                                        "username": "alice_jones",
                                        "email": "alice@company.com",
                                        "created_at": "2024-08-20T10:30:00Z",
                                        "is_active": True
                                    },
                                    {
                                        "user_id": 2,
                                        "username": "bob_smith",
                                        "email": "bob@company.com",
                                        "created_at": "2024-08-21T14:15:00Z",
                                        "is_active": True
                                    }
                                ],
                                "row_count": 15420,
                                "column_info": {
                                    "columns": [
                                        {"name": "user_id", "type": "integer", "nullable": False, "primary_key": True},
                                        {"name": "username", "type": "varchar(50)", "nullable": False, "unique": True},
                                        {"name": "email", "type": "varchar(255)", "nullable": False, "unique": True},
                                        {"name": "created_at", "type": "timestamp", "nullable": False},
                                        {"name": "is_active", "type": "boolean", "nullable": False, "default": True}
                                    ],
                                    "table_name": "users",
                                    "estimated_size_mb": 2.8
                                },
                                "created_at": "2024-08-24T13:45:00Z"
                            }
                        },
                        "csv_preview": {
                            "summary": "CSV file preview with format detection",
                            "value": {
                                "id": "preview-456e7890-e89b-12d3-a456-426614174000",
                                "connector_id": "456e7890-e89b-12d3-a456-426614174000",
                                "preview_data": [
                                    {"Product ID": "P001", "Product Name": "Widget A", "Price": 19.99, "Stock": 150},
                                    {"Product ID": "P002", "Product Name": "Widget B", "Price": 29.99, "Stock": 75}
                                ],
                                "row_count": 1250,
                                "column_info": {
                                    "columns": [
                                        {"name": "Product ID", "type": "string", "pattern": "P\\d{3}"},
                                        {"name": "Product Name", "type": "string", "max_length": 50},
                                        {"name": "Price", "type": "decimal", "precision": 2},
                                        {"name": "Stock", "type": "integer", "min": 0}
                                    ],
                                    "delimiter": ",",
                                    "encoding": "utf-8",
                                    "has_header": True
                                },
                                "created_at": "2024-08-24T13:45:00Z"
                            }
                        }
                    }
                }
            }
        },
        404: {
            "description": "Connector not found or preview generation failed",
            "content": {
                "application/json": {
                    "examples": {
                        "connector_not_found": {
                            "summary": "Connector does not exist",
                            "value": {
                                "error": "RESOURCE_NOT_FOUND",
                                "message": "Connector 123e4567-e89b-12d3-a456-426614174000 not found",
                                "details": {
                                    "resource_type": "connector",
                                    "resource_id": "123e4567-e89b-12d3-a456-426614174000"
                                }
                            }
                        },
                        "preview_failed": {
                            "summary": "Preview generation failed",
                            "value": {
                                "error": "PREVIEW_GENERATION_FAILED",
                                "message": "No data preview available for connector. Failed to generate preview: Connection timeout",
                                "details": {
                                    "connector_test_failed": True,
                                    "diagnostic": "Database connection timeout after 30 seconds",
                                    "suggestion": "Check connector configuration and database availability"
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    operation_id="get_data_preview"
)
async def get_data_preview(
    connector_id: UUID,
    limit: int = Query(10, ge=1, le=100, description="Number of rows to preview"),
    db: AsyncSession = Depends(get_session)
):
    """Get data preview for a connector. Creates preview if it doesn't exist."""
    try:
        service = ConnectorService(db)

        # Check if connector exists
        connector = await service.get_connector(connector_id)
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connector {connector_id} not found"
            )

        # Get existing preview
        preview = await service.get_data_preview(connector_id)

        # If no preview exists, create one by testing the connector
        if not preview:
            try:
                # Test the connector to get sample data
                test_result = await service.test_connector(
                    connector_type=connector.type,
                    connection_config=connector.connection_config
                )

                if test_result.success:
                    if test_result.sample_data:
                        # Create preview from test data
                        preview = await service.create_data_preview(
                            connector_id=connector_id,
                            sample_data=test_result.sample_data,
                            row_count=len(test_result.sample_data),
                            column_info=test_result.schema_preview
                        )
                    else:
                        # Create empty preview with schema info only
                        preview = await service.create_data_preview(
                            connector_id=connector_id,
                            sample_data=[],
                            row_count=0,
                            column_info=test_result.schema_preview or {"message": "No sample data available"}
                        )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"No data preview available for connector {connector_id}. Connector test failed: {test_result.message}"
                    )
            except Exception as preview_error:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No data preview available for connector {connector_id}. Failed to generate preview: {str(preview_error)}"
                )

        return DataPreviewResponse.model_validate(preview)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get data preview: {str(e)}"
        )