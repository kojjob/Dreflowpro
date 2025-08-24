from fastapi import APIRouter
from .auth import router as auth_router
from .connectors import router as connectors_router
from .tasks.router import router as tasks_router
from .pipelines import router as pipelines_router
from .data.router import router as data_router
from .config.router import router as config_router

# Create the main v1 router
router = APIRouter(prefix="/api/v1")

# Include all sub-routers
router.include_router(auth_router, prefix="/auth", tags=["authentication"])
router.include_router(connectors_router, prefix="/connectors", tags=["connectors"])
router.include_router(tasks_router, tags=["background_tasks"])
router.include_router(pipelines_router, tags=["pipelines"])
router.include_router(data_router, tags=["data"])
router.include_router(config_router, tags=["configuration"])