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

# Import all models to register them with SQLAlchemy
import app.models.all  # noqa

# Import API routers
from app.api.v1.router import router as v1_router


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
    
    yield
    
    # Shutdown
    await close_redis()
    print("✅ Redis connection closed")
    
    await close_db()
    print("✅ Database connection closed")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="ETL SaaS Platform for Non-Technical Users",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
