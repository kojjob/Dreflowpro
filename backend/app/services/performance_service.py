"""
Performance monitoring and optimization service.
"""
import asyncio
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import psutil
import logging

from app.core.cache_manager import cache_manager, get_cache_stats
from app.core.rate_limiter import rate_limiter
from app.core.redis import redis_manager

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """System performance monitoring and optimization service."""
    
    def __init__(self):
        self.metrics_history = []
        self.alert_thresholds = {
            'cpu_usage': 80.0,  # CPU usage percentage
            'memory_usage': 85.0,  # Memory usage percentage
            'response_time': 5.0,  # Response time in seconds
            'cache_hit_ratio': 0.6,  # Minimum cache hit ratio
            'error_rate': 0.05,  # Maximum error rate (5%)
        }
        self.performance_alerts = []
    
    async def collect_system_metrics(self) -> Dict[str, Any]:
        """Collect comprehensive system performance metrics."""
        try:
            # System metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Network I/O
            net_io = psutil.net_io_counters()
            
            # Process metrics
            process = psutil.Process()
            process_memory = process.memory_info()
            
            # Redis metrics
            redis_info = await self._get_redis_metrics()
            
            # Cache metrics
            cache_stats = await get_cache_stats()
            
            # Rate limiter metrics
            rate_limit_stats = await self._get_rate_limit_metrics()
            
            metrics = {
                'timestamp': datetime.utcnow().isoformat(),
                'system': {
                    'cpu_usage_percent': cpu_percent,
                    'memory_usage_percent': memory.percent,
                    'memory_available_gb': memory.available / (1024**3),
                    'disk_usage_percent': (disk.used / disk.total) * 100,
                    'disk_free_gb': disk.free / (1024**3),
                    'network_bytes_sent': net_io.bytes_sent,
                    'network_bytes_recv': net_io.bytes_recv,
                },
                'process': {
                    'memory_rss_mb': process_memory.rss / (1024**2),
                    'memory_vms_mb': process_memory.vms / (1024**2),
                    'cpu_percent': process.cpu_percent(),
                    'num_threads': process.num_threads(),
                    'num_fds': process.num_fds() if hasattr(process, 'num_fds') else 0,
                },
                'redis': redis_info,
                'cache': cache_stats,
                'rate_limiter': rate_limit_stats,
            }
            
            # Store metrics history (keep last 100 entries)
            self.metrics_history.append(metrics)
            if len(self.metrics_history) > 100:
                self.metrics_history.pop(0)
            
            # Check for performance alerts
            await self._check_performance_alerts(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'error': str(e)
            }
    
    async def _get_redis_metrics(self) -> Dict[str, Any]:
        """Get Redis performance metrics."""
        try:
            info = await redis_manager.info()
            
            return {
                'connected_clients': info.get('connected_clients', 0),
                'used_memory_mb': info.get('used_memory', 0) / (1024**2),
                'used_memory_peak_mb': info.get('used_memory_peak', 0) / (1024**2),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'expired_keys': info.get('expired_keys', 0),
                'evicted_keys': info.get('evicted_keys', 0),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'instantaneous_ops_per_sec': info.get('instantaneous_ops_per_sec', 0),
            }
        except Exception as e:
            logger.error(f"Error getting Redis metrics: {e}")
            return {'error': str(e)}
    
    async def _get_rate_limit_metrics(self) -> Dict[str, Any]:
        """Get rate limiter performance metrics."""
        try:
            # Get approximate count of active rate limits
            pattern = "rate_limit:*"
            keys = await redis_manager.keys(pattern)
            
            # Get blocked identifiers
            blocked_pattern = "rate_limit_block:*"
            blocked_keys = await redis_manager.keys(blocked_pattern)
            
            return {
                'active_rate_limits': len(keys) if keys else 0,
                'blocked_identifiers': len(blocked_keys) if blocked_keys else 0,
                'status': 'healthy'
            }
        except Exception as e:
            logger.error(f"Error getting rate limit metrics: {e}")
            return {'error': str(e)}
    
    async def _check_performance_alerts(self, metrics: Dict[str, Any]):
        """Check metrics against thresholds and generate alerts."""
        alerts = []
        
        try:
            system = metrics.get('system', {})
            cache = metrics.get('cache', {})
            
            # CPU usage alert
            cpu_usage = system.get('cpu_usage_percent', 0)
            if cpu_usage > self.alert_thresholds['cpu_usage']:
                alerts.append({
                    'type': 'cpu_high',
                    'severity': 'warning' if cpu_usage < 90 else 'critical',
                    'message': f'CPU usage high: {cpu_usage:.1f}%',
                    'value': cpu_usage,
                    'threshold': self.alert_thresholds['cpu_usage'],
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            # Memory usage alert
            memory_usage = system.get('memory_usage_percent', 0)
            if memory_usage > self.alert_thresholds['memory_usage']:
                alerts.append({
                    'type': 'memory_high',
                    'severity': 'warning' if memory_usage < 95 else 'critical',
                    'message': f'Memory usage high: {memory_usage:.1f}%',
                    'value': memory_usage,
                    'threshold': self.alert_thresholds['memory_usage'],
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            # Cache performance alert
            hit_ratio = cache.get('hit_ratio', 0)
            if hit_ratio < self.alert_thresholds['cache_hit_ratio']:
                alerts.append({
                    'type': 'cache_performance',
                    'severity': 'warning',
                    'message': f'Cache hit ratio low: {hit_ratio:.1%}',
                    'value': hit_ratio,
                    'threshold': self.alert_thresholds['cache_hit_ratio'],
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            # Store alerts (keep last 50)
            self.performance_alerts.extend(alerts)
            if len(self.performance_alerts) > 50:
                self.performance_alerts = self.performance_alerts[-50:]
            
            # Log critical alerts
            for alert in alerts:
                if alert['severity'] == 'critical':
                    logger.error(f"Performance alert: {alert['message']}")
                else:
                    logger.warning(f"Performance alert: {alert['message']}")
        
        except Exception as e:
            logger.error(f"Error checking performance alerts: {e}")
    
    async def get_performance_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get performance summary for the specified time period."""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            # Filter metrics within time range
            recent_metrics = [
                m for m in self.metrics_history
                if datetime.fromisoformat(m['timestamp']) > cutoff_time
            ]
            
            if not recent_metrics:
                return {'error': 'No metrics available for the specified time period'}
            
            # Calculate averages and trends
            cpu_values = [m.get('system', {}).get('cpu_usage_percent', 0) for m in recent_metrics]
            memory_values = [m.get('system', {}).get('memory_usage_percent', 0) for m in recent_metrics]
            
            cache_stats = recent_metrics[-1].get('cache', {}) if recent_metrics else {}
            
            summary = {
                'time_period_hours': hours,
                'metrics_count': len(recent_metrics),
                'system_performance': {
                    'avg_cpu_usage': sum(cpu_values) / len(cpu_values) if cpu_values else 0,
                    'max_cpu_usage': max(cpu_values) if cpu_values else 0,
                    'avg_memory_usage': sum(memory_values) / len(memory_values) if memory_values else 0,
                    'max_memory_usage': max(memory_values) if memory_values else 0,
                },
                'cache_performance': cache_stats,
                'recent_alerts': [
                    alert for alert in self.performance_alerts
                    if datetime.fromisoformat(alert['timestamp']) > cutoff_time
                ],
                'health_score': await self._calculate_health_score(recent_metrics),
                'recommendations': await self._generate_recommendations(recent_metrics)
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating performance summary: {e}")
            return {'error': str(e)}
    
    async def _calculate_health_score(self, metrics_list: List[Dict]) -> float:
        """Calculate overall system health score (0-100)."""
        if not metrics_list:
            return 0.0
        
        try:
            latest_metrics = metrics_list[-1]
            system = latest_metrics.get('system', {})
            cache = latest_metrics.get('cache', {})
            
            # Component scores (0-100)
            cpu_score = max(0, 100 - system.get('cpu_usage_percent', 0))
            memory_score = max(0, 100 - system.get('memory_usage_percent', 0))
            cache_score = min(100, cache.get('hit_ratio', 0) * 100)
            
            # Weighted average
            health_score = (
                cpu_score * 0.3 +
                memory_score * 0.3 +
                cache_score * 0.4
            )
            
            return round(health_score, 1)
            
        except Exception as e:
            logger.error(f"Error calculating health score: {e}")
            return 0.0
    
    async def _generate_recommendations(self, metrics_list: List[Dict]) -> List[str]:
        """Generate performance optimization recommendations."""
        recommendations = []
        
        if not metrics_list:
            return recommendations
        
        try:
            latest_metrics = metrics_list[-1]
            system = latest_metrics.get('system', {})
            cache = latest_metrics.get('cache', {})
            
            # CPU recommendations
            cpu_usage = system.get('cpu_usage_percent', 0)
            if cpu_usage > 80:
                recommendations.append("High CPU usage detected. Consider scaling up compute resources or optimizing CPU-intensive operations.")
            
            # Memory recommendations
            memory_usage = system.get('memory_usage_percent', 0)
            if memory_usage > 85:
                recommendations.append("High memory usage detected. Consider increasing memory allocation or implementing memory optimization strategies.")
            
            # Cache recommendations
            hit_ratio = cache.get('hit_ratio', 0)
            if hit_ratio < 0.6:
                recommendations.append("Low cache hit ratio. Consider reviewing cache keys, TTL values, or cache warming strategies.")
            
            # Redis recommendations
            redis_metrics = latest_metrics.get('redis', {})
            evicted_keys = redis_metrics.get('evicted_keys', 0)
            if evicted_keys > 1000:
                recommendations.append("High number of Redis key evictions. Consider increasing Redis memory limit or optimizing data structure usage.")
            
            # Rate limiting recommendations
            rate_limit_metrics = latest_metrics.get('rate_limiter', {})
            blocked_count = rate_limit_metrics.get('blocked_identifiers', 0)
            if blocked_count > 10:
                recommendations.append("High number of rate-limited identifiers. Monitor for potential abuse or consider adjusting rate limit thresholds.")
            
            # General recommendations
            if len(metrics_list) > 10:
                # Analyze trends
                cpu_trend = [m.get('system', {}).get('cpu_usage_percent', 0) for m in metrics_list[-10:]]
                if len(cpu_trend) > 5 and all(cpu_trend[i] < cpu_trend[i+1] for i in range(len(cpu_trend)-1)):
                    recommendations.append("CPU usage is trending upward. Monitor for potential resource exhaustion.")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return ["Unable to generate recommendations due to system error."]
    
    async def optimize_performance(self) -> Dict[str, Any]:
        """Perform automatic performance optimizations."""
        optimizations_applied = []
        
        try:
            metrics = await self.collect_system_metrics()
            system = metrics.get('system', {})
            cache = metrics.get('cache', {})
            
            # Cache optimization
            hit_ratio = cache.get('hit_ratio', 0)
            if hit_ratio < 0.5:
                # Trigger cache warming for frequently accessed data
                await cache_manager.warm_cache_on_startup()
                optimizations_applied.append("Triggered cache warming for low hit ratio")
            
            # Memory optimization
            memory_usage = system.get('memory_usage_percent', 0)
            if memory_usage > 90:
                # Reduce L1 cache size to free up memory
                cache_manager.l1_cache.max_size = max(100, cache_manager.l1_cache.max_size // 2)
                optimizations_applied.append("Reduced L1 cache size to free memory")
            
            # Rate limiter optimization
            rate_limit_stats = metrics.get('rate_limiter', {})
            blocked_count = rate_limit_stats.get('blocked_identifiers', 0)
            if blocked_count > 20:
                # Could trigger more aggressive rate limiting or IP blocking
                optimizations_applied.append("High abuse detected - consider manual review")
            
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'optimizations_applied': optimizations_applied,
                'status': 'completed'
            }
            
        except Exception as e:
            logger.error(f"Error during performance optimization: {e}")
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'error': str(e),
                'status': 'failed'
            }


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


async def start_performance_monitoring():
    """Start background performance monitoring."""
    async def monitor_loop():
        while True:
            try:
                await performance_monitor.collect_system_metrics()
                await asyncio.sleep(30)  # Collect metrics every 30 seconds
            except Exception as e:
                logger.error(f"Performance monitoring error: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    # Start monitoring task
    task = asyncio.create_task(monitor_loop())
    logger.info("Performance monitoring started")
    return task