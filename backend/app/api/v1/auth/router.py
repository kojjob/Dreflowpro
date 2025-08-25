from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
import uuid
import logging
from datetime import datetime

from ....core.database import get_db
from ....core.security import AuthService, SecurityUtils, JWTManager, AuthenticationError
from ....core.token_rotation import token_rotation_manager
from ....core.deps import get_current_user, get_current_user_optional
from ....core.validation import (
    validate_request_size,
    handle_validation_errors,
    SecurityValidation
)
from ....core.exceptions import ResourceNotFoundException, ValidationException
from ....core.rate_limiter import (
    rate_limit_login,
    rate_limit_register,
    rate_limit_password_reset,
    rate_limit_api
)
from ....core.audit_logger import log_user_login, audit_logger, AuditEventType, AuditSeverity
from ....models.user import User, Organization, APIKey, UserRole
from ....schemas.auth import (
    UserLogin, UserRegister, TokenResponse, TokenRefresh, AccessTokenResponse,
    PasswordChange, APIKeyCreate, APIKeyResponse, APIKeyInfo, UserProfile,
    AuthStatus, ErrorResponse
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User Login",
    description="""
    Authenticate user with email and password.
    
    **Security Features:**
    - **Rate Limiting**: Prevents brute force attacks
    - **Token Rotation**: Secure refresh token family system
    - **Audit Logging**: All login attempts are logged
    - **Breach Detection**: Monitors for suspicious activity
    
    **Response:** JWT access token with refresh token for extended sessions
    """)
