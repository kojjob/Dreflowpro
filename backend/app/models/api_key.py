"""
API Key model
Stores API keys for authentication and rate limiting
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from typing import Optional, List
import enum

from ..core.database import Base


class APIKeyScope(str, enum.Enum):
    """API key permission scopes"""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"
    WEBHOOK = "webhook"


class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    key_hash = Column(String, nullable=False, unique=True)
    key_type = Column(String, nullable=False)  # public, private, admin, service, webhook
    scopes = Column(JSON, default=list)  # List of permission scopes
    rate_limit = Column(Integer, nullable=True)  # Requests per hour
    expires_at = Column(DateTime, nullable=True)
    allowed_origins = Column(JSON, nullable=True)  # List of allowed origins for CORS
    allowed_ips = Column(JSON, nullable=True)  # List of allowed IP addresses
    
    # Tracking fields
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Usage statistics
    total_requests = Column(Integer, default=0)
    failed_requests = Column(Integer, default=0)
    
    def __repr__(self):
        return f"<APIKey {self.id} - {self.name}>"
    
    def is_expired(self) -> bool:
        """Check if the API key has expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    def has_scope(self, scope: str) -> bool:
        """Check if the API key has a specific scope"""
        return scope in self.scopes if self.scopes else False
    
    def is_valid_origin(self, origin: Optional[str]) -> bool:
        """Check if the origin is allowed for this API key"""
        if not self.allowed_origins:
            return True  # No restriction
        if not origin:
            return False  # Origin required but not provided
        return origin in self.allowed_origins
    
    def is_valid_ip(self, ip: Optional[str]) -> bool:
        """Check if the IP address is allowed for this API key"""
        if not self.allowed_ips:
            return True  # No restriction
        if not ip:
            return False  # IP required but not provided
        return ip in self.allowed_ips