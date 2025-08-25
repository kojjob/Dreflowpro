"""
Tenant management service for multi-tenant enterprise features.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import uuid
import logging

from app.models.tenant import Tenant, TenantApiKey, TenantUsageLog, TenantInvitation
from app.models.user import User
from app.models.pipeline import ETLPipeline
from app.models.connector import DataConnector
from app.core.security import generate_api_key, hash_api_key
from app.core.cache_manager import cache_manager

logger = logging.getLogger(__name__)


class TenantService:
    """Service class for tenant management operations."""

    @staticmethod
    async def create_tenant(
        tenant_data: Dict[str, Any],
        db: AsyncSession
    ) -> Tenant:
        """Create a new tenant with default configuration."""
        try:
            # Generate unique slug if not provided
            if not tenant_data.get('slug'):
                base_slug = tenant_data['name'].lower().replace(' ', '-')
                tenant_data['slug'] = await TenantService._generate_unique_slug(base_slug, db)
            
            # Set default branding config
            default_branding = {
                "primary_color": "#2563eb",
                "secondary_color": "#64748b",
                "company_name": tenant_data['name']
            }
            tenant_data['branding_config'] = tenant_data.get('branding_config', default_branding)
            
            # Set default feature flags based on plan
            plan_type = tenant_data.get('plan_type', 'starter')
            tenant_data['feature_flags'] = TenantService._get_default_features(plan_type)
            
            tenant = Tenant(**tenant_data)
            db.add(tenant)
            await db.commit()
            await db.refresh(tenant)
            
            # Clear tenant cache
            await TenantService._clear_tenant_cache(tenant.id)
            
            logger.info(f"Created tenant: {tenant.name} ({tenant.slug})")
            return tenant
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating tenant: {e}")
            raise

    @staticmethod
    async def get_tenant_by_id(tenant_id: str, db: AsyncSession) -> Optional[Tenant]:
        """Get tenant by ID with caching."""
        cache_key = f"tenant:{tenant_id}"
        
        # Try cache first
        try:
            cached_tenant = await cache_manager.get(cache_key)
            if cached_tenant:
                return cached_tenant
        except Exception:
            pass  # Cache miss or error, continue to database
        
        # Get from database
        tenant = await db.get(Tenant, tenant_id)
        if tenant:
            # Cache for 15 minutes
            try:
                await cache_manager.set(cache_key, tenant, l1_ttl=900, l2_ttl=3600)
            except Exception:
                pass  # Cache error, continue without caching
        
        return tenant

    @staticmethod
    async def get_tenant_by_slug(slug: str, db: AsyncSession) -> Optional[Tenant]:
        """Get tenant by slug with caching."""
        cache_key = f"tenant:slug:{slug}"
        
        # Try cache first
        try:
            cached_tenant = await cache_manager.get(cache_key)
            if cached_tenant:
                return cached_tenant
        except Exception:
            pass
        
        # Get from database
        result = await db.execute(select(Tenant).where(Tenant.slug == slug))
        tenant = result.scalar_one_or_none()
        
        if tenant:
            try:
                await cache_manager.set(cache_key, tenant, l1_ttl=900, l2_ttl=3600)
            except Exception:
                pass
        
        return tenant

    @staticmethod
    async def update_tenant_usage(
        tenant_id: str,
        usage_type: str,
        resource_name: Optional[str] = None,
        quantity: int = 1,
        metadata: Optional[Dict[str, Any]] = None,
        db: AsyncSession = None
    ) -> TenantUsageLog:
        """Record tenant resource usage for billing and quota tracking."""
        try:
            current_period = datetime.now().strftime("%Y-%m")
            
            usage_log = TenantUsageLog(
                tenant_id=tenant_id,
                usage_type=usage_type,
                resource_name=resource_name,
                quantity=quantity,
                usage_metadata=metadata or {},
                billing_period=current_period
            )
            
            if db:
                db.add(usage_log)
                await db.commit()
                await db.refresh(usage_log)
            
            # Clear usage cache for this tenant
            await TenantService._clear_usage_cache(tenant_id)
            
            logger.debug(f"Recorded usage: {usage_type} for tenant {tenant_id}")
            return usage_log
            
        except Exception as e:
            if db:
                await db.rollback()
            logger.error(f"Error recording tenant usage: {e}")
            raise

    @staticmethod
    async def check_quota_limits(tenant_id: str, db: AsyncSession) -> Dict[str, bool]:
        """Check if tenant has exceeded any quota limits."""
        try:
            tenant = await TenantService.get_tenant_by_id(tenant_id, db)
            if not tenant:
                return {"error": True}
            
            # Get current usage
            user_count = await db.scalar(
                select(func.count(User.id)).where(User.tenant_id == tenant_id)
            ) or 0
            
            pipeline_count = await db.scalar(
                select(func.count(ETLPipeline.id)).where(ETLPipeline.tenant_id == tenant_id)
            ) or 0
            
            connector_count = await db.scalar(
                select(func.count(DataConnector.id)).where(DataConnector.tenant_id == tenant_id)
            ) or 0
            
            # Get API usage for current month
            current_period = datetime.now().strftime("%Y-%m")
            api_usage = await db.scalar(
                select(func.coalesce(func.sum(TenantUsageLog.quantity), 0))
                .where(TenantUsageLog.tenant_id == tenant_id)
                .where(TenantUsageLog.usage_type == "api_call")
                .where(TenantUsageLog.billing_period == current_period)
            ) or 0
            
            # Check limits
            return {
                "users_exceeded": user_count >= tenant.max_users,
                "pipelines_exceeded": pipeline_count >= tenant.max_pipelines,
                "api_calls_exceeded": api_usage >= tenant.max_api_calls_monthly,
                "current_usage": {
                    "users": user_count,
                    "pipelines": pipeline_count,
                    "connectors": connector_count,
                    "api_calls": api_usage
                },
                "limits": {
                    "max_users": tenant.max_users,
                    "max_pipelines": tenant.max_pipelines,
                    "max_api_calls_monthly": tenant.max_api_calls_monthly
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking quota limits for tenant {tenant_id}: {e}")
            return {"error": True}

    @staticmethod
    async def create_tenant_api_key(
        tenant_id: str,
        key_name: str,
        permissions: List[str] = None,
        expires_at: Optional[datetime] = None,
        rate_limit_override: Optional[int] = None,
        db: AsyncSession = None
    ) -> tuple[TenantApiKey, str]:
        """Create a new API key for a tenant."""
        try:
            # Generate API key
            api_key_plain, api_key_hash = generate_api_key()
            
            # Create API key record
            tenant_api_key = TenantApiKey(
                tenant_id=tenant_id,
                key_name=key_name,
                api_key_hash=api_key_hash,
                permissions=permissions or [],
                rate_limit_override=rate_limit_override,
                expires_at=expires_at
            )
            
            if db:
                db.add(tenant_api_key)
                await db.commit()
                await db.refresh(tenant_api_key)
            
            logger.info(f"Created API key '{key_name}' for tenant {tenant_id}")
            return tenant_api_key, api_key_plain
            
        except Exception as e:
            if db:
                await db.rollback()
            logger.error(f"Error creating tenant API key: {e}")
            raise

    @staticmethod
    async def validate_tenant_api_key(
        api_key: str,
        db: AsyncSession
    ) -> Optional[TenantApiKey]:
        """Validate tenant API key and return key info if valid."""
        try:
            api_key_hash = hash_api_key(api_key)
            
            result = await db.execute(
                select(TenantApiKey)
                .where(TenantApiKey.api_key_hash == api_key_hash)
                .where(TenantApiKey.is_active == True)
            )
            tenant_key = result.scalar_one_or_none()
            
            if tenant_key:
                # Check expiration
                if tenant_key.expires_at and tenant_key.expires_at < datetime.utcnow():
                    return None
                
                # Update usage stats
                tenant_key.last_used_at = datetime.utcnow()
                tenant_key.usage_count += 1
                await db.commit()
                
                return tenant_key
            
            return None
            
        except Exception as e:
            logger.error(f"Error validating tenant API key: {e}")
            return None

    @staticmethod
    async def create_tenant_invitation(
        tenant_id: str,
        email: str,
        invited_by: str,
        role: str = "member",
        expires_in_days: int = 7,
        db: AsyncSession = None
    ) -> TenantInvitation:
        """Create an invitation for a user to join a tenant."""
        try:
            # Generate unique invitation token
            invitation_token = str(uuid.uuid4())
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
            
            invitation = TenantInvitation(
                tenant_id=tenant_id,
                email=email,
                invited_by=invited_by,
                role=role,
                invitation_token=invitation_token,
                expires_at=expires_at
            )
            
            if db:
                db.add(invitation)
                await db.commit()
                await db.refresh(invitation)
            
            # TODO: Send invitation email
            
            logger.info(f"Created invitation for {email} to tenant {tenant_id}")
            return invitation
            
        except Exception as e:
            if db:
                await db.rollback()
            logger.error(f"Error creating tenant invitation: {e}")
            raise

    @staticmethod
    async def accept_tenant_invitation(
        invitation_token: str,
        user_id: str,
        db: AsyncSession
    ) -> Optional[TenantInvitation]:
        """Accept a tenant invitation and add user to tenant."""
        try:
            # Find invitation
            result = await db.execute(
                select(TenantInvitation)
                .where(TenantInvitation.invitation_token == invitation_token)
                .where(TenantInvitation.status == "pending")
            )
            invitation = result.scalar_one_or_none()
            
            if not invitation:
                return None
            
            # Check expiration
            if invitation.expires_at and invitation.expires_at < datetime.utcnow():
                invitation.status = "expired"
                await db.commit()
                return None
            
            # Add user to tenant
            user = await db.get(User, user_id)
            if user:
                user.tenant_id = invitation.tenant_id
                invitation.status = "accepted"
                invitation.accepted_at = datetime.utcnow()
                
                await db.commit()
                
                # Clear user cache
                await TenantService._clear_user_cache(user_id)
                
                logger.info(f"User {user_id} accepted invitation to tenant {invitation.tenant_id}")
                return invitation
            
            return None
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error accepting tenant invitation: {e}")
            raise

    # Helper methods

    @staticmethod
    async def _generate_unique_slug(base_slug: str, db: AsyncSession) -> str:
        """Generate a unique slug for a tenant."""
        slug = base_slug
        counter = 1
        
        while True:
            result = await db.execute(select(Tenant).where(Tenant.slug == slug))
            if not result.scalar_one_or_none():
                return slug
            
            slug = f"{base_slug}-{counter}"
            counter += 1

    @staticmethod
    def _get_default_features(plan_type: str) -> Dict[str, bool]:
        """Get default feature flags for a plan type."""
        features = {
            "starter": {
                "advanced_analytics": False,
                "real_time_streaming": False,
                "custom_connectors": False,
                "api_access": False,
                "priority_support": False,
                "white_labeling": False,
                "sso_integration": False,
                "audit_logs": False,
            },
            "professional": {
                "advanced_analytics": True,
                "real_time_streaming": True,
                "custom_connectors": False,
                "api_access": True,
                "priority_support": True,
                "white_labeling": False,
                "sso_integration": False,
                "audit_logs": True,
            },
            "enterprise": {
                "advanced_analytics": True,
                "real_time_streaming": True,
                "custom_connectors": True,
                "api_access": True,
                "priority_support": True,
                "white_labeling": True,
                "sso_integration": True,
                "audit_logs": True,
            }
        }
        
        return features.get(plan_type, features["starter"])

    @staticmethod
    async def _clear_tenant_cache(tenant_id: str):
        """Clear tenant-related cache entries."""
        cache_keys = [
            f"tenant:{tenant_id}",
            f"tenant:usage:{tenant_id}",
            f"tenant:features:{tenant_id}"
        ]
        
        try:
            for key in cache_keys:
                await cache_manager.delete(key)
        except Exception:
            pass  # Cache errors shouldn't break functionality

    @staticmethod
    async def _clear_usage_cache(tenant_id: str):
        """Clear usage-related cache entries."""
        try:
            await cache_manager.delete(f"tenant:usage:{tenant_id}")
        except Exception:
            pass

    @staticmethod
    async def _clear_user_cache(user_id: str):
        """Clear user-related cache entries."""
        try:
            await cache_manager.delete(f"user:{user_id}")
        except Exception:
            pass