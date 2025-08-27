"""
Enterprise-grade audit logging system for security and compliance.
Tracks all sensitive operations with detailed context and tamper-proof storage.
"""

import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum
from dataclasses import dataclass, asdict
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from fastapi import Request, Response
import redis.asyncio as redis

from .config import settings
from .redis import redis_manager
from ..models.audit_log import AuditLog, AuditEventType, AuditSeverity

logger = logging.getLogger(__name__)


class AuditEventCategory(Enum):
    """Categories of audit events."""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    CONFIGURATION = "configuration"
    SECURITY = "security"
    COMPLIANCE = "compliance"
    SYSTEM = "system"


@dataclass
class AuditEvent:
    """Represents an audit event."""
    event_type: AuditEventType
    category: AuditEventCategory
    severity: AuditSeverity
    user_id: Optional[str]
    resource_type: Optional[str]
    resource_id: Optional[str]
    action: str
    outcome: str  # success, failure, error
    ip_address: Optional[str]
    user_agent: Optional[str]
    request_id: Optional[str]
    session_id: Optional[str]
    metadata: Dict[str, Any]
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        data = asdict(self)
        data["event_type"] = self.event_type.value
        data["category"] = self.category.value
        data["severity"] = self.severity.value
        data["timestamp"] = self.timestamp.isoformat()
        return data


