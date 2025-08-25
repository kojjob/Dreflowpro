"""
Admin endpoints for system administration tasks.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.services.tenant_migration_service import TenantMigrationService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/migrate-tenants")
async def migrate_tenants(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Run the tenant migration to add multi-tenant support.
    Only admin users can run this migration.
    """
    # Check if user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can run migrations"
        )
    
    try:
        result = await TenantMigrationService.run_complete_migration(db)
        return result
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Migration failed: {str(e)}"
        )


@router.get("/verify-tenant-migration")
async def verify_tenant_migration(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Verify the tenant migration status.
    Only admin users can access this endpoint.
    """
    # Check if user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can verify migrations"
        )
    
    try:
        verification = await TenantMigrationService.verify_migration(db)
        return {
            "status": "success",
            "verification": verification
        }
        
    except Exception as e:
        logger.error(f"Migration verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
        )