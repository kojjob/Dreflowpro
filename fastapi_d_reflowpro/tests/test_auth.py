"""
Authentication system tests.
"""
import pytest
from fastapi import status
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.core.security import verify_password, get_password_hash


class TestUserRegistration:
    """Test user registration functionality."""
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_register_new_user(self, async_client: AsyncClient):
        """Test successful user registration."""
        user_data = {
            "email": "newuser@example.com",
            "password": "securepassword123",
            "first_name": "New",
            "last_name": "User"
        }
        
        response = await async_client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["first_name"] == user_data["first_name"]
        assert data["last_name"] == user_data["last_name"]
        assert "id" in data
        assert "hashed_password" not in data  # Should not return password
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_register_duplicate_email(self, async_client: AsyncClient, test_user: User):
        """Test registration with existing email."""
        user_data = {
            "email": test_user.email,
            "password": "securepassword123",
            "first_name": "Duplicate",
            "last_name": "User"
        }
        
        response = await async_client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "already registered" in data["detail"].lower()
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_register_invalid_email(self, async_client: AsyncClient):
        """Test registration with invalid email format."""
        user_data = {
            "email": "invalid-email",
            "password": "securepassword123",
            "first_name": "Invalid",
            "last_name": "Email"
        }
        
        response = await async_client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_register_weak_password(self, async_client: AsyncClient):
        """Test registration with weak password."""
        user_data = {
            "email": "weakpass@example.com",
            "password": "123",  # Too short
            "first_name": "Weak",
            "last_name": "Password"
        }
        
        response = await async_client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestUserLogin:
    """Test user login functionality."""
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_login_valid_credentials(self, async_client: AsyncClient, test_user: User):
        """Test successful login with valid credentials."""
        login_data = {
            "username": test_user.email,
            "password": "testpassword123"
        }
        
        response = await async_client.post(
            "/api/v1/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_login_invalid_credentials(self, async_client: AsyncClient, test_user: User):
        """Test login with invalid credentials."""
        login_data = {
            "username": test_user.email,
            "password": "wrongpassword"
        }
        
        response = await async_client.post(
            "/api/v1/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert "incorrect" in data["detail"].lower()
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_login_nonexistent_user(self, async_client: AsyncClient):
        """Test login with non-existent user."""
        login_data = {
            "username": "nonexistent@example.com",
            "password": "somepassword123"
        }
        
        response = await async_client.post(
            "/api/v1/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_login_inactive_user(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test login with inactive user."""
        # Create inactive user
        inactive_user = User(
            email="inactive@example.com",
            first_name="Inactive",
            last_name="User",
            hashed_password=get_password_hash("testpassword123"),
            is_active=False
        )
        db_session.add(inactive_user)
        await db_session.commit()
        
        login_data = {
            "username": "inactive@example.com",
            "password": "testpassword123"
        }
        
        response = await async_client.post(
            "/api/v1/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestTokenAuthentication:
    """Test JWT token authentication."""
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_access_protected_route(self, async_client: AsyncClient, auth_headers: dict):
        """Test accessing protected route with valid token."""
        response = await async_client.get("/api/v1/auth/me", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "email" in data
        assert "first_name" in data
        assert "last_name" in data
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_access_without_token(self, async_client: AsyncClient):
        """Test accessing protected route without token."""
        response = await async_client.get("/api/v1/auth/me")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_access_with_invalid_token(self, async_client: AsyncClient):
        """Test accessing protected route with invalid token."""
        headers = {"Authorization": "Bearer invalid-token"}
        response = await async_client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_token_refresh(self, async_client: AsyncClient):
        """Test token refresh functionality."""
        # First login to get tokens
        login_data = {
            "username": "test@example.com",
            "password": "testpassword123"
        }
        
        login_response = await async_client.post(
            "/api/v1/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        tokens = login_response.json()
        refresh_token = tokens["refresh_token"]
        
        # Use refresh token to get new access token
        refresh_response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        
        assert refresh_response.status_code == status.HTTP_200_OK
        new_tokens = refresh_response.json()
        assert "access_token" in new_tokens
        assert "refresh_token" in new_tokens


class TestPasswordSecurity:
    """Test password security functions."""
    
    def test_password_hashing(self):
        """Test password hashing and verification."""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("wrongpassword", hashed) is False
    
    def test_hash_uniqueness(self):
        """Test that same password generates different hashes."""
        password = "testpassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestOAuthAuthentication:
    """Test OAuth authentication flows."""
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_google_oauth_initiation(self, async_client: AsyncClient):
        """Test Google OAuth flow initiation."""
        response = await async_client.get("/api/v1/auth/oauth/google/login")
        
        assert response.status_code == status.HTTP_302_FOUND
        assert "accounts.google.com" in response.headers["location"]
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_github_oauth_initiation(self, async_client: AsyncClient):
        """Test GitHub OAuth flow initiation."""
        response = await async_client.get("/api/v1/auth/oauth/github/login")
        
        assert response.status_code == status.HTTP_302_FOUND
        assert "github.com" in response.headers["location"]
    
    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_invalid_oauth_provider(self, async_client: AsyncClient):
        """Test invalid OAuth provider."""
        response = await async_client.get("/api/v1/auth/oauth/invalid/login")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND