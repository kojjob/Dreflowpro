"""
Security API endpoints
Provides security dashboard, monitoring, and management endpoints
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.auth import get_current_user
from ..core.security_dashboard import security_dashboard
from ..core.mfa import mfa_manager
from ..core.api_key_manager import api_key_manager, APIKeyType
from ..models.user import User


router = APIRouter(prefix="/api/v1/security", tags=["security"])


@router.get("/dashboard")
async def get_security_dashboard(
    time_window: str = Query("24h", regex="^(1h|24h|7d|30d)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get security dashboard data
    
    Args:
        time_window: Time window for metrics (1h, 24h, 7d, 30d)
        
    Returns:
        Security dashboard data including metrics, alerts, and activity
    """
    # Check if user has admin privileges
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    dashboard_data = await security_dashboard.get_dashboard_data(db, time_window)
    
    return dashboard_data


@router.get("/report")
async def export_security_report(
    format: str = Query("json", regex="^(json|csv|pdf)$"),
    time_window: str = Query("7d", regex="^(1h|24h|7d|30d)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Export security report
    
    Args:
        format: Export format (json, csv, pdf)
        time_window: Time window for report
        
    Returns:
        Security report data or download URL
    """
    # Check if user has admin privileges
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    report = await security_dashboard.export_security_report(db, format, time_window)
    
    return report


# MFA Endpoints

@router.post("/mfa/setup")
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Set up MFA for current user
    
    Returns:
        QR code and backup codes for MFA setup
    """
    # Generate secret and QR code
    secret = mfa_manager.generate_secret()
    provisioning_uri = mfa_manager.generate_provisioning_uri(
        current_user.email,
        secret
    )
    qr_code = mfa_manager.generate_qr_code(provisioning_uri)
    
    # Generate backup codes
    backup_codes = mfa_manager.generate_backup_codes()
    
    # Store temporarily in session or Redis for verification
    # User must verify with a code before MFA is fully enabled
    
    return {
        "qr_code": qr_code,
        "secret": secret,  # Remove in production
        "backup_codes": backup_codes,
        "message": "Please scan the QR code with your authenticator app and verify with a code"
    }


@router.post("/mfa/verify")
async def verify_mfa(
    code: str = Body(..., embed=True),
    secret: str = Body(..., embed=True),
    backup_codes: List[str] = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Verify MFA setup with initial code
    
    Args:
        code: 6-digit verification code
        secret: MFA secret (from setup)
        backup_codes: Backup codes to store
        
    Returns:
        Success status
    """
    # Verify the code
    if not mfa_manager.verify_token(secret, code):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Enable MFA for user
    result = await mfa_manager.enable_mfa(
        current_user.id,
        secret,
        backup_codes,
        db
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    
    return {
        "success": True,
        "message": "MFA has been successfully enabled"
    }


@router.post("/mfa/disable")
async def disable_mfa(
    password: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Disable MFA for current user
    
    Args:
        password: User's password for verification
        
    Returns:
        Success status
    """
    # Verify password before disabling MFA
    if not current_user.verify_password(password):
        raise HTTPException(status_code=400, detail="Invalid password")
    
    result = await mfa_manager.disable_mfa(current_user.id, db)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    
    return {
        "success": True,
        "message": "MFA has been disabled"
    }


# API Key Management Endpoints

@router.post("/api-keys")
async def create_api_key(
    name: str = Body(...),
    key_type: APIKeyType = Body(APIKeyType.PRIVATE),
    scopes: List[str] = Body([]),
    expires_in_days: Optional[int] = Body(None),
    allowed_origins: Optional[List[str]] = Body(None),
    allowed_ips: Optional[List[str]] = Body(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Create a new API key
    
    Args:
        name: Friendly name for the key
        key_type: Type of API key
        scopes: Permission scopes
        expires_in_days: Optional expiration period
        allowed_origins: Optional origin restrictions
        allowed_ips: Optional IP restrictions
        
    Returns:
        API key details (key shown only once)
    """
    # Calculate expiration
    expires_at = None
    if expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
    
    # Determine rate limit based on key type
    rate_limit = None  # Will use default
    
    result = await api_key_manager.create_api_key(
        user_id=current_user.id,
        name=name,
        key_type=key_type,
        scopes=scopes,
        expires_at=expires_at,
        rate_limit=rate_limit,
        allowed_origins=allowed_origins,
        allowed_ips=allowed_ips,
        db=db
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    
    return result


@router.get("/api-keys")
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    List user's API keys
    
    Returns:
        List of API keys (without the actual key values)
    """
    from ..models.api_key import APIKey
    from sqlalchemy import select, and_
    
    stmt = select(APIKey).where(
        and_(
            APIKey.user_id == current_user.id,
            APIKey.is_active == True
        )
    )
    
    result = await db.execute(stmt)
    keys = result.scalars().all()
    
    return [
        {
            "id": key.id,
            "name": key.name,
            "type": key.key_type,
            "scopes": key.scopes,
            "rate_limit": key.rate_limit,
            "created_at": key.created_at.isoformat(),
            "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
            "expires_at": key.expires_at.isoformat() if key.expires_at else None
        }
        for key in keys
    ]


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Revoke an API key
    
    Args:
        key_id: ID of the key to revoke
        
    Returns:
        Success status
    """
    result = await api_key_manager.revoke_api_key(
        key_id=key_id,
        user_id=current_user.id,
        db=db
    )
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    
    return result


@router.post("/api-keys/{key_id}/rotate")
async def rotate_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Rotate an API key (generate new, invalidate old)
    
    Args:
        key_id: ID of the key to rotate
        
    Returns:
        New API key details
    """
    result = await api_key_manager.rotate_api_key(
        key_id=key_id,
        user_id=current_user.id,
        db=db
    )
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    
    return result