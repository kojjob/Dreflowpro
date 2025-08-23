from fastapi import APIRouter
from .auth import router as auth_router
from .connectors import router as connectors_router
from .tasks.router import router as tasks_router

# Create the main v1 router
router = APIRouter(prefix="/api/v1")

# Include all sub-routers
router.include_router(auth_router, prefix="/auth", tags=["authentication"])
router.include_router(connectors_router, tags=["connectors"])
router.include_router(tasks_router, tags=["background_tasks"])