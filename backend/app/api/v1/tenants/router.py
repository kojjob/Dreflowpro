"""
Multi-tenant management API endpoints for enterprise features.
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.tenant import Tenant, TenantApiKey, TenantUsageLog, TenantInvitation
from app.schemas.tenant import (
    TenantCreate, TenantUpdate, TenantResponse, TenantListResponse,
    TenantApiKeyCreate, TenantApiKeyResponse, TenantInvitationCreate,
    TenantUsageResponse, BrandingConfigUpdate
)
from app.services.tenant_service import TenantService
from app.core.security import verify_api_key
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# Tenant Management Endpoints

@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new tenant organization.
    
    Only admin users can create new tenants.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can create tenants"
        )
    
    try:
        # Check if slug already exists
        existing_tenant = await db.execute(
            select(Tenant).where(Tenant.slug == tenant_data.slug)
        )
        if existing_tenant.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant with this slug already exists"
            )
        
        # Create tenant
        tenant = Tenant(
            name=tenant_data.name,
            slug=tenant_data.slug,
            plan_type=tenant_data.plan_type,
            contact_email=tenant_data.contact_email,
            contact_name=tenant_data.contact_name,
            max_users=tenant_data.max_users,
            max_pipelines=tenant_data.max_pipelines,
            max_data_size_gb=tenant_data.max_data_size_gb,
            max_api_calls_monthly=tenant_data.max_api_calls_monthly
        )
        
        db.add(tenant)
        await db.commit()
        await db.refresh(tenant)
        
        logger.info(f"Created new tenant: {tenant.name} ({tenant.slug})")
        return TenantResponse.model_validate(tenant)
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating tenant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create tenant"
        )


@router.get("/", response_model=List[TenantListResponse])
async def list_tenants(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all tenants.
    
    Admin users can see all tenants.
    Regular users can only see their own tenant.
    """
    try:
        if current_user.role == "admin":
            # Admin can see all tenants
            query = select(Tenant)
            if active_only:
                query = query.where(Tenant.is_active == True)
            query = query.offset(skip).limit(limit)
            
        else:
            # Regular users can only see their own tenant
            if not current_user.tenant_id:
                return []
            
            query = select(Tenant).where(Tenant.id == current_user.tenant_id)
            if active_only:
                query = query.where(Tenant.is_active == True)
        
        result = await db.execute(query)
        tenants = result.scalars().all()
        
        return [TenantListResponse.model_validate(tenant) for tenant in tenants]
        
    except Exception as e:
        logger.error(f"Error listing tenants: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tenants"
        )


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get tenant details by ID.
    
    Users can only access their own tenant unless they're admin.
    """
    try:
        # Check access permissions
        if current_user.role != "admin" and current_user.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this tenant"
            )
        
        tenant = await db.get(Tenant, tenant_id)
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        return TenantResponse.model_validate(tenant)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tenant"
        )


@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    tenant_data: TenantUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update tenant information.
    
    Admin users can update any tenant.
    Tenant owners can update their own tenant.
    """
    try:
        tenant = await db.get(Tenant, tenant_id)
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Check permissions
        if current_user.role != "admin" and current_user.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to update this tenant"
            )
        
        # Update tenant fields
        update_data = tenant_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(tenant, field, value)
        
        await db.commit()
        await db.refresh(tenant)
        
        logger.info(f"Updated tenant: {tenant.name} ({tenant.slug})")
        return TenantResponse.model_validate(tenant)
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tenant"
        )


# Branding and White-labeling Endpoints

