from datetime import datetime, timedelta
from typing import Optional, Union, Any, Dict
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import secrets
import uuid

from .config import settings
from ..models.user import User

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security utilities
class SecurityUtils:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password for storing."""
        return pwd_context.hash(password)
    
    @staticmethod
    def generate_api_key() -> str:
        """Generate a secure API key."""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def generate_verification_token(user_id: Union[str, uuid.UUID]) -> str:
        """Generate email verification token."""
        payload = {
            "sub": str(user_id),
            "type": "email_verification",
            "exp": datetime.utcnow() + timedelta(hours=24)  # 24 hour expiry
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    @staticmethod
    def verify_verification_token(token: str) -> Optional[str]:
        """Verify email verification token and return user ID."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            if payload.get("type") != "email_verification":
                return None
            return payload.get("sub")
        except JWTError:
            return None
    
    @staticmethod
    def generate_password_reset_token(user_id: Union[str, uuid.UUID]) -> str:
        """Generate password reset token."""
        payload = {
            "sub": str(user_id),
            "type": "password_reset",
            "exp": datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    @staticmethod
    def verify_password_reset_token(token: str) -> Optional[str]:
        """Verify password reset token and return user ID."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            if payload.get("type") != "password_reset":
                return None
            return payload.get("sub")
        except JWTError:
            return None

# JWT Token utilities with enhanced security
class JWTManager:
    def __init__(self):
        self.algorithm = settings.ALGORITHM
        self.secret_key = settings.SECRET_KEY
    
    def create_access_token(
        self, 
        subject: str,
        extra_claims: Optional[Dict[str, Any]] = None,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT access token with enhanced security."""
        now = datetime.utcnow()
        
        if expires_delta:
            expire = now + expires_delta
        else:
            expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        payload = {
            "sub": subject,
            "iat": now,
            "exp": expire,
            "type": "access",
            "jti": str(uuid.uuid4())  # Unique token identifier
        }
        
        if extra_claims:
            payload.update(extra_claims)
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(
        self,
        subject: str,
        extra_claims: Optional[Dict[str, Any]] = None,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT refresh token for token rotation."""
        now = datetime.utcnow()
        
        if expires_delta:
            expire = now + expires_delta
        else:
            expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        payload = {
            "sub": subject,
            "iat": now,
            "exp": expire,
            "type": "refresh",
            "jti": str(uuid.uuid4())  # Unique token identifier
        }
        
        if extra_claims:
            payload.update(extra_claims)
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_access_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode an access token."""
        return self._verify_token(token, "access")
    
    def verify_refresh_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a refresh token."""
        return self._verify_token(token, "refresh")
    
    def _verify_token(self, token: str, expected_type: str) -> Optional[Dict[str, Any]]:
        """Internal method to verify and decode a JWT token."""
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # Check token type
            if payload.get("type") != expected_type:
                return None
            
            # Check required fields
            if not all(key in payload for key in ["sub", "exp", "iat", "jti"]):
                return None
                
            return payload
            
        except JWTError:
            return None
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
        """Legacy method for backward compatibility."""
        manager = JWTManager()
        if token_type == "access":
            return manager.verify_access_token(token)
        elif token_type == "refresh":
            return manager.verify_refresh_token(token)
        return None

# Authentication service
class AuthService:
    @staticmethod
    async def authenticate_user(
        db: AsyncSession, 
        email: str, 
        password: str
    ) -> Optional[User]:
        """Authenticate a user with email and password."""
        # Get user by email
        result = await db.execute(
            select(User).where(User.email == email, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return None
            
        # Verify password
        if not SecurityUtils.verify_password(password, user.hashed_password):
            return None
            
        return user
    
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Get a user by email."""
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        """Get a user by ID."""
        import uuid
        try:
            # Convert string to UUID object
            user_uuid = uuid.UUID(user_id)
            result = await db.execute(
                select(User).where(User.id == user_uuid)
            )
            return result.scalar_one_or_none()
        except (ValueError, TypeError):
            return None
    
    @staticmethod
    def create_tokens(user: User) -> dict:
        """Create access and refresh tokens for a user."""
        # User data for token
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "org_id": str(user.organization_id) if user.organization_id else None
        }
        
        # Create tokens
        access_token = JWTManager.create_access_token(data=token_data)
        refresh_token = JWTManager.create_refresh_token(data=token_data)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    @staticmethod
    async def refresh_access_token(refresh_token: str, db: AsyncSession) -> Optional[dict]:
        """Create a new access token from a refresh token."""
        # Verify refresh token
        payload = JWTManager.verify_token(refresh_token, "refresh")
        if not payload:
            return None
        
        # Get user
        user_id = payload.get("sub")
        if not user_id:
            return None
            
        user = await AuthService.get_user_by_id(db, user_id)
        if not user or not user.is_active:
            return None
        
        # Create new access token
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "org_id": str(user.organization_id) if user.organization_id else None
        }
        
        access_token = JWTManager.create_access_token(data=token_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }

# Exception classes
class AuthenticationError(HTTPException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

class AuthorizationError(HTTPException):
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )

# Legacy function support (for backward compatibility)
def create_access_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token (legacy function)."""
    return JWTManager.create_access_token(
        {"sub": str(subject)}, 
        expires_delta
    )

def create_refresh_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT refresh token (legacy function)."""
    return JWTManager.create_refresh_token({"sub": str(subject)})

def verify_token(token: str) -> Optional[str]:
    """Verify and decode a JWT token (legacy function)."""
    payload = JWTManager.verify_token(token)
    return payload.get("sub") if payload else None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash (legacy function)."""
    return SecurityUtils.verify_password(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password (legacy function)."""
    return SecurityUtils.get_password_hash(password)