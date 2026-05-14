"""
Daily EOD sync worker — runs at 18:00 to pull latest session data.
Handles column name normalization from FiinQuantX API.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from app.services.fiinquant_client import get_fiinquant_client
from app.core.database import AsyncSessionLocal
from app.models.market import DailyPrice, MarketBreadth
from sqlalchemy.dialects.mysql import insert

logger = logging.getLogger(__name__)

INDICES = ["VNINDEX", "HNX", "UPCOM"]
FALLBACK_TICKERS = [
    "VNM", "VCB", "BID", "CTG", "HPG", "SSI", "FPT",
    "MBB", "TCB", "ACB", "STB", "HDB", "VHM", "VIC",
]


async def _upsert_rows(session, rows_data: list):
    """Batch upsert into daily_prices."""
    for row in rows_data:
        if not row.get("ticker") or not row.get("date") or not row.get("close"):
            continue
        stmt = insert(DailyPrice).values(**row)
        stmt = stmt.on_duplicate_key_update(
            open=stmt.inserted.open,
            high=stmt.inserted.high,
            low=stmt.inserted.low,
            close=stmt.inserted.close,
            volume=stmt.inserted.volume,
            value=stmt.inserted.value,
        )
        await session.execute(stmt)


def _normalize_df(df) -> list:
    """Normalize FiinQuantX DataFrame to list of dicts for DB insert."""
    import pandas as pd
    if df is None or df.empty:
        return []

    df = df.copy()
    df.columns = [c.lower() for c in df.columns]

    rows = []
    for _, row in df.iterrows():
        # Date column
        date_val = None
        for col in ["timestamp", "date", "trading_date", "datetime"]:
            if col in row.index and row[col] is not None:
                date_val = row[col]
                break
        if date_val is None:
            continue

        if hasattr(date_val, "date"):
            date_val = date_val.date()
        elif isinstance(date_val, str):
            date_val = date_val.split("T")[0].split(" ")[0]

        ticker = str(row.get("ticker", "")).strip()
        close = float(row.get("close", 0) or 0)
        if not ticker or close == 0:
            continue

        rows.append({
            "ticker": ticker,
            "date": date_val,
            "open": float(row.get("open", close) or close),
            "high": float(row.get("high", close) or close),
            "low": float(row.get("low", close) or close),
            "close": close,
            "volume": float(row.get("volume", 0) or 0),
            "value": float(row.get("volume", 0) or 0) * close,
        })
    return rows


async def sync_market_data():
    """Sync latest EOD data — called daily at 18:00."""
    logger.info("Starting daily market data sync...")
    client = get_fiinquant_client()

    # Build ticker list
    tickers = list(INDICES)
    try:
        for exchange in ["HOSE", "HNX"]:
            df = client.get_ticker_universe(exchange)
            if not df.empty:
                tickers.extend(df["ticker"].tolist())
    except Exception as e:
        logger.warning(f"Ticker universe error: {e}")
        tickers.extend(FALLBACK_TICKERS)

    tickers = list(set(tickers))
    from_date = (datetime.now() - timedelta(days=14)).strftime("%Y-%m-%d")
    logger.info(f"Syncing {len(tickers)} tickers from {from_date}")

    # Batch process
    batch_size = 30
    total_rows = 0
    for i in range(0, len(tickers), batch_size):
        batch = tickers[i:i + batch_size]
        try:
            df = client.get_trading_data(tickers=batch, from_date=from_date)
            rows = _normalize_df(df)
            if rows:
                async with AsyncSessionLocal() as session:
                    await _upsert_rows(session, rows)
                    await session.commit()
                total_rows += len(rows)
                logger.info(f"Batch {i//batch_size + 1}: +{len(rows)} rows")
            await asyncio.sleep(2)
        except Exception as e:
            logger.error(f"Sync error for batch {batch[:3]}: {e}")

    # Sync market breadth
    try:
        breadth = client.get_market_breadth()
        if breadth:
            async with AsyncSessionLocal() as session:
                stmt = insert(MarketBreadth).values(
                    date=datetime.now().date(),
                    advance=int(breadth.get("advance", 0)),
                    decline=int(breadth.get("decline", 0)),
                    unchanged=int(breadth.get("unchanged", 0)),
                    total_value=float(breadth.get("total_value", 0)),
                )
                stmt = stmt.on_duplicate_key_update(
                    advance=stmt.inserted.advance,
                    decline=stmt.inserted.decline,
                    unchanged=stmt.inserted.unchanged,
                    total_value=stmt.inserted.total_value,
                )
                await session.execute(stmt)
                await session.commit()
            logger.info("Market breadth synced")
    except Exception as e:
        logger.warning(f"Breadth sync error: {e}")

    logger.info(f"Daily sync complete. Total rows: {total_rows}")