class AuditLogger:
    """
    Comprehensive audit logging system with:
    - Real-time event logging
    - Tamper-proof storage with checksums
    - Compliance reporting
    - Security analytics
    - Retention policies
    """
    
    # Events that must always be logged
    CRITICAL_EVENTS = [
        AuditEventType.LOGIN_SUCCESS,
        AuditEventType.LOGIN_FAILURE,
        AuditEventType.LOGOUT,
        AuditEventType.PASSWORD_CHANGE,
        AuditEventType.PERMISSION_GRANT,
        AuditEventType.PERMISSION_REVOKE,
        AuditEventType.DATA_EXPORT,
        AuditEventType.DATA_DELETE,
        AuditEventType.SECURITY_ALERT,
        AuditEventType.COMPLIANCE_VIOLATION
    ]
    
    def __init__(self):
        self.redis_client = None
        self.enabled = getattr(settings, "AUDIT_LOGGING_ENABLED", True)
        self.retention_days = getattr(settings, "AUDIT_LOG_RETENTION_DAYS", 90)
        self.real_time_enabled = getattr(settings, "AUDIT_REAL_TIME_ENABLED", True)
        
    async def initialize(self):
        """Initialize Redis connection for real-time logging."""
        if not self.redis_client and self.real_time_enabled:
            try:
                self.redis_client = redis_manager.redis_client
                if not self.redis_client:
                    self.redis_client = await redis.from_url(
                        settings.REDIS_URL,
                        encoding="utf-8",
                        decode_responses=True
                    )
                logger.info("Audit logger initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize audit logger: {e}")
                self.real_time_enabled = False
    
    async def log_event(
        self,
        event_type: AuditEventType,
        request: Optional[Request] = None,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        action: Optional[str] = None,
        outcome: str = "success",
        metadata: Optional[Dict[str, Any]] = None,
        db: Optional[AsyncSession] = None
    ) -> Optional[AuditLog]:
        """
        Log an audit event.
        
        Args:
            event_type: Type of event
            request: FastAPI request object
            user_id: User performing the action
            resource_type: Type of resource affected
            resource_id: ID of resource affected
            action: Action performed
            outcome: Outcome of the action
            metadata: Additional context
            db: Database session
            
        Returns:
            AuditLog record if successful
        """
        if not self.enabled:
            return None
        
        try:
            # Determine event properties
            category = self._get_event_category(event_type)
            severity = self._get_event_severity(event_type, outcome)
            
            # Extract request information
            ip_address = None
            user_agent = None
            request_id = None
            session_id = None
            
            if request:
                ip_address = self._get_client_ip(request)
                user_agent = request.headers.get("User-Agent")
                request_id = getattr(request.state, "request_id", None)
                session_id = getattr(request.state, "session_id", None)
                
                # Get user from request if not provided
                if not user_id and hasattr(request.state, "user_id"):
                    user_id = str(request.state.user_id)
            
            # Create audit event
            event = AuditEvent(
                event_type=event_type,
                category=category,
                severity=severity,
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                action=action or event_type.value,
                outcome=outcome,
                ip_address=ip_address,
                user_agent=user_agent,
                request_id=request_id,
                session_id=session_id,
                metadata=metadata or {},
                timestamp=datetime.utcnow()
            )
            
            # Log to database if session provided
            audit_log = None
            if db:
                audit_log = await self._log_to_database(event, db)
            
            # Log to real-time stream
            if self.real_time_enabled:
                await self._log_to_stream(event)
            
            # Log critical events to security logger
            if event_type in self.CRITICAL_EVENTS:
                self._log_critical_event(event)
            
            # Check for security alerts
            await self._check_security_alerts(event)
            
            return audit_log
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            return None
    
    async def _log_to_database(
        self,
        event: AuditEvent,
        db: AsyncSession
    ) -> Optional[AuditLog]:
        """Store audit event in database."""
        try:
            # Create checksum for tamper detection
            checksum = self._calculate_checksum(event)
            
            # Create audit log record
            audit_log = AuditLog(
                id=uuid.uuid4(),
                event_type=event.event_type,
                severity=event.severity,
                user_id=uuid.UUID(event.user_id) if event.user_id else None,
                resource_type=event.resource_type,
                resource_id=event.resource_id,
                action=event.action,
                outcome=event.outcome,
                ip_address=event.ip_address,
                user_agent=event.user_agent,
                request_id=event.request_id,
                session_id=event.session_id,
                metadata=event.metadata,
                checksum=checksum,
                created_at=event.timestamp
            )
            
            db.add(audit_log)
            await db.commit()
            
            return audit_log
            
        except Exception as e:
            logger.error(f"Failed to log to database: {e}")
            await db.rollback()
            return None
    
    async def _log_to_stream(self, event: AuditEvent):
        """Log event to real-time stream for monitoring."""
        if not self.redis_client:
            await self.initialize()
        
        if self.redis_client:
            try:
                # Add to stream
                stream_key = f"audit:stream:{event.category.value}"
                event_data = event.to_dict()
                
                await self.redis_client.xadd(
                    stream_key,
                    event_data,
                    maxlen=10000  # Keep last 10000 events per category
                )
                
                # Add to time-series for analytics
                metric_key = f"audit:metrics:{event.event_type.value}:{datetime.utcnow().strftime('%Y%m%d')}"
                await self.redis_client.hincrby(metric_key, event.outcome, 1)
                await self.redis_client.expire(metric_key, 7 * 24 * 60 * 60)  # 7 days retention
                
            except Exception as e:
                logger.error(f"Failed to log to stream: {e}")
    
    def _log_critical_event(self, event: AuditEvent):
        """Log critical events to security logger."""
        security_logger = logging.getLogger("security.audit")
        
        log_message = (
            f"AUDIT: {event.event_type.value} - "
            f"User: {event.user_id or 'anonymous'} - "
            f"IP: {event.ip_address or 'unknown'} - "
            f"Outcome: {event.outcome}"
        )
        
        if event.severity == AuditSeverity.CRITICAL:
            security_logger.critical(log_message, extra=event.to_dict())
        elif event.severity == AuditSeverity.HIGH:
            security_logger.error(log_message, extra=event.to_dict())
        elif event.severity == AuditSeverity.MEDIUM:
            security_logger.warning(log_message, extra=event.to_dict())
        else:
            security_logger.info(log_message, extra=event.to_dict())
    
    async def _check_security_alerts(self, event: AuditEvent):
        """Check for security alert conditions."""
        if not self.redis_client:
            return
        
        try:
            # Check for brute force attempts
            if event.event_type == AuditEventType.LOGIN_FAILURE:
                await self._check_brute_force(event)
            
            # Check for privilege escalation
            if event.event_type in [AuditEventType.PERMISSION_GRANT, AuditEventType.ROLE_CHANGE]:
                await self._check_privilege_escalation(event)
            
            # Check for data exfiltration
            if event.event_type == AuditEventType.DATA_EXPORT:
                await self._check_data_exfiltration(event)
            
            # Check for suspicious patterns
            await self._check_suspicious_patterns(event)
            
        except Exception as e:
            logger.error(f"Security alert check failed: {e}")
    
    async def _check_brute_force(self, event: AuditEvent):
        """Check for brute force attack patterns."""
        if event.ip_address:
            key = f"audit:brute_force:{event.ip_address}"
            
            # Count failed logins in last 5 minutes
            await self.redis_client.incr(key)
            await self.redis_client.expire(key, 300)
            
            count = await self.redis_client.get(key)
            if int(count) > 5:
                # Log security alert
                await self.log_event(
                    AuditEventType.SECURITY_ALERT,
                    action="BRUTE_FORCE_DETECTED",
                    outcome="alert",
                    metadata={
                        "ip_address": event.ip_address,
                        "failed_attempts": count,
                        "user_id": event.user_id
                    }
                )
    
    async def _check_privilege_escalation(self, event: AuditEvent):
        """Check for suspicious privilege changes."""
        if event.user_id:
            key = f"audit:privilege_changes:{event.user_id}:{datetime.utcnow().strftime('%Y%m%d')}"
            
            # Count privilege changes today
            await self.redis_client.incr(key)
            await self.redis_client.expire(key, 86400)
            
            count = await self.redis_client.get(key)
            if int(count) > 3:
                # Log security alert
                await self.log_event(
                    AuditEventType.SECURITY_ALERT,
                    action="EXCESSIVE_PRIVILEGE_CHANGES",
                    outcome="alert",
                    metadata={
                        "user_id": event.user_id,
                        "changes_today": count
                    }
                )
    
    async def _check_data_exfiltration(self, event: AuditEvent):
        """Check for potential data exfiltration."""
        if event.user_id:
            key = f"audit:data_export:{event.user_id}:{datetime.utcnow().strftime('%Y%m%d%H')}"
            
            # Count exports in last hour
            await self.redis_client.incr(key)
            await self.redis_client.expire(key, 3600)
            
            count = await self.redis_client.get(key)
            if int(count) > 10:
                # Log security alert
                await self.log_event(
                    AuditEventType.SECURITY_ALERT,
                    action="EXCESSIVE_DATA_EXPORT",
                    outcome="alert",
                    metadata={
                        "user_id": event.user_id,
                        "exports_this_hour": count
                    }
                )
    
    async def _check_suspicious_patterns(self, event: AuditEvent):
        """Check for general suspicious patterns."""
        # Check for activity outside business hours
        current_hour = datetime.utcnow().hour
        if current_hour < 6 or current_hour > 22:
            if event.event_type in [
                AuditEventType.DATA_EXPORT,
                AuditEventType.DATA_DELETE,
                AuditEventType.PERMISSION_GRANT
            ]:
                await self.log_event(
                    AuditEventType.SECURITY_ALERT,
                    action="AFTER_HOURS_ACTIVITY",
                    outcome="warning",
                    metadata={
                        "original_event": event.event_type.value,
                        "user_id": event.user_id,
                        "hour": current_hour
                    }
                )
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host
    
    def _get_event_category(self, event_type: AuditEventType) -> AuditEventCategory:
        """Determine event category from type."""
        category_mapping = {
            AuditEventType.LOGIN_SUCCESS: AuditEventCategory.AUTHENTICATION,
            AuditEventType.LOGIN_FAILURE: AuditEventCategory.AUTHENTICATION,
            AuditEventType.LOGOUT: AuditEventCategory.AUTHENTICATION,
            AuditEventType.TOKEN_REFRESH: AuditEventCategory.AUTHENTICATION,
            AuditEventType.PASSWORD_CHANGE: AuditEventCategory.SECURITY,
            AuditEventType.PASSWORD_RESET: AuditEventCategory.SECURITY,
            AuditEventType.PERMISSION_GRANT: AuditEventCategory.AUTHORIZATION,
            AuditEventType.PERMISSION_REVOKE: AuditEventCategory.AUTHORIZATION,
            AuditEventType.ROLE_CHANGE: AuditEventCategory.AUTHORIZATION,
            AuditEventType.DATA_CREATE: AuditEventCategory.DATA_MODIFICATION,
            AuditEventType.DATA_UPDATE: AuditEventCategory.DATA_MODIFICATION,
            AuditEventType.DATA_DELETE: AuditEventCategory.DATA_MODIFICATION,
            AuditEventType.DATA_VIEW: AuditEventCategory.DATA_ACCESS,
            AuditEventType.DATA_EXPORT: AuditEventCategory.DATA_ACCESS,
            AuditEventType.DATA_IMPORT: AuditEventCategory.DATA_MODIFICATION,
            AuditEventType.CONFIG_CHANGE: AuditEventCategory.CONFIGURATION,
            AuditEventType.SECURITY_ALERT: AuditEventCategory.SECURITY,
            AuditEventType.COMPLIANCE_CHECK: AuditEventCategory.COMPLIANCE,
            AuditEventType.COMPLIANCE_VIOLATION: AuditEventCategory.COMPLIANCE,
            AuditEventType.SYSTEM_START: AuditEventCategory.SYSTEM,
            AuditEventType.SYSTEM_STOP: AuditEventCategory.SYSTEM,
            AuditEventType.BACKUP_CREATE: AuditEventCategory.SYSTEM,
            AuditEventType.BACKUP_RESTORE: AuditEventCategory.SYSTEM,
        }
        return category_mapping.get(event_type, AuditEventCategory.SYSTEM)
    
    def _get_event_severity(
        self,
        event_type: AuditEventType,
        outcome: str
    ) -> AuditSeverity:
        """Determine event severity."""
        # Critical events
        if event_type in [
            AuditEventType.SECURITY_ALERT,
            AuditEventType.COMPLIANCE_VIOLATION,
            AuditEventType.DATA_DELETE
        ] or outcome == "security_breach":
            return AuditSeverity.CRITICAL
        
        # High severity events
        if event_type in [
            AuditEventType.PERMISSION_GRANT,
            AuditEventType.ROLE_CHANGE,
            AuditEventType.DATA_EXPORT,
            AuditEventType.PASSWORD_CHANGE
        ] or outcome == "unauthorized":
            return AuditSeverity.HIGH
        
        # Medium severity events
        if event_type in [
            AuditEventType.LOGIN_FAILURE,
            AuditEventType.CONFIG_CHANGE,
            AuditEventType.DATA_UPDATE
        ] or outcome == "failure":
            return AuditSeverity.MEDIUM
        
        # Low severity events
        if event_type in [
            AuditEventType.LOGIN_SUCCESS,
            AuditEventType.DATA_VIEW,
            AuditEventType.LOGOUT
        ]:
            return AuditSeverity.LOW
        
        # Info level for everything else
        return AuditSeverity.INFO
    
    def _calculate_checksum(self, event: AuditEvent) -> str:
        """Calculate checksum for tamper detection."""
        # Create deterministic string from event
        checksum_data = {
            "event_type": event.event_type.value,
            "user_id": event.user_id,
            "resource_type": event.resource_type,
            "resource_id": event.resource_id,
            "action": event.action,
            "outcome": event.outcome,
            "timestamp": event.timestamp.isoformat()
        }
        
        checksum_string = json.dumps(checksum_data, sort_keys=True)
        return hashlib.sha256(checksum_string.encode()).hexdigest()
    
    async def cleanup_old_logs(self, db: AsyncSession) -> int:
        """Clean up old audit logs based on retention policy."""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=self.retention_days)
            
            # Delete old logs
            result = await db.execute(
                select(AuditLog).where(AuditLog.created_at < cutoff_date)
            )
            old_logs = result.scalars().all()
            
            for log in old_logs:
                db.delete(log)
            
            await db.commit()
            
            logger.info(f"Cleaned up {len(old_logs)} old audit logs")
            return len(old_logs)
            
        except Exception as e:
            logger.error(f"Failed to clean up old logs: {e}")
            await db.rollback()
            return 0
    
    async def get_user_activity(
        self,
        user_id: str,
        db: AsyncSession,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get recent activity for a user."""
        result = await db.execute(
            select(AuditLog)
            .where(AuditLog.user_id == uuid.UUID(user_id))
            .order_by(desc(AuditLog.created_at))
            .limit(limit)
        )
        return result.scalars().all()
    
    async def verify_log_integrity(
        self,
        log_id: str,
        db: AsyncSession
    ) -> bool:
        """Verify integrity of an audit log entry."""
        try:
            result = await db.execute(
                select(AuditLog).where(AuditLog.id == uuid.UUID(log_id))
            )
            log = result.scalar_one_or_none()
            
            if not log:
                return False
            
            # Recreate event from log
            event = AuditEvent(
                event_type=log.event_type,
                category=self._get_event_category(log.event_type),
                severity=log.severity,
                user_id=str(log.user_id) if log.user_id else None,
                resource_type=log.resource_type,
                resource_id=log.resource_id,
                action=log.action,
                outcome=log.outcome,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                request_id=log.request_id,
                session_id=log.session_id,
                metadata=log.metadata,
                timestamp=log.created_at
            )
            
            # Calculate checksum
            calculated_checksum = self._calculate_checksum(event)
            
            # Compare with stored checksum
            return calculated_checksum == log.checksum
            
        except Exception as e:
            logger.error(f"Failed to verify log integrity: {e}")
            return False


# Global audit logger instance
audit_logger = AuditLogger()