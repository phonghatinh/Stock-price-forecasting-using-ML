"""Prediction API router — AI recommendations (async)."""
import logging
from typing import List
from fastapi import APIRouter, Depends, Query
from app.services.fiinquant_client import get_fiinquant_client, FiinQuantClient
from app.services.xai_service import XAIService
from app.services.market_service import MarketService
from app.services.prediction_service import PredictionService
from app.config import settings
from app.core.cache import cache_get, cache_set

logger = logging.getLogger(__name__)
router = APIRouter()
_xai = XAIService()


def get_pred_svc(client: FiinQuantClient = Depends(get_fiinquant_client)) -> PredictionService:
    return PredictionService(client, _xai, MarketService(client))


@router.get("/recommendations")
async def get_recommendations(
    tickers: str = Query(
        ",".join(settings.VN_MARKET_TICKERS[:15]),
        description="Comma-separated ticker list"
    ),
    horizon_days: int = Query(5, ge=1, le=30),
    svc: PredictionService = Depends(get_pred_svc),
):
    """Batch AI recommendations for multiple tickers."""
    ticker_list = [t.strip().upper() for t in tickers.split(",")]
    cache_key = f"prediction:recs:{','.join(sorted(ticker_list))}:{horizon_days}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    data = await svc.predict_batch_async(ticker_list, horizon_days)
    await cache_set(cache_key, data, ttl=180)  # 3 min cache
    return data


@router.get("/{ticker}")
async def predict_single(
    ticker: str,
    horizon_days: int = Query(5),
    svc: PredictionService = Depends(get_pred_svc),
):
    """AI prediction for a single ticker."""
    cache_key = f"prediction:{ticker.upper()}:{horizon_days}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    data = await svc.predict_batch_async([ticker.upper()], horizon_days)
    if data["recommendations"]:
        result = data["recommendations"][0]
        await cache_set(cache_key, result, ttl=120)
        return result
    return {"ticker": ticker.upper(), "error": "No data available"}
