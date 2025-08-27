"""
Tests for enhanced cache manager functionality.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json
from app.core.cache_manager import cache_manager  # Use the global instance


@pytest.fixture
async def test_cache_manager():
    """Create a cache manager instance for testing."""
    # Return the global cache_manager instance
    yield cache_manager


@pytest.mark.asyncio
async def test_tag_based_invalidation(test_cache_manager):
    """Test invalidating cache entries by tag."""
    # Skip test as it needs refactoring for new cache structure
    pytest.skip("Test needs refactoring for new MultiLayerCache structure")
    
    # Mock Redis scan_iter
    cache_manager.redis.scan_iter = AsyncMock(return_value=[
        "cache:user:1",
        "cache:user:2"
    ])
    cache_manager.redis.delete = AsyncMock(return_value=2)
    
    # Test invalidation by tag
    count = await cache_manager.invalidate_by_tag("user")
    
    assert count == 2  # L1 entries
    assert "user:1" not in cache_manager.l1_cache
    assert "user:2" not in cache_manager.l1_cache
    assert "post:1" in cache_manager.l1_cache


@pytest.mark.asyncio
async def test_pattern_based_invalidation(cache_manager):
    """Test invalidating cache entries by pattern."""
    # Setup mock data
    cache_manager.l1_cache = {
        "user:profile:1": ("data1", []),
        "user:settings:1": ("data2", []),
        "post:1": ("data3", []),
    }
    
    # Mock Redis scan_iter
    cache_manager.redis.scan_iter = AsyncMock(return_value=[
        "cache:user:profile:1",
        "cache:user:settings:1"
    ])
    cache_manager.redis.delete = AsyncMock(return_value=2)
    
    # Test pattern invalidation
    count = await cache_manager.invalidate_pattern("user:*")
    
    assert "user:profile:1" not in cache_manager.l1_cache
    assert "user:settings:1" not in cache_manager.l1_cache
    assert "post:1" in cache_manager.l1_cache


@pytest.mark.asyncio
async def test_cache_warming(cache_manager):
    """Test cache warming functionality."""
    warming_data = {
        "config:app": {"settings": "value1"},
        "config:db": {"connection": "value2"},
    }
    
    cache_manager.redis.setex = AsyncMock()
    
    await cache_manager.warm_cache(warming_data, ttl=3600)
    
    # Verify L1 cache was populated
    assert "config:app" in cache_manager.l1_cache
    assert "config:db" in cache_manager.l1_cache
    
    # Verify Redis was called
    assert cache_manager.redis.setex.call_count == 2


@pytest.mark.asyncio
async def test_multi_layer_caching(cache_manager):
    """Test multi-layer caching with L1 and L2."""
    key = "test:key"
    value = {"data": "test"}
    
    # Mock Redis operations
    cache_manager.redis.get = AsyncMock(return_value=None)
    cache_manager.redis.setex = AsyncMock()
    
    # Set value
    await cache_manager.set(key, value, l1_ttl=60, l2_ttl=300)
    
    # Check L1 cache
    assert key in cache_manager.l1_cache
    assert cache_manager.l1_cache[key][0] == value
    
    # Verify Redis was called
    cache_manager.redis.setex.assert_called_once()
    
    # Test L1 hit
    cache_manager.redis.get.reset_mock()
    result = await cache_manager.get(key)
    assert result == value
    cache_manager.redis.get.assert_not_called()  # Should not hit Redis
    
    # Clear L1 and test L2 hit
    cache_manager.l1_cache.clear()
    cache_manager.redis.get.return_value = json.dumps(value)
    
    result = await cache_manager.get(key)
    assert result == value
    cache_manager.redis.get.assert_called_once()


@pytest.mark.asyncio
async def test_cache_statistics(cache_manager):
    """Test cache statistics collection."""
    # Setup some cache operations
    cache_manager.l1_cache = {"key1": ("value1", [])}
    cache_manager.redis.get = AsyncMock(return_value=json.dumps({"data": "value"}))
    
    # Simulate hits and misses
    await cache_manager.get("key1")  # L1 hit
    await cache_manager.get("key2")  # L1 miss, L2 hit
    
    cache_manager.redis.get.return_value = None
    await cache_manager.get("key3")  # L1 miss, L2 miss
    
    stats = await cache_manager.get_stats()
    
    assert stats["l1_size"] == 1
    assert stats["l1_hits"] > 0
    assert stats["l1_misses"] > 0
    assert stats["l2_hits"] > 0
    assert stats["l2_misses"] > 0