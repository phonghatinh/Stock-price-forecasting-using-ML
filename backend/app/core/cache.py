"""Redis cache helper."""
import json
import logging
import time
from typing import Any, Optional
import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

_redis_pool: Optional[aioredis.Redis] = None
_use_redis = True
_mem_cache = {}

async def get_redis() -> Optional[aioredis.Redis]:
    global _redis_pool, _use_redis
    if not _use_redis:
        return None
    if _redis_pool is None:
        try:
            _redis_pool = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
            # Test connection
            await _redis_pool.ping()
        except Exception as e:
            logger.warning(f"Redis unavailable, using in-memory cache: {e}")
            _use_redis = False
            _redis_pool = None
    return _redis_pool

async def cache_get(key: str) -> Optional[Any]:
    try:
        redis = await get_redis()
        if redis:
            value = await redis.get(key)
            return json.loads(value) if value else None
    except Exception:
        pass
    
    # Fallback to in-memory
    if key in _mem_cache:
        val, exp = _mem_cache[key]
        if time.time() < exp:
            return val
        else:
            del _mem_cache[key]
    return None

async def cache_set(key: str, value: Any, ttl: int = settings.CACHE_TTL):
    try:
        redis = await get_redis()
        if redis:
            await redis.setex(key, ttl, json.dumps(value, default=str))
            return
    except Exception:
        pass
        
    # Fallback to in-memory
    _mem_cache[key] = (value, time.time() + ttl)

async def cache_delete(key: str):
    try:
        redis = await get_redis()
        if redis:
            await redis.delete(key)
    except Exception:
        pass
        
    if key in _mem_cache:
        del _mem_cache[key]
