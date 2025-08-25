"""
Phase 1 API Router - Authentication and Core Features Only
"""
from fastapi import APIRouter
from .auth import router as auth_router
from .audit.router import router as audit_router

# Create the main v1 router for Phase 1
router = APIRouter(prefix="/api/v1")

# Include only Phase 1 sub-routers
router.include_router(auth_router, prefix="/auth", tags=["authentication"])
router.include_router(audit_router, tags=["audit"])

# Phase 2 routers will be added later:
# - connectors_router (requires DataConnector model)
# - tasks_router (requires pipeline models)
# - pipelines_router (requires ETLPipeline model)
# - data_router (requires connector models)
# - config_router (may be Phase 1 compatible)