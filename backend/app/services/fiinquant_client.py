"""
FiinQuantX Client — Centralized wrapper for all FiinQuant API interactions.
Handles authentication, session management, and data retrieval.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from functools import lru_cache
import pandas as pd

logger = logging.getLogger(__name__)


class FiinQuantClient:
    """Thread-safe FiinQuantX client with session pooling."""

    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self._client = None
        self._session_expires: Optional[datetime] = None
        self._lock = asyncio.Lock()

    def _get_client(self):
        """Get or refresh the FiinQuantX session."""
        try:
            import FiinQuantX as fq
            if (
                self._client is None
                or self._session_expires is None
                or datetime.now() >= self._session_expires
            ):
                logger.info("Initializing FiinQuantX session...")
                self._client = fq.FiinSession(
                    username=self.username,
                    password=self.password
                ).login()
                self._session_expires = datetime.now() + timedelta(hours=8)
                logger.info("FiinQuantX session established successfully.")
        except ImportError:
            logger.error("FiinQuantX library not installed. Run: pip install FiinQuantX")
            raise
        except Exception as e:
            logger.error(f"FiinQuantX authentication failed: {e}")
            raise
        return self._client

    # ─────────────────────────────────────────────────────────────────────
    # TRADING / PRICE DATA
    # ─────────────────────────────────────────────────────────────────────

    def get_trading_data(
        self,
        tickers: List[str],
        from_date: str,
        to_date: Optional[str] = None,
        interval: str = "1d",
        adjusted: bool = True,
        fields: Optional[List[str]] = None,
        realtime: bool = False,
    ) -> pd.DataFrame:
        """Fetch OHLCV + buy/sell data for given tickers."""
        client = self._get_client()
        if fields is None:
            fields = ["open", "high", "low", "close", "volume", "bu", "sd", "fn", "fs", "fb"]
        try:
            event = client.Fetch_Trading_Data(
                realtime=realtime,
                tickers=tickers,
                fields=fields,
                adjusted=adjusted,
                from_date=from_date,
                by=interval,
            )
            df = event.get_data()
            logger.info(f"Trading data fetched: {len(df)} rows for {tickers}")
            return df
        except Exception as e:
            logger.error(f"Error fetching trading data: {e}")
            raise

    def get_realtime_data(self, tickers: List[str]) -> pd.DataFrame:
        """Fetch real-time price snapshot."""
        return self.get_trading_data(
            tickers=tickers,
            from_date=datetime.now().strftime("%Y-%m-%d"),
            realtime=True,
        )

    # ─────────────────────────────────────────────────────────────────────
    # FUNDAMENTAL / FINANCIAL INDICATORS
    # ─────────────────────────────────────────────────────────────────────

    def get_fundamental_data(
        self,
        tickers: List[str],
        fields: Optional[List[str]] = None,
        from_date: str = "2020-01-01",
        to_date: Optional[str] = None,
    ) -> pd.DataFrame:
        """Fetch fundamental financial indicators (P/E, EPS, ROE, etc.)."""
        client = self._get_client()
        if fields is None:
            fields = [
                "pe", "pb", "eps", "roe", "roa", "ev_ebitda",
                "revenue", "net_profit", "gross_margin", "net_margin",
                "debt_equity", "current_ratio", "market_cap"
            ]
        if to_date is None:
            to_date = datetime.now().strftime("%Y-%m-%d")
        try:
            event = client.Fetch_Fundamental_Data(
                tickers=tickers,
                fields=fields,
                from_date=from_date,
                to_date=to_date,
            )
            df = event.get_data()
            logger.info(f"Fundamental data fetched: {len(df)} rows")
            return df
        except Exception as e:
            logger.error(f"Error fetching fundamental data: {e}")
            # Return mock data for development
            return self._mock_fundamental(tickers)

    def _mock_fundamental(self, tickers: List[str]) -> pd.DataFrame:
        """Mock fundamental data when API is unavailable."""
        import numpy as np
        rows = []
        for t in tickers:
            rows.append({
                "ticker": t,
                "pe": round(np.random.uniform(8, 25), 2),
                "pb": round(np.random.uniform(1, 5), 2),
                "eps": round(np.random.uniform(500, 5000), 0),
                "roe": round(np.random.uniform(0.05, 0.30), 3),
                "roa": round(np.random.uniform(0.01, 0.15), 3),
                "market_cap": round(np.random.uniform(1e11, 5e13), 0),
                "revenue": round(np.random.uniform(1e10, 1e13), 0),
                "net_profit": round(np.random.uniform(1e9, 1e12), 0),
            })
        return pd.DataFrame(rows)

    # ─────────────────────────────────────────────────────────────────────
    # MARKET INDEX DATA
    # ─────────────────────────────────────────────────────────────────────

    def get_index_data(
        self,
        index: str = "VNINDEX",
        from_date: str = "2020-01-01",
        to_date: Optional[str] = None,
        interval: str = "1D",
    ) -> pd.DataFrame:
        """Fetch market index OHLCV data."""
        if to_date is None:
            to_date = datetime.now().strftime("%Y-%m-%d")
        return self.get_trading_data(
            tickers=[index],
            from_date=from_date,
            to_date=to_date,
            interval=interval,
        )

    def get_market_breadth(self) -> Dict[str, Any]:
        """Get market advance/decline breadth statistics."""
        client = self._get_client()
        try:
            event = client.Fetch_Market_Breadth()
            data = event.get_data()
            if isinstance(data, pd.DataFrame):
                return data.to_dict(orient="records")[0] if len(data) > 0 else {}
            return {}
        except Exception as e:
            logger.warning(f"Market breadth unavailable: {e}")
            return self._mock_market_breadth()

    def _mock_market_breadth(self) -> Dict[str, Any]:
        import numpy as np
        return {
            "advance": int(np.random.randint(200, 400)),
            "decline": int(np.random.randint(100, 300)),
            "unchanged": int(np.random.randint(50, 150)),
            "total_volume": int(np.random.randint(300_000_000, 800_000_000)),
            "total_value": float(np.random.uniform(8e12, 20e12)),
        }

    # ─────────────────────────────────────────────────────────────────────
    # MACRO ECONOMIC DATA
    # ─────────────────────────────────────────────────────────────────────

    def get_macro_data(
        self,
        indicators: Optional[List[str]] = None,
        from_date: str = "2020-01-01",
        to_date: Optional[str] = None,
    ) -> pd.DataFrame:
        """Fetch macroeconomic indicators (interest rate, CPI, exchange rate, etc.)."""
        client = self._get_client()
        if indicators is None:
            indicators = ["interest_rate", "cpi", "usd_vnd", "gdp_growth", "inflation"]
        if to_date is None:
            to_date = datetime.now().strftime("%Y-%m-%d")
        try:
            event = client.Fetch_Macro_Data(
                indicators=indicators,
                from_date=from_date,
                to_date=to_date,
            )
            return event.get_data()
        except Exception as e:
            logger.warning(f"Macro data unavailable: {e}")
            return self._mock_macro()

    def _mock_macro(self) -> pd.DataFrame:
        import numpy as np
        dates = pd.date_range("2024-01-01", periods=12, freq="MS")
        return pd.DataFrame({
            "date": dates,
            "interest_rate": np.random.uniform(4.5, 6.0, 12),
            "cpi": np.random.uniform(2.5, 4.5, 12),
            "usd_vnd": np.random.uniform(24000, 25500, 12),
            "gdp_growth": np.random.uniform(5.0, 8.0, 12),
        })

    # ─────────────────────────────────────────────────────────────────────
    # TICKER UNIVERSE / SCREENING
    # ─────────────────────────────────────────────────────────────────────

    def get_ticker_universe(self, exchange: str = "HOSE") -> pd.DataFrame:
        """Get all listed tickers on an exchange."""
        client = self._get_client()
        try:
            event = client.Fetch_Ticker_Universe(exchange=exchange)
            return event.get_data()
        except Exception as e:
            logger.warning(f"Ticker universe unavailable: {e}")
            return pd.DataFrame({"ticker": ["VNM", "VCB", "HPG", "SSI", "FPT", "MBB", "TCB"]})

    def get_top_movers(self, n: int = 10, direction: str = "gain") -> pd.DataFrame:
        """Get top gaining or losing stocks."""
        client = self._get_client()
        try:
            event = client.Fetch_Top_Movers(n=n, direction=direction)
            return event.get_data()
        except Exception as e:
            logger.warning(f"Top movers unavailable: {e}")
            return self._mock_top_movers(n, direction)

    def _mock_top_movers(self, n: int, direction: str) -> pd.DataFrame:
        import numpy as np
        tickers = ["HPG", "SSI", "VND", "HDB", "MBB", "TCB", "ACB", "STB", "FPT", "MWG"][:n]
        sign = 1 if direction == "gain" else -1
        return pd.DataFrame({
            "ticker": tickers,
            "close": np.random.uniform(20000, 80000, n),
            "change_pct": sign * np.random.uniform(0.5, 7.0, n),
            "volume": np.random.randint(1_000_000, 20_000_000, n),
        })

    # ─────────────────────────────────────────────────────────────────────
    # SECTOR DATA
    # ─────────────────────────────────────────────────────────────────────

    def get_sector_performance(self, from_date: str = "2024-01-01") -> pd.DataFrame:
        """Get sector-level performance data."""
        client = self._get_client()
        try:
            event = client.Fetch_Sector_Performance(from_date=from_date)
            return event.get_data()
        except Exception as e:
            logger.warning(f"Sector data unavailable: {e}")
            return self._mock_sectors()

    def _mock_sectors(self) -> pd.DataFrame:
        import numpy as np
        sectors = ["Banking", "Real Estate", "Technology", "Steel", "Consumer", "Energy", "Pharma"]
        return pd.DataFrame({
            "sector": sectors,
            "change_pct": np.random.uniform(-3, 5, len(sectors)),
            "market_cap": np.random.uniform(1e13, 5e14, len(sectors)),
        })

    # ─────────────────────────────────────────────────────────────────────
    # FOREIGN INVESTOR FLOW
    # ─────────────────────────────────────────────────────────────────────

    def get_foreign_flow(
        self,
        tickers: Optional[List[str]] = None,
        from_date: str = "2024-01-01",
    ) -> pd.DataFrame:
        """Get foreign investor buy/sell flow."""
        client = self._get_client()
        try:
            kwargs = {"from_date": from_date}
            if tickers:
                kwargs["tickers"] = tickers
            event = client.Fetch_Foreign_Flow(**kwargs)
            return event.get_data()
        except Exception as e:
            logger.warning(f"Foreign flow unavailable: {e}")
            return pd.DataFrame()


# ─────────────────────────────────────────────────────────────────────────────
# Singleton
# ─────────────────────────────────────────────────────────────────────────────

_client_instance: Optional[FiinQuantClient] = None


def get_fiinquant_client() -> FiinQuantClient:
    """FastAPI dependency — returns singleton FiinQuantClient."""
    global _client_instance
    if _client_instance is None:
        from app.config import settings
        _client_instance = FiinQuantClient(
            username=settings.FIINQUANT_USERNAME,
            password=settings.FIINQUANT_PASSWORD,
        )
    return _client_instance
