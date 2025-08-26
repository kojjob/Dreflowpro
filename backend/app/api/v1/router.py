from fastapi import APIRouter
from .auth import router as auth_router
from .connectors import router as connectors_router
from .tasks.router import router as tasks_router
from .pipelines import router as pipelines_router
from .data.router import router as data_router
from .config.router import router as config_router
from .audit.router import router as audit_router
from .analytics.router import router as analytics_router
from .ai.router import router as ai_router
from .ml.router import router as ml_router
from .websocket_routes import router as websocket_router
from .performance.router import router as performance_router
from .monitoring.router import router as monitoring_router
from .webhooks.router import router as webhooks_router
from .tenants.router import router as tenants_router
from .admin.router import router as admin_router
from .export.router import router as export_router
from .reports.router import router as reports_router
from .dashboard.router import router as dashboard_router

# Create the main v1 router
router = APIRouter(prefix="/api/v1")

# Include all sub-routers
router.include_router(auth_router, prefix="/auth", tags=["authentication"])
router.include_router(connectors_router)
router.include_router(tasks_router, tags=["background_tasks"])
router.include_router(pipelines_router)
router.include_router(data_router, tags=["data"])
router.include_router(config_router, tags=["configuration"])
router.include_router(audit_router, tags=["audit"])
router.include_router(analytics_router, tags=["analytics"])
router.include_router(ai_router, tags=["ai_insights"])
router.include_router(ml_router, tags=["machine_learning"])
router.include_router(websocket_router, tags=["real-time"])
router.include_router(performance_router, tags=["performance"])
router.include_router(monitoring_router, prefix="/monitoring", tags=["monitoring"])
router.include_router(webhooks_router, prefix="/webhooks", tags=["webhooks"])
router.include_router(tenants_router, prefix="/tenants", tags=["tenants"])
router.include_router(admin_router, prefix="/admin", tags=["admin"])
router.include_router(export_router, tags=["data_export"])
router.include_router(reports_router, tags=["reports"])
router.include_router(dashboard_router, tags=["dashboard"])