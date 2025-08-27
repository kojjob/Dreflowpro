"""
Security Dashboard Service
Provides real-time security monitoring and analytics
"""

import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import asyncio

from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.sql import text

from ..core.config import settings
from ..core.redis import redis_manager
from ..models.audit_log import AuditLog
from ..models.user import User
from ..models.api_key import APIKey


class SecurityMetrics:
    """Security metrics calculation and aggregation"""
    
    def __init__(self):
        self.time_windows = {
            "1h": timedelta(hours=1),
            "24h": timedelta(days=1),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30)
        }
    
    async def calculate_auth_metrics(
        self,
        db: Session,
        time_window: str = "24h"
    ) -> Dict[str, Any]:
        """
        Calculate authentication-related metrics
        
        Args:
            db: Database session
            time_window: Time window for metrics
            
        Returns:
            Authentication metrics dictionary
        """
        if time_window not in self.time_windows:
            time_window = "24h"
        
        start_time = datetime.utcnow() - self.time_windows[time_window]
        
        # Query authentication events
        stmt = select(AuditLog).where(
            and_(
                AuditLog.created_at >= start_time,
                AuditLog.action.in_([
                    "login_success", "login_failed",
                    "mfa_success", "mfa_failed",
                    "password_reset", "account_locked"
                ])
            )
        )
        
        result = await db.execute(stmt)
        auth_logs = result.scalars().all()
        
        # Calculate metrics
        metrics = {
            "total_attempts": len(auth_logs),
            "successful_logins": sum(1 for log in auth_logs if log.action == "login_success"),
            "failed_logins": sum(1 for log in auth_logs if log.action == "login_failed"),
            "mfa_success": sum(1 for log in auth_logs if log.action == "mfa_success"),
            "mfa_failed": sum(1 for log in auth_logs if log.action == "mfa_failed"),
            "password_resets": sum(1 for log in auth_logs if log.action == "password_reset"),
            "account_lockouts": sum(1 for log in auth_logs if log.action == "account_locked"),
            "unique_users": len(set(log.user_id for log in auth_logs if log.user_id)),
            "unique_ips": len(set(log.ip_address for log in auth_logs if log.ip_address))
        }
        
        # Calculate rates
        if metrics["total_attempts"] > 0:
            metrics["success_rate"] = (metrics["successful_logins"] / metrics["total_attempts"]) * 100
            metrics["failure_rate"] = (metrics["failed_logins"] / metrics["total_attempts"]) * 100
        else:
            metrics["success_rate"] = 0
            metrics["failure_rate"] = 0
        
        # Identify suspicious patterns
        ip_counter = Counter(log.ip_address for log in auth_logs if log.action == "login_failed")
        metrics["suspicious_ips"] = [
            {"ip": ip, "failed_attempts": count}
            for ip, count in ip_counter.most_common(10)
            if count >= 5  # More than 5 failed attempts
        ]
        
        return metrics
    
    async def calculate_api_metrics(
        self,
        db: Session,
        time_window: str = "24h"
    ) -> Dict[str, Any]:
        """
        Calculate API usage metrics
        
        Args:
            db: Database session
            time_window: Time window for metrics
            
        Returns:
            API usage metrics dictionary
        """
        if time_window not in self.time_windows:
            time_window = "24h"
        
        start_time = datetime.utcnow() - self.time_windows[time_window]
        
        # Get API key usage from audit logs
        stmt = select(AuditLog).where(
            and_(
                AuditLog.created_at >= start_time,
                AuditLog.action.like("api_%")
            )
        )
        
        result = await db.execute(stmt)
        api_logs = result.scalars().all()
        
        # Get active API keys
        stmt = select(APIKey).where(
            and_(
                APIKey.is_active == True,
                or_(
                    APIKey.expires_at == None,
                    APIKey.expires_at > datetime.utcnow()
                )
            )
        )
        
        result = await db.execute(stmt)
        active_keys = result.scalars().all()
        
        # Calculate metrics
        metrics = {
            "total_requests": len(api_logs),
            "unique_keys_used": len(set(log.details.get("key_id") for log in api_logs if log.details and "key_id" in log.details)),
            "active_keys": len(active_keys),
            "requests_by_type": defaultdict(int)
        }
        
        # Categorize requests by API key type
        for log in api_logs:
            if log.details and "key_type" in log.details:
                metrics["requests_by_type"][log.details["key_type"]] += 1
        
        metrics["requests_by_type"] = dict(metrics["requests_by_type"])
        
        # Calculate rate limit violations
        rate_limit_violations = sum(
            1 for log in api_logs
            if log.action == "api_rate_limit_exceeded"
        )
        metrics["rate_limit_violations"] = rate_limit_violations
        
        # Top API consumers
        key_counter = Counter(
            log.details.get("key_id") for log in api_logs
            if log.details and "key_id" in log.details
        )
        metrics["top_consumers"] = [
            {"key_id": key_id, "requests": count}
            for key_id, count in key_counter.most_common(10)
        ]
        
        return metrics
    
    async def calculate_security_events(
        self,
        db: Session,
        time_window: str = "24h"
    ) -> Dict[str, Any]:
        """
        Calculate security event metrics
        
        Args:
            db: Database session
            time_window: Time window for metrics
            
        Returns:
            Security event metrics dictionary
        """
        if time_window not in self.time_windows:
            time_window = "24h"
        
        start_time = datetime.utcnow() - self.time_windows[time_window]
        
        # Query security-related events
        security_actions = [
            "suspicious_activity", "potential_attack",
            "injection_attempt", "xss_attempt",
            "unauthorized_access", "permission_denied",
            "session_hijack_attempt", "geographic_anomaly"
        ]
        
        stmt = select(AuditLog).where(
            and_(
                AuditLog.created_at >= start_time,
                AuditLog.action.in_(security_actions)
            )
        )
        
        result = await db.execute(stmt)
        security_logs = result.scalars().all()
        
        # Categorize events
        events_by_type = defaultdict(list)
        for log in security_logs:
            events_by_type[log.action].append({
                "timestamp": log.created_at.isoformat(),
                "user_id": str(log.user_id) if log.user_id else None,
                "ip_address": log.ip_address,
                "details": log.details
            })
        
        # Calculate threat level
        threat_score = 0
        if len(security_logs) > 0:
            threat_score += min(len(security_logs) * 2, 30)  # Max 30 points for volume
        
        critical_events = ["potential_attack", "injection_attempt", "session_hijack_attempt"]
        critical_count = sum(1 for log in security_logs if log.action in critical_events)
        threat_score += min(critical_count * 10, 40)  # Max 40 points for critical events
        
        # Determine threat level
        if threat_score >= 70:
            threat_level = "critical"
        elif threat_score >= 50:
            threat_level = "high"
        elif threat_score >= 30:
            threat_level = "medium"
        elif threat_score >= 10:
            threat_level = "low"
        else:
            threat_level = "minimal"
        
        return {
            "total_events": len(security_logs),
            "threat_level": threat_level,
            "threat_score": threat_score,
            "events_by_type": dict(events_by_type),
            "critical_events": critical_count,
            "unique_sources": len(set(log.ip_address for log in security_logs if log.ip_address))
        }


