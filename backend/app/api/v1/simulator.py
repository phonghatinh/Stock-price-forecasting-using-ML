"""What-If Simulator API — portfolio scenario analysis."""
import logging
import numpy as np
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.services.fiinquant_client import get_fiinquant_client, FiinQuantClient
from app.services.portfolio_service import PortfolioService

logger = logging.getLogger(__name__)
router = APIRouter()

DEMO_PRICES = {
    "VNM": 73_500, "VCB": 86_400, "BID": 44_200, "CTG": 32_800,
    "HPG": 25_600, "SSI": 29_400, "FPT": 121_000, "MBB": 21_500,
    "TCB": 20_800, "ACB": 24_600, "STB": 31_800, "VHM": 41_200,
    "VIC": 38_600, "MWG": 62_400, "MSN": 78_000, "VND": 17_800,
    "HDB": 18_900, "VPB": 18_200, "PLX": 41_000, "GAS": 78_500,
}

SECTOR_MAP = {
    "VCB": "Ngân hàng", "BID": "Ngân hàng", "CTG": "Ngân hàng", "MBB": "Ngân hàng",
    "TCB": "Ngân hàng", "ACB": "Ngân hàng", "STB": "Ngân hàng", "VPB": "Ngân hàng",
    "HDB": "Ngân hàng",
    "HPG": "Thép", "VNM": "Thực phẩm", "MWG": "Bán lẻ", "MSN": "Hàng tiêu dùng",
    "FPT": "Công nghệ", "VND": "Chứng khoán", "SSI": "Chứng khoán",
    "VHM": "Bất động sản", "VIC": "Bất động sản",
    "PLX": "Năng lượng", "GAS": "Năng lượng",
}

# Demo historical returns (annualized %) for correlation calc
DEMO_RETURNS_ANNUAL = {
    "VNM": 0.08, "VCB": 0.14, "BID": 0.12, "CTG": 0.11, "HPG": 0.18,
    "SSI": 0.22, "FPT": 0.25, "MBB": 0.13, "TCB": 0.15, "ACB": 0.14,
    "STB": 0.10, "VHM": 0.16, "VIC": 0.09, "MWG": 0.20, "MSN": 0.12,
    "VND": 0.24, "HDB": 0.16, "VPB": 0.17, "PLX": 0.09, "GAS": 0.11,
}

DEMO_VOLATILITY = {
    "VNM": 0.18, "VCB": 0.20, "BID": 0.21, "CTG": 0.22, "HPG": 0.30,
    "SSI": 0.35, "FPT": 0.28, "MBB": 0.23, "TCB": 0.25, "ACB": 0.22,
    "STB": 0.26, "VHM": 0.28, "VIC": 0.24, "MWG": 0.32, "MSN": 0.22,
    "VND": 0.38, "HDB": 0.24, "VPB": 0.26, "PLX": 0.20, "GAS": 0.19,
}


class HoldingInput(BaseModel):
    ticker: str
    quantity: float
    avg_cost: float


class SimulateRequest(BaseModel):
    holdings: List[HoldingInput]
    new_ticker: Optional[str] = None
    new_quantity: Optional[float] = None
    adjustments: Optional[dict] = None  # {ticker: new_quantity}
    scenario: Optional[str] = None  # "vnindex_down_5", "rate_up_05", "normal"


class SavedScenario(BaseModel):
    name: str
    holdings: List[HoldingInput]
    scenario: Optional[str] = None


def _get_price(ticker: str) -> float:
    return DEMO_PRICES.get(ticker.upper(), 25_000)


def _get_volatility(ticker: str) -> float:
    return DEMO_VOLATILITY.get(ticker.upper(), 0.25)


def _get_return(ticker: str) -> float:
    return DEMO_RETURNS_ANNUAL.get(ticker.upper(), 0.12)


def _scenario_shock(ticker: str, scenario: Optional[str]) -> float:
    """Returns price multiplier based on market scenario."""
    if not scenario or scenario == "normal":
        return 1.0
    shocks = {
        "vnindex_down_5": {
            "Ngân hàng": -0.065, "Thép": -0.072, "Bất động sản": -0.080,
            "Chứng khoán": -0.090, "Công nghệ": -0.045, "Thực phẩm": -0.030,
            "Bán lẻ": -0.050, "Năng lượng": -0.055, "Hàng tiêu dùng": -0.035,
        },
        "vnindex_up_5": {
            "Ngân hàng": 0.060, "Thép": 0.070, "Bất động sản": 0.075,
            "Chứng khoán": 0.085, "Công nghệ": 0.045, "Thực phẩm": 0.025,
            "Bán lẻ": 0.050, "Năng lượng": 0.050, "Hàng tiêu dùng": 0.030,
        },
        "rate_up_05": {
            "Ngân hàng": 0.020, "Thép": -0.040, "Bất động sản": -0.060,
            "Chứng khoán": -0.030, "Công nghệ": -0.020, "Thực phẩm": -0.010,
            "Bán lẻ": -0.025, "Năng lượng": 0.010, "Hàng tiêu dùng": -0.015,
        },
        "usd_up_2": {
            "Ngân hàng": -0.015, "Thép": 0.010, "Bất động sản": -0.020,
            "Chứng khoán": -0.010, "Công nghệ": 0.015, "Thực phẩm": -0.025,
            "Bán lẻ": -0.020, "Năng lượng": 0.025, "Hàng tiêu dùng": -0.015,
        },
    }
    sector = SECTOR_MAP.get(ticker.upper(), "Hàng tiêu dùng")
    impact = shocks.get(scenario, {}).get(sector, -0.03)
    return 1.0 + impact


