"""Portfolio API router — CRUD + Markowitz optimization."""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.portfolio import Portfolio, PortfolioHolding
from app.schemas.portfolio import (
    PortfolioCreate, PortfolioResponse, HoldingCreate, OptimizeRequest, OptimizeResponse
)
from app.services.fiinquant_client import get_fiinquant_client, FiinQuantClient
from app.services.portfolio_service import PortfolioService

logger = logging.getLogger(__name__)
router = APIRouter()


def get_portfolio_service(client: FiinQuantClient = Depends(get_fiinquant_client)) -> PortfolioService:
    return PortfolioService(client)


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[PortfolioResponse])
async def list_portfolios(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == int(current_user["user_id"]))
    )
    portfolios = result.scalars().all()
    return portfolios


@router.post("/", response_model=PortfolioResponse)
async def create_portfolio(
    body: PortfolioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    p = Portfolio(
        user_id=int(current_user["user_id"]),
        name=body.name,
        description=body.description,
    )
    db.add(p)
    await db.flush()
    await db.refresh(p)
    return p


@router.get("/{portfolio_id}")
async def get_portfolio(
    portfolio_id: int,
    db: AsyncSession = Depends(get_db),
    svc: PortfolioService = Depends(get_portfolio_service),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == int(current_user["user_id"])
        )
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    holdings_result = await db.execute(
        select(PortfolioHolding).where(PortfolioHolding.portfolio_id == portfolio_id)
    )
    raw_holdings = [
        {"id": h.id, "ticker": h.ticker, "quantity": h.quantity, "avg_cost": h.avg_cost}
        for h in holdings_result.scalars().all()
    ]
    enriched = svc.enrich_holdings(raw_holdings)
    total_value = sum(h.get("market_value", 0) for h in enriched)
    total_cost = sum(h.get("avg_cost", 0) * h.get("quantity", 0) for h in enriched)
    total_pnl = total_value - total_cost
    total_pnl_pct = (total_pnl / total_cost * 100) if total_cost > 0 else 0

    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "holdings": enriched,
        "total_value": round(total_value, 0),
        "total_cost": round(total_cost, 0),
        "total_pnl": round(total_pnl, 0),
        "total_pnl_pct": round(total_pnl_pct, 2),
        "created_at": p.created_at,
    }


@router.post("/{portfolio_id}/holdings")
async def add_holding(
    portfolio_id: int,
    body: HoldingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == int(current_user["user_id"])
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Portfolio not found")

    h = PortfolioHolding(
        portfolio_id=portfolio_id,
        ticker=body.ticker.upper(),
        quantity=body.quantity,
        avg_cost=body.avg_cost,
    )
    db.add(h)
    await db.flush()
    return {"message": "Holding added", "id": h.id}


@router.delete("/{portfolio_id}/holdings/{holding_id}")
async def delete_holding(
    portfolio_id: int,
    holding_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(PortfolioHolding).where(
            PortfolioHolding.id == holding_id,
            PortfolioHolding.portfolio_id == portfolio_id,
        )
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Holding not found")
    await db.delete(h)
    return {"message": "Deleted"}


# ── Optimization ──────────────────────────────────────────────────────────────

@router.post("/optimize")
async def optimize_portfolio(
    body: OptimizeRequest,
    db: AsyncSession = Depends(get_db),
    svc: PortfolioService = Depends(get_portfolio_service),
    current_user: dict = Depends(get_current_user),
):
    """Markowitz portfolio optimization."""
    holdings_result = await db.execute(
        select(PortfolioHolding).where(PortfolioHolding.portfolio_id == body.portfolio_id)
    )
    holdings = holdings_result.scalars().all()
    if not holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings")

    tickers = [h.ticker for h in holdings]
    enriched = svc.enrich_holdings([
        {"id": h.id, "ticker": h.ticker, "quantity": h.quantity, "avg_cost": h.avg_cost}
        for h in holdings
    ])
    total_value = sum(h.get("market_value", 0) for h in enriched)
    current_weights = {
        h["ticker"]: h.get("market_value", 0) / total_value if total_value > 0 else 1 / len(tickers)
        for h in enriched
    }

    return svc.markowitz_optimize(
        tickers=tickers,
        current_weights=current_weights,
        objective=body.objective,
        risk_free_rate=body.risk_free_rate,
    )