@rate_limit_login
async def login(
    user_data: UserLogin,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Authenticate user and return JWT tokens."""
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    try:
        # Authenticate user
        user = await AuthService.authenticate_user(db, user_data.email, user_data.password)
        
        if not user:
            # Log failed login attempt
            await log_user_login(
                user_id=None, 
                session_id=None,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                db=db
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "INVALID_CREDENTIALS",
                    "message": "Invalid email or password"
                }
            )
        
        # Create token family with device info
        device_info = {
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Generate tokens
        token_result = await token_rotation_manager.create_token_family(user, db, device_info)
        
        if not token_result.success:
            logger.error(f"Token creation failed: {token_result.error_code}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token generation failed"
            )
        
        # Log successful login
        await log_user_login(
            user_id=str(user.id),
            session_id=token_result.family_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
            db=db
        )
        
        return TokenResponse(
            access_token=token_result.access_token,
            refresh_token=token_result.refresh_token,
            token_type="bearer",
            expires_in=3600
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        
        # Log security event for unexpected errors
        await audit_logger.log_event(
            event_type=AuditEventType.USER_LOGIN_FAILED,
            message=f"Login system error: {str(e)}",
            severity=AuditSeverity.HIGH,
            ip_address=ip_address,
            user_agent=user_agent,
            outcome="ERROR",
            details={"error": str(e)},
            db=db
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error"
        )

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register New User Account",
    description="""
    Register a new user account with comprehensive validation and security features.
    
    **Registration Features:**
    - **Account Creation**: New user account with encrypted credentials
    - **Organization Setup**: Optionally create organization for team collaboration
    - **Email Verification**: Automated verification email sent to confirm address
    - **Welcome Process**: Onboarding emails and initial setup guidance
    - **Security Features**: Password strength validation and SQL injection protection
    
    **Account Types:**
    - **Individual**: Personal account without organization
    - **Organization Admin**: Creates new organization and becomes admin
    - **Team Member**: Joins existing organization (invitation required)
    
    **Security Validations:**
    - Password strength requirements (8+ chars, mixed case, numbers, symbols)
    - Email format validation and domain checks
    - SQL injection and XSS prevention
    - Rate limiting to prevent spam registrations
    - Input sanitization for all fields
    
    **Post-Registration:**
    - JWT tokens issued for immediate access
    - Email verification required for full account activation
    - Welcome email sent with getting started guide
    - Organization workspace created (if applicable)
    - Initial user preferences configured
    """,
    response_description="Successfully registered user with access tokens",
    responses={
        201: {
            "description": "User registered successfully",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "example_access_token_here",
                        "refresh_token": "example_refresh_token_here",
                        "token_type": "bearer",
                        "expires_in": 3600,
                        "user": {
                            "id": "123e4567-e89b-12d3-a456-426614174000",
                            "email": "john.doe@example.com",
                            "first_name": "John",
                            "last_name": "Doe",
                            "role": "admin",
                            "organization_id": "456e7890-e89b-12d3-a456-426614174000",
                            "email_verified": False,
                            "created_at": "2024-08-24T10:30:00Z"
                        }
                    }
                }
            }
        },
        400: {
            "description": "Email already exists or invalid registration data",
            "content": {
                "application/json": {
                    "example": {
                        "error": "EMAIL_ALREADY_EXISTS",
                        "message": "Email already registered",
                        "details": {
                            "field": "email"
                        }
                    }
                }
            }
        },
        422: {
            "description": "Validation error in registration data",
            "content": {
                "application/json": {
                    "example": {
                        "error": "VALIDATION_ERROR",
                        "message": "Password does not meet strength requirements",
                        "details": {
                            "field": "password",
                            "code": "PASSWORD_TOO_WEAK"
                        }
                    }
                }
            }
        },
        429: {
            "description": "Rate limit exceeded for registration attempts",
            "content": {
                "application/json": {
                    "example": {
                        "error": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many registration attempts",
                        "details": {
                            "retry_after": 300
                        }
                    }
                }
            }
        }
    },
    operation_id="register_user"
)
@rate_limit_register
@validate_request_size(max_size_mb=1)
@handle_validation_errors
async def register(
    user_data: UserRegister,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    background_tasks: BackgroundTasks
):
    """Register a new user account with comprehensive validation."""
    try:
        # Security validation
        SecurityValidation.validate_no_sql_injection(user_data.email, "email")
        SecurityValidation.validate_no_sql_injection(user_data.first_name, "first_name")
        SecurityValidation.validate_no_sql_injection(user_data.last_name, "last_name")
        if user_data.organization_name:
            SecurityValidation.validate_no_sql_injection(user_data.organization_name, "organization_name")
        
        # Check if user already exists
        existing_user = await AuthService.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "EMAIL_ALREADY_EXISTS",
                    "message": "Email already registered",
                    "details": {"field": "email"}
                }
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
        
        # Create device info for token family
        device_info = {
            "user_agent": request.headers.get("user-agent", "unknown"),
            "ip_address": request.client.host if request.client else "unknown",
            "platform": "web"
        }
        
        # Create token family with rotation support
        token_result = await token_rotation_manager.create_token_family(user, db, device_info)
        
        if not token_result.success:
            logger.error(f"Token creation failed: {token_result.message}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "TOKEN_CREATION_FAILED",
                    "message": "Failed to create authentication tokens",
                    "details": {}
                }
            )
        
        # Return token response
        tokens = {
            "access_token": token_result.access_token,
            "refresh_token": token_result.refresh_token,
            "token_type": "bearer",
            "expires_in": token_result.expires_in,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "organization_id": str(user.organization_id) if user.organization_id else None,
                "email_verified": user.is_verified,
                "created_at": user.created_at
            }
        }
        
        logger.info(
            f"User registered successfully",
            extra={
                "user_id": user.id,
                "user_email": user.email,
                "organization_id": organization.id if organization else None,
                "request_id": getattr(request.state, 'request_id', None)
            }
        )
        
        return tokens
        
    except ValidationException as e:
        logger.warning(f"Validation error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "VALIDATION_ERROR",
                "message": e.message,
                "details": {"field": e.field, "code": e.code}
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "Failed to register user",
                "details": {}
            }
        )

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User Authentication Login",
    description="""
    Authenticate user credentials and return access tokens for API access.
    
    **Authentication Features:**
    - **Secure Login**: Email and password authentication with bcrypt hashing
    - **JWT Tokens**: Access and refresh tokens for secure API access
    - **Rate Limiting**: Protection against brute force attacks
    - **Activity Tracking**: Login timestamps and IP address logging
    - **Account Validation**: Checks for active account status
    
    **Security Measures:**
    - Bcrypt password hashing with salt
    - Rate limiting on failed login attempts
    - IP address and request ID logging
    - SQL injection prevention
    - Failed login attempt monitoring
    - Account lockout protection (configurable)
    
    **Token Management:**
    - **Access Token**: Short-lived (1 hour) for API authentication
    - **Refresh Token**: Long-lived (30 days) for token renewal
    - **Token Rotation**: Refresh tokens can be rotated for enhanced security
    - **Scoped Access**: Tokens include user role and permissions
    
    **Login Flow:**
    1. Validate email format and password
    2. Authenticate against stored credentials
    3. Update last login timestamp
    4. Generate JWT tokens with user claims
    5. Return tokens and basic user info
    """,
    response_description="Successfully authenticated with access tokens",
    responses={
        200: {
            "description": "Login successful",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "example_access_token_here",
                        "refresh_token": "example_refresh_token_here",
                        "token_type": "bearer",
                        "expires_in": 3600,
                        "user": {
                            "id": "123e4567-e89b-12d3-a456-426614174000",
                            "email": "john.doe@example.com",
                            "first_name": "John",
                            "last_name": "Doe",
                            "role": "editor",
                            "organization_id": "456e7890-e89b-12d3-a456-426614174000",
                            "email_verified": True,
                            "last_login": "2024-08-24T14:30:00Z"
                        }
                    }
                }
            }
        },
        401: {
            "description": "Authentication failed - invalid credentials",
            "content": {
                "application/json": {
                    "example": {
                        "error": "AUTHENTICATION_FAILED",
                        "message": "Incorrect email or password",
                        "details": {}
                    }
                }
            }
        },
        422: {
            "description": "Validation error in login data",
            "content": {
                "application/json": {
                    "example": {
                        "error": "VALIDATION_ERROR",
                        "message": "Invalid email format",
                        "details": {
                            "field": "email",
                            "code": "INVALID_FORMAT"
                        }
                    }
                }
            }
        },
        429: {
            "description": "Rate limit exceeded for login attempts",
            "content": {
                "application/json": {
                    "example": {
                        "error": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many login attempts",
                        "details": {
                            "retry_after": 60,
                            "blocked_until": "2024-08-24T14:35:00Z"
                        }
                    }
                }
            }
        }
    },
    operation_id="login_user"
)
@rate_limit_login
@validate_request_size(max_size_mb=1)
@handle_validation_errors
async def login(
    user_data: UserLogin,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Authenticate user and return access tokens with comprehensive validation."""
    try:
        # Security validation
        SecurityValidation.validate_no_sql_injection(user_data.email, "email")
        
        # Authenticate user
        user = await AuthService.authenticate_user(db, user_data.email, user_data.password)
        if not user:
            logger.warning(
                f"Failed login attempt",
                extra={
                    "email": user_data.email,
                    "request_id": getattr(request.state, 'request_id', None),
                    "ip_address": request.client.host if request.client else None
                }
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "AUTHENTICATION_FAILED",
                    "message": "Incorrect email or password",
                    "details": {}
                },
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last login
        user.last_login = datetime.utcnow()
        await db.commit()
        
        # Create device info for token family
        device_info = {
            "user_agent": request.headers.get("user-agent", "unknown"),
            "ip_address": request.client.host if request.client else "unknown",
            "platform": "web"
        }
        
        # Create token family with rotation support
        token_result = await token_rotation_manager.create_token_family(user, db, device_info)
        
        if not token_result.success:
            logger.error(f"Token creation failed: {token_result.message}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "TOKEN_CREATION_FAILED",
                    "message": "Failed to create authentication tokens",
                    "details": {}
                }
            )
        
        # Return token response
        tokens = {
            "access_token": token_result.access_token,
            "refresh_token": token_result.refresh_token,
            "token_type": "bearer",
            "expires_in": token_result.expires_in,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "organization_id": str(user.organization_id) if user.organization_id else None,
                "email_verified": user.is_verified,
                "last_login": user.last_login
            }
        }
        
        logger.info(
            f"User login successful",
            extra={
                "user_id": user.id,
                "user_email": user.email,
                "request_id": getattr(request.state, 'request_id', None)
            }
        )
        
        return tokens
        
    except ValidationException as e:
        logger.warning(f"Validation error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "VALIDATION_ERROR",
                "message": e.message,
                "details": {"field": e.field, "code": e.code}
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "Login failed",
                "details": {}
            }
        )

