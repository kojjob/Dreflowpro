"""
OAuth2 integration service for social authentication.
Supports Google, GitHub, and Microsoft OAuth providers.
"""
import secrets
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from urllib.parse import urlencode

from authlib.integrations.httpx_client import AsyncOAuth2Client
from authlib.oauth2 import OAuth2Error
import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from .config import settings
from ..models.user import User, SocialAccount, OAuthProvider, AuthMethod
from ..schemas.auth import TokenResponse
from .security import AuthService


class OAuthConfig:
    """OAuth provider configurations."""
    
    PROVIDERS = {
        "google": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_endpoint": "https://oauth2.googleapis.com/token",
            "userinfo_endpoint": "https://www.googleapis.com/oauth2/v2/userinfo",
            "scopes": ["openid", "email", "profile"],
            "name": "Google"
        },
        "github": {
            "client_id": settings.GITHUB_CLIENT_ID,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "authorization_endpoint": "https://github.com/login/oauth/authorize",
            "token_endpoint": "https://github.com/login/oauth/access_token",
            "userinfo_endpoint": "https://api.github.com/user",
            "scopes": ["user:email"],
            "name": "GitHub"
        },
        "microsoft": {
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "client_secret": settings.MICROSOFT_CLIENT_SECRET,
            "authorization_endpoint": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            "token_endpoint": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            "userinfo_endpoint": "https://graph.microsoft.com/v1.0/me",
            "scopes": ["openid", "profile", "email"],
            "name": "Microsoft"
        }
    }


