"""
Multi-layer caching system for API performance optimization.
"""
import json
import hashlib
import asyncio
from typing import Dict, Any, Optional, Union, List
from datetime import datetime, timedelta
from functools import wraps

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import redis_manager
import logging

logger = logging.getLogger(__name__)


class CacheLayer:
    """Base cache layer interface."""
    
    async def get(self, key: str) -> Optional[Any]:
        raise NotImplementedError
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        raise NotImplementedError
    
    async def delete(self, key: str) -> bool:
        raise NotImplementedError
    
    async def exists(self, key: str) -> bool:
        raise NotImplementedError


class MemoryCache(CacheLayer):
    """In-memory cache layer (L1 cache)."""
    
    def __init__(self, max_size: int = 1000):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.access_order: List[str] = []
    
    async def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            # Check expiration
            entry = self.cache[key]
            if datetime.utcnow() < entry['expires_at']:
                # Update access order for LRU
                if key in self.access_order:
                    self.access_order.remove(key)
                self.access_order.append(key)
                return entry['value']
            else:
                # Remove expired entry
                await self.delete(key)
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        try:
            # Evict old entries if at capacity
            if len(self.cache) >= self.max_size and key not in self.cache:
                await self._evict_lru()
            
            expires_at = datetime.utcnow() + timedelta(seconds=ttl)
            self.cache[key] = {
                'value': value,
                'expires_at': expires_at,
                'created_at': datetime.utcnow()
            }
            
            # Update access order
            if key in self.access_order:
                self.access_order.remove(key)
            self.access_order.append(key)
            
            return True
        except Exception as e:
            logger.error(f"Memory cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        if key in self.cache:
            del self.cache[key]
            if key in self.access_order:
                self.access_order.remove(key)
            return True
        return False
    
    async def exists(self, key: str) -> bool:
        return key in self.cache and datetime.utcnow() < self.cache[key]['expires_at']
    
    async def _evict_lru(self):
        """Evict least recently used item."""
        if self.access_order:
            lru_key = self.access_order.pop(0)
            if lru_key in self.cache:
                del self.cache[lru_key]


class RedisCache(CacheLayer):
    """Redis cache layer (L2 cache)."""
    
    def __init__(self):
        self.redis = redis_manager
    
    async def get(self, key: str) -> Optional[Any]:
        try:
            cached = await self.redis.get(key)
            if cached:
                return json.loads(cached)
            return None
        except Exception as e:
            logger.error(f"Redis cache get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        try:
            serialized = json.dumps(value, default=str)
            await self.redis.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Redis cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        try:
            result = await self.redis.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Redis cache delete error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        try:
            result = await self.redis.exists(key)
            return result > 0
        except Exception as e:
            logger.error(f"Redis cache exists error: {e}")
            return False


class MultiLayerCache:
    """Multi-layer cache system with L1 (memory) and L2 (Redis) cache."""
    
    def __init__(self):
        self.l1_cache = MemoryCache(max_size=500)  # Smaller for API servers
        self.l2_cache = RedisCache()
        self.hit_stats = {
            'l1_hits': 0,
            'l2_hits': 0,
            'misses': 0,
            'total_requests': 0
        }
    
    def _generate_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from parameters."""
        key_data = f"{prefix}:{json.dumps(kwargs, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache, checking L1 then L2."""
        self.hit_stats['total_requests'] += 1
        
        # Check L1 cache first
        value = await self.l1_cache.get(key)
        if value is not None:
            self.hit_stats['l1_hits'] += 1
            return value
        
        # Check L2 cache
        value = await self.l2_cache.get(key)
        if value is not None:
            self.hit_stats['l2_hits'] += 1
            # Promote to L1 cache
            await self.l1_cache.set(key, value, ttl=300)
            return value
        
        self.hit_stats['misses'] += 1
        return None
    
    async def set(self, key: str, value: Any, l1_ttl: int = 300, l2_ttl: int = 1800) -> bool:
        """Set value in both cache layers."""
        l1_success = await self.l1_cache.set(key, value, l1_ttl)
        l2_success = await self.l2_cache.set(key, value, l2_ttl)
        
        return l1_success or l2_success
    
    async def delete(self, key: str) -> bool:
        """Delete value from both cache layers."""
        l1_deleted = await self.l1_cache.delete(key)
        l2_deleted = await self.l2_cache.delete(key)
        
        return l1_deleted or l2_deleted
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in any cache layer."""
        return await self.l1_cache.exists(key) or await self.l2_cache.exists(key)
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate cache entries matching pattern (Redis only)."""
        try:
            # Get all keys matching pattern from Redis
            keys = await self.l2_cache.redis.keys(pattern)
            if keys:
                await self.l2_cache.redis.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache entries matching pattern: {pattern}")
        except Exception as e:
            logger.error(f"Cache pattern invalidation error: {e}")
    
    def get_hit_ratio(self) -> Dict[str, float]:
        """Get cache hit ratio statistics."""
        total = self.hit_stats['total_requests']
        if total == 0:
            return {'l1_ratio': 0.0, 'l2_ratio': 0.0, 'hit_ratio': 0.0}
        
        l1_ratio = self.hit_stats['l1_hits'] / total
        l2_ratio = self.hit_stats['l2_hits'] / total
        hit_ratio = (self.hit_stats['l1_hits'] + self.hit_stats['l2_hits']) / total
        
        return {
            'l1_ratio': round(l1_ratio, 3),
            'l2_ratio': round(l2_ratio, 3),
            'hit_ratio': round(hit_ratio, 3),
            'total_requests': total
        }


# Global cache manager instance
cache_manager = MultiLayerCache()


def cache_result(
    key_prefix: str = None,
    ttl: int = 300,
    l2_ttl: int = None,
    skip_cache: bool = False
):
    """
    Decorator for caching function results.
    
    Args:
        key_prefix: Cache key prefix (defaults to function name)
        ttl: L1 cache TTL in seconds
        l2_ttl: L2 cache TTL in seconds (defaults to ttl * 6)
        skip_cache: Skip caching (useful for debugging)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if skip_cache:
                return await func(*args, **kwargs)
            
            # Generate cache key
            prefix = key_prefix or f"{func.__module__}.{func.__name__}"
            
            # Filter out non-serializable objects (like db sessions)
            cache_kwargs = {}
            for k, v in kwargs.items():
                if not isinstance(v, (AsyncSession,)):
                    try:
                        json.dumps(v, default=str)
                        cache_kwargs[k] = v
                    except (TypeError, ValueError):
                        # Skip non-serializable values
                        continue
            
            cache_key = cache_manager._generate_key(prefix, args=args, kwargs=cache_kwargs)
            
            # Try to get from cache
            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            
            if result is not None:
                l2_ttl_final = l2_ttl or (ttl * 6)
                await cache_manager.set(cache_key, result, ttl, l2_ttl_final)
            
            return result
        
        return wrapper
    return decorator


async def warm_cache_on_startup():
    """Warm up cache with frequently accessed data on application startup."""
    try:
        logger.info("Starting cache warm-up process...")
        
        # This would typically involve pre-loading:
        # - Common configuration data
        # - Frequently accessed user settings
        # - Popular dashboard metrics
        # - System health data
        
        # For now, we'll set a basic health indicator
        await cache_manager.set("system:health", {"status": "healthy", "timestamp": datetime.utcnow()}, 60)
        
        logger.info("Cache warm-up completed successfully")
        
    except Exception as e:
        logger.error(f"Cache warm-up failed: {e}")


async def get_cache_stats() -> Dict[str, Any]:
    """Get comprehensive cache statistics."""
    stats = cache_manager.get_hit_ratio()
    
    try:
        # Add Redis-specific stats
        redis_info = await cache_manager.l2_cache.redis.info('memory')
        stats.update({
            'redis_memory_used': redis_info.get('used_memory_human', 'N/A'),
            'redis_peak_memory': redis_info.get('used_memory_peak_human', 'N/A'),
            'l1_cache_size': len(cache_manager.l1_cache.cache),
            'l1_cache_capacity': cache_manager.l1_cache.max_size
        })
    except Exception as e:
        logger.error(f"Failed to get Redis stats: {e}")
        stats['redis_error'] = str(e)
    
    return stats