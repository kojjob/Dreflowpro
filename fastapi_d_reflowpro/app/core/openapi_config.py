"""
OpenAPI/Swagger documentation configuration for DReflowPro API.
"""
from typing import Dict, Any, List
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html

from .config import get_settings

settings = get_settings()


def create_openapi_schema(app: FastAPI) -> Dict[str, Any]:
    """Create comprehensive OpenAPI schema for the DReflowPro API."""
    
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="DReflowPro ETL Platform API",
        version="1.0.0",
        description="""
        ## DReflowPro ETL Platform API
        
        A comprehensive ETL (Extract, Transform, Load) platform providing:
        
        ### 🔗 **Data Connectors**
        - **Database Connectors**: PostgreSQL, MySQL, SQLite, MongoDB
        - **File Connectors**: CSV, Excel, JSON, XML uploads
        - **API Connectors**: REST APIs, webhooks, third-party integrations
        - **Real-time Testing**: Connection validation and data preview
        
        ### 🔄 **Pipeline Management**  
        - **Visual Pipeline Builder**: Drag-and-drop interface
        - **Advanced Transformations**: Data cleaning, validation, enrichment
        - **Scheduling**: Cron-based and event-driven execution
        - **Monitoring**: Real-time status, logs, and metrics
        
        ### 🔐 **Security & Authentication**
        - **JWT Authentication**: Access and refresh tokens
        - **API Key Management**: Service-to-service authentication  
        - **Role-based Access**: Admin, Editor, Viewer permissions
        - **Data Security**: Encryption, audit logs, compliance
        
        ### 📊 **Analytics & Monitoring**
        - **Execution Metrics**: Performance, success rates, resource usage
        - **Data Quality**: Validation reports, error tracking
        - **Business Intelligence**: Custom dashboards, export capabilities
        
        ### 🚀 **Enterprise Features**
        - **Multi-tenant Architecture**: Organization isolation
        - **Scalable Processing**: Distributed execution, queue management
        - **High Availability**: Health checks, failover, monitoring
        - **Integration Ready**: Webhooks, notifications, external APIs
        
        ---
        
        **Version:** 1.0.0  
        **Environment:** {environment}  
        **Base URL:** {base_url}
        """.format(
            environment=settings.ENVIRONMENT,
            base_url="https://api.dreflowpro.com" if settings.ENVIRONMENT == "production" else "http://localhost:8000"
        ),
        routes=app.routes,
        tags=get_openapi_tags()
    )
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT access token obtained from /auth/login endpoint"
        },
        "APIKeyAuth": {
            "type": "apiKey",
            "in": "header", 
            "name": "X-API-Key",
            "description": "API key for service-to-service authentication"
        },
        "RefreshToken": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT refresh token for obtaining new access tokens"
        }
    }
    
    # Add response schemas for common errors
    openapi_schema["components"]["schemas"].update(get_error_schemas())
    
    # Add request/response examples
    add_examples_to_schema(openapi_schema)
    
    # Add security requirements globally
    openapi_schema["security"] = [
        {"BearerAuth": []},
        {"APIKeyAuth": []}
    ]
    
    # Add servers configuration
    openapi_schema["servers"] = [
        {
            "url": "https://api.dreflowpro.com",
            "description": "Production server"
        },
        {
            "url": "https://staging-api.dreflowpro.com", 
            "description": "Staging server"
        },
        {
            "url": "http://localhost:8000",
            "description": "Local development server"
        }
    ]
    
    # Add external documentation links
    openapi_schema["externalDocs"] = {
        "description": "Complete API Documentation & Guides",
        "url": "https://docs.dreflowpro.com"
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


def get_openapi_tags() -> List[Dict[str, str]]:
    """Define OpenAPI tags with descriptions."""
    return [
        {
            "name": "Authentication", 
            "description": "User authentication, registration, and token management"
        },
        {
            "name": "Connectors",
            "description": "Data source connectors (database, file, API) management and testing"
        },
        {
            "name": "Pipelines", 
            "description": "ETL pipeline creation, management, and execution"
        },
        {
            "name": "Tasks",
            "description": "Background task management and monitoring"
        },
        {
            "name": "Data Management",
            "description": "Data preview, validation, and quality management"
        },
        {
            "name": "Configuration",
            "description": "System configuration and settings management"
        },
        {
            "name": "Health & Monitoring",
            "description": "System health checks and monitoring endpoints"
        }
    ]


def get_error_schemas() -> Dict[str, Any]:
    """Define common error response schemas."""
    return {
        "ValidationError": {
            "type": "object",
            "properties": {
                "error": {
                    "type": "string",
                    "example": "VALIDATION_ERROR"
                },
                "message": {
                    "type": "string", 
                    "example": "Request validation failed"
                },
                "details": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "field": {"type": "string", "example": "email"},
                            "code": {"type": "string", "example": "INVALID_FORMAT"},
                            "message": {"type": "string", "example": "Invalid email format"},
                            "context": {"type": "object"}
                        }
                    }
                },
                "metadata": {
                    "type": "object",
                    "properties": {
                        "request_id": {"type": "string", "format": "uuid"},
                        "timestamp": {"type": "string", "format": "date-time"},
                        "version": {"type": "string", "example": "v1"}
                    }
                }
            },
            "required": ["error", "message", "details"]
        },
        "AuthenticationError": {
            "type": "object", 
            "properties": {
                "error": {
                    "type": "string",
                    "example": "AUTHENTICATION_ERROR"
                },
                "message": {
                    "type": "string",
                    "example": "Invalid or expired access token"
                },
                "details": {
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "example": "TOKEN_EXPIRED"},
                        "hint": {"type": "string", "example": "Please refresh your token or login again"}
                    }
                }
            },
            "required": ["error", "message"]
        },
        "AuthorizationError": {
            "type": "object",
            "properties": {
                "error": {
                    "type": "string", 
                    "example": "AUTHORIZATION_ERROR"
                },
                "message": {
                    "type": "string",
                    "example": "Insufficient permissions for requested operation"
                },
                "details": {
                    "type": "object",
                    "properties": {
                        "required_role": {"type": "string", "example": "admin"},
                        "current_role": {"type": "string", "example": "editor"},
                        "resource": {"type": "string", "example": "connector"}
                    }
                }
            },
            "required": ["error", "message"]
        },
        "ResourceNotFoundError": {
            "type": "object",
            "properties": {
                "error": {
                    "type": "string",
                    "example": "RESOURCE_NOT_FOUND"
                },
                "message": {
                    "type": "string", 
                    "example": "Resource not found"
                },
                "details": {
                    "type": "object",
                    "properties": {
                        "resource_type": {"type": "string", "example": "connector"},
                        "resource_id": {"type": "string", "example": "123e4567-e89b-12d3-a456-426614174000"}
                    }
                }
            },
            "required": ["error", "message"]
        },
        "RateLimitError": {
            "type": "object",
            "properties": {
                "error": {
                    "type": "string",
                    "example": "RATE_LIMIT_EXCEEDED"  
                },
                "message": {
                    "type": "string",
                    "example": "Rate limit exceeded"
                },
                "details": {
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "example": 1000},
                        "remaining": {"type": "integer", "example": 0},
                        "reset_at": {"type": "string", "format": "date-time"},
                        "retry_after": {"type": "integer", "example": 3600}
                    }
                }
            },
            "required": ["error", "message"]
        },
        "InternalServerError": {
            "type": "object",
            "properties": {
                "error": {
                    "type": "string",
                    "example": "INTERNAL_ERROR"
                },
                "message": {
                    "type": "string",
                    "example": "An internal server error occurred"
                },
                "details": {
                    "type": "object",
                    "properties": {
                        "incident_id": {"type": "string", "format": "uuid"},
                        "support_contact": {"type": "string", "example": "support@dreflowpro.com"}
                    }
                }
            },
            "required": ["error", "message"]
        }
    }