@router.put("/{tenant_id}/branding", response_model=TenantResponse)
async def update_tenant_branding(
    tenant_id: str,
    branding_config: BrandingConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update tenant branding configuration for white-labeling.
    
    Only available for enterprise plans.
    """
    try:
        tenant = await db.get(Tenant, tenant_id)
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Check permissions and plan
        if current_user.role != "admin" and current_user.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to update tenant branding"
            )
        
        feature_flags = tenant.get_feature_flags()
        if not feature_flags.get("white_labeling", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="White-labeling not available for this plan"
            )
        
        # Update branding configuration
        current_branding = tenant.branding_config or {}
        updated_branding = {**current_branding, **branding_config.model_dump(exclude_unset=True)}
        tenant.branding_config = updated_branding
        
        await db.commit()
        await db.refresh(tenant)
        
        logger.info(f"Updated branding for tenant: {tenant.name}")
        return TenantResponse.model_validate(tenant)
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating tenant branding {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tenant branding"
        )


# Usage and Quota Management

@router.get("/{tenant_id}/usage", response_model=TenantUsageResponse)
async def get_tenant_usage(
    tenant_id: str,
    period: str = "current",  # current, last_month
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get tenant usage statistics and quota information.
    """
    try:
        tenant = await db.get(Tenant, tenant_id)
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Check permissions
        if current_user.role != "admin" and current_user.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to tenant usage data"
            )
        
        # Get current usage
        current_usage = tenant.current_usage
        
        # Get usage logs for the period
        if period == "current":
            billing_period = datetime.now().strftime("%Y-%m")
        else:
            billing_period = (datetime.now() - timedelta(days=30)).strftime("%Y-%m")
        
        usage_logs = await db.execute(
            select(TenantUsageLog)
            .where(TenantUsageLog.tenant_id == tenant_id)
            .where(TenantUsageLog.billing_period == billing_period)
        )
        logs = usage_logs.scalars().all()
        
        # Aggregate usage by type
        usage_by_type = {}
        for log in logs:
            if log.usage_type not in usage_by_type:
                usage_by_type[log.usage_type] = 0
            usage_by_type[log.usage_type] += log.quantity
        
        return TenantUsageResponse(
            tenant_id=tenant_id,
            period=period,
            billing_period=billing_period,
            current_usage=current_usage,
            usage_by_type=usage_by_type,
            quotas={
                "max_users": tenant.max_users,
                "max_pipelines": tenant.max_pipelines,
                "max_data_size_gb": tenant.max_data_size_gb,
                "max_api_calls_monthly": tenant.max_api_calls_monthly
            },
            quota_exceeded={
                "users": tenant.is_quota_exceeded("users"),
                "pipelines": tenant.is_quota_exceeded("pipelines")
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tenant usage {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tenant usage"
        )


# API Key Management for Tenants

@router.post("/{tenant_id}/api-keys", response_model=TenantApiKeyResponse)
async def create_tenant_api_key(
    tenant_id: str,
    api_key_data: TenantApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new API key scoped to a tenant.
    """
    try:
        tenant = await db.get(Tenant, tenant_id)
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Check permissions
        if current_user.role != "admin" and current_user.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to create API keys for this tenant"
            )
        
        # Check if API access is enabled for this tenant
        feature_flags = tenant.get_feature_flags()
        if not feature_flags.get("api_access", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="API access not available for this plan"
            )
        
        # Generate API key
        from app.core.security import generate_api_key, hash_api_key
        api_key_plain, api_key_hash = generate_api_key()
        
        # Create API key record
        tenant_api_key = TenantApiKey(
            tenant_id=tenant_id,
            key_name=api_key_data.key_name,
            api_key_hash=api_key_hash,
            permissions=api_key_data.permissions or [],
            rate_limit_override=api_key_data.rate_limit_override,
            expires_at=api_key_data.expires_at
        )
        
        db.add(tenant_api_key)
        await db.commit()
        await db.refresh(tenant_api_key)
        
        logger.info(f"Created API key for tenant {tenant_id}: {api_key_data.key_name}")
        
        # Return response with plain API key (only shown once)
        response_data = TenantApiKeyResponse.model_validate(tenant_api_key)
        response_data.api_key = api_key_plain  # Include plain key in response
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating tenant API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create API key"
        )


@router.get("/{tenant_id}/api-keys", response_model=List[TenantApiKeyResponse])
async def list_tenant_api_keys(
    tenant_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List API keys for a tenant.
    """
    try:
        tenant = await db.get(Tenant, tenant_id)
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Check permissions
        if current_user.role != "admin" and current_user.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to tenant API keys"
            )
        
        api_keys = await db.execute(
            select(TenantApiKey)
            .where(TenantApiKey.tenant_id == tenant_id)
            .where(TenantApiKey.is_active == True)
        )
        keys = api_keys.scalars().all()
        
        return [TenantApiKeyResponse.model_validate(key) for key in keys]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing tenant API keys: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve API keys"
        )


@router.delete("/{tenant_id}/api-keys/{key_id}")
async def revoke_tenant_api_key(
    tenant_id: str,
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke (deactivate) a tenant API key.
    """
    try:
        # Check permissions
        if current_user.role != "admin" and current_user.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to revoke API keys for this tenant"
            )
        
        api_key = await db.get(TenantApiKey, key_id)
        if not api_key or api_key.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        api_key.is_active = False
        await db.commit()
        
        logger.info(f"Revoked API key {key_id} for tenant {tenant_id}")
        return {"message": "API key revoked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error revoking API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke API key"
        )