from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

# Import core components
from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.redis import init_redis, close_redis
from app.core.openapi_config import setup_openapi_docs
from app.core.cache_manager import warm_cache_on_startup
from app.services.performance_service import start_performance_monitoring
from app.services.metrics_service import start_background_metrics_collection
from app.core.prometheus_middleware import PrometheusMiddleware

# Import all models to register them with SQLAlchemy
import app.models.all  # noqa

# Import API routers - Full implementation for Phase 2
from app.api.v1.router import router as v1_router

# Import middleware
from app.middleware.rate_limiting import GlobalRateLimitMiddleware, APIRateLimitMiddleware
from app.middleware.csrf_protection import CSRFProtectionMiddleware
from app.middleware.audit_middleware import AuditLoggingMiddleware, SecurityAuditMiddleware
from app.core.tenant_middleware import TenantMiddleware
from app.middleware.rate_limiter import rate_limit_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    await init_db()
    print("✅ Database initialized")
    
    # Initialize Redis
    redis_connected = await init_redis()
    if redis_connected:
        print("✅ Redis connected")
    else:
        print("⚠️ Redis connection failed - continuing without caching")
    
    # Create upload folder if it doesn't exist
    os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
    print(f"✅ Upload folder ready: {settings.UPLOAD_FOLDER}")
    
    # Initialize cache warming
    if redis_connected:
        await warm_cache_on_startup()
        print("✅ Cache warming completed")
    
    # Start performance monitoring in background
    monitoring_task = await start_performance_monitoring()
    print("✅ Performance monitoring started")
    
    # Start metrics collection in background
    metrics_task = await start_background_metrics_collection()
    print("✅ Prometheus metrics collection started")
    
    yield
    
    # Cancel background tasks
    if 'monitoring_task' in locals():
        monitoring_task.cancel()
        try:
            await monitoring_task
        except:
            pass  # Task was cancelled
        print("✅ Performance monitoring stopped")
    
    if 'metrics_task' in locals():
        metrics_task.cancel()
        try:
            await metrics_task
        except:
            pass  # Task was cancelled
        print("✅ Metrics collection stopped")
    
    # Shutdown
    await close_redis()
    print("✅ Redis connection closed")
    
    await close_db()
    print("✅ Database connection closed")


# Create FastAPI app
app = FastAPI(
    title="DReflowPro ETL Platform API",
    version="1.0.0",
    description="Production-ready ETL platform with comprehensive data connectors and pipeline management",
    lifespan=lifespan,
    openapi_url="/api/v1/openapi.json",
    docs_url=None,  # Will be configured in setup_openapi_docs
    redoc_url=None,  # Will be configured in setup_openapi_docs
)

# Prometheus metrics middleware (added early for comprehensive monitoring)
app.add_middleware(PrometheusMiddleware)

# Security headers middleware (added first for security)
from app.middleware.security_headers import SecurityHeadersMiddleware
app.add_middleware(SecurityHeadersMiddleware)

# Enhanced rate limiting middleware with DDoS protection
app.middleware("http")(rate_limit_middleware)

# Rate limiting middleware (added first for early protection)
app.add_middleware(
    GlobalRateLimitMiddleware,
    max_requests=200,  # 200 requests per minute per IP
    window_seconds=60
)

app.add_middleware(
    APIRateLimitMiddleware,
    max_requests=1000,  # 1000 API requests per hour
    window_seconds=3600
)

# CSRF protection middleware (added after rate limiting)
app.add_middleware(
    CSRFProtectionMiddleware,
    token_expiry=3600,  # 1 hour token expiry
    protected_methods={"POST", "PUT", "DELETE", "PATCH"},
    exempt_paths={
        "/docs", "/redoc", "/openapi.json", "/health", "/",
        "/api/v1/auth/login", "/api/v1/auth/register",
        "/api/v1/auth/refresh", "/api/v1/auth/forgot-password",
        "/api/v1/auth/reset-password", "/api/v1/auth/verify-email"
    },
    cookie_secure=not settings.DEBUG,  # Secure cookies in production only
    cookie_samesite="lax"
)

# Security audit middleware (monitors for suspicious activity)
app.add_middleware(SecurityAuditMiddleware)

# Tenant middleware (handles multi-tenant context)
app.add_middleware(TenantMiddleware)

# Comprehensive audit logging middleware
app.add_middleware(
    AuditLoggingMiddleware,
    log_request_body=False,  # Set to True for detailed logging (impacts performance)
    log_response_body=False,  # Set to True for response logging
    excluded_paths={
        "/health", "/docs", "/redoc", "/openapi.json", "/favicon.ico", "/static",
        "/uploads"  # Exclude file uploads from detailed logging
    }
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup comprehensive OpenAPI documentation
setup_openapi_docs(app)

# Include API routers
app.include_router(v1_router)

# Mount static files for uploads
if os.path.exists(settings.UPLOAD_FOLDER):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_FOLDER), name="uploads")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.VERSION,
        "status": "running",
        "features": [
            "Visual ETL Pipeline Builder",
            "No-Code Data Transformations", 
            "Multiple Data Connectors",
            "Real-time Dashboard Builder",
            "Automated Scheduling"
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    from app.core.redis import redis_manager
    
    # Check Redis connection
    redis_healthy = await redis_manager.ping()
    
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": "development" if settings.DEBUG else "production",
        "services": {
            "database": "healthy",
            "redis": "healthy" if redis_healthy else "unhealthy"
        }
    }

# expose an alias named `main` so commands like `uvicorn main:main` work
main = app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 
