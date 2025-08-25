"""
Prometheus metrics collection middleware.
"""
import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.metrics_service import metrics

logger = logging.getLogger(__name__)


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware to collect Prometheus metrics for HTTP requests."""
    
    def __init__(self, app, exclude_paths: list = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            '/metrics',
            '/health',
            '/favicon.ico',
            '/docs',
            '/openapi.json'
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and collect metrics."""
        start_time = time.time()
        
        # Skip metrics collection for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # Extract request information
        method = request.method
        endpoint = self._get_endpoint_name(request)
        
        try:
            # Process request
            response = await call_next(request)
            status_code = response.status_code
            
        except Exception as e:
            # Handle exceptions and still record metrics
            status_code = 500
            logger.error(f"Request failed with exception: {e}")
            raise
        
        finally:
            # Calculate duration and record metrics
            duration = time.time() - start_time
            
            # Record HTTP request metrics
            metrics.record_http_request(
                method=method,
                endpoint=endpoint,
                status_code=status_code,
                duration=duration
            )
            
            # Record rate limiting if applicable
            if hasattr(request.state, 'rate_limited'):
                if request.state.rate_limited:
                    metrics.record_rate_limit_hit('ip', endpoint)
                    if hasattr(request.state, 'rate_limit_blocked'):
                        if request.state.rate_limit_blocked:
                            metrics.record_rate_limit_block('ip', endpoint, 'exceeded')
        
        return response
    
    def _get_endpoint_name(self, request: Request) -> str:
        """Extract endpoint name from request."""
        try:
            # Try to get route path pattern
            if hasattr(request, 'scope') and 'route' in request.scope:
                route = request.scope['route']
                if hasattr(route, 'path'):
                    return route.path
            
            # Fallback to URL path
            path = request.url.path
            
            # Clean up path for better grouping
            path_parts = path.split('/')
            
            # Handle API versioning
            if len(path_parts) > 2 and path_parts[1] == 'api' and path_parts[2].startswith('v'):
                if len(path_parts) > 3:
                    return f"/api/{path_parts[2]}/{path_parts[3]}"
                else:
                    return f"/api/{path_parts[2]}"
            
            # Handle common patterns
            if len(path_parts) > 1:
                return f"/{path_parts[1]}"
            
            return path if path != '/' else '/root'
            
        except Exception as e:
            logger.warning(f"Failed to extract endpoint name: {e}")
            return '/unknown'