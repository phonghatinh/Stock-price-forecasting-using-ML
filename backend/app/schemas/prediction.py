"""Pydantic schemas for Prediction and Reflection endpoints."""
from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel


class PredictionRequest(BaseModel):
    tickers: List[str]
    horizon_days: int = 5


class AiRecommendation(BaseModel):
    ticker: str
    signal: str          # BUY | SELL | HOLD
    confidence: float
    predicted_return: float
    target_price: float
    current_price: float
    risk_level: str
    top_reasons: List[str]
    shap_summary: Dict[str, float]
    analyzed_at: str


class PredictionResponse(BaseModel):
    recommendations: List[AiRecommendation]
    model_version: str
    generated_at: str


# ── Reflection ────────────────────────────────────────────────────────────────

class PredictionHistoryItem(BaseModel):
    id: int
    ticker: str
    prediction_date: datetime
    target_date: datetime
    signal: str
    confidence: float
    predicted_return: Optional[float]
    actual_return: Optional[float]
    is_correct: Optional[bool]
    error_pct: Optional[float]
    model_version: Optional[str]


class MistakePattern(BaseModel):
    pattern: str
    frequency: int
    avg_error: float
    description: str
    tickers_affected: List[str]


class ReflectionSummary(BaseModel):
    total_predictions: int
    accuracy_rate: float
    avg_error_pct: float
    avg_confidence: float
    signal_breakdown: Dict[str, dict]
    top_mistakes: List[MistakePattern]
    improvement_suggestions: List[str]
    period: str