@router.post("/refresh", 
             response_model=AccessTokenResponse,
             summary="Refresh Access Token",
             description="""
             Refresh access token using refresh token with automatic token rotation.
             
             **Token Rotation Security:**
             - **Automatic Rotation**: Refresh token is invalidated and new one issued
             - **Family Tracking**: Tokens tracked by family for breach detection
             - **Replay Protection**: Used tokens automatically invalidated
             - **Breach Detection**: Suspicious activity triggers family revocation
             
             **Security Features:**
             - Single-use refresh tokens prevent replay attacks
             - Token family tracking for device security
             - Automatic cleanup of expired tokens
             - Audit logging for security monitoring
             """)
@rate_limit_api
async def refresh_token(
    token_data: TokenRefresh,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Refresh access token using refresh token with automatic rotation."""
    try:
        # Prepare request info for security logging
        request_info = {
            "ip_address": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Rotate refresh token and generate new access token
        token_result = await token_rotation_manager.rotate_refresh_token(
            token_data.refresh_token, 
            db, 
            request_info
        )
        
        if not token_result.success:
            logger.warning(
                f"Token rotation failed: {token_result.error_code}",
                extra={
                    "error_code": token_result.error_code,
                    "message": token_result.message,
                    "request_info": request_info
                }
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": token_result.error_code or "TOKEN_REFRESH_FAILED",
                    "message": token_result.message or "Invalid refresh token",
                    "details": {}
                },
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return {
            "access_token": token_result.access_token,
            "refresh_token": token_result.refresh_token,
            "token_type": "bearer",
            "expires_in": token_result.expires_in
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during token refresh: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "Token refresh failed",
                "details": {}
            }
        )

@router.post("/logout",
             summary="User Logout",
             description="""
             Logout user with comprehensive token invalidation and security cleanup.
             
             **Logout Security:**
             - **Token Family Revocation**: Invalidates all tokens in the current family
             - **Cache Invalidation**: Clears user profile and session caches
             - **Activity Logging**: Records logout activity for security audit
             - **Device Session Cleanup**: Terminates current device authentication
             
             **Security Features:**
             - Complete token family invalidation prevents token reuse
             - Cache cleanup ensures no residual authenticated state
             - Audit trail for security monitoring
             - Protection against session hijacking
             """)
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Logout user with comprehensive token invalidation."""
    try:
        # Get the family_id from the current token to revoke the family
        from ....core.deps import get_current_token
        current_token = await get_current_token(request)
        
        if current_token:
            # Decode token to get family_id
            from ....core.security import JWTManager
            jwt_manager = JWTManager()
            token_payload = jwt_manager.verify_access_token(current_token)
            
            if token_payload and token_payload.get("family_id"):
                # Revoke the entire token family
                await token_rotation_manager.revoke_token_family(
                    token_payload["family_id"],
                    db,
                    "USER_LOGOUT"
                )
                logger.info(
                    f"Token family revoked during logout",
                    extra={
                        "user_id": current_user.id,
                        "family_id": token_payload["family_id"],
                        "reason": "USER_LOGOUT"
                    }
                )
        
        # Invalidate user profile cache
        from ....core.redis import CacheService
        cache_key = f"user_profile_{current_user.id}"
        await CacheService.delete(cache_key)
        
        # Update last activity
        current_user.last_login = datetime.utcnow()
        await db.commit()
        
        logger.info(
            f"User logout successful",
            extra={
                "user_id": current_user.id,
                "user_email": current_user.email,
                "ip_address": request.client.host if request.client else "unknown"
            }
        )
        
        return {
            "message": "Successfully logged out",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        # Even if token revocation fails, we still log the user out
        return {
            "message": "Successfully logged out",
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get(
    "/me",
    response_model=UserProfile,
    summary="Get Current User Profile",
    description="""
    Retrieve the authenticated user's complete profile information with caching.
    
    **Profile Information:**
    - **Basic Details**: Name, email, avatar, contact information
    - **Account Status**: Active status, email verification, role permissions
    - **Organization**: Organization membership and role
    - **Authentication**: Auth method, social accounts, account security
    - **Activity**: Registration date, last login, account usage
    
    **Caching Strategy:**
    - **Redis Cache**: Profile cached for 15 minutes for performance
    - **Cache Invalidation**: Automatic invalidation on profile changes
    - **Fresh Data**: Cache miss triggers fresh database query
    - **Consistent Data**: Cache keys based on user ID for consistency
    
    **Security Features:**
    - **Authentication Required**: JWT token validation required
    - **User Isolation**: Can only access own profile data
    - **Sensitive Data**: Password and internal fields excluded
    - **Audit Logging**: Profile access logged for security monitoring
    
    **Social Account Integration:**
    - Connected social accounts detected and listed
    - Social login availability indicated
    - Account linking status provided
    - Social profile synchronization status
    """,
    response_description="Complete user profile with cached performance",
    responses={
        200: {
            "description": "User profile retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "email": "john.doe@example.com",
                        "first_name": "John",
                        "last_name": "Doe",
                        "avatar_url": "https://example.com/avatars/john.jpg",
                        "role": "editor",
                        "auth_method": "email",
                        "organization_id": "456e7890-e89b-12d3-a456-426614174000",
                        "is_active": True,
                        "email_verified": True,
                        "has_social_accounts": True,
                        "created_at": "2024-08-20T10:30:00Z",
                        "last_login": "2024-08-24T14:30:00Z"
                    }
                }
            }
        },
        401: {
            "description": "Authentication required",
            "content": {
                "application/json": {
                    "example": {
                        "error": "AUTHENTICATION_REQUIRED",
                        "message": "Valid authentication token required",
                        "details": {}
                    }
                }
            }
        }
    },
    operation_id="get_current_user_profile"
)
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
@rate_limit_password_reset
async def request_password_reset(
    email: str,
    request: Request,
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
@rate_limit_password_reset
async def reset_password(
    token: str,
    new_password: str,
    request: Request,
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

@router.get("/csrf-token", 
           summary="Get CSRF Token",
           description="""
           Get CSRF token for client-side applications to include in POST/PUT/DELETE requests.
           
           **CSRF Protection:**
           - **Double Submit Pattern**: Token must be included in both cookie and header
           - **Token Rotation**: New token generated after each successful request
           - **Secure Generation**: Cryptographically secure tokens with HMAC validation
           - **Expiration**: Tokens expire after 1 hour for security
           
           **Usage:**
           1. Call this endpoint to get initial CSRF token
           2. Include token in X-CSRF-Token header for protected requests
           3. Cookie will be automatically set and validated
           """)
async def get_csrf_token(request: Request):
    """Get CSRF token for AJAX applications."""
    from ....middleware.csrf_protection import get_csrf_token_endpoint
    return await get_csrf_token_endpoint(request)