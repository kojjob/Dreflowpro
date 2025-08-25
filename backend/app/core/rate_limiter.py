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

from .redis import redis_manager

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

class AdaptiveRateLimiter:
    """Enhanced adaptive rate limiter with intelligent burst handling and performance optimization."""
    
    def __init__(self):
        self.redis = redis_manager
        self.burst_multiplier = 1.5  # Allow 50% burst above normal limit
        self.reputation_scores = {}  # In-memory reputation tracking
        self.circuit_breaker_threshold = 0.8  # Trip breaker at 80% error rate
        
    async def get_reputation_score(self, identifier: str) -> float:
        """Get reputation score for identifier (0.0 = bad, 1.0 = excellent)."""
        try:
            # Check Redis for persistent reputation data
            reputation_key = f"reputation:{identifier}"
            cached_score = await self.redis.get(reputation_key)
            
            if cached_score:
                return float(cached_score)
            
            # Default reputation for new identifiers
            return 0.5
            
        except Exception as e:
            logger.error(f"Error getting reputation score: {e}")
            return 0.5
    
    async def update_reputation(self, identifier: str, success: bool):
        """Update reputation based on request success/failure."""
        try:
            current_score = await self.get_reputation_score(identifier)
            
            if success:
                # Gradually improve reputation on success
                new_score = min(1.0, current_score + 0.01)
            else:
                # Quickly degrade reputation on failure
                new_score = max(0.0, current_score - 0.05)
            
            reputation_key = f"reputation:{identifier}"
            await self.redis.setex(reputation_key, 86400, str(new_score))  # 24 hour TTL
            
        except Exception as e:
            logger.error(f"Error updating reputation: {e}")
    
    async def get_adaptive_limits(self, identifier: str, base_max: int, window_seconds: int) -> tuple:
        """Calculate adaptive limits based on reputation and system load."""
        reputation = await self.get_reputation_score(identifier)
        
        # Good reputation gets higher limits
        reputation_multiplier = 0.5 + (reputation * 1.5)  # Range: 0.5x to 2.0x
        
        # Check system load (simplified version)
        system_load = await self._get_system_load()
        load_multiplier = max(0.2, 1.0 - system_load)  # Reduce limits under high load
        
        # Calculate final limits
        adaptive_max = int(base_max * reputation_multiplier * load_multiplier)
        
        # Allow burst capacity for trusted users
        burst_max = int(adaptive_max * self.burst_multiplier) if reputation > 0.7 else adaptive_max
        
        return adaptive_max, burst_max
    
    async def _get_system_load(self) -> float:
        """Get system load metric (0.0 = idle, 1.0 = overloaded)."""
        try:
            # Simple load estimation based on Redis memory usage
            info = await self.redis.info('memory')
            used_memory = info.get('used_memory', 0)
            max_memory = info.get('maxmemory', 0)
            
            if max_memory > 0:
                memory_ratio = used_memory / max_memory
                return min(1.0, memory_ratio)
            
            return 0.1  # Low load if we can't determine
            
        except Exception:
            return 0.1  # Assume low load on error
    
    async def check_rate_limit(
        self, 
        identifier: str, 
        max_attempts: int, 
        window_seconds: int, 
        block_duration: int = None,
        adaptive: bool = True
    ) -> Tuple[bool, Dict]:
        """
        Enhanced rate limit check with adaptive limits and intelligent burst handling.
        
        Args:
            identifier: Unique identifier (IP, user_id, etc.)
            max_attempts: Base maximum attempts allowed in window
            window_seconds: Time window in seconds
            block_duration: How long to block after exceeding limit
            adaptive: Whether to use adaptive limits based on reputation
            
        Returns:
            Tuple of (is_allowed, info_dict)
        """
        try:
            current_time = time.time()
            window_start = current_time - window_seconds
            
            # Get adaptive limits if enabled
            if adaptive:
                adaptive_max, burst_max = await self.get_adaptive_limits(identifier, max_attempts, window_seconds)
            else:
                adaptive_max = burst_max = max_attempts
            
            # Redis keys for this identifier
            key = f"rate_limit:{identifier}"
            block_key = f"rate_limit_block:{identifier}"
            burst_key = f"rate_limit_burst:{identifier}"
            
            # Check if identifier is currently blocked
            is_blocked = await self.redis.exists(block_key)
            if is_blocked:
                block_ttl = await self.redis.ttl(block_key)
                return False, {
                    'blocked': True,
                    'reset_time': current_time + block_ttl,
                    'remaining_attempts': 0,
                    'window_seconds': window_seconds,
                    'adaptive_max': adaptive_max,
                    'reputation': await self.get_reputation_score(identifier)
                }
            
            # Use Redis pipeline for atomic operations
            pipe = self.redis.pipeline()
            
            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zremrangebyscore(burst_key, 0, window_start - 60)  # Burst window is shorter
            
            # Count current attempts in window
            pipe.zcard(key)
            pipe.zcard(burst_key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            pipe.zadd(burst_key, {str(current_time): current_time})
            
            # Set expiration on the keys
            pipe.expire(key, window_seconds + 1)
            pipe.expire(burst_key, 120)  # 2-minute burst tracking
            
            results = await pipe.execute()
            current_attempts = results[2] + 1  # +1 for the current request
            burst_attempts = results[3] + 1
            
            # Check burst limits first (for short-term protection)
            if burst_attempts > burst_max and adaptive:
                logger.warning(f"Burst limit exceeded for {identifier}: {burst_attempts} > {burst_max}")
                # Temporary burst block (shorter duration)
                temp_block_duration = min(60, block_duration or 60)  # Max 1 minute burst block
                await self.redis.setex(f"{block_key}_burst", temp_block_duration, "burst_blocked")
                await self.update_reputation(identifier, False)
                
                return False, {
                    'blocked': True,
                    'burst_blocked': True,
                    'reset_time': current_time + temp_block_duration,
                    'remaining_attempts': 0,
                    'window_seconds': window_seconds,
                    'adaptive_max': adaptive_max,
                    'reputation': await self.get_reputation_score(identifier)
                }
            
            remaining_attempts = max(0, adaptive_max - current_attempts)
            
            # Check main rate limit
            if current_attempts > adaptive_max:
                # Rate limit exceeded - block if block_duration is set
                if block_duration:
                    await self.redis.setex(block_key, block_duration, "blocked")
                
                # Remove the current request since it's blocked
                await self.redis.zrem(key, str(current_time))
                await self.redis.zrem(burst_key, str(current_time))
                
                # Update reputation negatively
                await self.update_reputation(identifier, False)
                
                logger.warning(
                    f"Rate limit exceeded for {identifier}",
                    extra={
                        'identifier': identifier,
                        'attempts': current_attempts,
                        'adaptive_max': adaptive_max,
                        'base_max': max_attempts,
                        'window_seconds': window_seconds,
                        'blocked_duration': block_duration,
                        'reputation': await self.get_reputation_score(identifier)
                    }
                )
                
                return False, {
                    'blocked': True,
                    'reset_time': current_time + block_duration if block_duration else current_time + window_seconds,
                    'remaining_attempts': 0,
                    'window_seconds': window_seconds,
                    'adaptive_max': adaptive_max,
                    'reputation': await self.get_reputation_score(identifier)
                }
            
            # Request allowed - update reputation positively
            await self.update_reputation(identifier, True)
            
            # Calculate when the window resets
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
                'window_seconds': window_seconds,
                'adaptive_max': adaptive_max,
                'base_max': max_attempts,
                'reputation': await self.get_reputation_score(identifier),
                'current_attempts': current_attempts,
                'burst_attempts': burst_attempts,
                'burst_max': burst_max
            }
            
        except Exception as e:
            logger.error(f"Enhanced rate limiter error: {e}")
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

# For backward compatibility, maintain the old class name
RateLimiter = AdaptiveRateLimiter

# Global rate limiter instance
rate_limiter = AdaptiveRateLimiter()

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