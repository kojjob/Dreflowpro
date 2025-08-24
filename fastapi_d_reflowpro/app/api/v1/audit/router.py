"""
Audit Dashboard API
Provides endpoints for viewing audit logs, security events, and system monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
from pydantic import BaseModel

from ....core.database import get_db
from ....core.deps import get_current_user, require_admin_access
from ....core.audit_logger import AuditLog, AuditEventType, AuditSeverity, audit_logger
from ....models.user import User
from ....schemas.auth import UserProfile


class AuditLogResponse(BaseModel):
    """Audit log response schema."""
    id: str
    timestamp: datetime
    event_type: str
    severity: str
    user_id: Optional[str]
    session_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    resource_type: Optional[str]
    resource_id: Optional[str]
    action: Optional[str]
    outcome: str
    message: str
    details: Optional[Dict[str, Any]]
    correlation_id: Optional[str]
    request_path: Optional[str]
    request_method: Optional[str]
    response_status: Optional[int]
    duration_ms: Optional[int]
    user_email: Optional[str] = None  # Joined from user table
    
    class Config:
        from_attributes = True


class AuditStatsResponse(BaseModel):
    """Audit statistics response."""
    total_events: int
    events_last_24h: int
    failed_events: int
    security_events: int
    unique_users: int
    top_event_types: List[Dict[str, Any]]
    severity_breakdown: Dict[str, int]
    recent_alerts: List[Dict[str, Any]]


router = APIRouter(
    prefix="/audit",
    tags=["Audit & Security"],
    dependencies=[Depends(require_admin_access)]  # Require admin access for all audit endpoints
)


@router.get("/logs", 
           response_model=List[AuditLogResponse],
           summary="Get Audit Logs",
           description="""
           Retrieve audit logs with filtering and pagination.
           
           **Admin Access Required** - Only administrators can view audit logs.
           
           **Filtering Options:**
           - **Event Type**: Filter by specific event types (login, data_access, etc.)
           - **Severity**: Filter by severity level (low, medium, high, critical)
           - **User ID**: Filter by specific user
           - **Date Range**: Filter by time period
           - **Outcome**: Filter by success/failure status
           
           **Use Cases:**
           - Security incident investigation
           - Compliance reporting
           - User activity monitoring
           - System health analysis
           """)
async def get_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=1000, description="Number of logs to return"),
    offset: int = Query(0, ge=0, description="Number of logs to skip"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    outcome: Optional[str] = Query(None, description="Filter by outcome (SUCCESS/FAILURE/ERROR)"),
    start_date: Optional[datetime] = Query(None, description="Start date for filtering"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    search: Optional[str] = Query(None, description="Search in message and details")
):
    """Get audit logs with comprehensive filtering."""
    
    # Build query with filters
    query = select(AuditLog).order_by(desc(AuditLog.timestamp))
    
    # Apply filters
    filters = []
    
    if event_type:
        filters.append(AuditLog.event_type == event_type)
    
    if severity:
        filters.append(AuditLog.severity == severity)
    
    if user_id:
        filters.append(AuditLog.user_id == user_id)
    
    if outcome:
        filters.append(AuditLog.outcome == outcome)
    
    if start_date:
        filters.append(AuditLog.timestamp >= start_date)
    
    if end_date:
        filters.append(AuditLog.timestamp <= end_date)
    
    if search:
        filters.append(
            AuditLog.message.ilike(f"%{search}%")
        )
    
    if filters:
        query = query.where(and_(*filters))
    
    # Apply pagination
    query = query.offset(offset).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Convert to response format
    response_logs = []
    for log in logs:
        log_dict = {
            "id": str(log.id),
            "timestamp": log.timestamp,
            "event_type": log.event_type,
            "severity": log.severity,
            "user_id": str(log.user_id) if log.user_id else None,
            "session_id": log.session_id,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "action": log.action,
            "outcome": log.outcome,
            "message": log.message,
            "details": log.details,
            "correlation_id": log.correlation_id,
            "request_path": log.request_path,
            "request_method": log.request_method,
            "response_status": log.response_status,
            "duration_ms": log.duration_ms
        }
        
        # Add user email if user_id exists
        if log.user_id:
            user_result = await db.execute(
                select(User.email).where(User.id == log.user_id)
            )
            user_email = user_result.scalar_one_or_none()
            log_dict["user_email"] = user_email
        
        response_logs.append(AuditLogResponse(**log_dict))
    
    return response_logs


@router.get("/stats",
           response_model=AuditStatsResponse,
           summary="Get Audit Statistics",
           description="""
           Get comprehensive audit statistics and security metrics.
           
           **Metrics Included:**
           - **Event Counts**: Total events, recent activity
           - **Security Events**: Failed logins, suspicious activity
           - **User Activity**: Unique active users, top performers
           - **System Health**: Error rates, response times
           
           **Use Cases:**
           - Security dashboard
           - Compliance reporting
           - System monitoring
           - Performance analysis
           """)
async def get_audit_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    days: int = Query(7, ge=1, le=90, description="Number of days to analyze")
):
    """Get comprehensive audit statistics."""
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    last_24h = end_date - timedelta(days=1)
    
    # Total events
    total_result = await db.execute(
        select(func.count(AuditLog.id))
        .where(AuditLog.timestamp >= start_date)
    )
    total_events = total_result.scalar()
    
    # Events in last 24 hours
    recent_result = await db.execute(
        select(func.count(AuditLog.id))
        .where(AuditLog.timestamp >= last_24h)
    )
    events_last_24h = recent_result.scalar()
    
    # Failed events
    failed_result = await db.execute(
        select(func.count(AuditLog.id))
        .where(
            and_(
                AuditLog.timestamp >= start_date,
                AuditLog.outcome.in_(["FAILURE", "ERROR"])
            )
        )
    )
    failed_events = failed_result.scalar()
    
    # Security events (high/critical severity)
    security_result = await db.execute(
        select(func.count(AuditLog.id))
        .where(
            and_(
                AuditLog.timestamp >= start_date,
                AuditLog.severity.in_(["HIGH", "CRITICAL"])
            )
        )
    )
    security_events = security_result.scalar()
    
    # Unique users
    users_result = await db.execute(
        select(func.count(func.distinct(AuditLog.user_id)))
        .where(
            and_(
                AuditLog.timestamp >= start_date,
                AuditLog.user_id.isnot(None)
            )
        )
    )
    unique_users = users_result.scalar()
    
    # Top event types
    event_types_result = await db.execute(
        select(AuditLog.event_type, func.count(AuditLog.id).label('count'))
        .where(AuditLog.timestamp >= start_date)
        .group_by(AuditLog.event_type)
        .order_by(desc('count'))
        .limit(10)
    )
    top_event_types = [
        {"event_type": row[0], "count": row[1]} 
        for row in event_types_result.fetchall()
    ]
    
    # Severity breakdown
    severity_result = await db.execute(
        select(AuditLog.severity, func.count(AuditLog.id).label('count'))
        .where(AuditLog.timestamp >= start_date)
        .group_by(AuditLog.severity)
    )
    severity_breakdown = {
        row[0]: row[1] for row in severity_result.fetchall()
    }
    
    # Recent security alerts from Redis
    recent_alerts = await audit_logger.get_security_alerts(limit=10)
    
    return AuditStatsResponse(
        total_events=total_events,
        events_last_24h=events_last_24h,
        failed_events=failed_events,
        security_events=security_events,
        unique_users=unique_users,
        top_event_types=top_event_types,
        severity_breakdown=severity_breakdown,
        recent_alerts=recent_alerts
    )


@router.get("/security-alerts",
           summary="Get Security Alerts",
           description="""
           Get recent security alerts and suspicious activity.
           
           **Alert Types:**
           - **Failed Login Attempts**: Multiple failed logins from same IP
           - **Suspicious Activity**: SQL injection, XSS attempts, etc.
           - **Token Breaches**: Refresh token family violations
           - **Rate Limit Violations**: Excessive API usage
           - **CSRF Violations**: Cross-site request forgery attempts
           
           **Response Time:** Real-time alerts from Redis cache
           """)
async def get_security_alerts(
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100, description="Number of alerts to return")
):
    """Get recent security alerts."""
    alerts = await audit_logger.get_security_alerts(limit=limit)
    return {"alerts": alerts}


@router.get("/user/{user_id}/activity",
           response_model=List[AuditLogResponse],
           summary="Get User Activity",
           description="""
           Get audit logs for a specific user.
           
           **Use Cases:**
           - User behavior analysis
           - Security incident investigation
           - Compliance audits
           - Support ticket investigation
           """)
async def get_user_activity(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=500, description="Number of events to return"),
    days: int = Query(30, ge=1, le=90, description="Number of days to look back")
):
    """Get audit logs for a specific user."""
    
    # Calculate date range
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Build query
    query = select(AuditLog).where(
        and_(
            AuditLog.user_id == user_id,
            AuditLog.timestamp >= start_date
        )
    ).order_by(desc(AuditLog.timestamp)).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Convert to response format (similar to get_audit_logs)
    response_logs = []
    for log in logs:
        log_dict = {
            "id": str(log.id),
            "timestamp": log.timestamp,
            "event_type": log.event_type,
            "severity": log.severity,
            "user_id": str(log.user_id) if log.user_id else None,
            "session_id": log.session_id,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "action": log.action,
            "outcome": log.outcome,
            "message": log.message,
            "details": log.details,
            "correlation_id": log.correlation_id,
            "request_path": log.request_path,
            "request_method": log.request_method,
            "response_status": log.response_status,
            "duration_ms": log.duration_ms
        }
        response_logs.append(AuditLogResponse(**log_dict))
    
    return response_logs


@router.get("/events/types",
           summary="Get Available Event Types",
           description="Get list of all available audit event types for filtering.")
async def get_event_types():
    """Get available audit event types."""
    return {
        "event_types": [event_type.value for event_type in AuditEventType],
        "severities": [severity.value for severity in AuditSeverity],
        "outcomes": ["SUCCESS", "FAILURE", "ERROR"]
    }


@router.post("/export",
            summary="Export Audit Logs",
            description="""
            Export audit logs in various formats for compliance and analysis.
            
            **Export Formats:**
            - **CSV**: Spreadsheet-compatible format
            - **JSON**: Machine-readable format
            - **XML**: Enterprise system integration
            
            **Compliance:** Suitable for SOC2, ISO27001, PCI DSS audits
            """)
async def export_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    format: str = Query("csv", regex="^(csv|json|xml)$", description="Export format"),
    start_date: Optional[datetime] = Query(None, description="Start date for export"),
    end_date: Optional[datetime] = Query(None, description="End date for export"),
    event_types: Optional[List[str]] = Query(None, description="Event types to include")
):
    """Export audit logs for compliance and analysis."""
    
    # For now, return a simple response indicating the feature is available
    # In a full implementation, this would generate and return the actual export
    
    return {
        "message": "Export functionality available",
        "format": format,
        "start_date": start_date,
        "end_date": end_date,
        "event_types": event_types,
        "note": "Full export implementation would generate downloadable file"
    }