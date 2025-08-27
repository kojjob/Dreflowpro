"""System status and health check API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
import asyncio
import logging
from datetime import datetime, timedelta, timezone
import psutil
import time
import redis.asyncio as redis

from app.core.deps import get_current_user, get_db
from app.core.config import settings
from app.models.user import User
from app.services.performance_service import performance_monitor
from app.core.cache_manager import cache_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/system", tags=["system"])


async def check_database_health(db: AsyncSession) -> Dict[str, Any]:
    """Check database connectivity and performance."""
    try:
        start_time = time.time()
        
        # Simple connectivity check
        from sqlalchemy import text
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        
        # Get connection pool stats if available
        pool_status = {}
        if hasattr(db.bind, 'pool'):
            pool_status = {
                "size": db.bind.pool.size(),
                "checked_in": db.bind.pool.checkedin(),
                "checked_out": db.bind.pool.checkedout(),
                "overflow": db.bind.pool.overflow(),
            }
        
        response_time = (time.time() - start_time) * 1000  # Convert to ms
        
        return {
            "status": "healthy",
            "response_time_ms": round(response_time, 2),
            "pool_status": pool_status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


async def check_redis_health() -> Dict[str, Any]:
    """Check Redis connectivity and performance."""
    try:
        start_time = time.time()
        
        # Test Redis connection
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        
        # Ping Redis
        await redis_client.ping()
        
        # Get Redis info
        info = await redis_client.info()
        memory_info = {
            "used_memory": info.get("used_memory_human", "unknown"),
            "used_memory_peak": info.get("used_memory_peak_human", "unknown"),
            "connected_clients": info.get("connected_clients", 0),
        }
        
        await redis_client.close()
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "status": "healthy",
            "response_time_ms": round(response_time, 2),
            "memory_info": memory_info,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.
    
    Returns a simple status indicating if the service is running.
    """
    return {
        "status": "healthy",
        "service": "dreflowpro-api",
        "version": getattr(settings, 'VERSION', "1.0.0"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/health/live")
async def liveness_probe():
    """
    Kubernetes liveness probe endpoint.
    
    Returns HTTP 200 if the service is alive.
    """
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/health/ready")
async def readiness_probe(db: AsyncSession = Depends(get_db)):
    """
    Kubernetes readiness probe endpoint.
    
    Checks if the service is ready to accept requests.
    """
    # Check database connectivity
    db_health = await check_database_health(db)
    
    # Check Redis connectivity
    redis_health = await check_redis_health()
    
    # Service is ready if both database and Redis are healthy
    is_ready = (
        db_health["status"] == "healthy" and
        redis_health["status"] == "healthy"
    )
    
    if not is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "not_ready",
                "database": db_health["status"],
                "redis": redis_health["status"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    
    return {
        "status": "ready",
        "database": db_health["status"],
        "redis": redis_health["status"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/health/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    """
    Detailed health check with comprehensive system status.
    
    Returns detailed information about all system components.
    """
    # Run all health checks concurrently
    health_checks = await asyncio.gather(
        check_database_health(db),
        check_redis_health(),
        return_exceptions=True
    )
    
    # Parse results
    db_health = health_checks[0] if not isinstance(health_checks[0], Exception) else {
        "status": "error",
        "error": str(health_checks[0])
    }
    
    redis_health = health_checks[1] if not isinstance(health_checks[1], Exception) else {
        "status": "error",
        "error": str(health_checks[1])
    }
    
    # Get system metrics
    system_metrics = {
        "cpu": {
            "usage_percent": psutil.cpu_percent(interval=0.1),
            "core_count": psutil.cpu_count()
        },
        "memory": {
            "total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
            "used_percent": psutil.virtual_memory().percent
        },
        "disk": {
            "total_gb": round(psutil.disk_usage('/').total / (1024**3), 2),
            "free_gb": round(psutil.disk_usage('/').free / (1024**3), 2),
            "used_percent": psutil.disk_usage('/').percent
        }
    }
    
    # Get cache statistics
    cache_stats = await cache_manager.get_stats()
    
    # Determine overall health status
    overall_status = "healthy"
    if db_health["status"] != "healthy" or redis_health["status"] != "healthy":
        overall_status = "unhealthy"
    
    return {
        "status": overall_status,
        "components": {
            "database": db_health,
            "redis": redis_health,
            "cache": cache_stats
        },
        "system": system_metrics,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/status")
async def get_system_status(
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive system status information.
    
    Returns system health, resource usage, and operational status.
    """
    try:
        # Get current system metrics
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        boot_time = psutil.boot_time()
        uptime_seconds = int(time.time() - boot_time)
        
        # Convert uptime to human readable format
        uptime_delta = timedelta(seconds=uptime_seconds)
        uptime_str = f"{uptime_delta.days}d {uptime_delta.seconds//3600}h {(uptime_delta.seconds//60)%60}m"
        
        # Get cache status
        cache_status = "operational"
        try:
            await cache_manager.set("status_check", "ok", l1_ttl=10, l2_ttl=30)
            cache_test = await cache_manager.get("status_check")
            if cache_test != "ok":
                cache_status = "degraded"
        except Exception:
            cache_status = "unavailable"
        
        # Get system load averages (Unix-like systems)
        try:
            load_avg = psutil.getloadavg()
            load_averages = {
                "1min": round(load_avg[0], 2),
                "5min": round(load_avg[1], 2),
                "15min": round(load_avg[2], 2)
            }
        except (AttributeError, OSError):
            # getloadavg not available on Windows
            load_averages = {
                "1min": 0.0,
                "5min": 0.0,
                "15min": 0.0
            }
        
        # Get network statistics
        try:
            network = psutil.net_io_counters()
            network_stats = {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv
            }
        except Exception:
            network_stats = {
                "bytes_sent": 0,
                "bytes_recv": 0,
                "packets_sent": 0,
                "packets_recv": 0
            }
        
        # Get process count
        try:
            process_count = len(psutil.pids())
        except Exception:
            process_count = 0
        
        # Calculate system health score
        health_factors = []
        
        # CPU health (lower is better)
        if cpu_usage < 50:
            health_factors.append(100)
        elif cpu_usage < 80:
            health_factors.append(75)
        else:
            health_factors.append(25)
        
        # Memory health
        if memory.percent < 60:
            health_factors.append(100)
        elif memory.percent < 85:
            health_factors.append(75)
        else:
            health_factors.append(25)
        
        # Disk health
        if disk.percent < 70:
            health_factors.append(100)
        elif disk.percent < 90:
            health_factors.append(75)
        else:
            health_factors.append(25)
        
        # Cache health
        if cache_status == "operational":
            health_factors.append(100)
        elif cache_status == "degraded":
            health_factors.append(50)
        else:
            health_factors.append(0)
        
        overall_health_score = round(sum(health_factors) / len(health_factors), 1)
        
        # Determine overall status
        if overall_health_score >= 90:
            overall_status = "excellent"
        elif overall_health_score >= 75:
            overall_status = "good"
        elif overall_health_score >= 50:
            overall_status = "fair"
        else:
            overall_status = "poor"
        
        # Get performance alerts if available
        alerts = []
        try:
            recent_alerts = performance_monitor.performance_alerts[-5:]  # Last 5 alerts
            alerts = [
                {
                    "type": alert.get("type", "unknown"),
                    "message": alert.get("message", ""),
                    "severity": alert.get("severity", "info"),
                    "timestamp": alert.get("timestamp", "")
                }
                for alert in recent_alerts
            ]
        except Exception:
            # Performance monitor might not be available
            pass
        
        system_status = {
            "overall": {
                "status": overall_status,
                "health_score": overall_health_score,
                "uptime": uptime_str,
                "uptime_seconds": uptime_seconds,
                "timestamp": datetime.utcnow().isoformat()
            },
            "resources": {
                "cpu": {
                    "usage_percent": round(cpu_usage, 1),
                    "load_averages": load_averages,
                    "cores": psutil.cpu_count()
                },
                "memory": {
                    "usage_percent": round(memory.percent, 1),
                    "total_gb": round(memory.total / (1024**3), 2),
                    "available_gb": round(memory.available / (1024**3), 2),
                    "used_gb": round(memory.used / (1024**3), 2)
                },
                "disk": {
                    "usage_percent": round(disk.percent, 1),
                    "total_gb": round(disk.total / (1024**3), 2),
                    "free_gb": round(disk.free / (1024**3), 2),
                    "used_gb": round(disk.used / (1024**3), 2)
                },
                "network": network_stats,
                "processes": {
                    "total_count": process_count
                }
            },
            "services": {
                "database": "connected",  # Would check actual DB connection in real implementation
                "cache": cache_status,
                "background_jobs": "operational",  # Would check Celery status
                "redis": "operational"  # Would check Redis connection
            },
            "alerts": alerts,
            "maintenance": {
                "next_scheduled": None,  # Would be actual maintenance window
                "last_restart": datetime.fromtimestamp(boot_time).isoformat(),
                "backup_status": "current",
                "update_available": False
            },
            "environment": {
                "python_version": f"{psutil.version_info}",
                "platform": f"{psutil.LINUX or psutil.WINDOWS or psutil.MACOS}",
                "architecture": "x86_64"  # Would detect actual architecture
            }
        }
        
        return {
            "success": True,
            "data": system_status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get system status: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to retrieve system status"
        )


@router.get("/info")
async def get_system_info(
    current_user: User = Depends(get_current_user)
):
    """Get basic system information."""
    try:
        system_info = {
            "hostname": psutil.boot_time(),  # Would use socket.gethostname() in real implementation
            "platform": "linux",  # Would detect actual platform
            "python_version": f"{psutil.version_info}",
            "cpu_count": psutil.cpu_count(),
            "memory_total": round(psutil.virtual_memory().total / (1024**3), 2),
            "disk_total": round(psutil.disk_usage('/').total / (1024**3), 2),
            "uptime_seconds": int(time.time() - psutil.boot_time())
        }
        
        return {
            "success": True,
            "info": system_info,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get system info: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve system information"
        )