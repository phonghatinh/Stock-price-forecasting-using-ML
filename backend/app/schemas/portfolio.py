"""Pydantic schemas for Portfolio endpoints."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class HoldingCreate(BaseModel):
    ticker: str
    quantity: float = Field(gt=0)
    avg_cost: float = Field(gt=0)


class HoldingResponse(BaseModel):
    id: int
    ticker: str
    quantity: float
    avg_cost: float
    current_price: Optional[float] = None
    market_value: Optional[float] = None
    pnl: Optional[float] = None
    pnl_pct: Optional[float] = None
    weight: Optional[float] = None
    sector: Optional[str] = None


class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = None


class PortfolioResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    holdings: List[HoldingResponse] = []
    total_value: Optional[float] = None
    total_cost: Optional[float] = None
    total_pnl: Optional[float] = None
    total_pnl_pct: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EfficientFrontierPoint(BaseModel):
    expected_return: float
    volatility: float
    sharpe: float
    weights: dict  # ticker -> weight


class OptimizeRequest(BaseModel):
    portfolio_id: int
    objective: str = Field("sharpe", description="sharpe | min_volatility | max_return")
    risk_free_rate: float = 0.045  # 4.5% VN risk-free rate


class OptimizeResponse(BaseModel):
    optimal_weights: dict
    expected_return: float
    volatility: float
    sharpe_ratio: float
    frontier: List[EfficientFrontierPoint]
    rebalance_trades: List[dict]
    xai_explanation: str


class RebalanceCard(BaseModel):
    ticker: str
    current_weight: float
    target_weight: float
    action: str   # "BUY" | "SELL" | "HOLD"
    amount: float
    reason: str
