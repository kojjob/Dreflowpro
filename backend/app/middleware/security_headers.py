"""
Enterprise-grade security headers middleware for production deployments.
Implements comprehensive security headers to protect against common web vulnerabilities.
"""

import hashlib
import secrets
import logging
from typing import Optional, Dict, Any, Callable
from urllib.parse import urlparse

from fastapi import Request, Response
from fastapi.responses import JSONResponse

from ..core.config import settings

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware:
    """
    Comprehensive security headers middleware implementing:
    - Content Security Policy (CSP)
    - Cross-Origin Resource Sharing (CORS) headers
    - Security headers against common attacks
    - HSTS for HTTPS enforcement
    """
    
    def __init__(
        self,
        app,
        strict_mode: bool = True,
        report_uri: Optional[str] = None,
        enable_hsts: bool = True,
        enable_csp: bool = True
    ):
        """
        Initialize security headers middleware.
        
        Args:
            app: The ASGI application
            strict_mode: Enable strict security policies
            report_uri: URI for CSP violation reports
            enable_hsts: Enable HTTP Strict Transport Security
            enable_csp: Enable Content Security Policy
        """
        self.app = app
        self.strict_mode = strict_mode
        self.report_uri = report_uri or getattr(settings, "CSP_REPORT_URI", None)
        self.enable_hsts = enable_hsts and getattr(settings, "ENABLE_HSTS", True)
        self.enable_csp = enable_csp and getattr(settings, "ENABLE_CSP", True)
        
        # Allowed origins for CORS
        self.allowed_origins = getattr(
            settings,
            "CORS_ALLOWED_ORIGINS",
            ["http://localhost:3000", "http://localhost:3001"]
        )
        
        # CSP directives
        self.csp_directives = self._build_csp_directives()
        
    def _build_csp_directives(self) -> Dict[str, str]:
        """Build Content Security Policy directives."""
        directives = {
            "default-src": "'self'",
            "script-src": "'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
            "style-src": "'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
            "font-src": "'self' https://fonts.gstatic.com data:",
            "img-src": "'self' data: https: blob:",
            "connect-src": "'self' http://localhost:* ws://localhost:* https://api.dreflowpro.com wss://api.dreflowpro.com",
            "frame-ancestors": "'none'",
            "base-uri": "'self'",
            "form-action": "'self'",
            "object-src": "'none'",
            "media-src": "'self'",
            "worker-src": "'self' blob:",
            "manifest-src": "'self'"
        }
        
        if self.strict_mode:
            # Stricter policies for production
            directives.update({
                "script-src": "'self'",
                "style-src": "'self'",
                "upgrade-insecure-requests": ""
            })
        
        if self.report_uri:
            directives["report-uri"] = self.report_uri
        
        return directives
    
    def _generate_csp_nonce(self) -> str:
        """Generate a secure nonce for CSP."""
        return secrets.token_urlsafe(16)
    
    def _build_csp_header(self, nonce: Optional[str] = None) -> str:
        """Build the Content Security Policy header value."""
        directives = self.csp_directives.copy()
        
        if nonce:
            # Add nonce to script and style sources
            if "script-src" in directives:
                directives["script-src"] = f"{directives['script-src']} 'nonce-{nonce}'"
            if "style-src" in directives:
                directives["style-src"] = f"{directives['style-src']} 'nonce-{nonce}'"
        
        # Build header string
        csp_parts = []
        for directive, value in directives.items():
            if value:
                csp_parts.append(f"{directive} {value}")
            else:
                csp_parts.append(directive)
        
        return "; ".join(csp_parts)
    
    def _is_same_origin(self, request: Request, origin: str) -> bool:
        """Check if origin is same as request origin."""
        request_origin = f"{request.url.scheme}://{request.url.hostname}"
        if request.url.port and request.url.port not in (80, 443):
            request_origin += f":{request.url.port}"
        return origin == request_origin
    
    def _get_cors_headers(self, request: Request, origin: str) -> Dict[str, str]:
        """Get CORS headers based on request origin."""
        cors_headers = {}
        
        # Check if origin is allowed
        if origin in self.allowed_origins or self._is_same_origin(request, origin):
            cors_headers["Access-Control-Allow-Origin"] = origin
            cors_headers["Access-Control-Allow-Credentials"] = "true"
            cors_headers["Vary"] = "Origin"
        elif "*" in self.allowed_origins and not self.strict_mode:
            cors_headers["Access-Control-Allow-Origin"] = "*"
        
        # Add other CORS headers for preflight requests
        if request.method == "OPTIONS":
            cors_headers.update({
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-CSRF-Token",
                "Access-Control-Max-Age": "86400"  # 24 hours
            })
        
        return cors_headers
    
    def _get_security_headers(self, request: Request, nonce: Optional[str] = None) -> Dict[str, str]:
        """Get all security headers."""
        headers = {
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # Enable browser XSS protection
            "X-XSS-Protection": "1; mode=block",
            
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            
            # Control referrer information
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Permissions Policy (formerly Feature Policy)
            "Permissions-Policy": (
                "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
                "magnetometer=(), microphone=(), payment=(), usb=()"
            ),
            
            # Prevent DNS prefetching
            "X-DNS-Prefetch-Control": "off",
            
            # Prevent IE from opening downloads
            "X-Download-Options": "noopen",
            
            # Remove X-Powered-By header
            "X-Powered-By": ""
        }
        
        # Add HSTS header for HTTPS connections
        if self.enable_hsts and request.url.scheme == "https":
            headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # Add CSP header
        if self.enable_csp:
            csp_value = self._build_csp_header(nonce)
            headers["Content-Security-Policy"] = csp_value
            
            # Add Report-Only CSP for monitoring in non-strict mode
            if not self.strict_mode:
                headers["Content-Security-Policy-Report-Only"] = csp_value
        
        # Add CORP and COEP for cross-origin isolation
        if self.strict_mode:
            headers["Cross-Origin-Resource-Policy"] = "same-origin"
            headers["Cross-Origin-Embedder-Policy"] = "require-corp"
            headers["Cross-Origin-Opener-Policy"] = "same-origin"
        
        return headers
    
    async def __call__(self, scope, receive, send):
        """Process request and add security headers to response."""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
            
        # For HTTP requests, we need to intercept and add headers
        from starlette.requests import Request
        
        request = Request(scope, receive=receive)
        
        # Generate CSP nonce for this request
        nonce = self._generate_csp_nonce() if self.enable_csp else None
        if nonce:
            # Store nonce in request state for use in templates
            request.state.csp_nonce = nonce
        
        # Handle preflight CORS requests
        if request.method == "OPTIONS":
            origin = request.headers.get("Origin", "")
            cors_headers = self._get_cors_headers(request, origin)
            
            async def send_response(message):
                if message["type"] == "http.response.start":
                    message["status"] = 204
                    message["headers"] = [
                        (k.encode(), v.encode()) 
                        for k, v in cors_headers.items()
                    ]
                await send(message)
            
            await send_response({
                "type": "http.response.start",
                "status": 204,
                "headers": []
            })
            await send_response({
                "type": "http.response.body",
                "body": b"",
            })
            return
        
        # Store original send to intercept headers
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Convert headers to dict for easier manipulation
                headers_dict = dict(message.get("headers", []))
                
                # Add security headers
                security_headers = self._get_security_headers(request, nonce)
                for header, value in security_headers.items():
                    if value:
                        headers_dict[header.encode()] = value.encode()
                
                # Add CORS headers if origin is present
                origin = request.headers.get("Origin")
                if origin:
                    cors_headers = self._get_cors_headers(request, origin)
                    for header, value in cors_headers.items():
                        headers_dict[header.encode()] = value.encode()
                
                # Remove server identification headers
                headers_dict.pop(b"server", None)
                headers_dict.pop(b"x-powered-by", None)
                
                # Add custom security headers
                request_id = getattr(
                    request.state,
                    "request_id",
                    secrets.token_urlsafe(16)
                )
                headers_dict[b"x-request-id"] = request_id.encode()
                
                # Convert back to list of tuples
                message["headers"] = list(headers_dict.items())
            
            await send(message)
        
        # Process the request with our wrapped send
        await self.app(scope, receive, send_wrapper)


