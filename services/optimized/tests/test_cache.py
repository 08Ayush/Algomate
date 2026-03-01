"""Unit tests for cache functionality."""

import pytest
import time

from storage.cache import (
    MemoryCache,
    CacheEntry,
    get_cache,
    cache_result,
)


class TestCacheEntry:
    """Tests for CacheEntry class."""
    
    def test_creation(self):
        """Test cache entry creation."""
        entry = CacheEntry("test_value", ttl=10)
        
        assert entry.value == "test_value"
        assert not entry.is_expired()
    
    def test_expiration(self):
        """Test cache entry expiration."""
        entry = CacheEntry("test_value", ttl=0)
        time.sleep(0.1)
        
        assert entry.is_expired()


class TestMemoryCache:
    """Tests for MemoryCache class."""
    
    def test_get_set(self):
        """Test basic get/set operations."""
        cache = MemoryCache(max_size=10, default_ttl=60)
        
        cache.set("key1", "value1")
        
        assert cache.get("key1") == "value1"
        assert cache.get("nonexistent") is None
    
    def test_expiration(self):
        """Test cache expiration."""
        cache = MemoryCache(default_ttl=1)
        
        cache.set("key1", "value1", ttl=0.05)  # 50ms TTL
        time.sleep(0.1)  # Wait 100ms
        
        assert cache.get("key1") is None
    
    def test_lru_eviction(self):
        """Test LRU eviction."""
        cache = MemoryCache(max_size=2, default_ttl=60)
        
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")  # Should evict key1
        
        assert cache.get("key1") is None
        assert cache.get("key2") == "value2"
        assert cache.get("key3") == "value3"
    
    def test_delete(self):
        """Test cache deletion."""
        cache = MemoryCache()
        
        cache.set("key1", "value1")
        cache.delete("key1")
        
        assert cache.get("key1") is None
    
    def test_clear(self):
        """Test cache clear."""
        cache = MemoryCache()
        
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.clear()
        
        assert len(cache.cache) == 0
    
    def test_stats(self):
        """Test cache statistics."""
        cache = MemoryCache()
        
        cache.set("key1", "value1")
        cache.get("key1")  # Hit
        cache.get("key2")  # Miss
        
        stats = cache.get_stats()
        
        assert stats['hits'] == 1
        assert stats['misses'] == 1
        assert stats['size'] == 1


class TestCacheResultDecorator:
    """Tests for cache_result decorator."""
    
    def test_cache_result(self):
        """Test @cache_result decorator."""
        call_count = 0
        
        @cache_result(ttl=60, key_prefix="test")
        def expensive_function(x):
            nonlocal call_count
            call_count += 1
            return x * 2
        
        # First call - should compute
        result1 = expensive_function(5)
        assert result1 == 10
        assert call_count == 1
        
        # Second call - should use cache
        result2 = expensive_function(5)
        assert result2 == 10
        assert call_count == 1  # Not incremented
        
        # Different argument - should compute
        result3 = expensive_function(10)
        assert result3 == 20
        assert call_count == 2
    
    def test_cache_clear(self):
        """Test cache clear method."""
        call_count = 0
        
        @cache_result(ttl=60)
        def my_function(x):
            nonlocal call_count
            call_count += 1
            return x * 2
        
        my_function(5)
        my_function(5)
        assert call_count == 1
        
        my_function.cache_clear()
        
        my_function(5)
        assert call_count == 2