def _compute_portfolio_metrics(holdings_data: list) -> dict:
    """Compute NAV, risk score, diversification from holdings list."""
    if not holdings_data:
        return {"nav": 0, "risk_score": 0, "diversification": 0, "sector_alloc": {}, "sharpe": 0}

    total_value = sum(h["market_value"] for h in holdings_data)
    if total_value == 0:
        return {"nav": 0, "risk_score": 0, "diversification": 0, "sector_alloc": {}, "sharpe": 0}

    weights = {h["ticker"]: h["market_value"] / total_value for h in holdings_data}
    tickers = list(weights.keys())
    w = np.array([weights[t] for t in tickers])

    # Portfolio volatility (simplified diagonal covariance)
    vols = np.array([_get_volatility(t) for t in tickers])
    port_vol = float(np.sqrt(np.dot(w ** 2, vols ** 2)))

    # Expected return
    rets = np.array([_get_return(t) for t in tickers])
    port_ret = float(np.dot(w, rets))

    # Sharpe (risk-free = 5% VN)
    sharpe = (port_ret - 0.05) / port_vol if port_vol > 0 else 0

    # Risk score (0-100, higher = riskier)
    risk_score = min(100, port_vol * 200)  # 50% vol → 100 score

    # Diversification (HHI-based, 0=concentrated, 100=diversified)
    hhi = sum(v ** 2 for v in weights.values())
    max_hhi = 1.0
    min_hhi = 1.0 / max(len(weights), 1)
    diversification = (1 - (hhi - min_hhi) / (max_hhi - min_hhi)) * 100 if len(weights) > 1 else 0

    # Sector allocation
    sector_alloc: dict = {}
    for h in holdings_data:
        sector = SECTOR_MAP.get(h["ticker"], "Khác")
        sector_alloc[sector] = sector_alloc.get(sector, 0) + weights[h["ticker"]] * 100

    return {
        "nav": round(total_value, 0),
        "risk_score": round(risk_score, 1),
        "diversification": round(diversification, 1),
        "volatility": round(port_vol * 100, 2),
        "expected_return": round(port_ret * 100, 2),
        "sharpe": round(sharpe, 3),
        "sector_alloc": {k: round(v, 1) for k, v in sector_alloc.items()},
    }


@router.post("/analyze")
async def simulate_portfolio(body: SimulateRequest):
    """Analyze portfolio with optional adjustments + scenario shock."""
    # Build base holdings with prices
    holdings_data = []
    for h in body.holdings:
        ticker = h.ticker.upper()
        base_price = _get_price(ticker)
        shock = _scenario_shock(ticker, body.scenario)
        current_price = base_price * shock

        # Apply quantity adjustment if provided
        qty = h.quantity
        if body.adjustments and ticker in body.adjustments:
            qty = body.adjustments[ticker]

        market_value = qty * current_price
        cost = qty * h.avg_cost
        pnl = market_value - cost
        pnl_pct = (pnl / cost * 100) if cost > 0 else 0

        holdings_data.append({
            "ticker": ticker,
            "quantity": qty,
            "avg_cost": h.avg_cost,
            "current_price": round(current_price, 0),
            "market_value": round(market_value, 0),
            "pnl": round(pnl, 0),
            "pnl_pct": round(pnl_pct, 2),
            "sector": SECTOR_MAP.get(ticker, "Khác"),
        })

    # Add new ticker simulation
    new_holding_data = None
    if body.new_ticker and body.new_quantity:
        nticker = body.new_ticker.upper()
        nprice = _get_price(nticker) * _scenario_shock(nticker, body.scenario)
        nvalue = body.new_quantity * nprice
        new_holding_data = {
            "ticker": nticker,
            "quantity": body.new_quantity,
            "current_price": round(nprice, 0),
            "market_value": round(nvalue, 0),
            "sector": SECTOR_MAP.get(nticker, "Khác"),
        }
        holdings_data.append({**new_holding_data, "avg_cost": nprice, "pnl": 0, "pnl_pct": 0})

    # Compute metrics
    base_metrics = _compute_portfolio_metrics([
        h for h in holdings_data if not (new_holding_data and h["ticker"] == body.new_ticker)
    ] if new_holding_data else holdings_data)
    full_metrics = _compute_portfolio_metrics(holdings_data)

    # Compute total value for weight
    total_value = full_metrics["nav"]
    for h in holdings_data:
        h["weight"] = round(h["market_value"] / total_value * 100, 1) if total_value > 0 else 0

    # Correlation with existing tickers (if new ticker added)
    correlation_warning = None
    if new_holding_data:
        nticker = new_holding_data["ticker"]
        existing = [h["ticker"] for h in holdings_data if h["ticker"] != nticker]
        new_sector = SECTOR_MAP.get(nticker, "Khác")
        same_sector = [t for t in existing if SECTOR_MAP.get(t, "") == new_sector]
        if len(same_sector) >= 2:
            correlation_warning = f"⚠️ {nticker} cùng ngành {new_sector} với {', '.join(same_sector[:3])} — tương quan cao, giảm hiệu quả đa dạng hóa"
        elif same_sector:
            correlation_warning = f"Lưu ý: {nticker} cùng ngành {new_sector} với {same_sector[0]}"

    # Delta
    nav_delta = full_metrics["nav"] - base_metrics["nav"]
    risk_delta = full_metrics["risk_score"] - base_metrics["risk_score"]

    return {
        "holdings": holdings_data,
        "metrics": full_metrics,
        "base_metrics": base_metrics,
        "nav_delta": round(nav_delta, 0),
        "risk_delta": round(risk_delta, 1),
        "new_holding": new_holding_data,
        "correlation_warning": correlation_warning,
        "scenario": body.scenario or "normal",
    }


