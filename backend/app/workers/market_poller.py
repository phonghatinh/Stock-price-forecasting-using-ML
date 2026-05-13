"""
Market poller — runs periodically to fetch latest market data
and push to Redis cache and WebSocket clients.
"""
import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)


async def poll_market():
    """Fetch market overview and push to cache + WebSocket."""
    try:
        from app.services.fiinquant_client import get_fiinquant_client
        from app.services.market_service import MarketService
        from app.core.cache import cache_set
        from app.core.websocket import broadcast_market_update

        client = get_fiinquant_client()
        svc = MarketService(client)
        data = svc.get_market_overview()
        await cache_set("market:overview", data, ttl=60)
        await broadcast_market_update(data)
        logger.info(f"[Poller] Market data updated at {datetime.now().strftime('%H:%M:%S')}")
    except Exception as e:
        logger.error(f"[Poller] Error: {e}")


def start_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(poll_market, "interval", seconds=30, id="market_poll")
    scheduler.start()
    logger.info("[Poller] Market scheduler started (30s interval)")
    return scheduler


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    loop = asyncio.get_event_loop()
    scheduler = start_scheduler()
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        scheduler.shutdown()