def add_examples_to_schema(openapi_schema: Dict[str, Any]) -> None:
    """Add comprehensive examples to the OpenAPI schema."""
    
    # Add connector examples
    connector_examples = {
        "DatabaseConnector": {
            "summary": "PostgreSQL Database Connector",
            "value": {
                "name": "Production PostgreSQL",
                "description": "Main production database for user data",
                "type": "database",
                "connection_config": {
                    "host": "prod-db.example.com",
                    "port": 5432,
                    "database": "userdata",
                    "username": "readonly_user",
                    "ssl_mode": "require",
                    "min_connections": 2,
                    "max_connections": 20,
                    "connection_timeout": 30
                },
                "tags": ["production", "postgresql", "users"],
                "is_sensitive": True
            }
        },
        "FileConnector": {
            "summary": "CSV File Connector", 
            "value": {
                "name": "Sales Data CSV",
                "description": "Monthly sales reports upload",
                "type": "file_upload",
                "connection_config": {
                    "file_path": "uploads/sales_data.csv",
                    "encoding": "utf-8",
                    "delimiter": ",",
                    "has_header": True,
                    "skip_rows": 0
                },
                "tags": ["sales", "monthly", "csv"]
            }
        },
        "APIConnector": {
            "summary": "REST API Connector",
            "value": {
                "name": "CRM API Integration",
                "description": "Salesforce CRM data synchronization",
                "type": "api",
                "connection_config": {
                    "base_url": "https://api.salesforce.com/v1",
                    "auth_type": "oauth2",
                    "timeout": 60,
                    "retry_attempts": 3,
                    "rate_limit_per_second": 10,
                    "headers": {
                        "Accept": "application/json",
                        "User-Agent": "DReflowPro/1.0"
                    }
                },
                "tags": ["crm", "salesforce", "sync"],
                "is_sensitive": True
            }
        }
    }
    
    # Add pipeline examples
    pipeline_examples = {
        "DataCleaningPipeline": {
            "summary": "Data Cleaning Pipeline",
            "value": {
                "name": "Customer Data Cleaning",
                "description": "Clean and standardize customer data from multiple sources",
                "steps": [
                    {
                        "name": "Extract Customer Data",
                        "type": "source",
                        "order": 1,
                        "source_connector_id": "123e4567-e89b-12d3-a456-426614174000",
                        "config": {
                            "query": "SELECT * FROM customers WHERE updated_at >= NOW() - INTERVAL '1 day'"
                        }
                    },
                    {
                        "name": "Clean Email Addresses", 
                        "type": "transform",
                        "order": 2,
                        "transformation_type": "data_cleaning",
                        "config": {
                            "operations": [
                                {"field": "email", "operation": "lowercase"},
                                {"field": "email", "operation": "trim"},
                                {"field": "email", "operation": "validate_format"}
                            ]
                        }
                    },
                    {
                        "name": "Load to Data Warehouse",
                        "type": "destination", 
                        "order": 3,
                        "destination_connector_id": "456e7890-e89b-12d3-a456-426614174000",
                        "config": {
                            "table": "clean_customers",
                            "mode": "upsert",
                            "conflict_resolution": "update"
                        }
                    }
                ],
                "schedule": {
                    "type": "cron",
                    "cron_expression": "0 2 * * *",
                    "timezone": "UTC"
                },
                "tags": ["data-cleaning", "customers", "daily"],
                "priority": 5,
                "timeout_minutes": 60,
                "retry_count": 3,
                "notifications": {
                    "on_success": ["admin@example.com"],
                    "on_failure": ["admin@example.com", "ops@example.com"]
                }
            }
        }
    }
    
    # Add authentication examples
    auth_examples = {
        "UserRegistration": {
            "summary": "User Registration",
            "value": {
                "email": "john.doe@example.com",
                "password": "SecureP@ssw0rd123!",
                "confirm_password": "SecureP@ssw0rd123!",
                "first_name": "John",
                "last_name": "Doe",
                "organization_name": "Acme Corp"
            }
        },
        "UserLogin": {
            "summary": "User Login",
            "value": {
                "email": "john.doe@example.com",
                "password": "SecureP@ssw0rd123!"
            }
        }
    }
    
    # Store examples in schema
    if "examples" not in openapi_schema:
        openapi_schema["examples"] = {}
    
    openapi_schema["examples"].update({
        "connectors": connector_examples,
        "pipelines": pipeline_examples, 
        "auth": auth_examples
    })