class SecurityDashboard:
    """
    Main security dashboard service
    Provides comprehensive security monitoring and alerting
    """
    
    def __init__(self):
        self.metrics = SecurityMetrics()
        self.alert_thresholds = {
            "failed_login_rate": 30,  # Percentage
            "rate_limit_violations": 100,  # Count
            "critical_events": 5,  # Count
            "suspicious_ips": 3  # Count
        }
    
    async def get_dashboard_data(
        self,
        db: Session,
        time_window: str = "24h"
    ) -> Dict[str, Any]:
        """
        Get comprehensive dashboard data
        
        Args:
            db: Database session
            time_window: Time window for metrics
            
        Returns:
            Complete dashboard data dictionary
        """
        try:
            # Gather all metrics concurrently
            auth_task = self.metrics.calculate_auth_metrics(db, time_window)
            api_task = self.metrics.calculate_api_metrics(db, time_window)
            security_task = self.metrics.calculate_security_events(db, time_window)
            
            auth_metrics, api_metrics, security_events = await asyncio.gather(
                auth_task, api_task, security_task
            )
            
            # Get active sessions from Redis if available
            active_sessions = await self._get_active_sessions()
            
            # Check for alerts
            alerts = self._generate_alerts(auth_metrics, api_metrics, security_events)
            
            # Get recent audit logs
            recent_logs = await self._get_recent_audit_logs(db)
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "time_window": time_window,
                "authentication": auth_metrics,
                "api_usage": api_metrics,
                "security_events": security_events,
                "active_sessions": active_sessions,
                "alerts": alerts,
                "recent_activity": recent_logs,
                "system_health": await self._get_system_health()
            }
            
        except Exception as e:
            return {
                "error": f"Failed to generate dashboard data: {str(e)}",
                "timestamp": datetime.utcnow().isoformat(),
                "time_window": time_window
            }
    
    async def _get_active_sessions(self) -> Dict[str, Any]:
        """Get active session information from Redis"""
        if not redis_manager.redis_client:
            return {"count": 0, "sessions": []}
        
        try:
            # Get all session keys
            session_keys = await redis_manager.redis_client.keys("session:*")
            
            sessions = []
            for key in session_keys[:100]:  # Limit to 100 for performance
                session_data = await redis_manager.redis_client.get(key)
                if session_data:
                    try:
                        session = json.loads(session_data)
                        sessions.append({
                            "session_id": key.split(":")[-1],
                            "user_id": session.get("user_id"),
                            "created_at": session.get("created_at"),
                            "last_activity": session.get("last_activity"),
                            "ip_address": session.get("ip_address")
                        })
                    except json.JSONDecodeError:
                        pass
            
            return {
                "count": len(session_keys),
                "sessions": sorted(
                    sessions,
                    key=lambda x: x.get("last_activity", ""),
                    reverse=True
                )[:20]  # Return top 20 most recent
            }
            
        except Exception:
            return {"count": 0, "sessions": []}
    
    async def _get_recent_audit_logs(
        self,
        db: Session,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get recent audit log entries"""
        stmt = (
            select(AuditLog)
            .order_by(desc(AuditLog.created_at))
            .limit(limit)
        )
        
        result = await db.execute(stmt)
        logs = result.scalars().all()
        
        return [
            {
                "id": str(log.id),
                "timestamp": log.created_at.isoformat(),
                "user_id": str(log.user_id) if log.user_id else None,
                "action": log.action,
                "resource": log.resource,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "status": log.status,
                "details": log.details
            }
            for log in logs
        ]
    
    def _generate_alerts(
        self,
        auth_metrics: Dict[str, Any],
        api_metrics: Dict[str, Any],
        security_events: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate security alerts based on metrics"""
        alerts = []
        
        # Check authentication alerts
        if auth_metrics.get("failure_rate", 0) > self.alert_thresholds["failed_login_rate"]:
            alerts.append({
                "type": "authentication",
                "severity": "high",
                "message": f"High login failure rate: {auth_metrics['failure_rate']:.1f}%",
                "details": {
                    "failed_attempts": auth_metrics.get("failed_logins", 0),
                    "total_attempts": auth_metrics.get("total_attempts", 0)
                }
            })
        
        if len(auth_metrics.get("suspicious_ips", [])) >= self.alert_thresholds["suspicious_ips"]:
            alerts.append({
                "type": "authentication",
                "severity": "medium",
                "message": f"Multiple IPs with failed login attempts detected",
                "details": {
                    "suspicious_ips": auth_metrics["suspicious_ips"][:5]
                }
            })
        
        # Check API alerts
        if api_metrics.get("rate_limit_violations", 0) > self.alert_thresholds["rate_limit_violations"]:
            alerts.append({
                "type": "api",
                "severity": "medium",
                "message": f"High number of rate limit violations: {api_metrics['rate_limit_violations']}",
                "details": {
                    "violations": api_metrics["rate_limit_violations"]
                }
            })
        
        # Check security event alerts
        if security_events.get("threat_level") in ["critical", "high"]:
            alerts.append({
                "type": "security",
                "severity": security_events["threat_level"],
                "message": f"Elevated threat level detected: {security_events['threat_level']}",
                "details": {
                    "threat_score": security_events.get("threat_score", 0),
                    "critical_events": security_events.get("critical_events", 0)
                }
            })
        
        if security_events.get("critical_events", 0) >= self.alert_thresholds["critical_events"]:
            alerts.append({
                "type": "security",
                "severity": "critical",
                "message": f"Multiple critical security events detected",
                "details": {
                    "count": security_events["critical_events"],
                    "types": list(security_events.get("events_by_type", {}).keys())
                }
            })
        
        return alerts
    
    async def _get_system_health(self) -> Dict[str, Any]:
        """Get system health metrics"""
        health = {
            "status": "healthy",
            "components": {}
        }
        
        # Check database health
        health["components"]["database"] = {
            "status": "healthy",
            "response_time": None
        }
        
        # Check Redis health
        if redis_manager.redis_client:
            try:
                start_time = datetime.utcnow()
                await redis_manager.redis_client.ping()
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                health["components"]["redis"] = {
                    "status": "healthy",
                    "response_time": f"{response_time:.2f}ms"
                }
            except Exception:
                health["components"]["redis"] = {
                    "status": "unhealthy",
                    "response_time": None
                }
                health["status"] = "degraded"
        else:
            health["components"]["redis"] = {
                "status": "unavailable",
                "response_time": None
            }
        
        return health
    
    async def export_security_report(
        self,
        db: Session,
        format: str = "json",
        time_window: str = "7d"
    ) -> Dict[str, Any]:
        """
        Export security report in various formats
        
        Args:
            db: Database session
            format: Export format (json, csv, pdf)
            time_window: Time window for report
            
        Returns:
            Report data or file path
        """
        # Get comprehensive dashboard data
        dashboard_data = await self.get_dashboard_data(db, time_window)
        
        if format == "json":
            return dashboard_data
        
        # Additional format handlers can be added here
        # For CSV: Convert to tabular format
        # For PDF: Generate formatted document
        
        return {
            "format": format,
            "message": f"Export format {format} not yet implemented",
            "data": dashboard_data
        }


# Export singleton instance
security_dashboard = SecurityDashboard()