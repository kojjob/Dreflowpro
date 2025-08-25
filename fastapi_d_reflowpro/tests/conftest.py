"""
Pytest configuration and fixtures for comprehensive testing.
"""
import asyncio
import os
import tempfile
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import Settings, get_settings
from app.core.database import Base, get_db
from app.core.redis import RedisManager
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
# Phase 2 models removed for Phase 1 testing
# from app.models.connector import DataConnector
# from app.models.pipeline import ETLPipeline
from main import app


class TestSettings(Settings):
    """Test-specific settings configuration."""
    
    # Use in-memory SQLite for tests
    DATABASE_URL: str = "sqlite+aiosqlite:///:memory:"
    
    # Use separate Redis DB for tests
    REDIS_DB: int = 15
    REDIS_URL: str = "redis://localhost:6379/15"
    
    # Test-specific settings
    DEBUG: bool = True
    SECRET_KEY: str = "test-secret-key-for-testing-only"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 5
    
    # Test file storage
    UPLOAD_FOLDER: str = "/tmp/test_uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB for tests
    
    # Disable external services in tests
    OPENAI_API_KEY: str = "test-openai-key"
    GOOGLE_CLIENT_ID: str = "test-google-client-id"
    GOOGLE_CLIENT_SECRET: str = "test-google-secret"


