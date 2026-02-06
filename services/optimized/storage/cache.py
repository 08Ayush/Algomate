"""Caching layer for performance optimization."""

from typing import Any, Optional, Callable, Dict
from datetime import datetime, timedelta
import functools
import logging
import hashlib
import pickle


class CacheEntry:
    """Single cache entry with expiration."""
    
    def __init__(self, value: Any, ttl: int):
        """Initialize cache entry.
        
        Args:
            value: Cached value
            ttl: Time-to-live in seconds
        """
        self.value = value
        self.created_at = datetime.now()
        self.expires_at = self.created_at + timedelta(seconds=ttl)
    
    def is_expired(self) -> bool:
        """Check if entry has expired."""
        return datetime.now() > self.expires_at
    
    def get_age(self) -> float:
        """Get age of entry in seconds."""
        return (datetime.now() - self.created_at).total_seconds()


class MemoryCache:
    """In-memory LRU cache with TTL support."""
    
    def __init__(self, max_size: int = 100, default_ttl: int = 3600):
        """Initialize memory cache.
        
        Args:
            max_size: Maximum number of entries
            default_ttl: Default time-to-live in seconds
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache: Dict[str, CacheEntry] = {}
        self.access_order: list = []
        self.logger = logging.getLogger(__name__)
        
        # Statistics
        self.hits = 0
        self.misses = 0
        self.evictions = 0
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache.
        
        Args:
            key: Cache key
        
        Returns:
            Cached value or None if not found/expired
        """
        if key not in self.cache:
            self.misses += 1
            return None
        
        entry = self.cache[key]
        
        # Check expiration
        if entry.is_expired():
            self.logger.debug(f"Cache expired for key: {key}")
            del self.cache[key]
            self.access_order.remove(key)
            self.misses += 1
            return None
        
        # Update access order (LRU)
        if key in self.access_order:
            self.access_order.remove(key)
        self.access_order.append(key)
        
        self.hits += 1
        self.logger.debug(f"Cache hit for key: {key} (age: {entry.get_age():.1f}s)")
        
        return entry.value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if None)
        """
        ttl = ttl or self.default_ttl
        
        # Evict if at capacity
        if key not in self.cache and len(self.cache) >= self.max_size:
            self._evict_lru()
        
        # Store entry
        self.cache[key] = CacheEntry(value, ttl)
        
        # Update access order
        if key in self.access_order:
            self.access_order.remove(key)
        self.access_order.append(key)
        
        self.logger.debug(f"Cache set for key: {key} (ttl: {ttl}s)")
    
    def delete(self, key: str):
        """Delete entry from cache.
        
        Args:
            key: Cache key
        """
        if key in self.cache:
            del self.cache[key]
            self.access_order.remove(key)
            self.logger.debug(f"Cache deleted for key: {key}")
    
    def clear(self):
        """Clear all cache entries."""
        count = len(self.cache)
        self.cache.clear()
        self.access_order.clear()
        self.logger.info(f"Cache cleared ({count} entries)")
    
    def _evict_lru(self):
        """Evict least recently used entry."""
        if not self.access_order:
            return
        
        lru_key = self.access_order[0]
        del self.cache[lru_key]
        self.access_order.pop(0)
        self.evictions += 1
        
        self.logger.debug(f"Evicted LRU entry: {lru_key}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics.
        
        Returns:
            Dictionary with cache stats
        """
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'size': len(self.cache),
            'max_size': self.max_size,
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': f"{hit_rate:.1f}%",
            'evictions': self.evictions,
            'total_requests': total_requests,
        }
    
    def cleanup_expired(self):
        """Remove all expired entries."""
        expired_keys = [
            key for key, entry in self.cache.items()
            if entry.is_expired()
        ]
        
        for key in expired_keys:
            del self.cache[key]
            self.access_order.remove(key)
        
        if expired_keys:
            self.logger.info(f"Cleaned up {len(expired_keys)} expired entries")


# Global cache instance
_global_cache: Optional[MemoryCache] = None


def get_cache() -> MemoryCache:
    """Get or create global cache instance."""
    global _global_cache
    if _global_cache is None:
        _global_cache = MemoryCache()
    return _global_cache


def cache_result(ttl: int = 3600, key_prefix: str = ""):
    """Decorator to cache function results.
    
    Args:
        ttl: Time-to-live in seconds
        key_prefix: Prefix for cache keys
    
    Example:
        @cache_result(ttl=600, key_prefix="schedule")
        def get_schedule(institution_id: str):
            # expensive operation
            return schedule
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            cache = get_cache()
            
            # Generate cache key from function name and arguments
            key_parts = [key_prefix, func.__name__]
            
            # Add args to key
            for arg in args:
                if isinstance(arg, (str, int, float, bool)):
                    key_parts.append(str(arg))
                else:
                    # Hash complex objects
                    try:
                        arg_bytes = pickle.dumps(arg)
                        arg_hash = hashlib.md5(arg_bytes).hexdigest()[:8]
                        key_parts.append(arg_hash)
                    except:
                        pass
            
            # Add kwargs to key
            for k, v in sorted(kwargs.items()):
                if isinstance(v, (str, int, float, bool)):
                    key_parts.append(f"{k}={v}")
            
            cache_key = ":".join(filter(None, key_parts))
            
            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Compute and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            
            return result
        
        # Add cache management methods
        wrapper.cache_clear = lambda: get_cache().clear()
        wrapper.cache_stats = lambda: get_cache().get_stats()
        
        return wrapper
    return decorator


def invalidate_cache_prefix(prefix: str):
    """Invalidate all cache entries with given prefix.
    
    Args:
        prefix: Cache key prefix to invalidate
    """
    cache = get_cache()
    keys_to_delete = [
        key for key in cache.cache.keys()
        if key.startswith(prefix)
    ]
    
    for key in keys_to_delete:
        cache.delete(key)
    
    if keys_to_delete:
        logging.getLogger(__name__).info(
            f"Invalidated {len(keys_to_delete)} cache entries with prefix '{prefix}'"
        )
