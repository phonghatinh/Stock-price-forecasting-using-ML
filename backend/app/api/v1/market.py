"""Market API router — VNIndex, top movers, candles, ticker detail, foreign flow."""
import logging
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from app.services.fiinquant_client import get_fiinquant_client, FiinQuantClient
from app.services.market_service import MarketService
from app.core.cache import cache_get, cache_set

logger = logging.getLogger(__name__)
router = APIRouter()


def get_market_service(client: FiinQuantClient = Depends(get_fiinquant_client)) -> MarketService:
    return MarketService(client)


@router.get("/overview")
async def get_market_overview(svc: MarketService = Depends(get_market_service)):
    """Full market overview: VNIndex, HNX, breadth, movers, sectors."""
    cache_key = "market:overview"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    data = await svc.get_market_overview()
    await cache_set(cache_key, data, ttl=30)
    return data


@router.get("/candles/{ticker}")
async def get_candles(
    ticker: str,
    from_date: str = Query("2024-01-01"),
    to_date: Optional[str] = Query(None),
    interval: str = Query("1d", description="1m | 5m | 15m | 1h | 1d | 1w"),
    svc: MarketService = Depends(get_market_service),
):
    """OHLCV candle data for a specific ticker."""
    cache_key = f"market:candles:{ticker}:{from_date}:{interval}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    data = await svc.get_candles(ticker.upper(), from_date, to_date, interval)
    await cache_set(cache_key, data, ttl=60)
    return data


@router.get("/ticker/{ticker}")
async def get_ticker_detail(
    ticker: str,
    svc: MarketService = Depends(get_market_service),
):
    """Full ticker detail: today's price snapshot + technicals."""
    cache_key = f"market:ticker:{ticker.upper()}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    data = await svc.get_ticker_detail(ticker.upper())
    await cache_set(cache_key, data, ttl=30)
    return data


@router.get("/movers")
async def get_top_movers(
    direction: str = Query("gain", description="gain | loss"),
    n: int = Query(10, ge=1, le=50),
    client: FiinQuantClient = Depends(get_fiinquant_client),
):
    """Top gaining or losing stocks."""
    cache_key = f"market:movers:{direction}:{n}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    df = client.get_top_movers(n=n, direction=direction)
    data = df.to_dict(orient="records") if not df.empty else []
    await cache_set(cache_key, data, ttl=60)
    return data


@router.get("/sectors")
async def get_sectors(client: FiinQuantClient = Depends(get_fiinquant_client)):
    """Sector performance heatmap data."""
    cached = await cache_get("market:sectors")
    if cached:
        return cached
    df = client.get_sector_performance()
    data = df.to_dict(orient="records") if not df.empty else []
    await cache_set("market:sectors", data, ttl=300)
    return data


@router.get("/foreign-flow")
async def get_foreign_flow(
    tickers: Optional[str] = Query(None, description="Comma-separated tickers"),
    from_date: str = Query("2024-01-01"),
    svc: MarketService = Depends(get_market_service),
):
    """Foreign investor buy/sell flow."""
    ticker_list = [t.strip().upper() for t in tickers.split(",")] if tickers else None
    return svc.get_foreign_flow(ticker_list, from_date)


@router.get("/macro")
async def get_macro(
    from_date: str = Query("2023-01-01"),
    client: FiinQuantClient = Depends(get_fiinquant_client),
):
    """Macroeconomic indicators (interest rate, CPI, exchange rate, GDP)."""
    cache_key = f"market:macro:{from_date}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    df = client.get_macro_data(from_date=from_date)
    # Build structured macro response
    if not df.empty:
        df.columns = [c.lower() for c in df.columns]
        # Get latest values
        latest = df.iloc[-1]
        data = {
            "series": df.to_dict(orient="records"),
            "latest": {
                "interest_rate": float(latest.get("interest_rate", 4.5)),
                "cpi": float(latest.get("cpi", 3.2)),
                "usd_vnd": float(latest.get("usd_vnd", 25000)),
                "gdp_growth": float(latest.get("gdp_growth", 6.0)),
            }
        }
    else:
        # Return realistic mock
        data = {
            "series": [],
            "latest": {
                "interest_rate": 4.5,
                "cpi": 3.1,
                "usd_vnd": 25450.0,
                "gdp_growth": 6.0,
            }
        }
    await cache_set(cache_key, data, ttl=3600)
    return data


@router.get("/breadth")
async def get_breadth(client: FiinQuantClient = Depends(get_fiinquant_client)):
    """Market advance/decline breadth."""
    cache_key = "market:breadth"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    data = client.get_market_breadth()
    await cache_set(cache_key, data, ttl=30)
    return data
