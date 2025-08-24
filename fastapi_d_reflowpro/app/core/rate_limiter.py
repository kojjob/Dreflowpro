"""
Rate limiting implementation for authentication endpoints.
Provides sliding window rate limiting with Redis backend for high performance.
"""

import time
import json
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
from fastapi import HTTPException, Request, status
from functools import wraps
import asyncio

from .redis import RedisManager, redis_client

logger = logging.getLogger(__name__)

class RateLimitConfig:
    """Rate limiting configuration for different endpoints."""
    
    # Authentication endpoints (per IP)
    LOGIN_ATTEMPTS = {
        'max_attempts': 5,
        'window_seconds': 900,  # 15 minutes
        'block_duration': 1800  # 30 minutes block
    }
    
    REGISTER_ATTEMPTS = {
        'max_attempts': 3,
        'window_seconds': 3600,  # 1 hour
        'block_duration': 3600   # 1 hour block
    }
    
    PASSWORD_RESET_ATTEMPTS = {
        'max_attempts': 3,
        'window_seconds': 3600,  # 1 hour
        'block_duration': 1800   # 30 minutes block
    }
    
    # API endpoints (per user/API key)
    API_REQUESTS = {
        'max_attempts': 1000,
        'window_seconds': 3600,  # 1 hour
        'block_duration': 300    # 5 minutes block
    }
    
    # Global limits (per IP)
    GLOBAL_REQUESTS = {
        'max_attempts': 100,
        'window_seconds': 60,    # 1 minute
        'block_duration': 60     # 1 minute block
    }

class RateLimiter:
    """Sliding window rate limiter using Redis for persistence and performance."""
    
    def __init__(self):
        self.redis = redis_client
    
    async def check_rate_limit(
        self, 
        identifier: str, 
        max_attempts: int, 
        window_seconds: int, 
        block_duration: int = None
    ) -> Tuple[bool, Dict]:
        """
        Check if request is within rate limits using sliding window algorithm.
        
        Args:
            identifier: Unique identifier (IP, user_id, etc.)
            max_attempts: Maximum attempts allowed in window
            window_seconds: Time window in seconds
            block_duration: How long to block after exceeding limit
            
        Returns:
            Tuple of (is_allowed, info_dict)
        """
        try:
            current_time = time.time()
            window_start = current_time - window_seconds
            
            # Redis key for this identifier and endpoint
            key = f"rate_limit:{identifier}"
            block_key = f"rate_limit_block:{identifier}"
            
            # Check if identifier is currently blocked
            is_blocked = await self.redis.exists(block_key)
            if is_blocked:
                block_ttl = await self.redis.ttl(block_key)
                return False, {
                    'blocked': True,
                    'reset_time': current_time + block_ttl,
                    'remaining_attempts': 0,
                    'window_seconds': window_seconds
                }
            
            # Use Redis pipeline for atomic operations
            pipe = self.redis.pipeline()
            
            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current attempts in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiration on the key
            pipe.expire(key, window_seconds + 1)
            
            results = await pipe.execute()
            current_attempts = results[1] + 1  # +1 for the current request
            
            remaining_attempts = max(0, max_attempts - current_attempts)
            
            if current_attempts > max_attempts:
                # Rate limit exceeded - block if block_duration is set
                if block_duration:
                    await self.redis.setex(block_key, block_duration, "blocked")
                
                # Remove the current request since it's blocked
                await self.redis.zrem(key, str(current_time))
                
                logger.warning(
                    f"Rate limit exceeded for {identifier}",
                    extra={
                        'identifier': identifier,
                        'attempts': current_attempts,
                        'max_attempts': max_attempts,
                        'window_seconds': window_seconds,
                        'blocked_duration': block_duration
                    }
                )
                
                return False, {
                    'blocked': True,
                    'reset_time': current_time + block_duration if block_duration else current_time + window_seconds,
                    'remaining_attempts': 0,
                    'window_seconds': window_seconds
                }
            
            # Calculate when the window resets (when oldest entry expires)
            oldest_entries = await self.redis.zrange(key, 0, 0, withscores=True)
            if oldest_entries:
                oldest_time = oldest_entries[0][1]
                reset_time = oldest_time + window_seconds
            else:
                reset_time = current_time + window_seconds
            
            return True, {
                'blocked': False,
                'reset_time': reset_time,
                'remaining_attempts': remaining_attempts,
                'window_seconds': window_seconds
            }
            
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Fail open - allow request if rate limiter fails
            return True, {
                'blocked': False,
                'reset_time': current_time + window_seconds,
                'remaining_attempts': max_attempts,
                'window_seconds': window_seconds,
                'error': 'Rate limiter unavailable'
            }
    
    async def reset_rate_limit(self, identifier: str):
        """Reset rate limit for an identifier (for testing or admin override)."""
        try:
            key = f"rate_limit:{identifier}"
            block_key = f"rate_limit_block:{identifier}"
            
            await self.redis.delete(key, block_key)
            logger.info(f"Rate limit reset for {identifier}")
            
        except Exception as e:
            logger.error(f"Error resetting rate limit for {identifier}: {e}")
    
    async def get_rate_limit_status(self, identifier: str) -> Dict:
        """Get current rate limit status for an identifier."""
        try:
            key = f"rate_limit:{identifier}"
            block_key = f"rate_limit_block:{identifier}"
            
            is_blocked = await self.redis.exists(block_key)
            if is_blocked:
                block_ttl = await self.redis.ttl(block_key)
                return {
                    'blocked': True,
                    'reset_time': time.time() + block_ttl,
                    'remaining_attempts': 0
                }
            
            current_attempts = await self.redis.zcard(key)
            return {
                'blocked': False,
                'current_attempts': current_attempts,
                'remaining_attempts': max(0, 100 - current_attempts)  # Default limit
            }
            
        except Exception as e:
            logger.error(f"Error getting rate limit status for {identifier}: {e}")
            return {'error': 'Rate limiter unavailable'}

