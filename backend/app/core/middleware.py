"""
Middleware for error handling, logging, and request processing.
"""
import json
import time
import uuid
from typing import Callable, Dict, Any
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from pydantic import ValidationError
import traceback

from app.core.exceptions import (
    BaseCustomException,
    to_http_exception,
    DatabaseException,
    ValidationException
)


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle exceptions and convert them to proper HTTP responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID for tracking
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Add request ID to response headers
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
            
        except BaseCustomException as exc:
            # Handle our custom exceptions
            logger.error(
                f"Custom exception occurred",
                extra={
                    "request_id": request_id,
                    "error_code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details,
                    "path": request.url.path,
                    "method": request.method
                }
            )
            
            http_exc = to_http_exception(exc)
            return JSONResponse(
                status_code=http_exc.status_code,
                content={
                    "error": exc.error_code or "UNKNOWN_ERROR",
                    "message": exc.message,
                    "details": exc.details,
                    "request_id": request_id
                },
                headers={"X-Request-ID": request_id}
            )
            
        except HTTPException as exc:
            # Handle FastAPI HTTP exceptions
            logger.warning(
                f"HTTP exception: {exc.status_code} - {exc.detail}",
                extra={
                    "request_id": request_id,
                    "status_code": exc.status_code,
                    "path": request.url.path,
                    "method": request.method
                }
            )
            
            # Ensure consistent error response format
            detail = exc.detail
            if isinstance(detail, str):
                detail = {
                    "error": "HTTP_ERROR",
                    "message": detail,
                    "details": {},
                    "request_id": request_id
                }
            elif isinstance(detail, dict) and "request_id" not in detail:
                detail["request_id"] = request_id
            
            return JSONResponse(
                status_code=exc.status_code,
                content=detail,
                headers={"X-Request-ID": request_id}
            )
            
        except ValidationError as exc:
            # Handle Pydantic validation errors
            logger.warning(
                f"Validation error: {exc}",
                extra={
                    "request_id": request_id,
                    "path": request.url.path,
                    "method": request.method,
                    "errors": exc.errors()
                }
            )
            
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={
                    "error": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": {
                        "validation_errors": exc.errors()
                    },
                    "request_id": request_id
                },
                headers={"X-Request-ID": request_id}
            )
            
        except SQLAlchemyError as exc:
            # Handle database errors
            logger.error(
                f"Database error occurred",
                extra={
                    "request_id": request_id,
                    "error": str(exc),
                    "path": request.url.path,
                    "method": request.method,
                    "traceback": traceback.format_exc()
                }
            )
            
            # Convert to our custom exception
            db_exc = DatabaseException(
                message="Database operation failed",
                details={"original_error": str(exc)}
            )
            
            http_exc = to_http_exception(db_exc)
            return JSONResponse(
                status_code=http_exc.status_code,
                content={
                    "error": db_exc.error_code,
                    "message": db_exc.message,
                    "details": db_exc.details,
                    "request_id": request_id
                },
                headers={"X-Request-ID": request_id}
            )
            
        except Exception as exc:
            # Handle unexpected exceptions
            logger.error(
                f"Unexpected error occurred: {exc}",
                extra={
                    "request_id": request_id,
                    "error_type": type(exc).__name__,
                    "error_message": str(exc),
                    "path": request.url.path,
                    "method": request.method,
                    "traceback": traceback.format_exc()
                }
            )
            
            # Don't expose internal errors in production
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred",
                    "details": {},
                    "request_id": request_id
                },
                headers={"X-Request-ID": request_id}
            )


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all requests and responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Start time
        start_time = time.time()
        
        # Get request info
        request_id = getattr(request.state, 'request_id', 'unknown')
        
        # Log request
        request_body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body:
                    # Try to parse as JSON for logging (don't log sensitive data)
                    try:
                        request_body = json.loads(body)
                        # Remove sensitive fields
                        sensitive_fields = ['password', 'token', 'secret', 'key']
                        if isinstance(request_body, dict):
                            for field in sensitive_fields:
                                if field in request_body:
                                    request_body[field] = "***"
                    except json.JSONDecodeError:
                        request_body = {"_raw": "binary_or_malformed_data"}
            except Exception:
                request_body = {"_error": "could_not_read_body"}
        
        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "client_ip": request.client.host,
                "user_agent": request.headers.get("user-agent"),
                "content_type": request.headers.get("content-type"),
                "body": request_body
            }
        )
        
        # Call next middleware/endpoint
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            f"Request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
                "response_size": response.headers.get("content-length", "unknown")
            }
        )
        
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to responses."""
    
    def __init__(self, app, hsts_max_age: int = 31536000):
        super().__init__(app)
        self.hsts_max_age = hsts_max_age
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers.update({
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Resource-Policy": "same-origin"
        })
        
        # HSTS header for HTTPS
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = f"max-age={self.hsts_max_age}; includeSubDomains"
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting middleware."""
    
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = {}  # In production, use Redis or similar
        self.window_size = 60  # 1 minute
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        
        # Get client identifier
        client_ip = request.client.host
        current_time = time.time()
        
        # Clean old entries
        self.requests = {
            ip: [req_time for req_time in requests if current_time - req_time < self.window_size]
            for ip, requests in self.requests.items()
            if any(current_time - req_time < self.window_size for req_time in requests)
        }
        
        # Check rate limit
        client_requests = self.requests.get(client_ip, [])
        if len(client_requests) >= self.requests_per_minute:
            logger.warning(
                f"Rate limit exceeded for IP: {client_ip}",
                extra={
                    "client_ip": client_ip,
                    "requests_count": len(client_requests),
                    "limit": self.requests_per_minute,
                    "window_size": self.window_size
                }
            )
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": f"Too many requests. Limit: {self.requests_per_minute} per minute",
                    "details": {
                        "limit": self.requests_per_minute,
                        "window_size": self.window_size,
                        "reset_time": int(current_time + self.window_size)
                    }
                },
                headers={
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(current_time + self.window_size)),
                    "Retry-After": str(self.window_size)
                }
            )
        
        # Add current request
        if client_ip not in self.requests:
            self.requests[client_ip] = []
        self.requests[client_ip].append(current_time)
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = self.requests_per_minute - len(self.requests[client_ip])
        response.headers.update({
            "X-RateLimit-Limit": str(self.requests_per_minute),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(int(current_time + self.window_size))
        })
        
        return response


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Middleware to validate common request properties."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Validate content type for POST/PUT/PATCH requests
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            
            # Skip validation for multipart uploads
            if not content_type.startswith("multipart/"):
                # Validate JSON content type
                if not any(ct in content_type for ct in ["application/json", "application/x-www-form-urlencoded"]):
                    if content_type:  # If content-type is provided but invalid
                        return JSONResponse(
                            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            content={
                                "error": "UNSUPPORTED_MEDIA_TYPE",
                                "message": f"Unsupported content type: {content_type}",
                                "details": {
                                    "supported_types": [
                                        "application/json",
                                        "application/x-www-form-urlencoded",
                                        "multipart/form-data"
                                    ]
                                }
                            }
                        )
        
        # Validate request size (basic check)
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                max_size = 100 * 1024 * 1024  # 100MB
                if size > max_size:
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={
                            "error": "REQUEST_TOO_LARGE",
                            "message": f"Request size {size} bytes exceeds maximum allowed size",
                            "details": {
                                "max_size_bytes": max_size,
                                "request_size_bytes": size
                            }
                        }
                    )
            except ValueError:
                pass  # Invalid content-length header, let FastAPI handle it
        
        return await call_next(request)


# Utility function to create a JSON error response
def create_error_response(
    error_code: str,
    message: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    details: Dict[str, Any] = None,
    request_id: str = None
) -> JSONResponse:
    """Create a standardized error response."""
    content = {
        "error": error_code,
        "message": message,
        "details": details or {},
    }
    
    if request_id:
        content["request_id"] = request_id
    
    headers = {}
    if request_id:
        headers["X-Request-ID"] = request_id
    
    return JSONResponse(
        status_code=status_code,
        content=content,
        headers=headers
    )