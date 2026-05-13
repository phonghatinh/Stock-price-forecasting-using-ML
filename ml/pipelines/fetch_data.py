"""Fetch training data from FiinQuant API."""
import sys
import logging
from pathlib import Path
from datetime import datetime
from typing import Tuple, Optional
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))

logger = logging.getLogger(__name__)


def fetch_training_data(
    ticker: str,
    from_date: str = "2020-01-01",
    to_date: Optional[str] = None,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Fetch price, fundamental, and macro data for a ticker.
    Returns (price_df, fundamental_df, macro_df).
    """
    if to_date is None:
        to_date = datetime.now().strftime("%Y-%m-%d")

    from app.config import settings
    from app.services.fiinquant_client import FiinQuantClient

    client = FiinQuantClient(
        username=settings.FIINQUANT_USERNAME,
        password=settings.FIINQUANT_PASSWORD,
    )

    logger.info(f"Fetching price data for {ticker} ({from_date} → {to_date})...")
    price_df = client.get_trading_data(
        tickers=[ticker],
        from_date=from_date,
        to_date=to_date,
        interval="1D",
        adjusted=True,
    )

    logger.info(f"Fetching fundamentals for {ticker}...")
    fund_df = client.get_fundamental_data(
        tickers=[ticker],
        from_date=from_date,
        to_date=to_date,
    )

    logger.info(f"Fetching macro data...")
    macro_df = client.get_macro_data(from_date=from_date, to_date=to_date)

    return price_df, fund_df, macro_df