# Global rate limiter instance
rate_limiter = RateLimiter()

def get_client_identifier(request: Request) -> str:
    """Get unique identifier for rate limiting (IP + User-Agent hash)."""
    # Primary: Use IP address
    client_ip = None
    if request.client:
        client_ip = request.client.host
    
    # Fallback: Check common proxy headers
    if not client_ip:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.headers.get("X-Real-IP", "unknown")
    
    # Add User-Agent to make identifier more unique
    user_agent = request.headers.get("User-Agent", "unknown")
    user_agent_hash = str(hash(user_agent))[-8:]  # Last 8 chars of hash
    
    return f"{client_ip}:{user_agent_hash}"

def rate_limit(
    max_attempts: int, 
    window_seconds: int, 
    block_duration: int = None,
    per_user: bool = False
):
    """
    Decorator for rate limiting endpoints.
    
    Args:
        max_attempts: Maximum attempts allowed in window
        window_seconds: Time window in seconds
        block_duration: How long to block after exceeding limit
        per_user: If True, limit per authenticated user instead of IP
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from function arguments
            request = None
            current_user = None
            
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                # Look in kwargs
                request = kwargs.get('request')
            
            if not request:
                # If no request found, skip rate limiting
                logger.warning("Rate limiter: No request object found, skipping rate limit")
                return await func(*args, **kwargs)
            
            # Determine identifier for rate limiting
            if per_user:
                # Try to get current user from kwargs or args
                for arg in list(args) + list(kwargs.values()):
                    if hasattr(arg, 'id') and hasattr(arg, 'email'):
                        current_user = arg
                        break
                
                if current_user:
                    identifier = f"user:{current_user.id}"
                else:
                    # Fall back to IP if user not found
                    identifier = get_client_identifier(request)
            else:
                identifier = get_client_identifier(request)
            
            # Check rate limit
            is_allowed, rate_info = await rate_limiter.check_rate_limit(
                identifier=identifier,
                max_attempts=max_attempts,
                window_seconds=window_seconds,
                block_duration=block_duration
            )
            
            if not is_allowed:
                # Add rate limit headers
                reset_time = rate_info.get('reset_time', time.time() + window_seconds)
                
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please try again later.",
                        "details": {
                            "retry_after": int(reset_time - time.time()),
                            "reset_time": datetime.fromtimestamp(reset_time).isoformat(),
                            "remaining_attempts": rate_info.get('remaining_attempts', 0)
                        }
                    },
                    headers={
                        "Retry-After": str(int(reset_time - time.time())),
                        "X-RateLimit-Limit": str(max_attempts),
                        "X-RateLimit-Remaining": str(rate_info.get('remaining_attempts', 0)),
                        "X-RateLimit-Reset": str(int(reset_time))
                    }
                )
            
            # Request is allowed, proceed
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator

# Convenience decorators for common rate limits
def rate_limit_login(func):
    """Rate limit for login attempts: 5 attempts per 15 minutes."""
    config = RateLimitConfig.LOGIN_ATTEMPTS
    return rate_limit(
        max_attempts=config['max_attempts'],
        window_seconds=config['window_seconds'],
        block_duration=config['block_duration']
    )(func)

def rate_limit_register(func):
    """Rate limit for registration: 3 attempts per hour."""
    config = RateLimitConfig.REGISTER_ATTEMPTS
    return rate_limit(
        max_attempts=config['max_attempts'],
        window_seconds=config['window_seconds'],
        block_duration=config['block_duration']
    )(func)

def rate_limit_password_reset(func):
    """Rate limit for password reset: 3 attempts per hour."""
    config = RateLimitConfig.PASSWORD_RESET_ATTEMPTS
    return rate_limit(
        max_attempts=config['max_attempts'],
        window_seconds=config['window_seconds'],
        block_duration=config['block_duration']
    )(func)

def rate_limit_api(func):
    """Rate limit for API requests: 1000 per hour per user."""
    config = RateLimitConfig.API_REQUESTS
    return rate_limit(
        max_attempts=config['max_attempts'],
        window_seconds=config['window_seconds'],
        block_duration=config['block_duration'],
        per_user=True
    )(func)

def rate_limit_global(func):
    """Rate limit for general endpoints: 100 per minute per IP."""
    config = RateLimitConfig.GLOBAL_REQUESTS
    return rate_limit(
        max_attempts=config['max_attempts'],
        window_seconds=config['window_seconds'],
        block_duration=config['block_duration']
    )(func)