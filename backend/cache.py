# cache.py - Redis cache manager with fallback
import os
import json
import pickle
from typing import Any, Optional, Union
from datetime import timedelta

import redis
from dotenv import load_dotenv

load_dotenv()

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_CACHE_TTL = int(os.getenv("REDIS_CACHE_TTL", "3600"))  # 1 hour default

# Create Redis client
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=False)
    # Test connection
    redis_client.ping()
    REDIS_AVAILABLE = True
except (redis.ConnectionError, redis.RedisError):
    redis_client = None
    REDIS_AVAILABLE = False


class CacheManager:
    """Redis cache manager with fallback to in-memory cache when Redis is unavailable"""
    
    def __init__(self):
        self._memory_cache = {}
        self._memory_cache_ttl = {}
    
    def _is_redis_available(self) -> bool:
        """Check if Redis is available"""
        return REDIS_AVAILABLE and redis_client is not None
    
    def _serialize_value(self, value: Any) -> bytes:
        """Serialize value for storage"""
        return pickle.dumps(value)
    
    def _deserialize_value(self, value: bytes) -> Any:
        """Deserialize value from storage"""
        return pickle.loads(value)
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set a value in cache"""
        try:
            ttl = ttl or REDIS_CACHE_TTL
            
            if self._is_redis_available():
                serialized_value = self._serialize_value(value)
                redis_client.setex(key, ttl, serialized_value)
                return True
            else:
                # Fallback to memory cache
                self._memory_cache[key] = value
                import time
                self._memory_cache_ttl[key] = time.time() + ttl
                return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """Get a value from cache"""
        try:
            if self._is_redis_available():
                value = redis_client.get(key)
                if value is not None:
                    return self._deserialize_value(value)
                return None
            else:
                # Fallback to memory cache
                import time
                if key in self._memory_cache:
                    # Check if expired
                    if key in self._memory_cache_ttl:
                        if time.time() > self._memory_cache_ttl[key]:
                            del self._memory_cache[key]
                            del self._memory_cache_ttl[key]
                            return None
                    return self._memory_cache[key]
                return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete a value from cache"""
        try:
            if self._is_redis_available():
                redis_client.delete(key)
                return True
            else:
                # Fallback to memory cache
                if key in self._memory_cache:
                    del self._memory_cache[key]
                if key in self._memory_cache_ttl:
                    del self._memory_cache_ttl[key]
                return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    def clear(self) -> bool:
        """Clear all cache"""
        try:
            if self._is_redis_available():
                redis_client.flushdb()
                return True
            else:
                # Fallback to memory cache
                self._memory_cache.clear()
                self._memory_cache_ttl.clear()
                return True
        except Exception as e:
            print(f"Cache clear error: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            if self._is_redis_available():
                return redis_client.exists(key) > 0
            else:
                # Fallback to memory cache
                return key in self._memory_cache
        except Exception as e:
            print(f"Cache exists error: {e}")
            return False


# Global cache manager instance
cache = CacheManager()


def cache_key(prefix: str, *args) -> str:
    """Generate a cache key from prefix and arguments"""
    key_parts = [prefix]
    for arg in args:
        if isinstance(arg, (dict, list, tuple)):
            key_parts.append(str(hash(json.dumps(arg, sort_keys=True))))
        else:
            key_parts.append(str(arg))
    return ":".join(key_parts)


def cached_result(prefix: str, ttl: Optional[int] = None):
    """Decorator to cache function results"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key_str = cache_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            result = cache.get(cache_key_str)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key_str, result, ttl)
            return result
        return wrapper
    return decorator
