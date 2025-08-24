from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
import uuid
from datetime import datetime

from ....core.database import get_db
from ....core.security import AuthService, SecurityUtils, JWTManager, AuthenticationError
from ....core.deps import get_current_user, get_current_user_optional
from ....models.user import User, Organization, APIKey, UserRole
from ....schemas.auth import (
    UserLogin, UserRegister, TokenResponse, TokenRefresh, AccessTokenResponse,
    PasswordChange, APIKeyCreate, APIKeyResponse, APIKeyInfo, UserProfile,
    AuthStatus, ErrorResponse
)

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
async def register(
    user_data: UserRegister,
    db: Annotated[AsyncSession, Depends(get_db)],
    background_tasks: BackgroundTasks
):
    """Register a new user account."""
    # Check if user already exists
    existing_user = await AuthService.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create organization if provided
    organization = None
    if user_data.organization_name:
        organization = Organization(
            id=uuid.uuid4(),
            name=user_data.organization_name
        )
        db.add(organization)
        await db.flush()  # Get the ID for the user
    
    # Create user
    user = User(
        id=uuid.uuid4(),
        email=user_data.email,
        hashed_password=SecurityUtils.get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=UserRole.ADMIN if organization else UserRole.EDITOR,
        organization_id=organization.id if organization else None,
        is_active=True,
        is_verified=False  # Email verification required
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Send welcome email and email verification
    from ....workers.notification_tasks import send_welcome_email, send_email_verification
    background_tasks.add_task(send_welcome_email, user.id)
    
    # Generate verification token
    from ....core.security import SecurityUtils
    verification_token = SecurityUtils.generate_verification_token(user.id)
    background_tasks.add_task(send_email_verification, user.id, verification_token)
    
    # Create and return tokens
    tokens = AuthService.create_tokens(user)
    return tokens

@router.post("/login", response_model=TokenResponse)
async def login(
    user_data: UserLogin,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Authenticate user and return access tokens."""
    # Authenticate user
    user = await AuthService.authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()
    
    # Create and return tokens
    tokens = AuthService.create_tokens(user)
    return tokens

@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(
    token_data: TokenRefresh,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Refresh access token using refresh token."""
    result = await AuthService.refresh_access_token(token_data.refresh_token, db)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return result

@router.post("/logout")
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Logout user with token invalidation."""
    # Invalidate user profile cache
    from ....core.redis import CacheService
    cache_key = f"user_profile_{current_user.id}"
    await CacheService.delete(cache_key)
    
    # Update last activity
    current_user.last_login = datetime.utcnow()
    await db.commit()
    
    # For production, you would also want to:
    # 1. Add the token to a blacklist/revocation list
    # 2. Or implement short-lived tokens with refresh token rotation
    # 3. Or use session-based authentication with server-side session storage
    
    return {
        "message": "Successfully logged out",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Get current user profile with caching."""
    from ....core.redis import CacheService
    
    # Try to get from cache first
    cache_key = f"user_profile_{current_user.id}"
    cached_profile = await CacheService.get(cache_key)
    
    if cached_profile:
        return UserProfile(**cached_profile)
    
    # Check if user has social accounts by querying directly
    from sqlalchemy import select, func
    from ....models.user import SocialAccount
    
    social_count_result = await db.execute(
        select(func.count()).select_from(SocialAccount).where(SocialAccount.user_id == current_user.id)
    )
    has_social_accounts = social_count_result.scalar() > 0
    
    # Create user profile
    user_profile = UserProfile(
        id=str(current_user.id),
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        auth_method=current_user.auth_method,
        organization_id=str(current_user.organization_id) if current_user.organization_id else None,
        is_active=current_user.is_active,
        email_verified=current_user.is_verified,
        has_social_accounts=has_social_accounts,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )
    
    # Cache the profile for 15 minutes
    await CacheService.set(cache_key, user_profile.model_dump(mode='json'), expire=900)
    
    return user_profile

@router.get("/status", response_model=AuthStatus)
async def auth_status(
    current_user: Annotated[User, Depends(get_current_user_optional)]
):
    """Check authentication status."""
    if not current_user:
        return AuthStatus(
            authenticated=False,
            user=None,
            permissions=[]
        )
    
    # Define permissions based on role
    permissions = []
    if current_user.role == UserRole.ADMIN:
        permissions = ["read", "write", "admin", "manage_users", "manage_organization"]
    elif current_user.role == UserRole.EDITOR:
        permissions = ["read", "write"]
    else:  # VIEWER
        permissions = ["read"]
    
    return AuthStatus(
        authenticated=True,
        user=UserProfile(
            id=str(current_user.id),
            email=current_user.email,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            avatar_url=current_user.avatar_url,
            role=current_user.role,
            auth_method=current_user.auth_method,
            organization_id=str(current_user.organization_id) if current_user.organization_id else None,
            is_active=current_user.is_active,
            email_verified=current_user.is_verified,
            has_social_accounts=len(current_user.social_accounts) > 0 if current_user.social_accounts else False,
            created_at=current_user.created_at,
            last_login=current_user.last_login
        ),
        permissions=permissions
    )

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Change user password."""
    # Verify current password
    if not SecurityUtils.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.hashed_password = SecurityUtils.get_password_hash(password_data.new_password)
    await db.commit()
    
    # Invalidate user profile cache
    from ....core.redis import CacheService
    cache_key = f"user_profile_{current_user.id}"
    await CacheService.delete(cache_key)
    
    return {"message": "Password updated successfully"}

# API Key management endpoints
@router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Create a new API key."""
    # Generate API key
    api_key_value = SecurityUtils.generate_api_key()
    
    # Hash the API key for secure storage
    key_hash = SecurityUtils.get_password_hash(api_key_value)
    
    # Create API key record
    api_key = APIKey(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=key_data.name,
        key_hash=key_hash,  # Store hashed version
        expires_at=key_data.expires_at,
        is_active=True
    )
    
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    
    return APIKeyResponse(
        id=str(api_key.id),
        name=api_key.name,
        key=api_key_value,  # Only returned on creation
        created_at=api_key.created_at,
        expires_at=api_key.expires_at
    )

@router.get("/api-keys", response_model=list[APIKeyInfo])
async def list_api_keys(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """List user's API keys (without key values)."""
    result = await db.execute(
        select(APIKey).where(APIKey.user_id == current_user.id)
    )
    api_keys = result.scalars().all()
    
    return [
        APIKeyInfo(
            id=str(key.id),
            name=key.name,
            created_at=key.created_at,
            last_used=key.last_used,
            expires_at=key.expires_at,
            is_active=key.is_active
        )
        for key in api_keys
    ]

@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Delete an API key."""
    try:
        key_uuid = uuid.UUID(key_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid API key ID"
        )
    
    # Get API key
    result = await db.execute(
        select(APIKey).where(
            APIKey.id == key_uuid,
            APIKey.user_id == current_user.id
        )
    )
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Delete API key
    await db.delete(api_key)
    await db.commit()
    
    return {"message": "API key deleted successfully"}

@router.patch("/api-keys/{key_id}/toggle")
async def toggle_api_key(
    key_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Toggle API key active status."""
    try:
        key_uuid = uuid.UUID(key_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid API key ID"
        )
    
    # Get API key
    result = await db.execute(
        select(APIKey).where(
            APIKey.id == key_uuid,
            APIKey.user_id == current_user.id
        )
    )
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Toggle status
    api_key.is_active = not api_key.is_active
    await db.commit()
    
    return {
        "message": f"API key {'activated' if api_key.is_active else 'deactivated'} successfully",
        "is_active": api_key.is_active
    }

@router.post("/verify-email/{token}")
async def verify_email(
    token: str,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Verify user email with verification token."""
    try:
        # Verify and decode token
        user_id = SecurityUtils.verify_verification_token(token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        # Get user
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.is_verified:
            return {"message": "Email already verified"}
        
        # Mark email as verified
        user.is_verified = True
        await db.commit()
        
        # Clear user profile cache
        from ....core.redis import CacheService
        cache_key = f"user_profile_{user.id}"
        await CacheService.delete(cache_key)
        
        return {"message": "Email verified successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )

@router.post("/request-password-reset")
async def request_password_reset(
    email: str,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Request password reset email."""
    # Get user by email
    user = await AuthService.get_user_by_email(db, email)
    
    if user:
        # Generate reset token
        reset_token = SecurityUtils.generate_password_reset_token(user.id)
        
        # Send password reset email
        from ....workers.notification_tasks import send_password_reset_email
        background_tasks.add_task(send_password_reset_email, user.id, reset_token)
    
    # Always return success to prevent email enumeration
    return {"message": "If an account with this email exists, a password reset email has been sent"}

@router.post("/reset-password/{token}")
async def reset_password(
    token: str,
    new_password: str,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Reset user password with reset token."""
    try:
        # Verify and decode token
        user_id = SecurityUtils.verify_password_reset_token(token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Get user
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        user.hashed_password = SecurityUtils.get_password_hash(new_password)
        await db.commit()
        
        # Clear user profile cache
        from ....core.redis import CacheService
        cache_key = f"user_profile_{user.id}"
        await CacheService.delete(cache_key)
        
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )