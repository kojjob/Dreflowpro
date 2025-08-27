"""
Pydantic schemas for multi-tenant enterprise features.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime


class TenantBase(BaseModel):
    """Base tenant schema with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="Tenant organization name")
    slug: str = Field(..., min_length=3, max_length=100, pattern=r'^[a-z0-9-]+$', description="URL-friendly identifier")
    contact_email: Optional[str] = Field(None, max_length=255, description="Primary contact email")
    contact_name: Optional[str] = Field(None, max_length=255, description="Primary contact name")


class TenantCreate(TenantBase):
    """Schema for creating a new tenant."""
    plan_type: str = Field(default="starter", description="Subscription plan type")
    max_users: int = Field(default=5, ge=1, le=1000, description="Maximum number of users")
    max_pipelines: int = Field(default=10, ge=1, le=10000, description="Maximum number of pipelines")
    max_data_size_gb: int = Field(default=1, ge=1, le=10000, description="Maximum data storage in GB")
    max_api_calls_monthly: int = Field(default=10000, ge=1000, le=10000000, description="Monthly API call limit")

    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v):
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Slug must contain only letters, numbers, hyphens, and underscores')
        return v.lower()


class TenantUpdate(BaseModel):
    """Schema for updating tenant information."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_name: Optional[str] = Field(None, max_length=255)
    plan_type: Optional[str] = None
    is_active: Optional[bool] = None
    is_suspended: Optional[bool] = None
    max_users: Optional[int] = Field(None, ge=1, le=1000)
    max_pipelines: Optional[int] = Field(None, ge=1, le=10000)
    max_data_size_gb: Optional[int] = Field(None, ge=1, le=10000)
    max_api_calls_monthly: Optional[int] = Field(None, ge=1000, le=10000000)


class TenantResponse(TenantBase):
    """Schema for tenant API responses."""
    id: str
    plan_type: str
    is_active: bool
    is_suspended: bool
    max_users: int
    max_pipelines: int
    max_data_size_gb: int
    max_api_calls_monthly: int
    branding_config: Dict[str, Any]
    feature_flags: Dict[str, bool]
    current_usage: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj):
        """Custom validation to include computed properties."""
        if hasattr(obj, 'get_feature_flags'):
            obj.feature_flags = obj.get_feature_flags()
        if hasattr(obj, 'current_usage'):
            obj.current_usage = obj.current_usage
        if hasattr(obj, 'get_branding_config'):
            obj.branding_config = obj.get_branding_config()
        return super().model_validate(obj)


class TenantListResponse(BaseModel):
    """Simplified tenant schema for listing."""
    id: str
    name: str
    slug: str
    plan_type: str
    is_active: bool
    user_count: int
    pipeline_count: int
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj):
        """Custom validation to include usage counts."""
        usage = obj.current_usage if hasattr(obj, 'current_usage') else {}
        obj.user_count = usage.get('user_count', 0)
        obj.pipeline_count = usage.get('pipeline_count', 0)
        return super().model_validate(obj)


class BrandingConfigUpdate(BaseModel):
    """Schema for updating tenant branding configuration."""
    primary_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$', description="Primary brand color (hex)")
    secondary_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$', description="Secondary brand color (hex)")
    logo_url: Optional[str] = Field(None, max_length=500, description="URL to company logo")
    company_name: Optional[str] = Field(None, max_length=255, description="Custom company name")
    favicon_url: Optional[str] = Field(None, max_length=500, description="URL to favicon")
    custom_css: Optional[str] = Field(None, max_length=10000, description="Custom CSS styles")
    footer_text: Optional[str] = Field(None, max_length=500, description="Custom footer text")


class TenantUsageResponse(BaseModel):
    """Schema for tenant usage statistics."""
    tenant_id: str
    period: str
    billing_period: str
    current_usage: Dict[str, Any]
    usage_by_type: Dict[str, int]
    quotas: Dict[str, int]
    quota_exceeded: Dict[str, bool]


# API Key Management Schemas

class TenantApiKeyBase(BaseModel):
    """Base schema for tenant API keys."""
    key_name: str = Field(..., min_length=1, max_length=255, description="Descriptive name for the API key")
    permissions: Optional[List[str]] = Field(default=[], description="List of allowed operations")
    rate_limit_override: Optional[int] = Field(None, ge=0, description="Custom rate limit for this key")


class TenantApiKeyCreate(TenantApiKeyBase):
    """Schema for creating tenant API keys."""
    expires_at: Optional[datetime] = Field(None, description="Optional expiration date")


class TenantApiKeyResponse(TenantApiKeyBase):
    """Schema for API key responses."""
    id: str
    tenant_id: str
    api_key: Optional[str] = Field(None, description="Plain API key (only shown on creation)")
    is_active: bool
    last_used_at: Optional[datetime]
    usage_count: int
    created_at: datetime
    expires_at: Optional[datetime]

    model_config = {"from_attributes": True}


# Invitation Management Schemas

class TenantInvitationCreate(BaseModel):
    """Schema for creating tenant invitations."""
    email: str = Field(..., max_length=255, description="Email address to invite")
    role: str = Field(default="member", description="Role to assign to invited user")
    expires_in_days: int = Field(default=7, ge=1, le=30, description="Invitation expiration in days")


class TenantInvitationResponse(BaseModel):
    """Schema for invitation responses."""
    id: str
    tenant_id: str
    email: str
    role: str
    status: str
    invited_at: datetime
    expires_at: Optional[datetime]
    accepted_at: Optional[datetime]

    model_config = {"from_attributes": True}


# Usage Logging Schemas

class UsageLogCreate(BaseModel):
    """Schema for creating usage log entries."""
    usage_type: str = Field(..., description="Type of usage (api_call, pipeline_execution, etc.)")
    resource_name: Optional[str] = Field(None, description="Specific resource used")
    quantity: int = Field(default=1, ge=1, description="Amount consumed")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional usage context")


class UsageLogResponse(BaseModel):
    """Schema for usage log responses."""
    id: str
    tenant_id: str
    usage_type: str
    resource_name: Optional[str]
    quantity: int
    metadata: Dict[str, Any]
    recorded_at: datetime
    billing_period: str

    model_config = {"from_attributes": True}


# Feature Flag Schemas

class FeatureFlagsResponse(BaseModel):
    """Schema for tenant feature flags."""
    tenant_id: str
    plan_type: str
    features: Dict[str, bool]
    custom_flags: Dict[str, bool]


# Tenant Settings Schemas

class TenantSettingsUpdate(BaseModel):
    """Schema for updating tenant settings."""
    domain_config: Optional[Dict[str, Any]] = Field(None, description="Custom domain configuration")
    feature_flags: Optional[Dict[str, bool]] = Field(None, description="Custom feature flag overrides")
    notification_preferences: Optional[Dict[str, Any]] = Field(None, description="Notification settings")
    integration_config: Optional[Dict[str, Any]] = Field(None, description="Third-party integration settings")


class TenantSettingsResponse(BaseModel):
    """Schema for tenant settings responses."""
    tenant_id: str
    domain_config: Dict[str, Any]
    feature_flags: Dict[str, bool]
    notification_preferences: Dict[str, Any]
    integration_config: Dict[str, Any]
    updated_at: datetime

    model_config = {"from_attributes": True}