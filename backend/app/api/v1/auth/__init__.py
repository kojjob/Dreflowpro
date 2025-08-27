# Authentication endpoints
from .router import router
from .oauth import router as oauth_router

# Include OAuth routes
router.include_router(oauth_router, prefix="/oauth", tags=["oauth"])

__all__ = ["router"]