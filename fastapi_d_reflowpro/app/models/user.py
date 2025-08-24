from sqlalchemy import Column, String, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
import uuid
from ..core.database import Base


class UserRole(str, PyEnum):
    """User roles in the system."""
    ADMIN = "admin"
    EDITOR = "editor" 
    VIEWER = "viewer"


class AuthMethod(str, PyEnum):
    """Authentication methods."""
    EMAIL = "email"
    GOOGLE = "google"
    GITHUB = "github"
    MICROSOFT = "microsoft"


class OAuthProvider(str, PyEnum):
    """OAuth providers."""
    GOOGLE = "google"
    GITHUB = "github"
    MICROSOFT = "microsoft"


class Organization(Base):
    """Organization/Company model."""
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    domain = Column(String(255), unique=True, nullable=True)
    plan_type = Column(String(50), default="free")
    usage_limits = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="organization")
    connectors = relationship("DataConnector", back_populates="organization")
    pipelines = relationship("ETLPipeline", back_populates="organization")


class User(Base):
    """User model."""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)  # Now optional for social auth
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)  # Profile picture from social providers
    role = Column(Enum(UserRole), default=UserRole.VIEWER)
    auth_method = Column(Enum(AuthMethod), default=AuthMethod.EMAIL)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    provider_data = Column(JSON, nullable=True)  # Store additional provider-specific data
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    api_keys = relationship("APIKey", back_populates="user")
    created_pipelines = relationship("ETLPipeline", back_populates="created_by")
    social_accounts = relationship("SocialAccount", back_populates="user", cascade="all, delete-orphan")
    
    @property
    def full_name(self) -> str:
        """Get user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.email.split("@")[0]


class SocialAccount(Base):
    """Social authentication accounts linked to users."""
    __tablename__ = "social_accounts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    provider = Column(Enum(OAuthProvider), nullable=False)
    provider_account_id = Column(String(255), nullable=False)  # ID from the OAuth provider
    provider_account_email = Column(String(255), nullable=True)  # Email from provider
    access_token = Column(Text, nullable=True)  # OAuth access token (encrypted in production)
    refresh_token = Column(Text, nullable=True)  # OAuth refresh token (encrypted in production) 
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Token expiration
    token_type = Column(String(50), default="Bearer")
    scope = Column(String(500), nullable=True)  # OAuth scopes granted
    raw_user_info = Column(JSON, nullable=True)  # Raw user info from provider
    is_primary = Column(Boolean, default=False)  # Primary login method for this provider
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="social_accounts")
    
    # Unique constraint: one account per provider per user
    __table_args__ = (
        {"schema": None}  # This will be handled by Alembic if needed
    )


class APIKey(Base):
    """API keys for programmatic access."""
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    key_hash = Column(String(255), nullable=False, unique=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    last_used = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="api_keys")