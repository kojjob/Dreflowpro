"""
API Key Management System
Provides secure API key generation, validation, and management with rate limiting
"""

import secrets
import hashlib
import hmac
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
import json
import base64
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import select, update, and_, or_

from ..core.config import settings
from ..core.redis import redis_manager
from ..models.api_key import APIKey, APIKeyScope


class APIKeyType(str, Enum):
    """API Key types with different permission levels"""
    PUBLIC = "public"  # Read-only access to public resources
    PRIVATE = "private"  # Full access to user's resources
    ADMIN = "admin"  # Administrative access
    SERVICE = "service"  # Service-to-service communication
    WEBHOOK = "webhook"  # Webhook signing and verification


class APIKeyManager:
    """
    Manages API key operations including:
    - Key generation with cryptographic security
    - Key validation and authentication
    - Rate limiting per key
    - Scope and permission management
    - Key rotation and revocation
    """
    
    def __init__(self):
        self.key_prefix = "dk"  # DReflowPro Key
        self.key_length = 32
        self.hash_algorithm = "sha256"
        self.rate_limit_window = 3600  # 1 hour in seconds
        
        # Default rate limits by key type
        self.default_rate_limits = {
            APIKeyType.PUBLIC: 100,  # 100 requests per hour
            APIKeyType.PRIVATE: 1000,  # 1000 requests per hour
            APIKeyType.ADMIN: 10000,  # 10000 requests per hour
            APIKeyType.SERVICE: 50000,  # 50000 requests per hour
            APIKeyType.WEBHOOK: 5000,  # 5000 requests per hour
        }
    
    def generate_api_key(self, key_type: APIKeyType = APIKeyType.PRIVATE) -> Tuple[str, str]:
        """
        Generate a new API key
        
        Args:
            key_type: Type of API key
            
        Returns:
            Tuple of (plain_key, hashed_key)
        """
        # Generate random key
        random_bytes = secrets.token_bytes(self.key_length)
        key_id = secrets.token_urlsafe(8)
        
        # Create the full key: prefix_keyid_randomkey
        plain_key = f"{self.key_prefix}_{key_id}_{secrets.token_urlsafe(24)}"
        
        # Hash the key for storage
        hashed_key = self._hash_key(plain_key)
        
        return plain_key, hashed_key
    
    def _hash_key(self, plain_key: str) -> str:
        """
        Hash an API key for secure storage
        
        Args:
            plain_key: Plain text API key
            
        Returns:
            Hashed key
        """
        return hashlib.sha256(plain_key.encode()).hexdigest()
    
    def _sign_data(self, data: str, secret: str) -> str:
        """
        Sign data using HMAC-SHA256
        
        Args:
            data: Data to sign
            secret: Secret key
            
        Returns:
            Hex-encoded signature
        """
        return hmac.new(
            secret.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()
    
    async def create_api_key(
        self,
        user_id: str,
        name: str,
        key_type: APIKeyType,
        scopes: List[str],
        expires_at: Optional[datetime],
        rate_limit: Optional[int],
        allowed_origins: Optional[List[str]],
        allowed_ips: Optional[List[str]],
        db: Session
    ) -> Dict[str, Any]:
        """
        Create a new API key in the database
        
        Args:
            user_id: User ID who owns the key
            name: Friendly name for the key
            key_type: Type of API key
            scopes: List of permission scopes
            expires_at: Optional expiration date
            rate_limit: Optional custom rate limit
            allowed_origins: Optional list of allowed origins
            allowed_ips: Optional list of allowed IP addresses
            db: Database session
            
        Returns:
            Result dictionary with key details
        """
        try:
            # Generate the key
            plain_key, hashed_key = self.generate_api_key(key_type)
            
            # Extract key ID from plain key
            key_id = plain_key.split("_")[1]
            
            # Set default rate limit if not provided
            if rate_limit is None:
                rate_limit = self.default_rate_limits[key_type]
            
            # Create API key record
            api_key = APIKey(
                id=key_id,
                user_id=user_id,
                name=name,
                key_hash=hashed_key,
                key_type=key_type,
                scopes=scopes,
                rate_limit=rate_limit,
                expires_at=expires_at,
                allowed_origins=allowed_origins,
                allowed_ips=allowed_ips,
                created_at=datetime.utcnow(),
                last_used_at=None,
                is_active=True
            )
            
            db.add(api_key)
            await db.commit()
            
            return {
                "success": True,
                "key": plain_key,  # Return plain key only once
                "key_id": key_id,
                "name": name,
                "type": key_type,
                "scopes": scopes,
                "rate_limit": rate_limit,
                "expires_at": expires_at.isoformat() if expires_at else None,
                "message": "API key created successfully. Store it securely as it won't be shown again."
            }
            
        except Exception as e:
            await db.rollback()
            return {
                "success": False,
                "message": f"Failed to create API key: {str(e)}"
            }
    
    async def validate_api_key(
        self,
        api_key: str,
        required_scope: Optional[str],
        request_origin: Optional[str],
        request_ip: Optional[str],
        db: Session
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Validate an API key and check permissions
        
        Args:
            api_key: API key to validate
            required_scope: Required permission scope
            request_origin: Request origin for CORS check
            request_ip: Request IP for IP restriction check
            db: Database session
            
        Returns:
            Tuple of (is_valid, key_details, error_message)
        """
        try:
            # Hash the provided key
            hashed_key = self._hash_key(api_key)
            
            # Extract key ID from the key
            try:
                key_parts = api_key.split("_")
                if len(key_parts) != 3 or key_parts[0] != self.key_prefix:
                    return False, None, "Invalid API key format"
                key_id = key_parts[1]
            except:
                return False, None, "Invalid API key format"
            
            # Look up the key in database
            stmt = select(APIKey).where(
                and_(
                    APIKey.id == key_id,
                    APIKey.key_hash == hashed_key,
                    APIKey.is_active == True
                )
            )
            
            result = await db.execute(stmt)
            api_key_record = result.scalar_one_or_none()
            
            if not api_key_record:
                return False, None, "Invalid or inactive API key"
            
            # Check expiration
            if api_key_record.expires_at and api_key_record.expires_at < datetime.utcnow():
                return False, None, "API key has expired"
            
            # Check required scope
            if required_scope and required_scope not in api_key_record.scopes:
                return False, None, f"API key lacks required scope: {required_scope}"
            
            # Check origin restrictions
            if api_key_record.allowed_origins and request_origin:
                if request_origin not in api_key_record.allowed_origins:
                    return False, None, f"Origin not allowed: {request_origin}"
            
            # Check IP restrictions
            if api_key_record.allowed_ips and request_ip:
                if request_ip not in api_key_record.allowed_ips:
                    return False, None, f"IP not allowed: {request_ip}"
            
            # Update last used timestamp
            stmt = (
                update(APIKey)
                .where(APIKey.id == key_id)
                .values(last_used_at=datetime.utcnow())
            )
            await db.execute(stmt)
            await db.commit()
            
            # Return key details
            key_details = {
                "key_id": api_key_record.id,
                "user_id": str(api_key_record.user_id),
                "type": api_key_record.key_type,
                "scopes": api_key_record.scopes,
                "rate_limit": api_key_record.rate_limit
            }
            
            return True, key_details, None
            
        except Exception as e:
            return False, None, f"Error validating API key: {str(e)}"
    
    async def check_rate_limit(
        self,
        key_id: str,
        rate_limit: int
    ) -> Tuple[bool, Dict[str, int]]:
        """
        Check and update rate limit for an API key
        
        Args:
            key_id: API key ID
            rate_limit: Maximum requests allowed
            
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        if not redis_manager.redis_client:
            # If Redis is not available, allow the request
            return True, {"limit": rate_limit, "remaining": rate_limit, "reset": 0}
        
        try:
            # Create rate limit key
            rate_key = f"api_rate:{key_id}"
            
            # Get current count
            current_count = await redis_manager.redis_client.get(rate_key)
            
            if current_count is None:
                # First request in the window
                await redis_manager.redis_client.setex(
                    rate_key,
                    self.rate_limit_window,
                    1
                )
                current_count = 1
            else:
                current_count = int(current_count)
                
                if current_count >= rate_limit:
                    # Rate limit exceeded
                    ttl = await redis_manager.redis_client.ttl(rate_key)
                    return False, {
                        "limit": rate_limit,
                        "remaining": 0,
                        "reset": ttl
                    }
                
                # Increment counter
                current_count = await redis_manager.redis_client.incr(rate_key)
            
            # Get TTL for reset time
            ttl = await redis_manager.redis_client.ttl(rate_key)
            
            return True, {
                "limit": rate_limit,
                "remaining": max(0, rate_limit - current_count),
                "reset": ttl
            }
            
        except Exception:
            # If Redis operation fails, allow the request
            return True, {"limit": rate_limit, "remaining": rate_limit, "reset": 0}
    
    async def rotate_api_key(
        self,
        key_id: str,
        user_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Rotate an API key (generate new key, invalidate old)
        
        Args:
            key_id: Current API key ID
            user_id: User ID for authorization
            db: Database session
            
        Returns:
            Result dictionary with new key details
        """
        try:
            # Get existing key details
            stmt = select(APIKey).where(
                and_(
                    APIKey.id == key_id,
                    APIKey.user_id == user_id,
                    APIKey.is_active == True
                )
            )
            
            result = await db.execute(stmt)
            old_key = result.scalar_one_or_none()
            
            if not old_key:
                return {
                    "success": False,
                    "message": "API key not found or unauthorized"
                }
            
            # Deactivate old key
            old_key.is_active = False
            old_key.revoked_at = datetime.utcnow()
            
            # Create new key with same settings
            new_result = await self.create_api_key(
                user_id=user_id,
                name=f"{old_key.name} (rotated)",
                key_type=old_key.key_type,
                scopes=old_key.scopes,
                expires_at=old_key.expires_at,
                rate_limit=old_key.rate_limit,
                allowed_origins=old_key.allowed_origins,
                allowed_ips=old_key.allowed_ips,
                db=db
            )
            
            if new_result["success"]:
                await db.commit()
                
            return new_result
            
        except Exception as e:
            await db.rollback()
            return {
                "success": False,
                "message": f"Failed to rotate API key: {str(e)}"
            }
    
    async def revoke_api_key(
        self,
        key_id: str,
        user_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Revoke an API key
        
        Args:
            key_id: API key ID to revoke
            user_id: User ID for authorization
            db: Database session
            
        Returns:
            Result dictionary
        """
        try:
            stmt = (
                update(APIKey)
                .where(
                    and_(
                        APIKey.id == key_id,
                        APIKey.user_id == user_id
                    )
                )
                .values(
                    is_active=False,
                    revoked_at=datetime.utcnow()
                )
            )
            
            result = await db.execute(stmt)
            
            if result.rowcount == 0:
                return {
                    "success": False,
                    "message": "API key not found or unauthorized"
                }
            
            await db.commit()
            
            # Clear rate limit cache if Redis is available
            if redis_manager.redis_client:
                rate_key = f"api_rate:{key_id}"
                await redis_manager.redis_client.delete(rate_key)
            
            return {
                "success": True,
                "message": "API key revoked successfully"
            }
            
        except Exception as e:
            await db.rollback()
            return {
                "success": False,
                "message": f"Failed to revoke API key: {str(e)}"
            }
    
    def generate_webhook_signature(
        self,
        payload: str,
        secret: str,
        timestamp: Optional[int] = None
    ) -> str:
        """
        Generate webhook signature for payload verification
        
        Args:
            payload: Webhook payload
            secret: Webhook secret
            timestamp: Optional timestamp
            
        Returns:
            Signature string
        """
        if timestamp is None:
            timestamp = int(datetime.utcnow().timestamp())
        
        # Create signed payload
        signed_payload = f"{timestamp}.{payload}"
        
        # Generate signature
        signature = self._sign_data(signed_payload, secret)
        
        return f"t={timestamp},v1={signature}"
    
    def verify_webhook_signature(
        self,
        payload: str,
        signature: str,
        secret: str,
        max_age_seconds: int = 300
    ) -> bool:
        """
        Verify webhook signature
        
        Args:
            payload: Webhook payload
            signature: Provided signature
            secret: Webhook secret
            max_age_seconds: Maximum age of signature
            
        Returns:
            True if signature is valid, False otherwise
        """
        try:
            # Parse signature
            elements = {}
            for element in signature.split(","):
                key, value = element.split("=")
                elements[key] = value
            
            if "t" not in elements or "v1" not in elements:
                return False
            
            timestamp = int(elements["t"])
            provided_signature = elements["v1"]
            
            # Check age
            current_timestamp = int(datetime.utcnow().timestamp())
            if current_timestamp - timestamp > max_age_seconds:
                return False
            
            # Recreate signature
            signed_payload = f"{timestamp}.{payload}"
            expected_signature = self._sign_data(signed_payload, secret)
            
            # Compare signatures
            return hmac.compare_digest(provided_signature, expected_signature)
            
        except Exception:
            return False


# Export singleton instance
api_key_manager = APIKeyManager()