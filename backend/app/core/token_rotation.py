"""
Advanced Token Rotation System for Enhanced Security

This module implements refresh token rotation, a security best practice where
refresh tokens are invalidated and replaced with new ones upon each use.
This prevents replay attacks and reduces the window of vulnerability.
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
import logging
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload

from .database import get_session
from .security import JWTManager, SecurityUtils
from .redis import CacheService
from ..models.user import User
from ..models.token_family import RefreshToken, TokenFamily, TokenStatus

logger = logging.getLogger(__name__)




@dataclass
class TokenRotationResult:
    """Result of token rotation operation."""
    success: bool
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None
    family_id: Optional[str] = None
    error_code: Optional[str] = None
    message: Optional[str] = None


class TokenRotationManager:
    """
    Advanced token rotation manager with family tracking and security features.
    
    Features:
    - Refresh token rotation on each use
    - Token family tracking for security
    - Automatic cleanup of expired tokens
    - Concurrent access protection
    - Audit logging for security events
    """
    
    def __init__(self):
        self.jwt_manager = JWTManager()
        self.cache_prefix = "token_rotation:"
        self.family_cache_ttl = 3600  # 1 hour
        
    async def create_token_family(
        self, 
        user: User, 
        db: AsyncSession,
        device_info: Optional[Dict[str, Any]] = None
    ) -> TokenRotationResult:
        """
        Create a new token family for a user session.
        
        Args:
            user: User instance
            db: Database session
            device_info: Optional device/client information
            
        Returns:
            TokenRotationResult with new tokens
        """
        try:
            # Create token family
            family_id = str(uuid.uuid4())
            
            # Generate tokens
            access_token = self.jwt_manager.create_access_token(
                subject=str(user.id),
                extra_claims={
                    "family_id": family_id,
                    "role": user.role.value,
                    "org_id": str(user.organization_id) if user.organization_id else None
                }
            )
            
            refresh_token = self.jwt_manager.create_refresh_token(
                subject=str(user.id),
                extra_claims={"family_id": family_id}
            )
            
            # Create token family record
            token_family = TokenFamily(
                id=uuid.UUID(family_id),
                user_id=user.id,
                device_info=device_info or {},
                created_at=datetime.utcnow(),
                last_used=datetime.utcnow(),
                is_active=True
            )
            
            # Create refresh token record
            refresh_token_record = RefreshToken(
                id=uuid.uuid4(),
                family_id=uuid.UUID(family_id),
                user_id=user.id,
                token_hash=SecurityUtils.get_password_hash(refresh_token),
                status=TokenStatus.ACTIVE,
                expires_at=datetime.utcnow() + timedelta(days=30),
                created_at=datetime.utcnow()
            )
            
            db.add(token_family)
            db.add(refresh_token_record)
            await db.commit()
            
            # Cache family info for quick lookups
            await self._cache_family_info(family_id, user.id, token_family.is_active)
            
            logger.info(
                f"Token family created successfully",
                extra={
                    "user_id": user.id,
                    "family_id": family_id,
                    "device": device_info.get("user_agent", "unknown") if device_info else "unknown"
                }
            )
            
            return TokenRotationResult(
                success=True,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=3600,  # 1 hour
                family_id=family_id
            )
            
        except Exception as e:
            logger.error(f"Failed to create token family: {e}")
            await db.rollback()
            return TokenRotationResult(
                success=False,
                error_code="TOKEN_CREATION_FAILED",
                message="Failed to create authentication tokens"
            )
    
    async def rotate_refresh_token(
        self, 
        refresh_token: str, 
        db: AsyncSession,
        request_info: Optional[Dict[str, Any]] = None
    ) -> TokenRotationResult:
        """
        Rotate refresh token and generate new access token.
        
        Args:
            refresh_token: Current refresh token
            db: Database session
            request_info: Request metadata for security logging
            
        Returns:
            TokenRotationResult with new tokens or error
        """
        try:
            # Decode and validate refresh token
            payload = self.jwt_manager.verify_refresh_token(refresh_token)
            if not payload:
                return TokenRotationResult(
                    success=False,
                    error_code="INVALID_REFRESH_TOKEN",
                    message="Invalid or expired refresh token"
                )
            
            user_id = uuid.UUID(payload["sub"])
            family_id = payload.get("family_id")
            
            if not family_id:
                return TokenRotationResult(
                    success=False,
                    error_code="INVALID_TOKEN_FAMILY",
                    message="Token missing family information"
                )
            
            # Check if family is active and not compromised
            family_active = await self._is_family_active(family_id)
            if not family_active:
                logger.warning(
                    f"Attempted to use token from inactive family",
                    extra={
                        "user_id": user_id,
                        "family_id": family_id,
                        "request_info": request_info
                    }
                )
                return TokenRotationResult(
                    success=False,
                    error_code="TOKEN_FAMILY_REVOKED",
                    message="Token family has been revoked"
                )
            
            # Find current refresh token record
            result = await db.execute(
                select(RefreshToken)
                .where(RefreshToken.family_id == uuid.UUID(family_id))
                .where(RefreshToken.status == TokenStatus.ACTIVE)
                .order_by(RefreshToken.created_at.desc())
                .limit(1)
            )
            current_token = result.scalar_one_or_none()
            
            if not current_token:
                return TokenRotationResult(
                    success=False,
                    error_code="TOKEN_NOT_FOUND",
                    message="Refresh token not found or already used"
                )
            
            # Verify token hash
            if not SecurityUtils.verify_password(refresh_token, current_token.token_hash):
                # Potential token theft - revoke entire family
                await self._revoke_token_family(family_id, db, "INVALID_TOKEN_USED")
                logger.warning(
                    f"Invalid refresh token used - family revoked",
                    extra={
                        "user_id": user_id,
                        "family_id": family_id,
                        "request_info": request_info
                    }
                )
                return TokenRotationResult(
                    success=False,
                    error_code="TOKEN_FAMILY_COMPROMISED",
                    message="Token family compromised and revoked"
                )
            
            # Check if token is expired
            if current_token.expires_at < datetime.utcnow():
                await self._mark_token_expired(current_token.id, db)
                return TokenRotationResult(
                    success=False,
                    error_code="REFRESH_TOKEN_EXPIRED",
                    message="Refresh token has expired"
                )
            
            # Get user for new token generation
            user_result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            
            if not user or not user.is_active:
                return TokenRotationResult(
                    success=False,
                    error_code="USER_INACTIVE",
                    message="User account is not active"
                )
            
            # Mark current token as rotated
            await db.execute(
                update(RefreshToken)
                .where(RefreshToken.id == current_token.id)
                .values(status=TokenStatus.ROTATED, rotated_at=datetime.utcnow())
            )
            
            # Generate new tokens
            new_access_token = self.jwt_manager.create_access_token(
                subject=str(user.id),
                extra_claims={
                    "family_id": family_id,
                    "role": user.role.value,
                    "org_id": str(user.organization_id) if user.organization_id else None
                }
            )
            
            new_refresh_token = self.jwt_manager.create_refresh_token(
                subject=str(user.id),
                extra_claims={"family_id": family_id}
            )
            
            # Create new refresh token record
            new_refresh_record = RefreshToken(
                id=uuid.uuid4(),
                family_id=uuid.UUID(family_id),
                user_id=user.id,
                token_hash=SecurityUtils.get_password_hash(new_refresh_token),
                status=TokenStatus.ACTIVE,
                expires_at=datetime.utcnow() + timedelta(days=30),
                created_at=datetime.utcnow(),
                rotated_from_id=current_token.id
            )
            
            db.add(new_refresh_record)
            
            # Update family last used timestamp
            await db.execute(
                update(TokenFamily)
                .where(TokenFamily.id == uuid.UUID(family_id))
                .values(last_used=datetime.utcnow())
            )
            
            await db.commit()
            
            # Update cache
            await self._cache_family_info(family_id, user.id, True)
            
            logger.info(
                f"Token rotated successfully",
                extra={
                    "user_id": user.id,
                    "family_id": family_id,
                    "old_token_id": current_token.id,
                    "new_token_id": new_refresh_record.id
                }
            )
            
            return TokenRotationResult(
                success=True,
                access_token=new_access_token,
                refresh_token=new_refresh_token,
                expires_in=3600,
                family_id=family_id
            )
            
        except Exception as e:
            logger.error(f"Token rotation failed: {e}")
            await db.rollback()
            return TokenRotationResult(
                success=False,
                error_code="TOKEN_ROTATION_FAILED",
                message="Failed to rotate tokens"
            )
    
    async def revoke_token_family(
        self, 
        family_id: str, 
        db: AsyncSession,
        reason: str = "USER_LOGOUT"
    ) -> bool:
        """
        Revoke entire token family (logout from all devices in family).
        
        Args:
            family_id: Token family ID
            db: Database session
            reason: Reason for revocation
            
        Returns:
            True if successful, False otherwise
        """
        return await self._revoke_token_family(family_id, db, reason)
    
    async def revoke_all_user_tokens(
        self, 
        user_id: uuid.UUID, 
        db: AsyncSession,
        reason: str = "SECURITY_BREACH"
    ) -> bool:
        """
        Revoke all token families for a user (logout from all devices).
        
        Args:
            user_id: User ID
            db: Database session
            reason: Reason for revocation
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get all active families for user
            result = await db.execute(
                select(TokenFamily)
                .where(TokenFamily.user_id == user_id)
                .where(TokenFamily.is_active == True)
            )
            families = result.scalars().all()
            
            for family in families:
                await self._revoke_token_family(str(family.id), db, reason)
            
            logger.warning(
                f"All user tokens revoked",
                extra={
                    "user_id": user_id,
                    "families_revoked": len(families),
                    "reason": reason
                }
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to revoke all user tokens: {e}")
            return False
    
    async def cleanup_expired_tokens(self, db: AsyncSession) -> int:
        """
        Clean up expired tokens and inactive families.
        
        Args:
            db: Database session
            
        Returns:
            Number of tokens cleaned up
        """
        try:
            current_time = datetime.utcnow()
            
            # Mark expired refresh tokens
            expired_result = await db.execute(
                update(RefreshToken)
                .where(RefreshToken.expires_at < current_time)
                .where(RefreshToken.status == TokenStatus.ACTIVE)
                .values(status=TokenStatus.EXPIRED)
            )
            
            # Delete old rotated/expired tokens (older than 7 days)
            cleanup_date = current_time - timedelta(days=7)
            delete_result = await db.execute(
                delete(RefreshToken)
                .where(RefreshToken.created_at < cleanup_date)
                .where(RefreshToken.status.in_([TokenStatus.ROTATED, TokenStatus.EXPIRED]))
            )
            
            # Deactivate families with no active tokens
            await db.execute(
                update(TokenFamily)
                .where(
                    ~TokenFamily.id.in_(
                        select(RefreshToken.family_id)
                        .where(RefreshToken.status == TokenStatus.ACTIVE)
                    )
                )
                .values(is_active=False)
            )
            
            await db.commit()
            
            tokens_cleaned = expired_result.rowcount + delete_result.rowcount
            
            logger.info(f"Token cleanup completed: {tokens_cleaned} tokens processed")
            
            return tokens_cleaned
            
        except Exception as e:
            logger.error(f"Token cleanup failed: {e}")
            await db.rollback()
            return 0
    
    async def _revoke_token_family(
        self, 
        family_id: str, 
        db: AsyncSession, 
        reason: str
    ) -> bool:
        """Revoke entire token family."""
        try:
            # Mark all active tokens in family as revoked
            await db.execute(
                update(RefreshToken)
                .where(RefreshToken.family_id == uuid.UUID(family_id))
                .where(RefreshToken.status == TokenStatus.ACTIVE)
                .values(status=TokenStatus.REVOKED, revoked_at=datetime.utcnow())
            )
            
            # Deactivate family
            await db.execute(
                update(TokenFamily)
                .where(TokenFamily.id == uuid.UUID(family_id))
                .values(is_active=False, revoked_at=datetime.utcnow())
            )
            
            await db.commit()
            
            # Remove from cache
            await self._remove_family_from_cache(family_id)
            
            logger.warning(
                f"Token family revoked",
                extra={
                    "family_id": family_id,
                    "reason": reason
                }
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to revoke token family: {e}")
            await db.rollback()
            return False
    
    async def _mark_token_expired(self, token_id: uuid.UUID, db: AsyncSession) -> None:
        """Mark a specific token as expired."""
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.id == token_id)
            .values(status=TokenStatus.EXPIRED)
        )
        await db.commit()
    
    async def _is_family_active(self, family_id: str) -> bool:
        """Check if token family is active (cached)."""
        cache_key = f"{self.cache_prefix}family:{family_id}"
        cached_status = await CacheService.get(cache_key)
        
        if cached_status is not None:
            return cached_status.get("active", False)
        
        # If not cached, it might be expired or we need to check database
        return False
    
    async def _cache_family_info(
        self, 
        family_id: str, 
        user_id: uuid.UUID, 
        active: bool
    ) -> None:
        """Cache token family information."""
        cache_key = f"{self.cache_prefix}family:{family_id}"
        cache_data = {
            "user_id": str(user_id),
            "active": active,
            "cached_at": datetime.utcnow().isoformat()
        }
        await CacheService.set(cache_key, cache_data, expire=self.family_cache_ttl)
    
    async def _remove_family_from_cache(self, family_id: str) -> None:
        """Remove token family from cache."""
        cache_key = f"{self.cache_prefix}family:{family_id}"
        await CacheService.delete(cache_key)


# Global instance
token_rotation_manager = TokenRotationManager()