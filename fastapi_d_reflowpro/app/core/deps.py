from typing import Generator, Optional, Annotated
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .security import JWTManager, AuthService, AuthenticationError, AuthorizationError
from ..models.user import User, UserRole

# Security scheme
security = HTTPBearer(auto_error=False)

# Extract current token from request
async def get_current_token(request: Request) -> Optional[str]:
    """Extract the current JWT token from the request."""
    auth_header = request.headers.get("authorization")
    if not auth_header:
        return None
    
    # Check for Bearer token format
    if not auth_header.startswith("Bearer "):
        return None
    
    # Extract token (remove "Bearer " prefix)
    token = auth_header[7:]
    return token if token else None

# Current user dependency
async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]
) -> User:
    """Get the current authenticated user."""
    if not credentials:
        raise AuthenticationError("Authentication credentials required")
    
    # Verify token
    payload = JWTManager.verify_token(credentials.credentials, "access")
    if not payload:
        raise AuthenticationError("Invalid or expired token")
    
    # Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Invalid token payload")
    
    # Get user from database
    user = await AuthService.get_user_by_id(db, user_id)
    if not user:
        raise AuthenticationError("User not found")
    
    if not user.is_active:
        raise AuthenticationError("User account is disabled")
    
    return user

# Optional current user (for endpoints that work with or without auth)
async def get_current_user_optional(
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]
) -> Optional[User]:
    """Get the current user if authenticated, None otherwise."""
    if not credentials:
        return None
    
    try:
        return await get_current_user(db, credentials)
    except HTTPException:
        return None

# Role-based access control
def require_role(required_role: UserRole):
    """Create a dependency that requires a specific role."""
    def role_checker(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role != required_role:
            raise AuthorizationError(f"Role '{required_role}' required")
        return current_user
    return role_checker

def require_roles(*required_roles: UserRole):
    """Create a dependency that requires one of multiple roles."""
    def role_checker(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in required_roles:
            roles_str = "', '".join(required_roles)
            raise AuthorizationError(f"One of roles '{roles_str}' required")
        return current_user
    return role_checker

# Admin only access
def get_admin_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Get current user and verify admin role."""
    if current_user.role != UserRole.ADMIN:
        raise AuthorizationError("Admin access required")
    return current_user

# Alias for consistency with other frameworks
require_admin_access = get_admin_user

# Editor or admin access
def get_editor_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Get current user and verify editor or admin role."""
    if current_user.role not in [UserRole.ADMIN, UserRole.EDITOR]:
        raise AuthorizationError("Editor or Admin access required")
    return current_user

# Organization access (user must belong to the organization)
async def verify_organization_access(
    organization_id: str,
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Verify user has access to the specified organization."""
    if str(current_user.organization_id) != organization_id:
        raise AuthorizationError("Access denied to this organization")
    return current_user

# API Key authentication (for service-to-service communication)
async def get_api_key_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]
) -> User:
    """Authenticate using API key."""
    if not credentials:
        raise AuthenticationError("API key required")
    
    # For API key auth, the token should be the API key
    from sqlalchemy import select
    from ..models.user import APIKey
    
    result = await db.execute(
        select(APIKey).where(
            APIKey.key_hash == credentials.credentials,
            APIKey.is_active == True
        )
    )
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise AuthenticationError("Invalid API key")
    
    # Get the user associated with this API key
    user = await AuthService.get_user_by_id(db, str(api_key.user_id))
    if not user or not user.is_active:
        raise AuthenticationError("API key user not found or disabled")
    
    # Update last used timestamp
    from datetime import datetime
    api_key.last_used = datetime.utcnow()
    await db.commit()
    
    return user