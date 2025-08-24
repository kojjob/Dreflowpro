"""
CSRF Protection Middleware for FastAPI
Implements CSRF protection using double-submit cookie pattern with secure token generation.
"""

import hashlib
import hmac
import secrets
import time
from typing import Optional, Set, Callable
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from ..core.config import settings
from ..core.redis import redis_manager, CacheService


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection middleware implementing double-submit cookie pattern.
    
    Features:
    - Secure token generation using secrets module
    - HMAC-based token verification
    - Time-based token expiration
    - Redis-based token storage and validation
    - Configurable protected methods and exempt paths
    - SameSite cookie settings for additional security
    """
    
    def __init__(
        self,
        app: ASGIApp,
        secret_key: str = None,
        token_expiry: int = 3600,  # 1 hour
        protected_methods: Set[str] = None,
        exempt_paths: Set[str] = None,
        cookie_name: str = "csrf_token",
        header_name: str = "X-CSRF-Token",
        cookie_secure: bool = True,
        cookie_samesite: str = "lax"
    ):
        super().__init__(app)
        self.secret_key = secret_key or settings.SECRET_KEY
        self.token_expiry = token_expiry
        self.protected_methods = protected_methods or {"POST", "PUT", "DELETE", "PATCH"}
        self.exempt_paths = exempt_paths or {
            "/docs", "/redoc", "/openapi.json", "/health",
            "/api/v1/auth/login", "/api/v1/auth/register",
            "/api/v1/auth/refresh", "/api/v1/auth/forgot-password"
        }
        self.cookie_name = cookie_name
        self.header_name = header_name
        self.cookie_secure = cookie_secure
        self.cookie_samesite = cookie_samesite

    def generate_csrf_token(self) -> str:
        """Generate a cryptographically secure CSRF token."""
        timestamp = str(int(time.time()))
        random_bytes = secrets.token_bytes(32)
        token_data = f"{timestamp}:{random_bytes.hex()}"
        
        # Create HMAC signature
        signature = hmac.new(
            self.secret_key.encode(),
            token_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"{token_data}:{signature}"

    def verify_csrf_token(self, token: str) -> bool:
        """Verify CSRF token authenticity and expiration."""
        try:
            # Split token components
            parts = token.split(":")
            if len(parts) != 3:
                return False
            
            timestamp_str, random_hex, signature = parts
            timestamp = int(timestamp_str)
            
            # Check token expiration
            current_time = int(time.time())
            if current_time - timestamp > self.token_expiry:
                return False
            
            # Verify HMAC signature
            token_data = f"{timestamp_str}:{random_hex}"
            expected_signature = hmac.new(
                self.secret_key.encode(),
                token_data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
            
        except (ValueError, TypeError):
            return False

    async def store_token_in_redis(self, token: str, user_session: str = None) -> bool:
        """Store CSRF token in Redis for additional validation."""
        try:
            key = f"csrf_token:{token[:16]}"  # Use first 16 chars as key
            redis = await redis_manager.connect()
            await redis.setex(key, self.token_expiry, token)
            
            # Also store by session if available
            if user_session:
                session_key = f"csrf_session:{user_session}"
                redis = await redis_manager.connect()
                await redis.setex(session_key, self.token_expiry, token)
            
            return True
        except Exception:
            return False

    async def validate_token_in_redis(self, token: str) -> bool:
        """Validate CSRF token exists in Redis."""
        try:
            key = f"csrf_token:{token[:16]}"
            redis = await redis_manager.connect()
            stored_token = await redis.get(key)
            return stored_token == token if stored_token else False
        except Exception:
            return False

    def is_path_exempt(self, path: str) -> bool:
        """Check if the request path is exempt from CSRF protection."""
        return any(path.startswith(exempt_path) for exempt_path in self.exempt_paths)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and apply CSRF protection."""
        
        # Skip CSRF protection for exempt paths
        if self.is_path_exempt(request.url.path):
            return await call_next(request)
        
        # Skip CSRF protection for safe methods
        if request.method not in self.protected_methods:
            response = await call_next(request)
            
            # Generate and set CSRF token for GET requests
            if request.method == "GET":
                csrf_token = self.generate_csrf_token()
                
                # Store in Redis
                session_id = request.cookies.get("session_id")
                await self.store_token_in_redis(csrf_token, session_id)
                
                # Set cookie with token
                response.set_cookie(
                    key=self.cookie_name,
                    value=csrf_token,
                    max_age=self.token_expiry,
                    secure=self.cookie_secure,
                    httponly=True,
                    samesite=self.cookie_samesite
                )
            
            return response
        
        # For protected methods, verify CSRF token
        cookie_token = request.cookies.get(self.cookie_name)
        header_token = request.headers.get(self.header_name)
        
        # Check if tokens are present
        if not cookie_token or not header_token:
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "CSRF token missing",
                    "error_code": "CSRF_TOKEN_MISSING",
                    "message": "CSRF protection requires both cookie and header tokens"
                }
            )
        
        # Verify tokens match (double-submit pattern)
        if not hmac.compare_digest(cookie_token, header_token):
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "CSRF token mismatch",
                    "error_code": "CSRF_TOKEN_MISMATCH",
                    "message": "Cookie and header CSRF tokens do not match"
                }
            )
        
        # Verify token authenticity
        if not self.verify_csrf_token(cookie_token):
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "Invalid CSRF token",
                    "error_code": "CSRF_TOKEN_INVALID",
                    "message": "CSRF token is invalid or expired"
                }
            )
        
        # Additional Redis validation for enhanced security
        if not await self.validate_token_in_redis(cookie_token):
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "CSRF token not found",
                    "error_code": "CSRF_TOKEN_NOT_FOUND",
                    "message": "CSRF token not found in server storage"
                }
            )
        
        # Process the request
        response = await call_next(request)
        
        # Generate new token after successful request (token rotation)
        new_csrf_token = self.generate_csrf_token()
        session_id = request.cookies.get("session_id")
        await self.store_token_in_redis(new_csrf_token, session_id)
        
        # Update cookie with new token
        response.set_cookie(
            key=self.cookie_name,
            value=new_csrf_token,
            max_age=self.token_expiry,
            secure=self.cookie_secure,
            httponly=True,
            samesite=self.cookie_samesite
        )
        
        # Add CSRF token to response headers for client-side access
        response.headers[f"X-New-{self.header_name}"] = new_csrf_token
        
        return response


# Convenience function to get CSRF token from request
async def get_csrf_token(request: Request) -> Optional[str]:
    """Extract CSRF token from request for manual validation."""
    return request.cookies.get("csrf_token")


# CSRF token endpoint for AJAX applications
async def get_csrf_token_endpoint(request: Request) -> dict:
    """Endpoint to get CSRF token for AJAX applications."""
    csrf_token = await get_csrf_token(request)
    return {
        "csrf_token": csrf_token,
        "header_name": "X-CSRF-Token"
    }