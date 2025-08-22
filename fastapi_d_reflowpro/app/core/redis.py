import redis.asyncio as redis
from typing import Optional
import json
import asyncio
from datetime import timedelta, datetime

from .config import settings

# Global Redis connection pool
redis_pool: Optional[redis.Redis] = None

class RedisManager:
    """Redis connection and operations manager."""
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
    
    async def connect(self) -> redis.Redis:
        """Create Redis connection pool."""
        if self.redis is None:
            self.redis = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20,
                retry_on_timeout=True
            )
        return self.redis
    
    async def disconnect(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
            self.redis = None
    
    async def ping(self) -> bool:
        """Check Redis connection."""
        try:
            if self.redis:
                await self.redis.ping()
                return True
        except Exception:
            pass
        return False

# Global Redis manager instance
redis_manager = RedisManager()

class CacheService:
    """High-level caching service."""
    
    @staticmethod
    async def get_redis() -> redis.Redis:
        """Get Redis connection."""
        return await redis_manager.connect()
    
    @staticmethod
    async def set(
        key: str, 
        value: any, 
        expire: Optional[int] = None,
        serialize: bool = True
    ) -> bool:
        """Set a cache value."""
        try:
            redis = await CacheService.get_redis()
            
            # Serialize value if needed
            if serialize:
                if isinstance(value, (dict, list)):
                    value = json.dumps(value)
                elif not isinstance(value, str):
                    value = str(value)
            
            # Set with optional expiration
            if expire:
                await redis.setex(key, expire, value)
            else:
                await redis.set(key, value)
            
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    @staticmethod
    async def get(key: str, deserialize: bool = True) -> any:
        """Get a cache value."""
        try:
            redis = await CacheService.get_redis()
            value = await redis.get(key)
            
            if value is None:
                return None
            
            # Deserialize if requested
            if deserialize:
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    return value
            
            return value
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    @staticmethod
    async def delete(key: str) -> bool:
        """Delete a cache key."""
        try:
            redis = await CacheService.get_redis()
            result = await redis.delete(key)
            return result > 0
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    @staticmethod
    async def exists(key: str) -> bool:
        """Check if a cache key exists."""
        try:
            redis = await CacheService.get_redis()
            result = await redis.exists(key)
            return result > 0
        except Exception as e:
            print(f"Cache exists error: {e}")
            return False
    
    @staticmethod
    async def expire(key: str, seconds: int) -> bool:
        """Set expiration for a key."""
        try:
            redis = await CacheService.get_redis()
            result = await redis.expire(key, seconds)
            return result
        except Exception as e:
            print(f"Cache expire error: {e}")
            return False
    
    @staticmethod
    async def ttl(key: str) -> int:
        """Get time to live for a key."""
        try:
            redis = await CacheService.get_redis()
            return await redis.ttl(key)
        except Exception as e:
            print(f"Cache TTL error: {e}")
            return -1
    
    @staticmethod
    async def keys(pattern: str) -> list[str]:
        """Get keys matching pattern."""
        try:
            redis = await CacheService.get_redis()
            return await redis.keys(pattern)
        except Exception as e:
            print(f"Cache keys error: {e}")
            return []
    
    @staticmethod
    async def clear_pattern(pattern: str) -> int:
        """Clear all keys matching pattern."""
        try:
            redis = await CacheService.get_redis()
            keys = await redis.keys(pattern)
            if keys:
                return await redis.delete(*keys)
            return 0
        except Exception as e:
            print(f"Cache clear pattern error: {e}")
            return 0

class SessionManager:
    """Session management using Redis."""
    
    SESSION_PREFIX = "session:"
    DEFAULT_EXPIRE = 24 * 60 * 60  # 24 hours
    
    @staticmethod
    async def create_session(
        user_id: str, 
        session_data: dict,
        expire_seconds: Optional[int] = None
    ) -> str:
        """Create a new session."""
        import uuid
        
        session_id = str(uuid.uuid4())
        session_key = f"{SessionManager.SESSION_PREFIX}{session_id}"
        
        # Add metadata to session
        session_data.update({
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "last_accessed": datetime.utcnow().isoformat()
        })
        
        expire = expire_seconds or SessionManager.DEFAULT_EXPIRE
        success = await CacheService.set(session_key, session_data, expire)
        
        return session_id if success else None
    
    @staticmethod
    async def get_session(session_id: str) -> Optional[dict]:
        """Get session data."""
        session_key = f"{SessionManager.SESSION_PREFIX}{session_id}"
        session_data = await CacheService.get(session_key)
        
        if session_data:
            # Update last accessed time
            session_data["last_accessed"] = datetime.utcnow().isoformat()
            await CacheService.set(
                session_key, 
                session_data, 
                await CacheService.ttl(session_key)
            )
        
        return session_data
    
    @staticmethod
    async def update_session(session_id: str, data: dict) -> bool:
        """Update session data."""
        session_key = f"{SessionManager.SESSION_PREFIX}{session_id}"
        session_data = await CacheService.get(session_key)
        
        if session_data:
            session_data.update(data)
            session_data["last_accessed"] = datetime.utcnow().isoformat()
            
            ttl = await CacheService.ttl(session_key)
            return await CacheService.set(session_key, session_data, ttl)
        
        return False
    
    @staticmethod
    async def delete_session(session_id: str) -> bool:
        """Delete a session."""
        session_key = f"{SessionManager.SESSION_PREFIX}{session_id}"
        return await CacheService.delete(session_key)
    
    @staticmethod
    async def extend_session(session_id: str, expire_seconds: int) -> bool:
        """Extend session expiration."""
        session_key = f"{SessionManager.SESSION_PREFIX}{session_id}"
        return await CacheService.expire(session_key, expire_seconds)
    
    @staticmethod
    async def get_user_sessions(user_id: str) -> list[dict]:
        """Get all sessions for a user."""
        pattern = f"{SessionManager.SESSION_PREFIX}*"
        session_keys = await CacheService.keys(pattern)
        
        user_sessions = []
        for key in session_keys:
            session_data = await CacheService.get(key, deserialize=True)
            if session_data and session_data.get("user_id") == user_id:
                session_data["session_id"] = key.replace(SessionManager.SESSION_PREFIX, "")
                user_sessions.append(session_data)
        
        return user_sessions
    
    @staticmethod
    async def clear_user_sessions(user_id: str) -> int:
        """Clear all sessions for a user."""
        pattern = f"{SessionManager.SESSION_PREFIX}*"
        session_keys = await CacheService.keys(pattern)
        
        cleared = 0
        for key in session_keys:
            session_data = await CacheService.get(key, deserialize=True)
            if session_data and session_data.get("user_id") == user_id:
                if await CacheService.delete(key):
                    cleared += 1
        
        return cleared

# Initialization and cleanup functions
async def init_redis():
    """Initialize Redis connection."""
    try:
        redis = await redis_manager.connect()
        await redis.ping()
        print("✅ Redis connection established")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False

async def close_redis():
    """Close Redis connection."""
    await redis_manager.disconnect()
    print("✅ Redis connection closed")