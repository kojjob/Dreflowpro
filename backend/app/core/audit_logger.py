"""
Comprehensive Audit Logging System
Tracks all security-relevant activities and system events for compliance and forensic analysis.
"""

import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Column, String, DateTime, JSON, Text, Integer, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
import uuid

from .database import Base, get_db
from .redis import redis_manager, CacheService


class AuditEventType(str, Enum):
    """Types of audit events to track."""
    # Authentication Events
    USER_LOGIN = "user_login"
    USER_LOGIN_FAILED = "user_login_failed"
    USER_LOGOUT = "user_logout"
    USER_REGISTER = "user_register"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    
    # Authorization Events
    ACCESS_GRANTED = "access_granted"
    ACCESS_DENIED = "access_denied"
    PERMISSION_ESCALATION = "permission_escalation"
    
    # Data Events
    DATA_CREATE = "data_create"
    DATA_READ = "data_read"
    DATA_UPDATE = "data_update"
    DATA_DELETE = "data_delete"
    DATA_EXPORT = "data_export"
    DATA_IMPORT = "data_import"
    
    # System Events
    SYSTEM_CONFIG_CHANGE = "system_config_change"
    ADMIN_ACTION = "admin_action"
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"
    
    # Security Events
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    CSRF_VIOLATION = "csrf_violation"
    TOKEN_BREACH = "token_breach"
    
    # Business Events
    PIPELINE_CREATED = "pipeline_created"
    PIPELINE_EXECUTED = "pipeline_executed"
    CONNECTOR_CREATED = "connector_created"
    CONNECTOR_TESTED = "connector_tested"


