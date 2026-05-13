"""Redis cache helper."""
import json
import logging
from typing import Any, Optional
import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        try:
            _redis_pool = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        except Exception as e:
            logger.warning(f"Redis unavailable: {e}")
    return _redis_pool


async def cache_get(key: str) -> Optional[Any]:
    try:
        redis = await get_redis()
        if redis is None:
            return None
        value = await redis.get(key)
        return json.loads(value) if value else None
    except Exception as e:
        logger.warning(f"Cache GET error [{key}]: {e}")
        return None


async def cache_set(key: str, value: Any, ttl: int = settings.CACHE_TTL):
    try:
        redis = await get_redis()
        if redis is None:
            return
        await redis.setex(key, ttl, json.dumps(value, default=str))
    except Exception as e:
        logger.warning(f"Cache SET error [{key}]: {e}")


async def cache_delete(key: str):
    try:
        redis = await get_redis()
        if redis:
            await redis.delete(key)
    except Exception as e:
        logger.warning(f"Cache DELETE error [{key}]: {e}")