@pytest.fixture(scope="session")
def test_settings() -> TestSettings:
    """Test settings fixture."""
    return TestSettings()


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine(test_settings):
    """Create test database engine."""
    engine = create_async_engine(
        test_settings.DATABASE_URL,
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def mock_redis():
    """Mock Redis client for testing."""
    mock_redis = AsyncMock()
    mock_redis.ping.return_value = True
    mock_redis.get.return_value = None
    mock_redis.set.return_value = True
    mock_redis.delete.return_value = 1
    mock_redis.exists.return_value = False
    return mock_redis


@pytest_asyncio.fixture
async def test_redis_manager(mock_redis):
    """Test Redis manager with mocked client."""
    manager = RedisManager()
    manager.redis_client = mock_redis
    manager._connection_pool = MagicMock()
    return manager


@pytest.fixture
def override_get_settings(test_settings):
    """Override settings dependency."""
    def _override():
        return test_settings
    return _override


@pytest.fixture
def override_get_db(db_session):
    """Override database dependency."""
    async def _override():
        yield db_session
    return _override


@pytest_asyncio.fixture
async def test_app(
    test_settings, 
    override_get_settings, 
    override_get_db,
    test_redis_manager
):
    """Create test FastAPI application with overridden dependencies."""
    from app.core.redis import redis_manager
    
    # Override dependencies
    app.dependency_overrides[get_settings] = override_get_settings
    app.dependency_overrides[get_db] = override_get_db
    
    # Mock Redis manager
    redis_manager.redis_client = test_redis_manager.redis_client
    
    # Create upload directory
    os.makedirs(test_settings.UPLOAD_FOLDER, exist_ok=True)
    
    yield app
    
    # Cleanup
    app.dependency_overrides.clear()
    
    # Remove test upload directory
    import shutil
    if os.path.exists(test_settings.UPLOAD_FOLDER):
        shutil.rmtree(test_settings.UPLOAD_FOLDER)


@pytest.fixture
def test_client(test_app) -> TestClient:
    """Create test client for synchronous tests."""
    return TestClient(test_app)


@pytest_asyncio.fixture
async def async_client(test_app) -> AsyncGenerator[AsyncClient, None]:
    """Create async test client for async tests."""
    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# User fixtures
@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        first_name="Test",
        last_name="User",
        hashed_password=get_password_hash("testpassword123"),
        is_active=True,
        is_verified=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin_user(db_session: AsyncSession) -> User:
    """Create a test admin user."""
    user = User(
        email="admin@example.com",
        first_name="Admin",
        last_name="User",
        hashed_password=get_password_hash("adminpassword123"),
        is_active=True,
        is_verified=True,
        is_superuser=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def test_user_token(test_user: User, test_settings: TestSettings) -> str:
    """Create access token for test user."""
    return create_access_token(
        subject=test_user.email,
        expires_delta_minutes=test_settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )


@pytest.fixture
def test_admin_token(test_admin_user: User, test_settings: TestSettings) -> str:
    """Create access token for test admin user."""
    return create_access_token(
        subject=test_admin_user.email,
        expires_delta_minutes=test_settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )


@pytest.fixture
def auth_headers(test_user_token: str) -> dict:
    """Authorization headers for test user."""
    return {"Authorization": f"Bearer {test_user_token}"}


@pytest.fixture
def admin_auth_headers(test_admin_token: str) -> dict:
    """Authorization headers for test admin user."""
    return {"Authorization": f"Bearer {test_admin_token}"}


# Data fixtures - Phase 2 models temporarily disabled for Phase 1 testing
# @pytest.fixture
# async def test_connector(db_session: AsyncSession, test_user: User) -> DataConnector:
#     """Create a test connector."""
#     connector = DataConnector(
#         name="Test PostgreSQL Connector",
#         type="postgres",
#         config={
#             "host": "localhost",
#             "port": 5432,
#             "database": "test_db",
#             "username": "test_user"
#         },
#         user_id=test_user.id,
#         is_active=True
#     )
#     db_session.add(connector)
#     await db_session.commit()
#     await db_session.refresh(connector)
#     return connector


# @pytest.fixture
# async def test_pipeline(db_session: AsyncSession, test_user: User) -> ETLPipeline:
#     """Create a test pipeline."""
#     pipeline = ETLPipeline(
#         name="Test ETL Pipeline",
#         description="A test pipeline for unit testing",
#         config={
#             "source": {"type": "csv", "path": "/test/data.csv"},
#             "transformations": [
#                 {"type": "filter", "column": "status", "value": "active"}
#             ],
#             "destination": {"type": "postgres", "table": "processed_data"}
#         },
#         user_id=test_user.id,
#         is_active=True
#     )
#     db_session.add(pipeline)
#     await db_session.commit()
#     await db_session.refresh(pipeline)
#     return pipeline


# File fixtures
@pytest.fixture
def sample_csv_file():
    """Create a sample CSV file for testing."""
    content = "name,email,age\nJohn Doe,john@example.com,30\nJane Smith,jane@example.com,25"
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write(content)
        f.flush()
        yield f.name
    os.unlink(f.name)


@pytest.fixture
def sample_json_file():
    """Create a sample JSON file for testing."""
    import json
    content = [
        {"name": "John Doe", "email": "john@example.com", "age": 30},
        {"name": "Jane Smith", "email": "jane@example.com", "age": 25}
    ]
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(content, f)
        f.flush()
        yield f.name
    os.unlink(f.name)


# Mock external services
@pytest.fixture
def mock_celery_task():
    """Mock Celery task for testing."""
    mock_task = MagicMock()
    mock_task.delay.return_value = MagicMock(id="test-task-id")
    return mock_task


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for testing."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="Mocked AI response"))]
    mock_client.chat.completions.create.return_value = mock_response
    return mock_client


# Performance testing fixtures
@pytest.fixture
def performance_test_data():
    """Generate performance test data."""
    import pandas as pd
    import numpy as np
    
    # Create sample data with 1000 rows
    data = {
        'id': range(1000),
        'name': [f'User {i}' for i in range(1000)],
        'email': [f'user{i}@example.com' for i in range(1000)],
        'age': np.random.randint(18, 80, 1000),
        'score': np.random.normal(75, 15, 1000)
    }
    return pd.DataFrame(data)


# Cleanup fixtures
@pytest_asyncio.fixture(autouse=True)
async def cleanup_test_data(db_session: AsyncSession):
    """Automatically cleanup test data after each test."""
    yield
    
    # Clean up any test data that might have been created
    try:
        # Phase 2 tables disabled for Phase 1 testing
        # await db_session.execute(text("DELETE FROM pipelines WHERE name LIKE 'Test%'"))
        # await db_session.execute(text("DELETE FROM connectors WHERE name LIKE 'Test%'"))
        await db_session.execute(text("DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%example.com%'"))
        await db_session.commit()
    except Exception:
        await db_session.rollback()