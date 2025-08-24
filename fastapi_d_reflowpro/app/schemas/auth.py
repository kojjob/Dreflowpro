from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
import re

from ..core.validators import ValidatorMixin, ValidationError

class UserLogin(BaseModel, ValidatorMixin):
    """User login request schema."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=128, description="User password")
    remember_me: Optional[bool] = Field(False, description="Remember login session")
    
    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v):
        return cls.validate_email_format(v)
    
    @field_validator('password')
    @classmethod
    def validate_password_not_empty(cls, v):
        if not v or not v.strip():
            raise ValidationError("Password cannot be empty", field="password", code="PASSWORD_EMPTY")
        return v.strip()

class UserRegister(BaseModel, ValidatorMixin):
    """User registration request schema."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=128, description="User password")
    confirm_password: str = Field(..., min_length=8, max_length=128, description="Password confirmation")
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    organization_name: Optional[str] = Field(None, min_length=1, max_length=200, description="Organization name for new org")
    terms_accepted: bool = Field(..., description="Terms and conditions acceptance")
    marketing_consent: Optional[bool] = Field(False, description="Marketing communications consent")
    
    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v):
        return cls.validate_email_format(v)
    
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v):
        return cls.validate_password_strength(v)
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_names(cls, v, info):
        field_name = info.field_name
        if not v or not v.strip():
            raise ValidationError(f"{field_name} cannot be empty", field=field_name, code="NAME_EMPTY")
        
        v = cls.sanitize_string_input(v.strip(), max_length=100)
        
        # Check for valid name characters
        if not re.match(r"^[a-zA-Z\s'-]+$", v):
            raise ValidationError(
                f"{field_name} can only contain letters, spaces, hyphens, and apostrophes",
                field=field_name,
                code="NAME_INVALID_CHARS"
            )
        
        return v
    
    @field_validator('organization_name')
    @classmethod
    def validate_organization_name(cls, v):
        if v is None:
            return v
        
        v = v.strip()
        if not v:
            return None
            
        return cls.sanitize_string_input(v, max_length=200)
    
    @field_validator('terms_accepted')
    @classmethod
    def validate_terms_acceptance(cls, v):
        if not v:
            raise ValidationError("Terms and conditions must be accepted", field="terms_accepted", code="TERMS_NOT_ACCEPTED")
        return v
    
    @model_validator(mode='after')
    def validate_passwords_match(self):
        password = self.password
        confirm_password = self.confirm_password
        
        if password and confirm_password and password != confirm_password:
            raise ValidationError("Passwords do not match", field="confirm_password", code="PASSWORD_MISMATCH")
        
        return self

class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")

class TokenRefresh(BaseModel):
    """Token refresh request schema."""
    refresh_token: str = Field(..., description="JWT refresh token")

class AccessTokenResponse(BaseModel):
    """Access token response schema."""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")

class PasswordReset(BaseModel, ValidatorMixin):
    """Password reset request schema."""
    email: EmailStr = Field(..., description="User email address")
    
    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v):
        return cls.validate_email_format(v)

class PasswordResetConfirm(BaseModel, ValidatorMixin):
    """Password reset confirmation schema."""
    token: str = Field(..., min_length=32, max_length=256, description="Password reset token")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., min_length=8, max_length=128, description="Password confirmation")
    
    @field_validator('token')
    @classmethod
    def validate_token_format(cls, v):
        v = v.strip()
        if not re.match(r'^[a-fA-F0-9\-]+$', v):
            raise ValidationError("Invalid token format", field="token", code="TOKEN_INVALID_FORMAT")
        return v
    
    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, v):
        return cls.validate_password_strength(v)
    
    @model_validator(mode='after')
    def validate_passwords_match(self):
        new_password = self.new_password
        confirm_password = self.confirm_password
        
        if new_password and confirm_password and new_password != confirm_password:
            raise ValidationError("Passwords do not match", field="confirm_password", code="PASSWORD_MISMATCH")
        
        return self

class PasswordChange(BaseModel, ValidatorMixin):
    """Password change request schema."""
    current_password: str = Field(..., max_length=128, description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., min_length=8, max_length=128, description="Password confirmation")
    
    @field_validator('current_password')
    @classmethod
    def validate_current_password_not_empty(cls, v):
        if not v or not v.strip():
            raise ValidationError("Current password cannot be empty", field="current_password", code="PASSWORD_EMPTY")
        return v.strip()
    
    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, v):
        return cls.validate_password_strength(v)
    
    @model_validator(mode='after')
    def validate_passwords(self):
        current_password = self.current_password
        new_password = self.new_password
        confirm_password = self.confirm_password
        
        # Check passwords match
        if new_password and confirm_password and new_password != confirm_password:
            raise ValidationError("New passwords do not match", field="confirm_password", code="PASSWORD_MISMATCH")
        
        # Check new password is different from current
        if current_password and new_password and current_password == new_password:
            raise ValidationError("New password must be different from current password", field="new_password", code="PASSWORD_SAME_AS_CURRENT")
        
        return self

class EmailVerification(BaseModel):
    """Email verification schema."""
    token: str = Field(..., description="Email verification token")