class OAuthService:
    """OAuth2 authentication service."""
    
    @staticmethod
    def get_provider_config(provider: str) -> Dict[str, Any]:
        """Get OAuth provider configuration."""
        if provider not in OAuthConfig.PROVIDERS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {provider}"
            )
        
        config = OAuthConfig.PROVIDERS[provider]
        if not config["client_id"] or not config["client_secret"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OAuth provider {provider} is not configured"
            )
        
        return config
    
    @staticmethod
    def generate_authorization_url(provider: str, redirect_uri: str, state: Optional[str] = None) -> str:
        """Generate OAuth authorization URL."""
        config = OAuthService.get_provider_config(provider)
        
        if not state:
            state = secrets.token_urlsafe(32)
        
        params = {
            "response_type": "code",
            "client_id": config["client_id"],
            "redirect_uri": redirect_uri,
            "scope": " ".join(config["scopes"]),
            "state": state,
        }
        
        # Add provider-specific parameters
        if provider == "microsoft":
            params["response_mode"] = "query"
        
        return f"{config['authorization_endpoint']}?{urlencode(params)}"
    
    @staticmethod
    async def exchange_code_for_token(
        provider: str, 
        code: str, 
        redirect_uri: str
    ) -> Dict[str, Any]:
        """Exchange authorization code for access token."""
        config = OAuthService.get_provider_config(provider)
        
        async with httpx.AsyncClient() as client:
            try:
                oauth_client = AsyncOAuth2Client(
                    client_id=config["client_id"],
                    client_secret=config["client_secret"],
                    client=client
                )
                
                token = await oauth_client.fetch_token(
                    config["token_endpoint"],
                    code=code,
                    redirect_uri=redirect_uri
                )
                
                return token
                
            except OAuth2Error as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"OAuth token exchange failed: {str(e)}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to exchange OAuth code: {str(e)}"
                )
    
    @staticmethod
    async def get_user_info(provider: str, access_token: str) -> Dict[str, Any]:
        """Fetch user information from OAuth provider."""
        config = OAuthService.get_provider_config(provider)
        
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(config["userinfo_endpoint"], headers=headers)
                response.raise_for_status()
                user_info = response.json()
                
                # For GitHub, we need to fetch email separately if not public
                if provider == "github" and "email" not in user_info:
                    email_response = await client.get(
                        "https://api.github.com/user/emails",
                        headers=headers
                    )
                    if email_response.status_code == 200:
                        emails = email_response.json()
                        primary_email = next((e for e in emails if e.get("primary")), None)
                        if primary_email:
                            user_info["email"] = primary_email["email"]
                
                return user_info
                
            except httpx.HTTPStatusError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to fetch user info: {e.response.text}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error fetching user info: {str(e)}"
                )
    
    @staticmethod
    def normalize_user_info(provider: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize user information across different OAuth providers."""
        normalized = {}
        
        if provider == "google":
            normalized = {
                "provider_account_id": user_info.get("id"),
                "email": user_info.get("email"),
                "first_name": user_info.get("given_name"),
                "last_name": user_info.get("family_name"),
                "avatar_url": user_info.get("picture"),
                "email_verified": user_info.get("verified_email", False)
            }
        
        elif provider == "github":
            name_parts = (user_info.get("name") or "").split(" ", 1)
            normalized = {
                "provider_account_id": str(user_info.get("id")),
                "email": user_info.get("email"),
                "first_name": name_parts[0] if name_parts else user_info.get("login"),
                "last_name": name_parts[1] if len(name_parts) > 1 else "",
                "avatar_url": user_info.get("avatar_url"),
                "email_verified": True  # GitHub emails are considered verified
            }
        
        elif provider == "microsoft":
            normalized = {
                "provider_account_id": user_info.get("id"),
                "email": user_info.get("mail") or user_info.get("userPrincipalName"),
                "first_name": user_info.get("givenName"),
                "last_name": user_info.get("surname"),
                "avatar_url": None,  # Microsoft Graph doesn't provide avatar URL directly
                "email_verified": True  # Microsoft emails are considered verified
            }
        
        # Ensure we have required fields
        if not normalized.get("provider_account_id") or not normalized.get("email"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incomplete user information from {provider}"
            )
        
        return normalized
    
    @staticmethod
    async def authenticate_or_create_user(
        db: AsyncSession,
        provider: str,
        token_data: Dict[str, Any],
        user_info: Dict[str, Any]
    ) -> Tuple[User, bool]:
        """
        Authenticate existing user or create new user from OAuth data.
        Returns (User, is_new_user).
        """
        normalized_info = OAuthService.normalize_user_info(provider, user_info)
        provider_enum = OAuthProvider(provider)
        
        # Check if social account already exists
        result = await db.execute(
            select(SocialAccount).where(
                SocialAccount.provider == provider_enum,
                SocialAccount.provider_account_id == normalized_info["provider_account_id"]
            )
        )
        existing_social_account = result.scalar_one_or_none()
        
        if existing_social_account:
            # Update token information
            existing_social_account.access_token = token_data.get("access_token")
            existing_social_account.refresh_token = token_data.get("refresh_token")
            existing_social_account.expires_at = (
                datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))
                if token_data.get("expires_in") else None
            )
            existing_social_account.raw_user_info = user_info
            
            await db.commit()
            await db.refresh(existing_social_account)
            
            return existing_social_account.user, False
        
        # Check if user exists by email
        user = await AuthService.get_user_by_email(db, normalized_info["email"])
        is_new_user = user is None
        
        if not user:
            # Create new user
            user = User(
                id=uuid.uuid4(),
                email=normalized_info["email"],
                first_name=normalized_info["first_name"] or "",
                last_name=normalized_info["last_name"] or "",
                avatar_url=normalized_info["avatar_url"],
                auth_method=AuthMethod(provider.upper()),
                is_verified=normalized_info.get("email_verified", False),
                is_active=True,
                provider_data={
                    "primary_provider": provider,
                    "verified_email": normalized_info.get("email_verified", False)
                }
            )
            
            db.add(user)
            await db.flush()  # Get the user ID
        
        # Create social account connection
        social_account = SocialAccount(
            id=uuid.uuid4(),
            user_id=user.id,
            provider=provider_enum,
            provider_account_id=normalized_info["provider_account_id"],
            provider_account_email=normalized_info["email"],
            access_token=token_data.get("access_token"),
            refresh_token=token_data.get("refresh_token"),
            expires_at=(
                datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))
                if token_data.get("expires_in") else None
            ),
            token_type=token_data.get("token_type", "Bearer"),
            scope=token_data.get("scope"),
            raw_user_info=user_info,
            is_primary=is_new_user  # Set as primary if it's a new user
        )
        
        db.add(social_account)
        await db.commit()
        await db.refresh(user)
        
        return user, is_new_user
    
    @staticmethod
    async def get_user_social_accounts(db: AsyncSession, user_id: uuid.UUID) -> list[SocialAccount]:
        """Get all social accounts for a user."""
        result = await db.execute(
            select(SocialAccount).where(SocialAccount.user_id == user_id)
        )
        return result.scalars().all()
    
    @staticmethod
    async def unlink_social_account(
        db: AsyncSession, 
        user_id: uuid.UUID, 
        provider: str
    ) -> bool:
        """Unlink a social account from user."""
        provider_enum = OAuthProvider(provider)
        
        result = await db.execute(
            select(SocialAccount).where(
                SocialAccount.user_id == user_id,
                SocialAccount.provider == provider_enum
            )
        )
        social_account = result.scalar_one_or_none()
        
        if not social_account:
            return False
        
        await db.delete(social_account)
        await db.commit()
        
        return True


class OAuthStateManager:
    """Manage OAuth state for security and redirect handling."""
    
    # In production, use Redis or database for state storage
    _state_storage: Dict[str, Dict[str, Any]] = {}
    
    @classmethod
    def create_state(
        cls, 
        provider: str, 
        redirect_url: Optional[str] = None,
        expires_in: int = 600  # 10 minutes
    ) -> str:
        """Create and store OAuth state."""
        state = secrets.token_urlsafe(32)
        
        cls._state_storage[state] = {
            "provider": provider,
            "redirect_url": redirect_url,
            "expires_at": datetime.utcnow() + timedelta(seconds=expires_in),
            "created_at": datetime.utcnow()
        }
        
        return state
    
    @classmethod
    def verify_and_consume_state(cls, state: str) -> Optional[Dict[str, Any]]:
        """Verify and consume OAuth state."""
        if state not in cls._state_storage:
            return None
        
        state_data = cls._state_storage.pop(state)
        
        # Check if state has expired
        if datetime.utcnow() > state_data["expires_at"]:
            return None
        
        return state_data
    
    @classmethod
    def cleanup_expired_states(cls):
        """Clean up expired states."""
        now = datetime.utcnow()
        expired_states = [
            state for state, data in cls._state_storage.items()
            if now > data["expires_at"]
        ]
        
        for state in expired_states:
            cls._state_storage.pop(state, None)