"""
Performance monitoring and optimization API endpoints.
"""
from datetime import datetime
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.cache_manager import cache_manager, get_cache_stats, cache_result
from app.core.rate_limiter import rate_limiter
from app.services.performance_service import performance_monitor
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/performance", tags=["Performance & Optimization"])


@router.get("/metrics")
async def get_system_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current system performance metrics."""
    try:
        metrics = await performance_monitor.collect_system_metrics()
        return {
            "success": True,
            "data": metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system metrics"
        )


@router.get("/summary")
async def get_performance_summary(
    hours: int = Query(1, ge=1, le=24, description="Time period in hours"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get performance summary for specified time period."""
    try:
        summary = await performance_monitor.get_performance_summary(hours=hours)
        return {
            "success": True,
            "data": summary,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get performance summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve performance summary"
        )


@router.get("/cache/stats")
async def get_cache_statistics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive cache statistics."""
    try:
        stats = await get_cache_stats()
        return {
            "success": True,
            "data": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cache statistics"
        )


@router.post("/cache/clear")
async def clear_cache(
    pattern: Optional[str] = Query(None, description="Pattern to match for cache invalidation"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clear cache entries, optionally matching a pattern."""
    try:
        if pattern:
            await cache_manager.invalidate_pattern(pattern)
            message = f"Cache entries matching pattern '{pattern}' have been cleared"
        else:
            # Clear all cache (be careful with this)
            await cache_manager.l1_cache.cache.clear()
            await cache_manager.invalidate_pattern("*")
            message = "All cache entries have been cleared"
        
        logger.info(f"Cache cleared by user {current_user.id}: {message}")
        
        return {
            "success": True,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear cache"
        )


@router.post("/cache/warm")
async def warm_cache(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Warm up cache with frequently accessed data."""
    try:
        from app.core.cache_manager import warm_cache_on_startup
        
        await warm_cache_on_startup()
        
        logger.info(f"Cache warming triggered by user {current_user.id}")
        
        return {
            "success": True,
            "message": "Cache warming completed successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to warm cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to warm cache"
        )


@router.get("/rate-limits")
async def get_rate_limit_status(
    identifier: Optional[str] = Query(None, description="Specific identifier to check"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get rate limiting status and statistics."""
    try:
        if identifier:
            # Get status for specific identifier
            status_info = await rate_limiter.get_rate_limit_status(identifier)
            return {
                "success": True,
                "data": {
                    "identifier": identifier,
                    "status": status_info
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            # Get general rate limiting metrics
            metrics = await performance_monitor._get_rate_limit_metrics()
            return {
                "success": True,
                "data": metrics,
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        logger.error(f"Failed to get rate limit status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve rate limit status"
        )


@router.post("/rate-limits/reset")
async def reset_rate_limit(
    identifier: str = Query(..., description="Identifier to reset rate limits for"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reset rate limits for a specific identifier."""
    try:
        await rate_limiter.reset_rate_limit(identifier)
        
        logger.info(f"Rate limit reset by user {current_user.id} for identifier: {identifier}")
        
        return {
            "success": True,
            "message": f"Rate limits reset for identifier: {identifier}",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to reset rate limit: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset rate limit"
        )


@router.post("/optimize")
async def optimize_performance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Trigger automatic performance optimizations."""
    try:
        result = await performance_monitor.optimize_performance()
        
        logger.info(f"Performance optimization triggered by user {current_user.id}")
        
        return {
            "success": True,
            "data": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to optimize performance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to optimize performance"
        )


@router.get("/alerts")
async def get_performance_alerts(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of alerts to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get recent performance alerts."""
    try:
        alerts = performance_monitor.performance_alerts[-limit:] if performance_monitor.performance_alerts else []
        
        return {
            "success": True,
            "data": {
                "alerts": alerts,
                "total_count": len(performance_monitor.performance_alerts)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get performance alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve performance alerts"
        )


@router.get("/health")
async def get_system_health(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get overall system health status."""
    try:
        # Get recent metrics for health calculation
        recent_metrics = performance_monitor.metrics_history[-10:] if performance_monitor.metrics_history else []
        
        if not recent_metrics:
            # Collect current metrics if none available
            await performance_monitor.collect_system_metrics()
            recent_metrics = performance_monitor.metrics_history[-1:] if performance_monitor.metrics_history else []
        
        health_score = await performance_monitor._calculate_health_score(recent_metrics)
        recommendations = await performance_monitor._generate_recommendations(recent_metrics)
        
        # Determine health status
        if health_score >= 80:
            health_status = "excellent"
        elif health_score >= 60:
            health_status = "good"
        elif health_score >= 40:
            health_status = "fair"
        else:
            health_status = "poor"
        
        return {
            "success": True,
            "data": {
                "health_score": health_score,
                "health_status": health_status,
                "recommendations": recommendations,
                "alert_count": len(performance_monitor.performance_alerts),
                "metrics_available": len(recent_metrics)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get system health: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system health"
        )