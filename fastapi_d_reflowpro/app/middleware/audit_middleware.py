"""
Audit Logging Middleware
Automatically captures and logs all HTTP requests and responses for compliance and security monitoring.
"""

import time
import json
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from ..core.audit_logger import audit_logger, AuditEventType, AuditSeverity
from ..core.deps import get_current_user_optional
from ..core.database import get_db


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to automatically log all HTTP requests and responses."""
    
    def __init__(
        self,
        app: ASGIApp,
        log_request_body: bool = False,
        log_response_body: bool = False,
        excluded_paths: set = None,
        sensitive_headers: set = None
    ):
        super().__init__(app)
        self.log_request_body = log_request_body
        self.log_response_body = log_response_body
        self.excluded_paths = excluded_paths or {
            "/health", "/docs", "/redoc", "/openapi.json",
            "/favicon.ico", "/static"
        }
        self.sensitive_headers = sensitive_headers or {
            "authorization", "cookie", "x-api-key", "x-auth-token"
        }
    
    def should_log_request(self, path: str) -> bool:
        """Determine if request should be logged."""
        return not any(path.startswith(excluded) for excluded in self.excluded_paths)
    
    def sanitize_headers(self, headers: dict) -> dict:
        """Remove sensitive information from headers."""
        sanitized = {}
        for key, value in headers.items():
            key_lower = key.lower()
            if key_lower in self.sensitive_headers:
                sanitized[key] = "[REDACTED]"
            else:
                sanitized[key] = value
        return sanitized
    
    def determine_event_type(self, method: str, path: str) -> AuditEventType:
        """Determine audit event type based on request method and path."""
        if "auth" in path.lower():
            if method == "POST" and "login" in path:
                return AuditEventType.USER_LOGIN
            elif method == "POST" and "register" in path:
                return AuditEventType.USER_REGISTER
            elif method == "POST" and "logout" in path:
                return AuditEventType.USER_LOGOUT
        
        # Map HTTP methods to data events
        method_mapping = {
            "POST": AuditEventType.DATA_CREATE,
            "GET": AuditEventType.DATA_READ,
            "PUT": AuditEventType.DATA_UPDATE,
            "PATCH": AuditEventType.DATA_UPDATE,
            "DELETE": AuditEventType.DATA_DELETE
        }
        
        return method_mapping.get(method, AuditEventType.DATA_READ)
    
    def determine_severity(self, method: str, status_code: int) -> AuditSeverity:
        """Determine severity based on method and response status."""
        if status_code >= 500:
            return AuditSeverity.HIGH
        elif status_code >= 400:
            return AuditSeverity.MEDIUM
        elif method in ["DELETE", "PUT", "PATCH"]:
            return AuditSeverity.MEDIUM
        else:
            return AuditSeverity.LOW
    
    def extract_resource_info(self, path: str) -> tuple:
        """Extract resource type and ID from path."""
        path_parts = path.strip("/").split("/")
        
        # Skip API version prefix
        if len(path_parts) > 0 and path_parts[0] == "api":
            path_parts = path_parts[2:]  # Skip "api" and "v1"
        
        if len(path_parts) >= 1:
            resource_type = path_parts[0]
            resource_id = path_parts[1] if len(path_parts) > 1 else None
            return resource_type, resource_id
        
        return None, None
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log audit information."""
        
        # Skip logging for excluded paths
        if not self.should_log_request(request.url.path):
            return await call_next(request)
        
        # Start timing
        start_time = time.time()
        
        # Extract request information
        method = request.method
        path = request.url.path
        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Get user information if available
        user_id = None
        session_id = None
        try:
            # Try to extract user from token
            auth_header = request.headers.get("authorization")
            if auth_header:
                # This is a simplified extraction - in practice, you'd decode the JWT
                # For now, we'll set these during actual user authentication
                pass
                
            # Extract session ID from cookies
            session_id = request.cookies.get("session_id")
            
        except Exception:
            pass  # Continue without user info
        
        # Prepare request details
        request_details = {
            "method": method,
            "path": path,
            "query_params": dict(request.query_params),
            "headers": self.sanitize_headers(dict(request.headers)),
            "content_type": request.headers.get("content-type")
        }
        
        # Add request body if configured and not too large
        if self.log_request_body and method in ["POST", "PUT", "PATCH"]:
            try:
                # Read body without consuming it
                body = await request.body()
                if len(body) < 10240:  # Only log bodies smaller than 10KB
                    content_type = request.headers.get("content-type", "")
                    if "application/json" in content_type:
                        try:
                            request_details["body"] = json.loads(body.decode())
                        except json.JSONDecodeError:
                            request_details["body"] = body.decode()[:500]
                    else:
                        request_details["body"] = f"[{content_type}] {len(body)} bytes"
                else:
                    request_details["body"] = f"[Large body: {len(body)} bytes]"
                
                # Recreate request with body for downstream processing
                # This is a bit complex with ASGI, so we'll skip it for now
                
            except Exception as e:
                request_details["body_error"] = str(e)
        
        # Process the request
        try:
            response = await call_next(request)
            status_code = response.status_code
            outcome = "SUCCESS" if status_code < 400 else "FAILURE"
            
        except Exception as e:
            status_code = 500
            outcome = "ERROR"
            # Re-raise the exception
            raise
        
        finally:
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Determine event details
            event_type = self.determine_event_type(method, path)
            severity = self.determine_severity(method, status_code)
            resource_type, resource_id = self.extract_resource_info(path)
            
            # Prepare response details
            response_details = request_details.copy()
            response_details.update({
                "status_code": status_code,
                "duration_ms": duration_ms,
                "outcome": outcome
            })
            
            # Add response headers
            if 'response' in locals():
                response_details["response_headers"] = self.sanitize_headers(dict(response.headers))
            
            # Create audit message
            if outcome == "SUCCESS":
                message = f"{method} {path} - {status_code}"
            else:
                message = f"{method} {path} - FAILED ({status_code})"
            
            # Log the audit event
            try:
                # Get database session for logging
                async for db in get_db():
                    await audit_logger.log_event(
                        event_type=event_type,
                        message=message,
                        severity=severity,
                        user_id=user_id,
                        session_id=session_id,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        action=method.lower(),
                        outcome=outcome,
                        details=response_details,
                        request_path=path,
                        request_method=method,
                        response_status=status_code,
                        duration_ms=duration_ms,
                        db=db
                    )
                    break  # Exit after first iteration
                    
            except Exception as e:
                # Log error but don't fail the request
                audit_logger.logger.error(f"Failed to log audit event: {e}")
        
        return response


