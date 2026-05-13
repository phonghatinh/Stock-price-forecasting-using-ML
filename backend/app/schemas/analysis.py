"""Pydantic schemas for Analysis (XAI) endpoints."""
from typing import List, Optional, Dict
from pydantic import BaseModel


class ShapFeature(BaseModel):
    feature: str
    value: float
    shap_value: float
    impact: str  # "positive" | "negative"


class SignalBadge(BaseModel):
    signal: str          # "BUY" | "SELL" | "HOLD"
    confidence: float    # 0.0 – 1.0
    color: str           # "green" | "red" | "yellow"
    label_vi: str        # "MUA" | "BÁN" | "NẮM GIỮ"


class XaiNarrative(BaseModel):
    summary: str
    bullet_points: List[str]
    risk_level: str      # "LOW" | "MEDIUM" | "HIGH"
    recommendation: str


class StockAnalysisResponse(BaseModel):
    ticker: str
    signal: SignalBadge
    shap_features: List[ShapFeature]
    narrative: XaiNarrative
    fundamental: Dict[str, float]
    technical: Dict[str, float]
    analyzed_at: str


class TechnicalIndicators(BaseModel):
    rsi_14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_lower: Optional[float] = None
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    ema_20: Optional[float] = None
    atr_14: Optional[float] = None
    volume_ratio: Optional[float] = None  # vs 20-day avg
