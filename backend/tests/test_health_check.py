"""
Tests for health check endpoints.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock
from main import app


@pytest.mark.asyncio
async def test_basic_health_check():
    """Test the basic health check endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/system/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "dreflowpro-api"
        assert "timestamp" in data


@pytest.mark.asyncio
async def test_liveness_probe():
    """Test the liveness probe endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/system/health/live")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"
        assert "timestamp" in data


@pytest.mark.asyncio
async def test_readiness_probe_healthy():
    """Test readiness probe when services are healthy."""
    with patch('app.api.v1.system.router.check_database_health') as mock_db:
        with patch('app.api.v1.system.router.check_redis_health') as mock_redis:
            mock_db.return_value = {"status": "healthy"}
            mock_redis.return_value = {"status": "healthy"}
            
            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/system/health/ready")
                
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "ready"
                assert data["database"] == "healthy"
                assert data["redis"] == "healthy"


@pytest.mark.asyncio
async def test_readiness_probe_unhealthy():
    """Test readiness probe when a service is unhealthy."""
    with patch('app.api.v1.system.router.check_database_health') as mock_db:
        with patch('app.api.v1.system.router.check_redis_health') as mock_redis:
            mock_db.return_value = {"status": "unhealthy", "error": "Connection failed"}
            mock_redis.return_value = {"status": "healthy"}
            
            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/system/health/ready")
                
                assert response.status_code == 503
                data = response.json()
                assert "not_ready" in str(data)


@pytest.mark.asyncio
async def test_detailed_health_check():
    """Test detailed health check endpoint."""
    with patch('app.api.v1.system.router.check_database_health') as mock_db:
        with patch('app.api.v1.system.router.check_redis_health') as mock_redis:
            with patch('app.core.cache_manager.cache_manager.get_stats') as mock_cache:
                mock_db.return_value = {
                    "status": "healthy",
                    "response_time_ms": 1.5,
                    "pool_status": {"size": 20, "checked_in": 15, "checked_out": 5}
                }
                mock_redis.return_value = {
                    "status": "healthy",
                    "response_time_ms": 0.8,
                    "memory_info": {"used_memory": "100MB"}
                }
                mock_cache.return_value = {
                    "l1_hits": 100,
                    "l1_misses": 10,
                    "l2_hits": 50,
                    "l2_misses": 5
                }
                
                async with AsyncClient(app=app, base_url="http://test") as client:
                    response = await client.get("/api/v1/system/health/detailed")
                    
                    assert response.status_code == 200
                    data = response.json()
                    assert data["status"] == "healthy"
                    assert "components" in data
                    assert "system" in data
                    assert data["components"]["database"]["status"] == "healthy"
                    assert data["components"]["redis"]["status"] == "healthy"
                    assert "cache" in data["components"]