class AuditSeverity(str, Enum):
    """Severity levels for audit events."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AuditLog(Base):
    """Audit log database model."""
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    event_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    session_id = Column(String(255), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True, index=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    resource_type = Column(String(50), nullable=True, index=True)
    resource_id = Column(String(255), nullable=True, index=True)
    action = Column(String(50), nullable=True, index=True)
    outcome = Column(String(20), nullable=False, index=True)  # SUCCESS, FAILURE, ERROR
    message = Column(Text, nullable=False)
    details = Column(JSON, nullable=True)
    correlation_id = Column(String(255), nullable=True, index=True)
    request_path = Column(String(500), nullable=True)
    request_method = Column(String(10), nullable=True)
    response_status = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    
    # Indexes for efficient querying
    __table_args__ = (
        Index('ix_audit_logs_timestamp_event', 'timestamp', 'event_type'),
        Index('ix_audit_logs_user_timestamp', 'user_id', 'timestamp'),
        Index('ix_audit_logs_severity_timestamp', 'severity', 'timestamp'),
        Index('ix_audit_logs_correlation', 'correlation_id'),
    )


class AuditLogger:
    """Comprehensive audit logging service."""
    
    def __init__(self):
        self.logger = logging.getLogger("audit")
        self.logger.setLevel(logging.INFO)
        
        # Create audit log handler if not exists
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - AUDIT - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    async def log_event(
        self,
        event_type: AuditEventType,
        message: str,
        severity: AuditSeverity = AuditSeverity.MEDIUM,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        action: Optional[str] = None,
        outcome: str = "SUCCESS",
        details: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
        request_path: Optional[str] = None,
        request_method: Optional[str] = None,
        response_status: Optional[int] = None,
        duration_ms: Optional[int] = None,
        db: Optional[AsyncSession] = None
    ):
        """Log an audit event to database and structured logs."""
        
        # Generate correlation ID if not provided
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
        
        # Create audit log entry
        audit_entry = AuditLog(
            event_type=event_type.value,
            severity=severity.value,
            user_id=uuid.UUID(user_id) if user_id else None,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            outcome=outcome,
            message=message,
            details=details,
            correlation_id=correlation_id,
            request_path=request_path,
            request_method=request_method,
            response_status=response_status,
            duration_ms=duration_ms
        )
        
        # Store in database
        if db:
            try:
                db.add(audit_entry)
                await db.commit()
            except Exception as e:
                await db.rollback()
                self.logger.error(f"Failed to store audit log in database: {e}")
        
        # Store in Redis for real-time monitoring
        await self._store_in_redis(audit_entry)
        
        # Log to structured logger
        log_data = {
            "event_type": event_type.value,
            "severity": severity.value,
            "user_id": user_id,
            "session_id": session_id,
            "ip_address": ip_address,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": action,
            "outcome": outcome,
            "message": message,
            "correlation_id": correlation_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if details:
            log_data["details"] = details
        
        # Log with appropriate level based on severity
        if severity == AuditSeverity.CRITICAL:
            self.logger.critical(json.dumps(log_data))
        elif severity == AuditSeverity.HIGH:
            self.logger.error(json.dumps(log_data))
        elif severity == AuditSeverity.MEDIUM:
            self.logger.warning(json.dumps(log_data))
        else:
            self.logger.info(json.dumps(log_data))
        
        # Check for security alerts
        await self._check_security_alerts(event_type, severity, user_id, ip_address)
    
    async def _get_redis(self):
        """Get Redis connection."""
        return await redis_manager.connect()
    
    async def _store_in_redis(self, audit_entry: AuditLog):
        """Store audit entry in Redis for real-time monitoring."""
        try:
            redis = await self._get_redis()
            
            # Store in multiple Redis structures for different query patterns
            
            # 1. Recent events list (last 1000 events)
            event_data = {
                "id": str(audit_entry.id),
                "timestamp": audit_entry.timestamp.isoformat(),
                "event_type": audit_entry.event_type,
                "severity": audit_entry.severity,
                "user_id": str(audit_entry.user_id) if audit_entry.user_id else None,
                "message": audit_entry.message,
                "outcome": audit_entry.outcome
            }
            
            await redis.lpush("audit:recent_events", json.dumps(event_data))
            await redis.ltrim("audit:recent_events", 0, 999)  # Keep last 1000
            
            # 2. Events by user (last 100 per user)
            if audit_entry.user_id:
                user_key = f"audit:user:{audit_entry.user_id}"
                await redis.lpush(user_key, json.dumps(event_data))
                await redis.ltrim(user_key, 0, 99)  # Keep last 100
                await redis.expire(user_key, 86400)  # 24 hours
            
            # 3. Security events (critical and high severity)
            if audit_entry.severity in [AuditSeverity.CRITICAL.value, AuditSeverity.HIGH.value]:
                security_key = "audit:security_events"
                await redis.lpush(security_key, json.dumps(event_data))
                await redis.ltrim(security_key, 0, 499)  # Keep last 500
                await redis.expire(security_key, 604800)  # 7 days
            
            # 4. Event counts by type (for dashboards)
            count_key = f"audit:count:{audit_entry.event_type}"
            await redis.incr(count_key)
            await redis.expire(count_key, 86400)  # Reset daily
            
        except Exception as e:
            self.logger.error(f"Failed to store audit log in Redis: {e}")
    
    async def _check_security_alerts(
        self, 
        event_type: AuditEventType, 
        severity: AuditSeverity,
        user_id: Optional[str],
        ip_address: Optional[str]
    ):
        """Check for security alert conditions."""
        try:
            # Alert on critical events
            if severity == AuditSeverity.CRITICAL:
                await self._trigger_security_alert(
                    f"Critical security event: {event_type.value}",
                    {"event_type": event_type.value, "user_id": user_id, "ip_address": ip_address}
                )
            
            # Check for failed login attempts
            if event_type == AuditEventType.USER_LOGIN_FAILED and ip_address:
                failed_attempts_key = f"audit:failed_logins:{ip_address}"
                redis = await self._get_redis()
                failed_count = await redis.incr(failed_attempts_key)
                await redis.expire(failed_attempts_key, 900)  # 15 minutes
                
                if failed_count >= 5:  # 5 failed attempts in 15 minutes
                    await self._trigger_security_alert(
                        f"Multiple failed login attempts from IP: {ip_address}",
                        {"ip_address": ip_address, "failed_count": failed_count}
                    )
            
            # Check for suspicious user activity
            if user_id and severity in [AuditSeverity.HIGH, AuditSeverity.CRITICAL]:
                suspicious_key = f"audit:suspicious:{user_id}"
                redis = await self._get_redis()
                suspicious_count = await redis.incr(suspicious_key)
                await redis.expire(suspicious_key, 3600)  # 1 hour
                
                if suspicious_count >= 3:  # 3 high/critical events in 1 hour
                    await self._trigger_security_alert(
                        f"Suspicious activity detected for user: {user_id}",
                        {"user_id": user_id, "suspicious_count": suspicious_count}
                    )
        
        except Exception as e:
            self.logger.error(f"Failed to check security alerts: {e}")
    
    async def _trigger_security_alert(self, message: str, details: Dict[str, Any]):
        """Trigger security alert notification."""
        alert_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": message,
            "details": details,
            "alert_id": str(uuid.uuid4())
        }
        
        # Store alert in Redis
        redis = await self._get_redis()
        await redis.lpush("audit:security_alerts", json.dumps(alert_data))
        await redis.ltrim("audit:security_alerts", 0, 99)  # Keep last 100 alerts
        
        # Log critical alert
        self.logger.critical(f"SECURITY ALERT: {json.dumps(alert_data)}")
        
        # TODO: Send to external monitoring systems (Slack, PagerDuty, etc.)
    
    async def get_recent_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent audit events from Redis."""
        try:
            redis = await self._get_redis()
            events = await redis.lrange("audit:recent_events", 0, limit - 1)
            return [json.loads(event) for event in events]
        except Exception as e:
            self.logger.error(f"Failed to get recent events: {e}")
            return []
    
    async def get_user_events(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get audit events for a specific user."""
        try:
            user_key = f"audit:user:{user_id}"
            redis = await self._get_redis()
            events = await redis.lrange(user_key, 0, limit - 1)
            return [json.loads(event) for event in events]
        except Exception as e:
            self.logger.error(f"Failed to get user events: {e}")
            return []
    
    async def get_security_alerts(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent security alerts."""
        try:
            redis = await self._get_redis()
            alerts = await redis.lrange("audit:security_alerts", 0, limit - 1)
            return [json.loads(alert) for alert in alerts]
        except Exception as e:
            self.logger.error(f"Failed to get security alerts: {e}")
            return []


# Global audit logger instance
audit_logger = AuditLogger()


# Convenience functions for common audit events
async def log_user_login(user_id: str, session_id: str, ip_address: str, user_agent: str, success: bool = True, db: AsyncSession = None):
    """Log user login event."""
    await audit_logger.log_event(
        event_type=AuditEventType.USER_LOGIN if success else AuditEventType.USER_LOGIN_FAILED,
        message=f"User {'login successful' if success else 'login failed'}",
        severity=AuditSeverity.LOW if success else AuditSeverity.MEDIUM,
        user_id=user_id,
        session_id=session_id,
        ip_address=ip_address,
        user_agent=user_agent,
        action="login",
        outcome="SUCCESS" if success else "FAILURE",
        db=db
    )


async def log_data_access(user_id: str, resource_type: str, resource_id: str, action: str, ip_address: str, db: AsyncSession = None):
    """Log data access event."""
    await audit_logger.log_event(
        event_type=AuditEventType.DATA_READ,
        message=f"Data access: {action} on {resource_type}",
        severity=AuditSeverity.LOW,
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,
        ip_address=ip_address,
        outcome="SUCCESS",
        db=db
    )


async def log_security_event(event_type: AuditEventType, message: str, user_id: str = None, ip_address: str = None, details: Dict = None, db: AsyncSession = None):
    """Log security-related event."""
    await audit_logger.log_event(
        event_type=event_type,
        message=message,
        severity=AuditSeverity.HIGH,
        user_id=user_id,
        ip_address=ip_address,
        outcome="FAILURE",
        details=details,
        db=db
    )