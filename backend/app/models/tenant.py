"""
Multi-tenant enterprise models for white-labeling and tenant isolation.
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from typing import Dict, Any, Optional
import uuid


class Tenant(Base):
    """
    Multi-tenant model for enterprise white-labeling.
    Each tenant represents a separate customer organization with isolated data.
    """
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)  # URL-friendly identifier
    
    # Subscription and billing
    plan_type = Column(String(50), default="starter")  # starter, professional, enterprise
    is_active = Column(Boolean, default=True)
    is_suspended = Column(Boolean, default=False)
    
    # White-labeling configuration
    branding_config = Column(JSON, default=dict)  # Custom branding, colors, logos
    domain_config = Column(JSON, default=dict)    # Custom domains, subdomains
    feature_flags = Column(JSON, default=dict)    # Feature toggles per tenant
    
    # Limits and quotas
    max_users = Column(Integer, default=5)
    max_pipelines = Column(Integer, default=10)
    max_data_size_gb = Column(Integer, default=1)
    max_api_calls_monthly = Column(Integer, default=10000)
    
    # Contact information
    contact_email = Column(String(255))
    contact_name = Column(String(255))
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Note: This model is for enterprise multi-tenancy features
    # Currently using Organization-based tenancy in User model

    def __repr__(self):
        return f"<Tenant {self.name} ({self.slug})>"

    @property
    def current_usage(self) -> Dict[str, Any]:
        """Calculate current usage statistics for quota monitoring.
        Note: This would need to be implemented with proper database queries
        since relationships are not available.
        """
        return {
            "user_count": 0,  # Would need database query
            "pipeline_count": 0,  # Would need database query
            "active_pipelines": 0,  # Would need database query
        }

    def is_quota_exceeded(self, resource_type: str) -> bool:
        """Check if tenant has exceeded quotas for specific resource."""
        usage = self.current_usage
        
        if resource_type == "users":
            return usage["user_count"] >= self.max_users
        elif resource_type == "pipelines":
            return usage["pipeline_count"] >= self.max_pipelines
        
        return False

    def get_branding_config(self) -> Dict[str, Any]:
        """Get tenant-specific branding configuration with defaults."""
        default_config = {
            "primary_color": "#2563eb",
            "secondary_color": "#64748b", 
            "logo_url": None,
            "company_name": self.name,
            "favicon_url": None,
            "custom_css": None,
            "footer_text": None,
        }
        
        if self.branding_config:
            default_config.update(self.branding_config)
            
        return default_config

    def get_feature_flags(self) -> Dict[str, bool]:
        """Get tenant-specific feature flags based on plan and configuration."""
        # Default features by plan type
        plan_features = {
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
        
        features = plan_features.get(self.plan_type, plan_features["starter"])
        
        # Override with tenant-specific feature flags
        if self.feature_flags:
            features.update(self.feature_flags)
            
        return features


class TenantApiKey(Base):
    """
    API keys scoped to specific tenants for multi-tenant API access.
    """
    __tablename__ = "tenant_api_keys"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, nullable=False, index=True)
    
    key_name = Column(String(255), nullable=False)
    api_key_hash = Column(String(255), nullable=False, unique=True)
    
    # Permissions and scoping
    permissions = Column(JSON, default=list)  # List of allowed operations
    rate_limit_override = Column(Integer)     # Custom rate limit for this key
    
    # Status
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime(timezone=True))
    usage_count = Column(Integer, default=0)
    
    # Audit fields  
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))

    def __repr__(self):
        return f"<TenantApiKey {self.key_name} (Tenant: {self.tenant_id})>"


class TenantUsageLog(Base):
    """
    Track tenant resource usage for billing and quota management.
    """
    __tablename__ = "tenant_usage_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, nullable=False, index=True)
    
    # Usage metrics
    usage_type = Column(String(50), nullable=False)  # api_call, pipeline_execution, data_processing
    resource_name = Column(String(255))              # Specific resource used
    quantity = Column(Integer, default=1)            # Amount consumed
    
    # Metadata
    usage_metadata = Column(JSON, default=dict)      # Additional usage context
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    billing_period = Column(String(20))              # YYYY-MM for monthly aggregation

    def __repr__(self):
        return f"<TenantUsageLog {self.usage_type} - {self.quantity}>"


class TenantInvitation(Base):
    """
    Invitation system for adding users to tenant organizations.
    """
    __tablename__ = "tenant_invitations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, nullable=False)
    
    email = Column(String(255), nullable=False)
    invited_by = Column(String)  # User ID who sent invitation
    role = Column(String(50), default="member")  # member, admin, owner
    
    # Status tracking
    status = Column(String(20), default="pending")  # pending, accepted, expired, revoked
    invitation_token = Column(String(255), unique=True)
    
    # Timestamps
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    accepted_at = Column(DateTime(timezone=True))

    def __repr__(self):
        return f"<TenantInvitation {self.email} -> {self.tenant_id}>"