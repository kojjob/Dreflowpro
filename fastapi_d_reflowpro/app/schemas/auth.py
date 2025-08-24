from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserLogin(BaseModel):
    """User login request schema."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password")

class UserRegister(BaseModel):
    """User registration request schema."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password")
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    organization_name: Optional[str] = Field(None, max_length=200, description="Organization name for new org")

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

class PasswordReset(BaseModel):
    """Password reset request schema."""
    email: EmailStr = Field(..., description="User email address")

class PasswordResetConfirm(BaseModel):
    """Password reset confirmation schema."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")

class PasswordChange(BaseModel):
    """Password change request schema."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")

class EmailVerification(BaseModel):
    """Email verification schema."""
    token: str = Field(..., description="Email verification token")

class APIKeyCreate(BaseModel):
    """API key creation request schema."""
    name: str = Field(..., min_length=1, max_length=100, description="API key name/description")
    expires_at: Optional[datetime] = Field(None, description="API key expiration date")

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