class CSPViolationReporter:
    """
    Handler for CSP violation reports.
    Logs and analyzes CSP violations for security monitoring.
    """
    
    def __init__(self):
        self.violation_logger = logging.getLogger("security.csp_violations")
        
    async def handle_violation(self, request: Request) -> Response:
        """Handle CSP violation report."""
        try:
            # Parse violation report
            violation_data = await request.json()
            
            # Extract relevant information
            report = violation_data.get("csp-report", {})
            
            violation_info = {
                "document_uri": report.get("document-uri"),
                "violated_directive": report.get("violated-directive"),
                "blocked_uri": report.get("blocked-uri"),
                "source_file": report.get("source-file"),
                "line_number": report.get("line-number"),
                "column_number": report.get("column-number"),
                "referrer": report.get("referrer"),
                "user_agent": request.headers.get("User-Agent"),
                "ip_address": request.client.host
            }
            
            # Log violation
            self.violation_logger.warning(
                f"CSP Violation: {violation_info['violated_directive']} - "
                f"Blocked: {violation_info['blocked_uri']}",
                extra=violation_info
            )
            
            # Analyze for potential attacks
            if self._is_potential_attack(violation_info):
                self.violation_logger.error(
                    "Potential attack detected via CSP violation",
                    extra=violation_info
                )
            
            return Response(status_code=204)
            
        except Exception as e:
            logger.error(f"Error handling CSP violation report: {e}")
            return Response(status_code=204)
    
    def _is_potential_attack(self, violation_info: Dict[str, Any]) -> bool:
        """Analyze violation for potential attack patterns."""
        blocked_uri = violation_info.get("blocked_uri", "").lower()
        
        # Check for common attack patterns
        attack_indicators = [
            "javascript:",
            "data:text/html",
            "data:application",
            "vbscript:",
            "file://",
            "about:blank",
        ]
        
        for indicator in attack_indicators:
            if indicator in blocked_uri:
                return True
        
        # Check for external script injection attempts
        if violation_info.get("violated_directive", "").startswith("script-src"):
            if blocked_uri and not blocked_uri.startswith(("https://", "http://localhost")):
                return True
        
        return False


# Export reporter instance and middleware class
SecurityHeadersMiddleware = SecurityHeadersMiddleware  # Export the class itself
csp_violation_reporter = CSPViolationReporter()