class SecurityAuditMiddleware(BaseHTTPMiddleware):
    """Specialized middleware for security event logging."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Monitor for security events."""
        
        # Check for suspicious patterns
        await self._check_suspicious_requests(request)
        
        # Process request
        try:
            response = await call_next(request)
            
            # Check for security-related response codes
            if response.status_code in [401, 403]:
                await self._log_access_denied(request, response.status_code)
            
            return response
            
        except Exception as e:
            # Log any unhandled exceptions as security events
            await self._log_security_exception(request, str(e))
            raise
    
    async def _check_suspicious_requests(self, request: Request):
        """Check for suspicious request patterns."""
        suspicious_indicators = []
        
        # Check for SQL injection patterns
        query_string = str(request.url.query)
        if any(pattern in query_string.lower() for pattern in [
            "select", "union", "insert", "delete", "drop", "--", "/*", "*/"
        ]):
            suspicious_indicators.append("SQL_INJECTION_PATTERN")
        
        # Check for XSS patterns
        if any(pattern in query_string.lower() for pattern in [
            "<script", "javascript:", "onerror", "onload", "alert("
        ]):
            suspicious_indicators.append("XSS_PATTERN")
        
        # Check for path traversal
        if "../" in str(request.url.path) or "..%2f" in str(request.url.path).lower():
            suspicious_indicators.append("PATH_TRAVERSAL")
        
        # Check for unusual user agents
        user_agent = request.headers.get("user-agent", "").lower()
        suspicious_agents = ["sqlmap", "nmap", "nikto", "burp", "scanner"]
        if any(agent in user_agent for agent in suspicious_agents):
            suspicious_indicators.append("SUSPICIOUS_USER_AGENT")
        
        # Log suspicious activity
        if suspicious_indicators:
            ip_address = request.client.host if request.client else "unknown"
            
            async for db in get_db():
                await audit_logger.log_event(
                    event_type=AuditEventType.SUSPICIOUS_ACTIVITY,
                    message=f"Suspicious request detected: {', '.join(suspicious_indicators)}",
                    severity=AuditSeverity.HIGH,
                    ip_address=ip_address,
                    user_agent=request.headers.get("user-agent"),
                    request_path=str(request.url.path),
                    request_method=request.method,
                    outcome="FAILURE",
                    details={
                        "indicators": suspicious_indicators,
                        "query_string": query_string,
                        "full_url": str(request.url)
                    },
                    db=db
                )
                break
    
    async def _log_access_denied(self, request: Request, status_code: int):
        """Log access denied events."""
        ip_address = request.client.host if request.client else "unknown"
        
        async for db in get_db():
            await audit_logger.log_event(
                event_type=AuditEventType.ACCESS_DENIED,
                message=f"Access denied: {status_code}",
                severity=AuditSeverity.MEDIUM,
                ip_address=ip_address,
                user_agent=request.headers.get("user-agent"),
                request_path=str(request.url.path),
                request_method=request.method,
                response_status=status_code,
                outcome="FAILURE",
                db=db
            )
            break
    
    async def _log_security_exception(self, request: Request, error: str):
        """Log security exceptions."""
        ip_address = request.client.host if request.client else "unknown"
        
        async for db in get_db():
            await audit_logger.log_event(
                event_type=AuditEventType.SUSPICIOUS_ACTIVITY,
                message=f"Security exception: {error}",
                severity=AuditSeverity.CRITICAL,
                ip_address=ip_address,
                user_agent=request.headers.get("user-agent"),
                request_path=str(request.url.path),
                request_method=request.method,
                outcome="ERROR",
                details={"exception": error},
                db=db
            )
            break