@router.get("/scenarios")
async def get_scenarios():
    """Available market scenario presets."""
    return [
        {"id": "normal", "label": "Bình thường", "description": "Điều kiện thị trường bình thường", "icon": "📊"},
        {"id": "vnindex_down_5", "label": "VN-Index −5%", "description": "Thị trường điều chỉnh mạnh 5%", "icon": "📉"},
        {"id": "vnindex_up_5", "label": "VN-Index +5%", "description": "Thị trường tăng mạnh 5%", "icon": "📈"},
        {"id": "rate_up_05", "label": "Lãi suất +0.5%", "description": "Ngân hàng Nhà nước tăng lãi suất 0.5%", "icon": "🏦"},
        {"id": "usd_up_2", "label": "USD/VND +2%", "description": "Tỷ giá USD tăng 2%", "icon": "💵"},
    ]


@router.post("/optimize-suggest")
async def optimize_suggest(body: SimulateRequest):
    """AI portfolio optimizer — suggest target weights for max Sharpe."""
    holdings_data = []
    for h in body.holdings:
        ticker = h.ticker.upper()
        holdings_data.append({
            "ticker": ticker,
            "current_price": _get_price(ticker),
            "avg_cost": h.avg_cost,
            "quantity": h.quantity,
            "market_value": h.quantity * _get_price(ticker),
            "expected_return": _get_return(ticker),
            "volatility": _get_volatility(ticker),
            "sector": SECTOR_MAP.get(ticker, "Khác"),
        })

    total_value = sum(h["market_value"] for h in holdings_data)
    if total_value == 0:
        return {"suggestions": []}

    # Simple max-Sharpe via risk-adjusted return scoring
    scores = []
    for h in holdings_data:
        sharpe_est = (_get_return(h["ticker"]) - 0.05) / _get_volatility(h["ticker"])
        scores.append({"ticker": h["ticker"], "score": sharpe_est})

    total_score = sum(max(s["score"], 0.01) for s in scores)
    suggestions = []
    for s in scores:
        target_weight = max(s["score"], 0.01) / total_score * 100
        current_weight = (next(h["market_value"] for h in holdings_data if h["ticker"] == s["ticker"]) / total_value) * 100
        delta = target_weight - current_weight
        action = "Tăng" if delta > 2 else "Giảm" if delta < -2 else "Giữ nguyên"
        suggestions.append({
            "ticker": s["ticker"],
            "current_weight": round(current_weight, 1),
            "target_weight": round(target_weight, 1),
            "delta": round(delta, 1),
            "action": action,
            "sharpe_estimate": round(s["score"], 3),
            "sector": SECTOR_MAP.get(s["ticker"], "Khác"),
        })

    suggestions.sort(key=lambda x: x["delta"], reverse=True)

    return {
        "suggestions": suggestions,
        "estimated_sharpe": round(sum(s["sharpe_estimate"] * max(s["target_weight"], 0) / 100 for s in suggestions), 3),
        "note": "Gợi ý dựa trên tỷ lệ Sharpe ước tính. Không phải tư vấn đầu tư chính thức.",
    }
