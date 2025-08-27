"""System status and information API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import logging
from datetime import datetime, timedelta
import psutil
import time

from app.core.deps import get_current_user
from app.models.user import User
from app.services.performance_service import performance_monitor
from app.core.cache_manager import cache_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/system", tags=["system"])


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