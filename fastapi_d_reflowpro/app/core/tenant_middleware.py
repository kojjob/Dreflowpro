"""
Tenant-aware middleware for multi-tenant request processing.
"""

import logging
from fastapi import HTTPException, status, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional

from app.core.database import get_session
from app.services.tenant_service import TenantService
from app.models.tenant import Tenant

logger = logging.getLogger(__name__)


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle tenant context and multi-tenant data isolation.
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.exempt_paths = [
            "/docs",
            "/redoc", 
            "/openapi.json",
            "/api/v1/auth",
            "/api/v1/monitoring/health",
            "/favicon.ico",
        ]
    
    async def dispatch(self, request: Request, call_next):
        """
        Process request with tenant context injection.
        """
        # Skip tenant processing for exempt paths
        if any(request.url.path.startswith(path) for path in self.exempt_paths):
            return await call_next(request)
        
        try:
            # Extract tenant information from request
            tenant = await self._extract_tenant(request)
            
            # Inject tenant into request state
            request.state.tenant = tenant
            request.state.tenant_id = tenant.id if tenant else None
            
            # Validate tenant permissions for the request
            if tenant and not await self._validate_tenant_access(tenant, request):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tenant access denied for this resource"
                )
            
            # Process request
            response = await call_next(request)
            
            # Add tenant headers to response
            if tenant:
                response.headers["X-Tenant-ID"] = tenant.id
                response.headers["X-Tenant-Plan"] = tenant.plan_type
            
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Tenant middleware error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Tenant processing error"
            )
    
    async def _extract_tenant(self, request: Request) -> Optional[Tenant]:
        """
        Extract tenant from request headers or API key.
        """
        # Try X-Tenant-ID header first
        tenant_id = request.headers.get("X-Tenant-ID")
        if tenant_id:
            return await self._get_tenant_by_id(tenant_id)
        
        # Try tenant slug from subdomain
        host = request.headers.get("host", "")
        if "." in host:
            subdomain = host.split(".")[0]
            if subdomain and subdomain != "www" and subdomain != "api":
                return await self._get_tenant_by_slug(subdomain)
        
        # Try API key for tenant-scoped requests
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return await self._get_tenant_by_api_key(api_key)
        
        # For authenticated users, get tenant from user context
        # This will be handled in the dependency injection layer
        return None
    
    async def _get_tenant_by_id(self, tenant_id: str) -> Optional[Tenant]:
        """Get tenant by ID."""
        try:
            async for db in get_session():
                tenant = await TenantService.get_tenant_by_id(tenant_id, db)
                if tenant and tenant.is_active and not tenant.is_suspended:
                    return tenant
                return None
        except Exception as e:
            logger.warning(f"Failed to get tenant by ID {tenant_id}: {e}")
            return None
    
    async def _get_tenant_by_slug(self, slug: str) -> Optional[Tenant]:
        """Get tenant by slug."""
        try:
            async for db in get_session():
                tenant = await TenantService.get_tenant_by_slug(slug, db)
                if tenant and tenant.is_active and not tenant.is_suspended:
                    return tenant
                return None
        except Exception as e:
            logger.warning(f"Failed to get tenant by slug {slug}: {e}")
            return None
    
    async def _get_tenant_by_api_key(self, api_key: str) -> Optional[Tenant]:
        """Get tenant by API key."""
        try:
            async for db in get_session():
                tenant_key = await TenantService.validate_tenant_api_key(api_key, db)
                if tenant_key and tenant_key.tenant:
                    return tenant_key.tenant
                return None
        except Exception as e:
            logger.warning(f"Failed to get tenant by API key: {e}")
            return None
    
    async def _validate_tenant_access(self, tenant: Tenant, request: Request) -> bool:
        """
        Validate tenant access to requested resource.
        """
        try:
            # Check if tenant is active and not suspended
            if not tenant.is_active or tenant.is_suspended:
                return False
            
            # Check feature flags for specific endpoints
            path = request.url.path
            feature_flags = tenant.get_feature_flags()
            
            # API access control
            if "/api/" in path and not feature_flags.get("api_access", False):
                return False
            
            # Advanced analytics access
            if "/analytics/" in path and not feature_flags.get("advanced_analytics", False):
                return False
            
            # White-labeling endpoints
            if "/tenants/" in path and "/branding" in path:
                if not feature_flags.get("white_labeling", False):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Tenant access validation error: {e}")
            return False


class TenantContextManager:
    """
    Utility class for managing tenant context within requests.
    """
    
    @staticmethod
    def get_current_tenant(request: Request) -> Optional[Tenant]:
        """Get current tenant from request state."""
        return getattr(request.state, "tenant", None)
    
    @staticmethod
    def get_current_tenant_id(request: Request) -> Optional[str]:
        """Get current tenant ID from request state."""
        return getattr(request.state, "tenant_id", None)
    
    @staticmethod
    def is_tenant_active(request: Request) -> bool:
        """Check if current tenant is active."""
        tenant = TenantContextManager.get_current_tenant(request)
        return tenant and tenant.is_active and not tenant.is_suspended
    
    @staticmethod
    def get_tenant_feature_flags(request: Request) -> dict:
        """Get current tenant's feature flags."""
        tenant = TenantContextManager.get_current_tenant(request)
        return tenant.get_feature_flags() if tenant else {}
    
    @staticmethod
    def check_tenant_feature(request: Request, feature_name: str) -> bool:
        """Check if tenant has specific feature enabled."""
        feature_flags = TenantContextManager.get_tenant_feature_flags(request)
        return feature_flags.get(feature_name, False)