def configure_docs_ui(app: FastAPI) -> None:
    """Configure custom documentation UI with enhanced features."""
    
    @app.get("/docs", include_in_schema=False)
    async def custom_swagger_ui_html():
        return get_swagger_ui_html(
            openapi_url=app.openapi_url,
            title=f"{app.title} - Interactive API Documentation",
            oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
            swagger_js_url="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
            swagger_css_url="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css",
            swagger_ui_parameters={
                "defaultModelsExpandDepth": 2,
                "defaultModelExpandDepth": 2,
                "displayOperationId": False,
                "displayRequestDuration": True,
                "docExpansion": "list",
                "filter": True,
                "showExtensions": True,
                "showCommonExtensions": True,
                "tryItOutEnabled": True,
                "requestSnippetsEnabled": True,
                "requestSnippets": {
                    "generators": {
                        "curl_bash": {
                            "title": "cURL (bash)",
                            "syntax": "bash"
                        },
                        "curl_powershell": {
                            "title": "cURL (PowerShell)",
                            "syntax": "powershell"
                        },
                        "curl_cmd": {
                            "title": "cURL (CMD)",
                            "syntax": "bash"
                        }
                    },
                    "defaultExpanded": False,
                    "languages": None
                }
            }
        )
    
    @app.get("/redoc", include_in_schema=False)
    async def redoc_html():
        return get_redoc_html(
            openapi_url=app.openapi_url,
            title=f"{app.title} - API Reference",
            redoc_js_url="https://unpkg.com/redoc@2.1.3/bundles/redoc.standalone.js",
            redoc_favicon_url="https://dreflowpro.com/favicon.ico"
        )


def add_openapi_metadata(app: FastAPI) -> None:
    """Add comprehensive metadata to the FastAPI app for OpenAPI generation."""
    
    app.title = "DReflowPro ETL Platform API"
    app.description = """
    Production-ready ETL platform API with comprehensive data connectors, 
    pipeline management, and enterprise security features.
    """
    app.version = "1.0.0"
    app.contact = {
        "name": "DReflowPro Support Team",
        "url": "https://dreflowpro.com/support", 
        "email": "support@dreflowpro.com"
    }
    app.license_info = {
        "name": "Commercial License",
        "url": "https://dreflowpro.com/license"
    }
    app.terms_of_service = "https://dreflowpro.com/terms"
    
    # Configure OpenAPI settings
    app.openapi_tags = get_openapi_tags()
    app.openapi_url = "/api/v1/openapi.json"
    app.docs_url = "/docs"
    app.redoc_url = "/redoc"


def setup_openapi_docs(app: FastAPI) -> None:
    """Setup comprehensive OpenAPI documentation for the application."""
    
    # Add metadata
    add_openapi_metadata(app)
    
    # Configure custom docs UI
    configure_docs_ui(app)
    
    # Override the default openapi generation
    def custom_openapi():
        return create_openapi_schema(app)
    
    app.openapi = custom_openapi