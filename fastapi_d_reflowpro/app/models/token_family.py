"""
Token Family and Refresh Token Models for Advanced Token Rotation

These models support the refresh token rotation security feature by tracking
token families and individual refresh tokens with their rotation history.
"""

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
import uuid

from ..core.database import Base


class TokenStatus(str, PyEnum):
    """Token status enumeration."""
    ACTIVE = "active"
    ROTATED = "rotated"
    REVOKED = "revoked"
    EXPIRED = "expired"


class TokenFamily(Base):
    """
    Token family model for tracking user authentication sessions.
    
    A token family represents a single authentication session that can span
    multiple token rotations. Each family has a unique ID that ties together
    all tokens in the rotation chain.
    """
    __tablename__ = "token_families"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Device and client information
    device_info = Column(JSON, nullable=True)  # User agent, IP, device type, etc.
    device_fingerprint = Column(String(255), nullable=True)  # Unique device identifier
    
    # Session tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Family expiration
    
    # Status tracking
    is_active = Column(Boolean, default=True, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revocation_reason = Column(String(100), nullable=True)  # logout, breach, expired, etc.
    
    # Security features
    max_rotations = Column(Integer, default=100)  # Limit rotations per family
    rotation_count = Column(Integer, default=0)  # Current rotation count
    
    # Relationships
    user = relationship("User", back_populates="token_families")
    refresh_tokens = relationship("RefreshToken", back_populates="token_family", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<TokenFamily(id={self.id}, user_id={self.user_id}, active={self.is_active})>"


class RefreshToken(Base):
    """
    Individual refresh token model with rotation tracking.
    
    Each refresh token is part of a token family and maintains a chain
    of rotations for security auditing and breach detection.
    """
    __tablename__ = "refresh_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(UUID(as_uuid=True), ForeignKey("token_families.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Token data
    token_hash = Column(String(255), nullable=False)  # Hashed token for security
    jti = Column(String(36), nullable=True)  # JWT ID for additional tracking
    
    # Status and lifecycle
    status = Column(Enum(TokenStatus), default=TokenStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_used = Column(DateTime(timezone=True), nullable=True)
    
    # Rotation tracking
    rotated_from_id = Column(UUID(as_uuid=True), ForeignKey("refresh_tokens.id"), nullable=True)
    rotated_at = Column(DateTime(timezone=True), nullable=True)
    rotated_to_id = Column(UUID(as_uuid=True), nullable=True)  # Filled when token is rotated
    
    # Revocation tracking
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revocation_reason = Column(String(100), nullable=True)
    
    # Security metadata
    client_ip = Column(String(45), nullable=True)  # IPv4/IPv6 support
    user_agent = Column(Text, nullable=True)
    security_flags = Column(JSON, nullable=True)  # Additional security context
    
    # Relationships
    user = relationship("User")
    token_family = relationship("TokenFamily", back_populates="refresh_tokens")
    rotated_from = relationship("RefreshToken", remote_side=[id], foreign_keys=[rotated_from_id])
    
    def __repr__(self):
        return f"<RefreshToken(id={self.id}, family_id={self.family_id}, status={self.status})>"
    
    @property
    def is_active(self) -> bool:
        """Check if token is currently active."""
        return (
            self.status == TokenStatus.ACTIVE and 
            self.expires_at > func.now() and
            self.token_family.is_active
        )
    
    @property
    def rotation_chain_length(self) -> int:
        """Calculate the length of rotation chain."""
        count = 0
        current = self.rotated_from
        while current:
            count += 1
            current = current.rotated_from
        return count


class TokenAuditLog(Base):
    """
    Audit log for token-related security events.
    
    This model tracks all significant token events for security monitoring,
    breach detection, and compliance reporting.
    """
    __tablename__ = "token_audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Event identification
    event_type = Column(String(50), nullable=False)  # created, rotated, revoked, etc.
    event_severity = Column(String(20), default="info")  # info, warning, error, critical
    
    # Related entities
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    family_id = Column(UUID(as_uuid=True), ForeignKey("token_families.id"), nullable=True)
    token_id = Column(UUID(as_uuid=True), ForeignKey("refresh_tokens.id"), nullable=True)
    
    # Event details
    event_data = Column(JSON, nullable=True)  # Structured event information
    event_message = Column(Text, nullable=True)  # Human-readable description
    
    # Request context
    client_ip = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    request_id = Column(String(36), nullable=True)  # For request correlation
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Security context
    risk_score = Column(Integer, nullable=True)  # 0-100 risk assessment
    geographic_location = Column(JSON, nullable=True)  # Country, city, etc.
    
    # Relationships
    user = relationship("User")
    token_family = relationship("TokenFamily")
    refresh_token = relationship("RefreshToken")
    
    def __repr__(self):
        return f"<TokenAuditLog(id={self.id}, event_type={self.event_type}, severity={self.event_severity})>"


# Add relationships to User model
def add_token_relationships():
    """Add token-related relationships to User model."""
    from .user import User
    
    if not hasattr(User, 'token_families'):
        User.token_families = relationship(
            "TokenFamily", 
            back_populates="user", 
            cascade="all, delete-orphan"
        )
    
    if not hasattr(User, 'refresh_tokens'):
        User.refresh_tokens = relationship("RefreshToken", cascade="all, delete-orphan")
    
    if not hasattr(User, 'token_audit_logs'):
        User.token_audit_logs = relationship("TokenAuditLog", cascade="all, delete-orphan")


# Automatically add relationships when module is imported
add_token_relationships()