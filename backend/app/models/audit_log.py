"""
Audit log models for enterprise security and compliance tracking.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any

from sqlalchemy import (
    Column, String, DateTime, Text, JSON, ForeignKey,
    Index, CheckConstraint, Enum as SQLEnum, UUID
)
from sqlalchemy.orm import relationship

from .base import Base


class AuditEventType(str, Enum):
    """Types of audit events."""
    # Authentication events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    TOKEN_REFRESH = "token_refresh"
    
    # Authorization events
    PERMISSION_GRANT = "permission_grant"
    PERMISSION_REVOKE = "permission_revoke"
    ROLE_CHANGE = "role_change"
    
    # Password events
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    
    # Data events
    DATA_CREATE = "data_create"
    DATA_VIEW = "data_view"
    DATA_UPDATE = "data_update"
    DATA_DELETE = "data_delete"
    DATA_EXPORT = "data_export"
    DATA_IMPORT = "data_import"
    
    # Configuration events
    CONFIG_CHANGE = "config_change"
    
    # Security events
    SECURITY_ALERT = "security_alert"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    
    # Compliance events
    COMPLIANCE_CHECK = "compliance_check"
    COMPLIANCE_VIOLATION = "compliance_violation"
    
    # System events
    SYSTEM_START = "system_start"
    SYSTEM_STOP = "system_stop"
    BACKUP_CREATE = "backup_create"
    BACKUP_RESTORE = "backup_restore"


class AuditSeverity(str, Enum):
    """Severity levels for audit events."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AuditLog(Base):
    """
    Audit log entry for tracking all sensitive operations.
    Provides tamper-proof logging with checksums and comprehensive metadata.
    """
    __tablename__ = "audit_logs"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Event details
    event_type = Column(
        SQLEnum(AuditEventType),
        nullable=False,
        index=True,
        doc="Type of audit event"
    )
    severity = Column(
        SQLEnum(AuditSeverity),
        nullable=False,
        index=True,
        default=AuditSeverity.INFO,
        doc="Severity level of the event"
    )
    
    # Actor information
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="User who performed the action"
    )
    
    # Resource information
    resource_type = Column(
        String(50),
        nullable=True,
        index=True,
        doc="Type of resource affected (e.g., 'pipeline', 'connector')"
    )
    resource_id = Column(
        String(100),
        nullable=True,
        index=True,
        doc="ID of the affected resource"
    )
    
    # Action details
    action = Column(
        String(100),
        nullable=False,
        doc="Action performed"
    )
    outcome = Column(
        String(20),
        nullable=False,
        default="success",
        doc="Outcome of the action (success, failure, error)"
    )
    
    # Request context
    ip_address = Column(
        String(45),
        nullable=True,
        index=True,
        doc="IP address of the client"
    )
    user_agent = Column(
        Text,
        nullable=True,
        doc="User agent string"
    )
    request_id = Column(
        String(100),
        nullable=True,
        index=True,
        doc="Request ID for correlation"
    )
    session_id = Column(
        String(100),
        nullable=True,
        index=True,
        doc="Session ID for session tracking"
    )
    
    # Additional metadata
    metadata = Column(
        JSON,
        nullable=True,
        default=dict,
        doc="Additional context and details"
    )
    
    # Tamper detection
    checksum = Column(
        String(64),
        nullable=False,
        doc="SHA-256 checksum for tamper detection"
    )
    
    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
        doc="When the event occurred"
    )
    
    # Relationships
    user = relationship(
        "User",
        back_populates="audit_logs",
        lazy="select"
    )
    
    # Indexes for common queries
    __table_args__ = (
        # Composite index for user activity queries
        Index(
            "ix_audit_logs_user_created",
            "user_id",
            "created_at"
        ),
        # Composite index for resource queries
        Index(
            "ix_audit_logs_resource",
            "resource_type",
            "resource_id",
            "created_at"
        ),
        # Index for security monitoring
        Index(
            "ix_audit_logs_security",
            "event_type",
            "severity",
            "created_at"
        ),
        # Index for compliance reporting
        Index(
            "ix_audit_logs_compliance",
            "event_type",
            "outcome",
            "created_at"
        ),
        # Check constraint for outcome values
        CheckConstraint(
            "outcome IN ('success', 'failure', 'error', 'warning', 'alert')",
            name="check_audit_log_outcome"
        ),
    )
    
    def __repr__(self) -> str:
        return (
            f"<AuditLog(id={self.id}, "
            f"event_type={self.event_type}, "
            f"user_id={self.user_id}, "
            f"action={self.action})>"
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert audit log to dictionary."""
        return {
            "id": str(self.id),
            "event_type": self.event_type.value if self.event_type else None,
            "severity": self.severity.value if self.severity else None,
            "user_id": str(self.user_id) if self.user_id else None,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "action": self.action,
            "outcome": self.outcome,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "request_id": self.request_id,
            "session_id": self.session_id,
            "metadata": self.metadata,
            "checksum": self.checksum,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
    
    @property
    def is_security_event(self) -> bool:
        """Check if this is a security-related event."""
        security_events = [
            AuditEventType.SECURITY_ALERT,
            AuditEventType.SUSPICIOUS_ACTIVITY,
            AuditEventType.LOGIN_FAILURE,
            AuditEventType.PERMISSION_GRANT,
            AuditEventType.PERMISSION_REVOKE,
            AuditEventType.COMPLIANCE_VIOLATION
        ]
        return self.event_type in security_events
    
    @property
    def is_compliance_event(self) -> bool:
        """Check if this is a compliance-related event."""
        compliance_events = [
            AuditEventType.COMPLIANCE_CHECK,
            AuditEventType.COMPLIANCE_VIOLATION,
            AuditEventType.DATA_EXPORT,
            AuditEventType.DATA_DELETE
        ]
        return self.event_type in compliance_events
    
    @property
    def requires_alert(self) -> bool:
        """Check if this event requires immediate alerting."""
        return (
            self.severity in [AuditSeverity.CRITICAL, AuditSeverity.HIGH] or
            self.event_type == AuditEventType.SECURITY_ALERT or
            self.outcome in ["security_breach", "unauthorized"]
        )