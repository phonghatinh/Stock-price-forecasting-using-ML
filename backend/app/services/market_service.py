"""Market service — business logic layer."""
import logging
from datetime import datetime, timedelta, date
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
import hashlib

from app.services.fiinquant_client import FiinQuantClient

logger = logging.getLogger(__name__)


def _ticker_rng(ticker: str, offset: int = 0):
    seed = int(hashlib.md5(ticker.encode()).hexdigest()[:8], 16) % (2**31) + offset
    return np.random.default_rng(seed)


class MarketService:
    def __init__(self, client: FiinQuantClient):
        self.client = client

    # ── Market Overview ──────────────────────────────────────────────────────

    async def get_market_overview(self) -> Dict[str, Any]:
        """Build full market overview snapshot from DB."""
        index_data = {}
        from app.core.database import AsyncSessionLocal
        from app.models.market import DailyPrice, MarketBreadth
        from sqlalchemy import select, desc

        async with AsyncSessionLocal() as session:
            for idx in ["VNINDEX", "HNX", "UPCOM"]:
                try:
                    stmt = (
                        select(DailyPrice)
                        .where(DailyPrice.ticker == idx)
                        .order_by(desc(DailyPrice.date))
                        .limit(2)
                    )
                    res = await session.execute(stmt)
                    rows = res.scalars().all()

                    if len(rows) > 0:
                        latest = rows[0]
                        prev = rows[1] if len(rows) > 1 else latest
                        change = latest.close - prev.close
                        change_pct = (change / prev.close) * 100 if prev.close else 0
                        index_data[idx.lower()] = {
                            "ticker": idx,
                            "price": round(latest.close, 2),
                            "change": round(change, 2),
                            "change_pct": round(change_pct, 2),
                            "volume": round(latest.volume or 0, 0),
                            "value": round(latest.value or 0, 0),
                            "timestamp": str(latest.date),
                        }
                    else:
                        index_data[idx.lower()] = self._mock_index(idx)
                except Exception as e:
                    logger.warning(f"Index {idx} data error: {e}")
                    index_data[idx.lower()] = self._mock_index(idx)

            # Try to get breadth from DB first
            try:
                stmt = select(MarketBreadth).order_by(desc(MarketBreadth.date)).limit(1)
                res = await session.execute(stmt)
                breadth_row = res.scalar_one_or_none()
                if breadth_row:
                    breadth = {
                        "advance": breadth_row.advance,
                        "decline": breadth_row.decline,
                        "unchanged": breadth_row.unchanged,
                        "total_value": breadth_row.total_value or 0,
                        "total_volume": breadth_row.advance + breadth_row.decline + breadth_row.unchanged,
                    }
                else:
                    breadth = self.client.get_market_breadth()
            except Exception as e:
                logger.warning(f"Breadth from DB error: {e}")
                breadth = self.client.get_market_breadth()

        top_gainers = self.client.get_top_movers(n=10, direction="gain")
        top_losers = self.client.get_top_movers(n=10, direction="loss")
        sectors = self.client.get_sector_performance()

        return {
            "vnindex": index_data.get("vnindex", self._mock_index("VNINDEX")),
            "hnx": index_data.get("hnx", self._mock_index("HNX")),
            "upcom": index_data.get("upcom", self._mock_index("UPCOM")),
            "breadth": breadth,
            "top_gainers": self._df_to_records(top_gainers, 10),
            "top_losers": self._df_to_records(top_losers, 10),
            "sectors": self._df_to_records(sectors),
            "updated_at": datetime.now().isoformat(),
        }

    def _mock_index(self, ticker: str) -> Dict:
        prices = {"VNINDEX": 1260.5, "HNX": 228.3, "UPCOM": 92.7}
        base = prices.get(ticker, 1000)
        rng = _ticker_rng(ticker + str(datetime.now().date()))
        return {
            "ticker": ticker,
            "price": round(base + float(rng.uniform(-15, 15)), 2),
            "change": round(float(rng.uniform(-20, 20)), 2),
            "change_pct": round(float(rng.uniform(-1.5, 1.5)), 2),
            "volume": int(rng.integers(200_000_000, 600_000_000)),
            "value": round(float(rng.uniform(1e13, 2e13)), 0),
            "timestamp": datetime.now().isoformat(),
        }

    def _df_to_records(self, df: pd.DataFrame, limit: Optional[int] = None) -> List[Dict]:
        if df is None or df.empty:
            return []
        if limit:
            df = df.head(limit)
        return df.to_dict(orient="records")

    # ── Ticker Detail ─────────────────────────────────────────────────────────

    async def get_ticker_detail(self, ticker: str) -> Dict[str, Any]:
        """Get full ticker detail for today: OHLCV + technicals from DB."""
        from app.core.database import AsyncSessionLocal
        from app.models.market import DailyPrice
        from sqlalchemy import select, desc

        async with AsyncSessionLocal() as session:
            # Get last 120 days for technicals
            stmt = (
                select(DailyPrice)
                .where(DailyPrice.ticker == ticker)
                .order_by(desc(DailyPrice.date))
                .limit(120)
            )
            res = await session.execute(stmt)
            rows = res.scalars().all()

        if not rows:
            return self._mock_ticker_detail(ticker)

        # Latest data
        latest = rows[0]
        prev = rows[1] if len(rows) > 1 else latest
        change = latest.close - prev.close
        change_pct = (change / prev.close * 100) if prev.close else 0

        # Compute technicals from history
        df = pd.DataFrame(
            [{"date": r.date, "close": r.close, "open": r.open,
              "high": r.high, "low": r.low, "volume": r.volume or 0}
             for r in reversed(rows)]
        )
        tech = self.compute_technicals(ticker, df)

        return {
            "ticker": ticker,
            "date": str(latest.date),
            "open": round(latest.open or latest.close, 0),
            "high": round(latest.high or latest.close, 0),
            "low": round(latest.low or latest.close, 0),
            "close": round(latest.close, 0),
            "volume": round(latest.volume or 0, 0),
            "value": round(latest.value or 0, 0),
            "change": round(change, 0),
            "change_pct": round(change_pct, 2),
            "technicals": tech,
        }

    def _mock_ticker_detail(self, ticker: str) -> Dict[str, Any]:
        rng = _ticker_rng(ticker)
        close = float(rng.uniform(15000, 120000))
        change = float(rng.uniform(-2000, 2000))
        return {
            "ticker": ticker,
            "date": str(datetime.now().date()),
            "open": round(close - change * 0.3, 0),
            "high": round(close + abs(change) * 0.5, 0),
            "low": round(close - abs(change) * 0.5, 0),
            "close": round(close, 0),
            "volume": int(rng.integers(1_000_000, 30_000_000)),
            "value": round(close * float(rng.integers(1_000_000, 30_000_000)), 0),
            "change": round(change, 0),
            "change_pct": round(change / close * 100, 2),
            "technicals": {
                "rsi_14": round(float(rng.uniform(30, 70)), 2),
                "macd": round(float(rng.uniform(-500, 500)), 2),
                "macd_signal": round(float(rng.uniform(-400, 400)), 2),
                "sma_20": round(close * float(rng.uniform(0.95, 1.05)), 0),
                "sma_50": round(close * float(rng.uniform(0.9, 1.1)), 0),
                "volume_ratio": round(float(rng.uniform(0.5, 2.5)), 2),
                "bb_upper": round(close * 1.05, 0),
                "bb_lower": round(close * 0.95, 0),
            },
        }

    # ── Candle Data ──────────────────────────────────────────────────────────

    async def get_candles(
        self,
        ticker: str,
        from_date: str,
        to_date: Optional[str] = None,
        interval: str = "1d",
    ) -> Dict[str, Any]:
        """Get OHLCV candle data for charting from DB."""
        from app.core.database import AsyncSessionLocal
        from app.models.market import DailyPrice
        from sqlalchemy import select

        async with AsyncSessionLocal() as session:
            stmt = select(DailyPrice).where(
                DailyPrice.ticker == ticker,
                DailyPrice.date >= from_date,
            )
            if to_date:
                stmt = stmt.where(DailyPrice.date <= to_date)
            stmt = stmt.order_by(DailyPrice.date)
            res = await session.execute(stmt)
            rows = res.scalars().all()

            bars = []
            for row in rows:
                bars.append({
                    "date": row.date.strftime("%Y-%m-%d"),
                    "open": float(row.open or 0),
                    "high": float(row.high or 0),
                    "low": float(row.low or 0),
                    "close": float(row.close or 0),
                    "volume": float(row.volume or 0),
                    "ticker": ticker,
                })
        return {"ticker": ticker, "interval": interval, "bars": bars}

    # ── Foreign Flow ─────────────────────────────────────────────────────────

    def get_foreign_flow(
        self,
        tickers: Optional[List[str]] = None,
        from_date: str = "2024-01-01",
    ) -> List[Dict]:
        df = self.client.get_foreign_flow(tickers=tickers, from_date=from_date)
        return self._df_to_records(df)

    # ── Technical Indicators ─────────────────────────────────────────────────

    def compute_technicals(self, ticker: str, df: pd.DataFrame) -> Dict[str, float]:
        """Compute RSI, MACD, Bollinger Bands from price DataFrame."""
        if df.empty:
            return {}
        closes = df["close"].astype(float)
        result = {}

        # RSI-14
        if len(closes) >= 15:
            delta = closes.diff()
            gain = delta.clip(lower=0).rolling(14).mean()
            loss = (-delta.clip(upper=0)).rolling(14).mean()
            rs = gain / loss.replace(0, np.nan)
            rsi_series = 100 - 100 / (1 + rs)
            last_rsi = rsi_series.iloc[-1]
            result["rsi_14"] = round(float(last_rsi) if not np.isnan(last_rsi) else 50.0, 2)
        else:
            result["rsi_14"] = 50.0

        # SMA
        if len(closes) >= 20:
            result["sma_20"] = round(float(closes.rolling(20).mean().iloc[-1]), 2)
        if len(closes) >= 50:
            result["sma_50"] = round(float(closes.rolling(50).mean().iloc[-1]), 2)

        result["ema_20"] = round(float(closes.ewm(span=20).mean().iloc[-1]), 2)

        # MACD
        ema12 = closes.ewm(span=12).mean()
        ema26 = closes.ewm(span=26).mean()
        macd = ema12 - ema26
        signal_line = macd.ewm(span=9).mean()
        result["macd"] = round(float(macd.iloc[-1]), 2)
        result["macd_signal"] = round(float(signal_line.iloc[-1]), 2)

        # Bollinger Bands
        if len(closes) >= 20:
            sma20 = closes.rolling(20).mean()
            std20 = closes.rolling(20).std()
            result["bb_upper"] = round(float((sma20 + 2 * std20).iloc[-1]), 2)
            result["bb_lower"] = round(float((sma20 - 2 * std20).iloc[-1]), 2)

        # Volume ratio
        if "volume" in df.columns and len(df) >= 20:
            vols = df["volume"].astype(float)
            avg_vol = vols.rolling(20).mean().iloc[-1]
            if avg_vol > 0:
                result["volume_ratio"] = round(float(vols.iloc[-1] / avg_vol), 2)

        return result
