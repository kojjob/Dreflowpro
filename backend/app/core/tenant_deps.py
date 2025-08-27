"""
Tenant-aware dependency injection for multi-tenant operations.
"""

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_session
from app.core.deps import get_current_user
from app.core.tenant_middleware import TenantContextManager
from app.models.user import User
from app.models.tenant import Tenant
from app.services.tenant_service import TenantService


async def get_current_tenant(request: Request) -> Optional[Tenant]:
    """
    Get current tenant from request context.
    """
    return TenantContextManager.get_current_tenant(request)


async def require_tenant(request: Request) -> Tenant:
    """
    Require tenant context, raise error if not available.
    """
    tenant = await get_current_tenant(request)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant context required for this operation"
        )
    return tenant


async def get_tenant_for_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
) -> Optional[Tenant]:
    """
    Get tenant for current authenticated user.
    """
    if not current_user.tenant_id:
        return None
    
    return await TenantService.get_tenant_by_id(current_user.tenant_id, db)


async def require_tenant_for_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
) -> Tenant:
    """
    Require tenant for current authenticated user.
    """
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a tenant"
        )
    
    tenant = await TenantService.get_tenant_by_id(current_user.tenant_id, db)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User's tenant not found"
        )
    
    if not tenant.is_active or tenant.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant is inactive or suspended"
        )
    
    return tenant


async def check_tenant_feature(
    feature_name: str,
    request: Request = None,
    tenant: Tenant = None
) -> bool:
    """
    Check if tenant has specific feature enabled.
    """
    if request:
        return TenantContextManager.check_tenant_feature(request, feature_name)
    elif tenant:
        feature_flags = tenant.get_feature_flags()
        return feature_flags.get(feature_name, False)
    else:
        raise ValueError("Either request or tenant must be provided")


def require_tenant_feature(feature_name: str):
    """
    Dependency factory to require specific tenant feature.
    """
    async def _require_feature(request: Request):
        if not TenantContextManager.check_tenant_feature(request, feature_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Feature '{feature_name}' not available for your plan"
            )
        return True
    
    return _require_feature


async def get_tenant_quota_status(
    tenant: Tenant = Depends(require_tenant_for_user),
    db: AsyncSession = Depends(get_session)
) -> dict:
    """
    Get current tenant quota usage status.
    """
    return await TenantService.check_quota_limits(tenant.id, db)


def require_quota_availability(resource_type: str):
    """
    Dependency factory to check quota availability before operations.
    """
    async def _check_quota(
        tenant: Tenant = Depends(require_tenant_for_user),
        db: AsyncSession = Depends(get_session)
    ):
        quota_status = await TenantService.check_quota_limits(tenant.id, db)
        
        if quota_status.get("error"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to check quota limits"
            )
        
        quota_field = f"{resource_type}_exceeded"
        if quota_status.get(quota_field, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quota exceeded for {resource_type}. Please upgrade your plan."
            )
        
        return tenant
    
    return _check_quota


async def track_tenant_usage(
    usage_type: str,
    resource_name: Optional[str] = None,
    quantity: int = 1,
    metadata: Optional[dict] = None,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_session)
):
    """
    Track tenant resource usage for billing and analytics.
    """
    if tenant:
        try:
            await TenantService.update_tenant_usage(
                tenant_id=tenant.id,
                usage_type=usage_type,
                resource_name=resource_name,
                quantity=quantity,
                metadata=metadata or {},
                db=db
            )
        except Exception as e:
            # Log error but don't fail the request
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to track tenant usage: {e}")


class TenantFeatureGate:
    """
    Feature gate decorator for tenant-specific functionality.
    """
    
    def __init__(self, feature_name: str, error_message: Optional[str] = None):
        self.feature_name = feature_name
        self.error_message = error_message or f"Feature '{feature_name}' not available"
    
    def __call__(self, func):
        async def wrapper(*args, **kwargs):
            # Extract request from function arguments
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            # Check if we have tenant context
            if request and not TenantContextManager.check_tenant_feature(request, self.feature_name):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=self.error_message
                )
            
            return await func(*args, **kwargs)
        
        return wrapper


# Pre-configured dependency functions for common features
require_api_access = require_tenant_feature("api_access")
require_advanced_analytics = require_tenant_feature("advanced_analytics") 
require_real_time_streaming = require_tenant_feature("real_time_streaming")
require_custom_connectors = require_tenant_feature("custom_connectors")
require_white_labeling = require_tenant_feature("white_labeling")
require_sso_integration = require_tenant_feature("sso_integration")
require_audit_logs = require_tenant_feature("audit_logs")

# Pre-configured quota checkers
require_user_quota = require_quota_availability("users")
require_pipeline_quota = require_quota_availability("pipelines")
require_connector_quota = require_quota_availability("connectors")