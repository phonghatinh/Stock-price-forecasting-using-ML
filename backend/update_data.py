import asyncio
import logging
from app.workers.market_sync import sync_market_data

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s — %(message)s")

async def main():
    print("Starting manual data synchronization...")
    await sync_market_data()
    print("Data synchronization completed.")

if __name__ == "__main__":
    asyncio.run(main())
