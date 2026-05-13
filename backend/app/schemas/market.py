"""Pydantic schemas for Market endpoints."""
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class OHLCVBar(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    ticker: Optional[str] = None


class IndexSnapshot(BaseModel):
    ticker: str
    price: float
    change: float
    change_pct: float
    volume: float
    value: float
    timestamp: str


class TopMover(BaseModel):
    ticker: str
    close: float
    change_pct: float
    volume: float
    sector: Optional[str] = None


class MarketBreadth(BaseModel):
    advance: int
    decline: int
    unchanged: int
    total_volume: float
    total_value: float


class SectorPerformance(BaseModel):
    sector: str
    change_pct: float
    market_cap: float


class MarketOverviewResponse(BaseModel):
    vnindex: IndexSnapshot
    hnx30: Optional[IndexSnapshot]
    upcom: Optional[IndexSnapshot]
    breadth: MarketBreadth
    top_gainers: List[TopMover]
    top_losers: List[TopMover]
    sectors: List[SectorPerformance]
    updated_at: str


class CandleRequest(BaseModel):
    ticker: str
    from_date: str = "2024-01-01"
    to_date: Optional[str] = None
    interval: str = Field("1D", description="1m, 5m, 15m, 1H, 1D, 1W")


class CandleResponse(BaseModel):
    ticker: str
    interval: str
    bars: List[OHLCVBar]


class ForeignFlowItem(BaseModel):
    ticker: str
    buy_volume: Optional[float] = None
    sell_volume: Optional[float] = None
    net_volume: Optional[float] = None
    net_value: Optional[float] = None
    date: Optional[str] = None
