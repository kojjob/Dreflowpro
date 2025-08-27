"""
Production-grade rate limiting and DDoS protection middleware.
Implements multiple rate limiting strategies with Redis backend.
"""

import time
import hashlib
import logging
from typing import Optional, Dict, Any, Callable, Tuple
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
import redis.asyncio as redis

from ..core.config import settings
from ..core.redis import redis_manager

logger = logging.getLogger(__name__)


class RateLimitStrategy(Enum):
    """Rate limiting strategies."""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    LEAKY_BUCKET = "leaky_bucket"


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting."""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    requests_per_day: int = 10000
    burst_size: int = 10
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
    whitelist_ips: list[str] = None
    blacklist_ips: list[str] = None
    
    def __post_init__(self):
        if self.whitelist_ips is None:
            self.whitelist_ips = []
        if self.blacklist_ips is None:
            self.blacklist_ips = []


class RateLimiter:
    """
    Advanced rate limiter with multiple strategies and DDoS protection.
    """
    
    # Different limits for different endpoints
    ENDPOINT_LIMITS = {
        # Authentication endpoints - stricter limits
        "/api/v1/auth/login": RateLimitConfig(
            requests_per_minute=5,
            requests_per_hour=30,
            requests_per_day=100,
            burst_size=2
        ),
        "/api/v1/auth/register": RateLimitConfig(
            requests_per_minute=3,
            requests_per_hour=10,
            requests_per_day=50,
            burst_size=1
        ),
        "/api/v1/auth/password-reset": RateLimitConfig(
            requests_per_minute=2,
            requests_per_hour=5,
            requests_per_day=10,
            burst_size=1
        ),
        
        # API endpoints - moderate limits
        "/api/v1/pipelines": RateLimitConfig(
            requests_per_minute=30,
            requests_per_hour=500,
            requests_per_day=5000
        ),
        "/api/v1/data": RateLimitConfig(
            requests_per_minute=20,
            requests_per_hour=300,
            requests_per_day=3000
        ),
        
        # File upload - strict limits
        "/api/v1/upload": RateLimitConfig(
            requests_per_minute=5,
            requests_per_hour=50,
            requests_per_day=200,
            burst_size=1
        ),
        
        # Health check - relaxed limits
        "/api/v1/system/health": RateLimitConfig(
            requests_per_minute=120,
            requests_per_hour=2000,
            requests_per_day=20000
        ),
    }
    
    # Global DDoS protection limits
    GLOBAL_LIMITS = RateLimitConfig(
        requests_per_minute=1000,
        requests_per_hour=50000,
        requests_per_day=500000,
        burst_size=50
    )
    
    def __init__(self):
        self.redis_client = None
        self.enabled = getattr(settings, "RATE_LIMITING_ENABLED", True)
        self.global_limit = self.GLOBAL_LIMITS
        self.default_limit = RateLimitConfig()
        
    async def initialize(self):
        """Initialize Redis connection."""
        if not self.redis_client and self.enabled:
            try:
                self.redis_client = redis_manager.redis_client
                if not self.redis_client:
                    self.redis_client = await redis.from_url(
                        settings.REDIS_URL,
                        encoding="utf-8",
                        decode_responses=True
                    )
                logger.info("Rate limiter initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize rate limiter: {e}")
                self.enabled = False
    
    def get_client_identifier(self, request: Request) -> str:
        """
        Get unique client identifier from request.
        Uses combination of IP, user agent, and user ID if authenticated.
        """
        # Get client IP (handle proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host
        
        # Include user ID if authenticated
        user_id = getattr(request.state, "user_id", "anonymous")
        
        # Create composite identifier
        identifier = f"{client_ip}:{user_id}"
        
        return identifier
    
    def get_endpoint_config(self, path: str) -> RateLimitConfig:
        """Get rate limit configuration for endpoint."""
        # Check exact match first
        if path in self.ENDPOINT_LIMITS:
            return self.ENDPOINT_LIMITS[path]
        
        # Check prefix match for parameterized routes
        for endpoint, config in self.ENDPOINT_LIMITS.items():
            if path.startswith(endpoint.rstrip("/")):
                return config
        
        return self.default_limit
    
    async def check_rate_limit(
        self,
        request: Request,
        identifier: str,
        config: RateLimitConfig
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if request is within rate limits.
        
        Returns:
            Tuple of (allowed, metadata)
        """
        if not self.enabled or not self.redis_client:
            return True, {}
        
        # Check blacklist
        client_ip = identifier.split(":")[0]
        if client_ip in config.blacklist_ips:
            return False, {"reason": "IP blacklisted"}
        
        # Skip rate limiting for whitelisted IPs
        if client_ip in config.whitelist_ips:
            return True, {"whitelisted": True}
        
        current_timestamp = int(time.time())
        
        # Apply selected strategy
        if config.strategy == RateLimitStrategy.SLIDING_WINDOW:
            return await self._sliding_window_check(
                identifier,
                current_timestamp,
                config
            )
        elif config.strategy == RateLimitStrategy.TOKEN_BUCKET:
            return await self._token_bucket_check(
                identifier,
                current_timestamp,
                config
            )
        else:
            return await self._fixed_window_check(
                identifier,
                current_timestamp,
                config
            )
    
    async def _sliding_window_check(
        self,
        identifier: str,
        timestamp: int,
        config: RateLimitConfig
    ) -> Tuple[bool, Dict[str, Any]]:
        """Sliding window rate limiting algorithm."""
        try:
            # Check multiple time windows
            windows = [
                ("minute", 60, config.requests_per_minute),
                ("hour", 3600, config.requests_per_hour),
                ("day", 86400, config.requests_per_day),
            ]
            
            for window_name, window_size, limit in windows:
                if limit <= 0:
                    continue
                
                key = f"rate_limit:{identifier}:{window_name}"
                window_start = timestamp - window_size
                
                # Remove old entries and count current
                pipe = self.redis_client.pipeline()
                pipe.zremrangebyscore(key, 0, window_start)
                pipe.zcard(key)
                pipe.zadd(key, {str(timestamp): timestamp})
                pipe.expire(key, window_size + 60)
                
                results = await pipe.execute()
                request_count = results[1]
                
                if request_count >= limit:
                    return False, {
                        "limit": limit,
                        "window": window_name,
                        "requests": request_count,
                        "retry_after": window_size
                    }
            
            return True, {"requests": request_count if 'request_count' in locals() else 0}
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Fail open on errors
            return True, {}
    
    async def _token_bucket_check(
        self,
        identifier: str,
        timestamp: int,
        config: RateLimitConfig
    ) -> Tuple[bool, Dict[str, Any]]:
        """Token bucket rate limiting algorithm."""
        try:
            key = f"token_bucket:{identifier}"
            
            # Get current bucket state
            bucket_data = await self.redis_client.get(key)
            
            if bucket_data:
                tokens, last_refill = bucket_data.split(":")
                tokens = float(tokens)
                last_refill = float(last_refill)
            else:
                tokens = float(config.burst_size)
                last_refill = timestamp
            
            # Calculate tokens to add based on time elapsed
            time_elapsed = timestamp - last_refill
            refill_rate = config.requests_per_minute / 60.0
            tokens_to_add = time_elapsed * refill_rate
            
            # Update token count (cap at burst size)
            tokens = min(tokens + tokens_to_add, config.burst_size)
            
            if tokens >= 1:
                # Consume a token
                tokens -= 1
                await self.redis_client.setex(
                    key,
                    300,  # 5 minute expiry
                    f"{tokens}:{timestamp}"
                )
                return True, {"tokens_remaining": int(tokens)}
            else:
                # No tokens available
                retry_after = int((1 - tokens) / refill_rate)
                return False, {
                    "tokens_remaining": 0,
                    "retry_after": retry_after
                }
                
        except Exception as e:
            logger.error(f"Token bucket check failed: {e}")
            return True, {}
    
    async def _fixed_window_check(
        self,
        identifier: str,
        timestamp: int,
        config: RateLimitConfig
    ) -> Tuple[bool, Dict[str, Any]]:
        """Fixed window rate limiting algorithm."""
        try:
            # Round timestamp to minute
            window = timestamp // 60
            key = f"fixed_window:{identifier}:{window}"
            
            # Increment counter
            count = await self.redis_client.incr(key)
            
            # Set expiry on first request in window
            if count == 1:
                await self.redis_client.expire(key, 70)  # Slightly longer than window
            
            if count > config.requests_per_minute:
                return False, {
                    "limit": config.requests_per_minute,
                    "requests": count,
                    "retry_after": 60 - (timestamp % 60)
                }
            
            return True, {"requests": count}
            
        except Exception as e:
            logger.error(f"Fixed window check failed: {e}")
            return True, {}
    
    async def check_ddos_protection(
        self,
        request: Request,
        identifier: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check for DDoS patterns and apply protection.
        """
        if not self.enabled or not self.redis_client:
            return True, {}
        
        try:
            client_ip = identifier.split(":")[0]
            timestamp = int(time.time())
            
            # Check for suspicious patterns
            patterns = [
                await self._check_rapid_requests(client_ip, timestamp),
                await self._check_distributed_attack(timestamp),
                await self._check_suspicious_user_agent(request),
                await self._check_request_patterns(client_ip, request.url.path)
            ]
            
            for is_suspicious, reason in patterns:
                if is_suspicious:
                    # Temporarily ban the IP
                    await self._temporary_ban(client_ip, reason)
                    return False, {"reason": f"DDoS protection: {reason}"}
            
            return True, {}
            
        except Exception as e:
            logger.error(f"DDoS protection check failed: {e}")
            return True, {}
    
    async def _check_rapid_requests(
        self,
        client_ip: str,
        timestamp: int
    ) -> Tuple[bool, str]:
        """Check for unusually rapid requests from single IP."""
        key = f"ddos:rapid:{client_ip}"
        
        # Count requests in last 10 seconds
        await self.redis_client.zadd(key, {str(timestamp): timestamp})
        await self.redis_client.zremrangebyscore(key, 0, timestamp - 10)
        count = await self.redis_client.zcard(key)
        await self.redis_client.expire(key, 30)
        
        # More than 100 requests in 10 seconds is suspicious
        if count > 100:
            return True, "Rapid request pattern detected"
        
        return False, ""
    
    async def _check_distributed_attack(self, timestamp: int) -> Tuple[bool, str]:
        """Check for distributed attack patterns."""
        key = f"ddos:global:{timestamp // 60}"  # Per minute
        
        # Count total requests across all IPs
        count = await self.redis_client.incr(key)
        await self.redis_client.expire(key, 120)
        
        # More than 10000 requests per minute globally is suspicious
        if count > 10000:
            return True, "Global request surge detected"
        
        return False, ""
    
    async def _check_suspicious_user_agent(self, request: Request) -> Tuple[bool, str]:
        """Check for suspicious user agents."""
        user_agent = request.headers.get("User-Agent", "").lower()
        
        suspicious_patterns = [
            "bot", "crawler", "spider", "scraper",
            "curl", "wget", "python-requests",
            "scanner", "nikto", "sqlmap"
        ]
        
        for pattern in suspicious_patterns:
            if pattern in user_agent and "googlebot" not in user_agent:
                return True, f"Suspicious user agent: {pattern}"
        
        return False, ""
    
    async def _check_request_patterns(
        self,
        client_ip: str,
        path: str
    ) -> Tuple[bool, str]:
        """Check for suspicious request patterns."""
        # Check for path traversal attempts
        if "../" in path or "..%2F" in path:
            return True, "Path traversal attempt"
        
        # Check for SQL injection patterns
        suspicious_params = ["'", "\"", "--", "/*", "*/", "xp_", "sp_"]
        if any(param in path for param in suspicious_params):
            return True, "SQL injection pattern detected"
        
        # Track unique paths accessed
        key = f"ddos:paths:{client_ip}"
        await self.redis_client.sadd(key, path)
        await self.redis_client.expire(key, 60)
        
        # Too many unique paths in short time is suspicious
        unique_paths = await self.redis_client.scard(key)
        if unique_paths > 100:
            return True, "Scanning behavior detected"
        
        return False, ""
    
    async def _temporary_ban(self, client_ip: str, reason: str):
        """Temporarily ban an IP address."""
        key = f"ban:{client_ip}"
        ban_duration = 3600  # 1 hour ban
        
        await self.redis_client.setex(
            key,
            ban_duration,
            f"Banned: {reason} at {datetime.utcnow().isoformat()}"
        )
        
        logger.warning(f"IP banned: {client_ip} - {reason}")
    
    async def is_banned(self, client_ip: str) -> bool:
        """Check if an IP is banned."""
        if not self.redis_client:
            return False
        
        key = f"ban:{client_ip}"
        result = await self.redis_client.get(key)
        return result is not None


class RateLimitMiddleware:
    """
    FastAPI middleware for rate limiting and DDoS protection.
    """
    
    def __init__(self):
        self.rate_limiter = RateLimiter()
        
    async def __call__(self, request: Request, call_next: Callable) -> Response:
        """Process request through rate limiting."""
        
        # Initialize rate limiter on first request
        if not self.rate_limiter.redis_client:
            await self.rate_limiter.initialize()
        
        # Skip rate limiting for excluded paths
        excluded_paths = ["/docs", "/redoc", "/openapi.json", "/favicon.ico"]
        if any(request.url.path.startswith(path) for path in excluded_paths):
            return await call_next(request)
        
        # Get client identifier
        identifier = self.rate_limiter.get_client_identifier(request)
        client_ip = identifier.split(":")[0]
        
        # Check if IP is banned
        if await self.rate_limiter.is_banned(client_ip):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Your IP has been temporarily banned"},
                headers={
                    "Retry-After": "3600",
                    "X-Rate-Limit-Reason": "Banned"
                }
            )
        
        # Check DDoS protection
        ddos_allowed, ddos_metadata = await self.rate_limiter.check_ddos_protection(
            request, identifier
        )
        if not ddos_allowed:
            logger.warning(
                f"DDoS protection triggered for {identifier}: {ddos_metadata}"
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests - DDoS protection activated"},
                headers={
                    "Retry-After": "3600",
                    "X-Rate-Limit-Reason": ddos_metadata.get("reason", "DDoS")
                }
            )
        
        # Get endpoint configuration
        config = self.rate_limiter.get_endpoint_config(request.url.path)
        
        # Check rate limits
        allowed, metadata = await self.rate_limiter.check_rate_limit(
            request, identifier, config
        )
        
        if not allowed:
            logger.warning(
                f"Rate limit exceeded for {identifier} on {request.url.path}: {metadata}"
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Rate limit exceeded. Limit: {metadata.get('limit')} per {metadata.get('window')}",
                    "retry_after": metadata.get("retry_after", 60)
                },
                headers={
                    "Retry-After": str(metadata.get("retry_after", 60)),
                    "X-Rate-Limit-Limit": str(metadata.get("limit", config.requests_per_minute)),
                    "X-Rate-Limit-Remaining": "0",
                    "X-Rate-Limit-Reset": str(int(time.time()) + metadata.get("retry_after", 60))
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-Rate-Limit-Limit"] = str(config.requests_per_minute)
        response.headers["X-Rate-Limit-Remaining"] = str(
            max(0, config.requests_per_minute - metadata.get("requests", 0))
        )
        response.headers["X-Rate-Limit-Reset"] = str(int(time.time()) + 60)
        
        return response


# Export middleware instance
rate_limit_middleware = RateLimitMiddleware()