class APIKeyCreate(BaseModel, ValidatorMixin):
    """API key creation request schema."""
    name: str = Field(..., min_length=1, max_length=100, description="API key name/description")
    description: Optional[str] = Field(None, max_length=500, description="API key description")
    expires_at: Optional[datetime] = Field(None, description="API key expiration date")
    scopes: Optional[List[str]] = Field(None, description="API key permissions/scopes")
    
    @field_validator('name')
    @classmethod
    def validate_name_format(cls, v):
        v = cls.sanitize_string_input(v.strip(), max_length=100)
        
        if not re.match(r'^[a-zA-Z0-9\s_-]+$', v):
            raise ValidationError(
                "API key name can only contain letters, numbers, spaces, underscores, and hyphens",
                field="name",
                code="API_KEY_NAME_INVALID_CHARS"
            )
        
        return v
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is None:
            return v
        return cls.sanitize_string_input(v.strip(), max_length=500)
    
    @field_validator('expires_at')
    @classmethod
    def validate_expiration_date(cls, v):
        if v is None:
            return v
        
        if v <= datetime.now():
            raise ValidationError(
                "Expiration date must be in the future",
                field="expires_at",
                code="EXPIRY_DATE_PAST"
            )
        
        # Don't allow expiration more than 5 years in the future
        max_future = datetime.now().replace(year=datetime.now().year + 5)
        if v > max_future:
            raise ValidationError(
                "Expiration date cannot be more than 5 years in the future",
                field="expires_at", 
                code="EXPIRY_DATE_TOO_FAR"
            )
        
        return v
    
    @field_validator('scopes')
    @classmethod
    def validate_scopes(cls, v):
        if v is None:
            return v
        
        valid_scopes = ['read', 'write', 'admin', 'pipeline:execute', 'connector:manage', 'data:export']
        
        for scope in v:
            if scope not in valid_scopes:
                raise ValidationError(
                    f"Invalid scope '{scope}'. Valid scopes: {valid_scopes}",
                    field="scopes",
                    code="API_KEY_INVALID_SCOPE"
                )
        
        # Remove duplicates while preserving order
        return list(dict.fromkeys(v))

class APIKeyResponse(BaseModel):
    """API key response schema."""
    id: str = Field(..., description="API key ID")
    name: str = Field(..., description="API key name")
    key: str = Field(..., description="API key value (only shown once)")
    created_at: datetime = Field(..., description="Creation timestamp")
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp")

class APIKeyInfo(BaseModel):
    """API key info schema (without the key value)."""
    id: str = Field(..., description="API key ID")
    name: str = Field(..., description="API key name")
    created_at: datetime = Field(..., description="Creation timestamp")
    last_used: Optional[datetime] = Field(None, description="Last used timestamp")
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp")
    is_active: bool = Field(..., description="Whether the key is active")

class UserProfile(BaseModel):
    """User profile schema."""
    id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    avatar_url: Optional[str] = Field(None, description="Profile picture URL")
    role: str = Field(..., description="User role")
    auth_method: str = Field(..., description="Primary authentication method")
    organization_id: Optional[str] = Field(None, description="Organization ID")
    is_active: bool = Field(..., description="Whether user is active")
    email_verified: bool = Field(..., description="Whether email is verified")
    has_social_accounts: bool = Field(default=False, description="Whether user has connected social accounts")
    created_at: datetime = Field(..., description="Account creation timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")

class AuthStatus(BaseModel):
    """Authentication status schema."""
    authenticated: bool = Field(..., description="Whether user is authenticated")
    user: Optional[UserProfile] = Field(None, description="User profile if authenticated")
    permissions: list[str] = Field(default_factory=list, description="User permissions")

class ErrorResponse(BaseModel):
    """Error response schema."""
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code")

# OAuth schemas
class OAuthProvider(BaseModel):
    """OAuth provider info."""
    name: str = Field(..., description="Provider name")
    authorization_url: str = Field(..., description="Authorization URL")
    enabled: bool = Field(..., description="Whether provider is enabled")

class OAuthCallback(BaseModel):
    """OAuth callback data."""
    code: str = Field(..., description="Authorization code")
    state: Optional[str] = Field(None, description="State parameter")

class OAuthLoginRequest(BaseModel):
    """OAuth login initiation request."""
    provider: str = Field(..., description="OAuth provider (google, github, microsoft)")
    redirect_url: Optional[str] = Field(None, description="Custom redirect URL after auth")

class SocialAccountInfo(BaseModel):
    """Social account information."""
    id: str = Field(..., description="Social account ID")
    provider: str = Field(..., description="OAuth provider")
    provider_account_email: Optional[str] = Field(None, description="Email from provider")
    is_primary: bool = Field(..., description="Is primary auth method")
    created_at: datetime = Field(..., description="Account connection date")

class SocialAccountList(BaseModel):
    """List of connected social accounts."""
    accounts: list[SocialAccountInfo] = Field(..., description="Connected social accounts")
    total: int = Field(..., description="Total number of connected accounts")

# Two-factor authentication schemas (for future implementation)
class TwoFactorSetup(BaseModel):
    """Two-factor authentication setup."""
    secret: str = Field(..., description="2FA secret")
    qr_code: str = Field(..., description="QR code for authenticator app")
    backup_codes: list[str] = Field(..., description="Backup codes")

class TwoFactorVerify(BaseModel):
    """Two-factor authentication verification."""
    code: str = Field(..., min_length=6, max_length=6, description="2FA code")

class TwoFactorLogin(UserLogin):
    """Login with two-factor authentication."""
    totp_code: Optional[str] = Field(None, min_length=6, max_length=6, description="2FA code")

# Session management schemas
class SessionInfo(BaseModel):
    """Session information."""
    id: str = Field(..., description="Session ID")
    user_agent: Optional[str] = Field(None, description="User agent")
    ip_address: Optional[str] = Field(None, description="IP address")
    created_at: datetime = Field(..., description="Session creation time")
    last_activity: datetime = Field(..., description="Last activity time")
    is_current: bool = Field(..., description="Whether this is the current session")

class SessionList(BaseModel):
    """List of user sessions."""
    sessions: list[SessionInfo] = Field(..., description="User sessions")
    total: int = Field(..., description="Total number of sessions")