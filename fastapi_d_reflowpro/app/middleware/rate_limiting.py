"""
Global rate limiting middleware for the entire application.
Provides general protection against abuse and DDoS attacks.
"""

import time
import logging
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime

from ..core.rate_limiter import rate_limiter, get_client_identifier

logger = logging.getLogger(__name__)

class GlobalRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Global rate limiting middleware that applies to all endpoints.
    Uses a more lenient limit than endpoint-specific rate limits.
    """
    
    def __init__(self, app, max_requests: int = 200, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for certain paths
        if self._should_skip_rate_limit(request.url.path):
            return await call_next(request)
        
        # Get client identifier
        identifier = get_client_identifier(request)
        
        # Check global rate limit
        is_allowed, rate_info = await rate_limiter.check_rate_limit(
            identifier=f"global:{identifier}",
            max_attempts=self.max_requests,
            window_seconds=self.window_seconds,
            block_duration=60  # 1 minute block for global limits
        )
        
        if not is_allowed:
            reset_time = rate_info.get('reset_time', time.time() + self.window_seconds)
            
            logger.warning(
                f"Global rate limit exceeded for {identifier}",
                extra={
                    'client_identifier': identifier,
                    'path': request.url.path,
                    'method': request.method,
                    'user_agent': request.headers.get('User-Agent', 'unknown')
                }
            )
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Please try again later.",
                    "details": {
                        "retry_after": int(reset_time - time.time()),
                        "reset_time": datetime.fromtimestamp(reset_time).isoformat(),
                        "limit_type": "global"
                    }
                },
                headers={
                    "Retry-After": str(int(reset_time - time.time())),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": str(rate_info.get('remaining_attempts', 0)),
                    "X-RateLimit-Reset": str(int(reset_time)),
                    "X-RateLimit-Scope": "global"
                }
            )
        
        # Add rate limit headers to successful responses
        response = await call_next(request)
        
        if hasattr(response, 'headers'):
            response.headers["X-RateLimit-Limit"] = str(self.max_requests)
            response.headers["X-RateLimit-Remaining"] = str(rate_info.get('remaining_attempts', self.max_requests))
            response.headers["X-RateLimit-Scope"] = "global"
        
        return response
    
    def _should_skip_rate_limit(self, path: str) -> bool:
        """Determine if rate limiting should be skipped for this path."""
        skip_paths = [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico",
            "/robots.txt",
            "/sitemap.xml"
        ]
        
        return any(path.startswith(skip_path) for skip_path in skip_paths)

class APIRateLimitMiddleware(BaseHTTPMiddleware):
    """
    API-specific rate limiting middleware for API endpoints.
    More restrictive than global rate limiting.
    """
    
    def __init__(self, app, max_requests: int = 1000, window_seconds: int = 3600):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    async def dispatch(self, request: Request, call_next):
        # Only apply to API endpoints
        if not request.url.path.startswith("/api/"):
            return await call_next(request)
        
        # Skip for health checks and documentation
        if self._should_skip_rate_limit(request.url.path):
            return await call_next(request)
        
        # Get identifier (prefer user-based for authenticated requests)
        identifier = await self._get_api_identifier(request)
        
        # Check API rate limit
        is_allowed, rate_info = await rate_limiter.check_rate_limit(
            identifier=f"api:{identifier}",
            max_attempts=self.max_requests,
            window_seconds=self.window_seconds,
            block_duration=300  # 5 minutes block for API limits
        )
        
        if not is_allowed:
            reset_time = rate_info.get('reset_time', time.time() + self.window_seconds)
            
            logger.warning(
                f"API rate limit exceeded for {identifier}",
                extra={
                    'api_identifier': identifier,
                    'path': request.url.path,
                    'method': request.method,
                    'user_agent': request.headers.get('User-Agent', 'unknown')
                }
            )
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "API_RATE_LIMIT_EXCEEDED",
                    "message": "API rate limit exceeded. Please try again later.",
                    "details": {
                        "retry_after": int(reset_time - time.time()),
                        "reset_time": datetime.fromtimestamp(reset_time).isoformat(),
                        "limit_type": "api",
                        "hourly_limit": self.max_requests
                    }
                },
                headers={
                    "Retry-After": str(int(reset_time - time.time())),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": str(rate_info.get('remaining_attempts', 0)),
                    "X-RateLimit-Reset": str(int(reset_time)),
                    "X-RateLimit-Scope": "api"
                }
            )
        
        # Add API rate limit headers
        response = await call_next(request)
        
        if hasattr(response, 'headers'):
            response.headers["X-RateLimit-Limit"] = str(self.max_requests)
            response.headers["X-RateLimit-Remaining"] = str(rate_info.get('remaining_attempts', self.max_requests))
            response.headers["X-RateLimit-Scope"] = "api"
            response.headers["X-RateLimit-Window"] = str(self.window_seconds)
        
        return response
    
    async def _get_api_identifier(self, request: Request) -> str:
        """Get identifier for API rate limiting (user-based if authenticated)."""
        # Try to get user from Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                from ..core.security import JWTManager
                token = auth_header.split(" ")[1]
                payload = JWTManager.decode_token(token)
                if payload and "sub" in payload:
                    return f"user:{payload['sub']}"
            except:
                pass  # Fall back to IP-based limiting
        
        # Try to get API key from headers
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"apikey:{api_key[:16]}..."  # Use first 16 chars for privacy
        
        # Fall back to IP-based limiting
        return get_client_identifier(request)
    
    def _should_skip_rate_limit(self, path: str) -> bool:
        """Determine if rate limiting should be skipped for this API path."""
        skip_paths = [
            "/api/health",
            "/api/docs",
            "/api/status"
        ]
        
        return any(path.startswith(skip_path) for skip_path in skip_paths)