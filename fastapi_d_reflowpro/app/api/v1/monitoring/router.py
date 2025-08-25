"""
Monitoring and metrics API endpoints.
"""
from fastapi import APIRouter, Response, Depends, HTTPException, status
from typing import Dict, Any, Optional
import logging
from datetime import datetime

from app.services.metrics_service import get_metrics_data, metrics
from app.services.performance_service import performance_monitor
from app.core.deps import get_current_user
from app.models.user import User
from app.core.cache_manager import cache_manager
from prometheus_client import CONTENT_TYPE_LATEST

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring systems.
    
    This endpoint provides a quick health status without authentication.
    """
    try:
        # Basic health indicators
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "environment": "development"
        }
        
        # Quick system check
        try:
            await cache_manager.set("health_check", "ok", l1_ttl=10, l2_ttl=30)
            cache_test = await cache_manager.get("health_check")
            health_data["cache"] = "operational" if cache_test == "ok" else "degraded"
        except Exception:
            health_data["cache"] = "unavailable"
        
        return health_data
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable"
        )


@router.get("/metrics")
async def get_prometheus_metrics():
    """
    Prometheus metrics endpoint.
    
    Returns metrics in Prometheus format for scraping.
    """
    try:
        metrics_data = await get_metrics_data()
        return Response(
            content=metrics_data,
            media_type=CONTENT_TYPE_LATEST
        )
    except Exception as e:
        logger.error(f"Failed to generate metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate metrics"
        )


@router.get("/metrics/summary")
async def get_metrics_summary(current_user: User = Depends(get_current_user)):
    """
    Get high-level metrics summary.
    
    Returns key metrics in JSON format for dashboards.
    """
    try:
        # Collect current system metrics
        system_metrics = await performance_monitor.collect_system_metrics()
        
        # Get cache statistics
        cache_stats = cache_manager.get_hit_ratio()
        
        summary = {
            "timestamp": system_metrics.get("timestamp"),
            "system": {
                "cpu_usage": system_metrics.get("system", {}).get("cpu_usage_percent", 0),
                "memory_usage": system_metrics.get("system", {}).get("memory_usage_percent", 0),
                "disk_usage": system_metrics.get("system", {}).get("disk_usage_percent", 0),
            },
            "cache": {
                "hit_ratio": cache_stats.get("hit_ratio", 0),
                "l1_hit_ratio": cache_stats.get("l1_ratio", 0),
                "l2_hit_ratio": cache_stats.get("l2_ratio", 0),
                "total_requests": cache_stats.get("total_requests", 0),
                "l1_cache_size": cache_stats.get("l1_cache_size", 0),
            },
            "redis": system_metrics.get("redis", {}),
            "performance": {
                "health_score": await performance_monitor._calculate_health_score([system_metrics]),
                "alerts": len(performance_monitor.performance_alerts),
            }
        }
        
        return summary
        
    except Exception as e:
        logger.error(f"Failed to get metrics summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve metrics summary"
        )


@router.get("/alerts")
async def get_alerts(current_user: User = Depends(get_current_user)):
    """
    Get current system alerts.
    
    Returns active alerts and their details.
    """
    try:
        alerts = performance_monitor.performance_alerts[-20:]  # Last 20 alerts
        
        # Categorize alerts by severity
        critical_alerts = [a for a in alerts if a.get('severity') == 'critical']
        warning_alerts = [a for a in alerts if a.get('severity') == 'warning']
        
        return {
            "total_alerts": len(alerts),
            "critical_count": len(critical_alerts),
            "warning_count": len(warning_alerts),
            "recent_alerts": alerts,
            "critical_alerts": critical_alerts[:5],  # Top 5 critical
            "warning_alerts": warning_alerts[:10],  # Top 10 warnings
        }
        
    except Exception as e:
        logger.error(f"Failed to get alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alerts"
        )


@router.post("/metrics/reset")
async def reset_metrics(current_user: User = Depends(get_current_user)):
    """
    Reset specific metrics counters.
    
    Useful for testing and development.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        # Reset performance alerts
        performance_monitor.performance_alerts = []
        
        # Reset cache statistics
        cache_manager.hit_stats = {
            'l1_hits': 0,
            'l2_hits': 0,
            'misses': 0,
            'total_requests': 0
        }
        
        return {
            "message": "Metrics reset successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to reset metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset metrics"
        )


@router.get("/dashboard/data")
async def get_dashboard_data(
    hours: int = 1,
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive dashboard data.
    
    Returns data for monitoring dashboards and visualizations.
    """
    try:
        # Get performance summary for the specified time period
        performance_summary = await performance_monitor.get_performance_summary(hours=hours)
        
        # Get current metrics
        current_metrics = await performance_monitor.collect_system_metrics()
        
        # Get cache statistics
        cache_stats = cache_manager.get_hit_ratio()
        
        dashboard_data = {
            "period_hours": hours,
            "current_metrics": current_metrics,
            "performance_summary": performance_summary,
            "cache_statistics": cache_stats,
            "system_health": {
                "overall_score": performance_summary.get("health_score", 0),
                "recommendations": performance_summary.get("recommendations", []),
                "alerts_count": len(performance_summary.get("recent_alerts", [])),
            },
            "trends": {
                "cpu_trend": "stable",  # Could be calculated from metrics_history
                "memory_trend": "stable",
                "cache_trend": "improving" if cache_stats.get("hit_ratio", 0) > 0.7 else "needs_attention"
            }
        }
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Failed to get dashboard data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard data"
        )


@router.get("/stats/system")
async def get_system_stats(current_user: User = Depends(get_current_user)):
    """
    Get detailed system statistics.
    
    Returns comprehensive system performance data.
    """
    try:
        stats = await performance_monitor.collect_system_metrics()
        
        # Add additional computed metrics
        if 'system' in stats:
            system = stats['system']
            
            # Memory calculations
            if 'memory_available_gb' in system:
                stats['system']['memory_used_gb'] = round(
                    system.get('memory_available_gb', 0) * 
                    (system.get('memory_usage_percent', 0) / 100), 2
                )
            
            # Network rate calculations (simple approximation)
            stats['system']['network_utilization'] = min(100.0, 
                (system.get('network_bytes_sent', 0) + 
                 system.get('network_bytes_recv', 0)) / (1024 * 1024)  # Convert to MB
            )
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get system stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system statistics"
        )


@router.get("/config")
async def get_monitoring_config(current_user: User = Depends(get_current_user)):
    """
    Get monitoring configuration.
    
    Returns current monitoring settings and thresholds.
    """
    try:
        config = {
            "alert_thresholds": performance_monitor.alert_thresholds,
            "metrics_collection": {
                "interval_seconds": 30,
                "retention_samples": 100,
                "enabled_collectors": [
                    "system_metrics",
                    "cache_metrics",
                    "redis_metrics",
                    "performance_metrics"
                ]
            },
            "cache_settings": {
                "l1_max_size": cache_manager.l1_cache.max_size,
                "default_l1_ttl": 300,
                "default_l2_ttl": 1800,
            },
            "prometheus": {
                "metrics_endpoint": "/api/v1/monitoring/metrics",
                "scrape_interval": "30s",
                "retention": "15d"
            }
        }
        
        return config
        
    except Exception as e:
        logger.error(f"Failed to get monitoring config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve monitoring configuration"
        )