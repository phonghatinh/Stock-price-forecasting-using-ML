"""Analysis API router — XAI, SHAP, signal, candle with overlay."""
import logging
from fastapi import APIRouter, Depends, Query
from app.services.fiinquant_client import get_fiinquant_client, FiinQuantClient
from app.services.xai_service import XAIService
from app.services.market_service import MarketService
from app.services.prediction_service import PredictionService
from app.core.cache import cache_get, cache_set

logger = logging.getLogger(__name__)
router = APIRouter()

_xai = XAIService()


def get_prediction_service(client: FiinQuantClient = Depends(get_fiinquant_client)) -> PredictionService:
    market_svc = MarketService(client)
    return PredictionService(client, _xai, market_svc)


@router.get("/{ticker}")
async def analyze_ticker(
    ticker: str,
    svc: PredictionService = Depends(get_prediction_service),
):
    """Full XAI analysis: signal, SHAP, narrative, technicals, fundamentals."""
    key = f"analysis:{ticker.upper()}"
    cached = await cache_get(key)
    if cached:
        return cached
    data = await svc.get_full_analysis_async(ticker.upper())
    await cache_set(key, data, ttl=120)
    return data


@router.get("/{ticker}/signal")
async def get_signal(
    ticker: str,
    svc: PredictionService = Depends(get_prediction_service),
):
    """Quick BUY/SELL/HOLD signal for a ticker."""
    data = await svc.get_full_analysis_async(ticker.upper())
    return data["signal"]


@router.get("/{ticker}/shap")
async def get_shap(
    ticker: str,
    svc: PredictionService = Depends(get_prediction_service),
):
    """SHAP feature attribution for a ticker."""
    data = await svc.get_full_analysis_async(ticker.upper())
    return {"ticker": ticker.upper(), "shap_features": data["shap_features"]}


@router.get("/{ticker}/narrative")
async def get_narrative(
    ticker: str,
    svc: PredictionService = Depends(get_prediction_service),
):
    """Vietnamese-language narrative explanation."""
    data = await svc.get_full_analysis_async(ticker.upper())
    return {"ticker": ticker.upper(), "narrative": data["narrative"]}


@router.get("/{ticker}/technicals")
async def get_technicals(
    ticker: str,
    from_date: str = Query("2024-01-01"),
    svc: PredictionService = Depends(get_prediction_service),
):
    """Technical indicators from DB: RSI, MACD, Bollinger Bands, SMA."""
    tech = await svc._get_technicals_from_db(ticker.upper())
    return {"ticker": ticker.upper(), "technicals": tech}
