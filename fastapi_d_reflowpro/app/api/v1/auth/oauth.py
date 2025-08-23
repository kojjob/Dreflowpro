"""
OAuth authentication endpoints for social login.
Supports Google, GitHub, and Microsoft OAuth providers.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, Optional
import logging

from ....core.database import get_db
from ....core.oauth import OAuthService, OAuthStateManager
from ....core.security import AuthService
from ....core.deps import get_current_user
from ....models.user import User
from ....schemas.auth import (
    TokenResponse, OAuthLoginRequest, SocialAccountList, 
    SocialAccountInfo, ErrorResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/providers")
async def get_oauth_providers():
    """Get list of available OAuth providers."""
    from ....core.oauth import OAuthConfig
    
    providers = []
    for provider_key, config in OAuthConfig.PROVIDERS.items():
        providers.append({
            "name": provider_key,
            "display_name": config["name"],
            "enabled": bool(config["client_id"] and config["client_secret"])
        })
    
    return {
        "providers": providers,
        "total": len(providers)
    }


@router.get("/{provider}/login")
async def initiate_oauth_login(
    provider: str,
    request: Request,
    redirect_url: Optional[str] = None
):
    """Initiate OAuth login flow."""
    try:
        # Validate provider
        OAuthService.get_provider_config(provider)
        
        # Generate state for security
        state = OAuthStateManager.create_state(
            provider=provider,
            redirect_url=redirect_url
        )
        
        # Get redirect URI - use the configured callback URL
        redirect_uri = str(request.url_for("oauth_callback", provider=provider))
        
        # Generate authorization URL
        auth_url = OAuthService.generate_authorization_url(
            provider=provider,
            redirect_uri=redirect_uri,
            state=state
        )
        
        logger.info(f"Initiating OAuth login for provider: {provider}")
        
        return {
            "authorization_url": auth_url,
            "state": state,
            "provider": provider
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating OAuth login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate OAuth login"
        )


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None
):
    """Handle OAuth callback from provider."""
    try:
        # Handle OAuth errors
        if error:
            logger.warning(f"OAuth error from {provider}: {error} - {error_description}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth authentication failed: {error_description or error}"
            )
        
        if not code or not state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing authorization code or state parameter"
            )
        
        # Verify state parameter
        state_data = OAuthStateManager.verify_and_consume_state(state)
        if not state_data or state_data["provider"] != provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired state parameter"
            )
        
        # Exchange code for token
        redirect_uri = str(request.url_for("oauth_callback", provider=provider))
        token_data = await OAuthService.exchange_code_for_token(
            provider=provider,
            code=code,
            redirect_uri=redirect_uri
        )
        
        # Get user info from provider
        user_info = await OAuthService.get_user_info(
            provider=provider,
            access_token=token_data["access_token"]
        )
        
        # Authenticate or create user
        user, is_new_user = await OAuthService.authenticate_or_create_user(
            db=db,
            provider=provider,
            token_data=token_data,
            user_info=user_info
        )
        
        # Update last login
        from datetime import datetime
        user.last_login = datetime.utcnow()
        await db.commit()
        
        # Create JWT tokens
        tokens = AuthService.create_tokens(user)
        
        logger.info(f"OAuth login successful for {provider}: user_id={user.id}, new_user={is_new_user}")
        
        # Handle redirect
        redirect_url = state_data.get("redirect_url") or "http://localhost:3000/dashboard"
        
        # For development, return JSON response
        # In production, you might want to redirect with tokens in secure cookies
        if request.headers.get("accept", "").startswith("application/json"):
            return {
                "success": True,
                "user_id": str(user.id),
                "is_new_user": is_new_user,
                "tokens": tokens,
                "redirect_url": redirect_url
            }
        else:
            # Redirect with token as query parameter (for development only)
            # In production, use secure HTTP-only cookies
            redirect_response = RedirectResponse(
                url=f"{redirect_url}?access_token={tokens['access_token']}&new_user={is_new_user}"
            )
            return redirect_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback error for {provider}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth authentication failed"
        )


@router.post("/{provider}/link")
async def link_social_account(
    provider: str,
    request: OAuthLoginRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Link a social account to existing user account."""
    # This endpoint would be used to add additional OAuth providers to an existing account
    # Implementation would be similar to the callback but would link to existing user
    # For now, return a placeholder
    
    return {
        "message": f"Social account linking for {provider} is not yet implemented",
        "user_id": str(current_user.id)
    }


@router.delete("/{provider}/unlink")
async def unlink_social_account(
    provider: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Unlink a social account from user."""
    try:
        success = await OAuthService.unlink_social_account(
            db=db,
            user_id=current_user.id,
            provider=provider
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No {provider} account linked to this user"
            )
        
        logger.info(f"Social account unlinked: user_id={current_user.id}, provider={provider}")
        
        return {
            "message": f"{provider.title()} account unlinked successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unlinking social account: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unlink social account"
        )


@router.get("/accounts", response_model=SocialAccountList)
async def get_social_accounts(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Get user's connected social accounts."""
    try:
        social_accounts = await OAuthService.get_user_social_accounts(
            db=db,
            user_id=current_user.id
        )
        
        accounts = [
            SocialAccountInfo(
                id=str(account.id),
                provider=account.provider.value,
                provider_account_email=account.provider_account_email,
                is_primary=account.is_primary,
                created_at=account.created_at
            )
            for account in social_accounts
        ]
        
        return SocialAccountList(
            accounts=accounts,
            total=len(accounts)
        )
        
    except Exception as e:
        logger.error(f"Error fetching social accounts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch social accounts"
        )