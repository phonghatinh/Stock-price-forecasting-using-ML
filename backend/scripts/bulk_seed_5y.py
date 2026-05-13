"""
Full HOSE + HNX seed script with comprehensive hardcoded ticker list.
Run after matplotlib is installed.
"""
import asyncio
import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.fiinquant_client import get_fiinquant_client
from app.core.database import AsyncSessionLocal, init_db
from app.models.market import DailyPrice
from sqlalchemy.dialects.mysql import insert

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

FROM_DATE = "2021-01-01"
BATCH_SIZE = 20

# Comprehensive HOSE + HNX blue-chip and mid-cap tickers
ALL_TICKERS = [
    # Indices
    "VNINDEX", "HNX", "UPCOM",
    # HOSE Banking
    "VCB", "BID", "CTG", "MBB", "TCB", "ACB", "STB", "HDB", "VPB",
    "LPB", "EIB", "SHB", "TPB", "OCB", "MSB", "ABB", "BAB",
    # HOSE Consumer / Retail
    "VNM", "MWG", "PNJ", "SAB", "MSN", "KDC", "MCH", "ANV",
    # HOSE Real Estate
    "VHM", "VIC", "NVL", "DIG", "KDH", "NLG", "PDR", "DXG",
    "BCM", "CII", "NRC", "HDG", "LDG", "CEO",
    # HOSE Steel / Industrial
    "HPG", "HSG", "NKG", "TLH", "POM",
    # HOSE Tech / Telecom
    "FPT", "CMG", "ELC",
    # HOSE Energy / Oil
    "GAS", "PLX", "POW", "PVD", "BSR", "PVT", "PGV",
    # HOSE Securities
    "SSI", "VND", "HCM", "MBS", "CTS", "VCI", "BSI", "AGR",
    # HOSE Transport / Aviation
    "VJC", "HVN", "GMD", "HAH", "PVT",
    # HOSE Others
    "GVR", "REE", "DBC", "BAF", "VGC", "PHR", "DPM", "DCM",
    "SCS", "ASM", "VOS", "PAN", "HAG", "AST",
    # HNX stocks
    "PVS", "SHB", "VCS", "BVS", "SHS", "KLB", "NVB", "HCC",
    "TNG", "IDC", "HUT", "PGS", "VGS", "BTS", "NRC",
]

# Deduplicate
ALL_TICKERS = list(dict.fromkeys(ALL_TICKERS))


async def seed_batch(client, tickers: list, from_date: str) -> int:
    try:
        df = client.get_trading_data(tickers=tickers, from_date=from_date)
        if df is None or df.empty:
            return 0

        df.columns = [c.lower() for c in df.columns]
        rows_inserted = 0

        async with AsyncSessionLocal() as session:
            for _, row in df.iterrows():
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

                stmt = insert(DailyPrice).values(
                    ticker=ticker,
                    date=date_val,
                    open=float(row.get("open", close) or close),
                    high=float(row.get("high", close) or close),
                    low=float(row.get("low", close) or close),
                    close=close,
                    volume=float(row.get("volume", 0) or 0),
                    value=float(row.get("volume", 0) or 0) * close,
                )
                stmt = stmt.on_duplicate_key_update(
                    open=stmt.inserted.open,
                    high=stmt.inserted.high,
                    low=stmt.inserted.low,
                    close=stmt.inserted.close,
                    volume=stmt.inserted.volume,
                    value=stmt.inserted.value,
                )
                await session.execute(stmt)
                rows_inserted += 1
            await session.commit()
        return rows_inserted
    except Exception as e:
        logger.error(f"Batch error {tickers[:3]}: {e}")
        return 0


async def main():
    logger.info(f"=== Full HOSE+HNX 5-Year Seed | {len(ALL_TICKERS)} tickers from {FROM_DATE} ===")
    await init_db()
    client = get_fiinquant_client()

    batches = [ALL_TICKERS[i:i+BATCH_SIZE] for i in range(0, len(ALL_TICKERS), BATCH_SIZE)]
    logger.info(f"Processing {len(batches)} batches of {BATCH_SIZE}...")

    total = 0
    for i, batch in enumerate(batches):
        logger.info(f"[{i+1}/{len(batches)}] Seeding: {', '.join(batch[:4])}...")
        rows = await seed_batch(client, batch, FROM_DATE)
        total += rows
        logger.info(f"  → +{rows} rows (total: {total:,})")
        await asyncio.sleep(3)  # Respect API rate limits

    logger.info(f"\n✅ Seed complete! Total rows in DB: {total:,}")


if __name__ == "__main__":
    asyncio.run(main())
