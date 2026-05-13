"""
FastAPI main entry point — registers all routers, middleware, and startup events.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config import settings
from app.core.database import init_db
from app.api.v1 import market, analysis, portfolio, prediction, reflection, simulator, settings as settings_router
from app.core.websocket import ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.workers.market_sync import sync_market_data

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("🚀 Starting FiinQuant Financial Platform...")
    await init_db()
    logger.info("✅ Database initialized")
    
    scheduler.add_job(sync_market_data, 'cron', hour=18, minute=0) # Run at 6 PM daily
    scheduler.start()
    logger.info("✅ Scheduler started")
    
    yield
    
    scheduler.shutdown()
    logger.info("🛑 Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered Vietnam stock market analysis platform",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(market.router,     prefix="/api/v1/market",     tags=["Market"])
app.include_router(analysis.router,   prefix="/api/v1/analysis",   tags=["Analysis"])
app.include_router(portfolio.router,  prefix="/api/v1/portfolio",  tags=["Portfolio"])
app.include_router(prediction.router, prefix="/api/v1/prediction", tags=["Prediction"])
app.include_router(reflection.router,        prefix="/api/v1/reflection",  tags=["Reflection"])
app.include_router(simulator.router,         prefix="/api/v1/simulator",   tags=["Simulator"])
app.include_router(settings_router.router,   prefix="/api/v1/settings",    tags=["Settings"])
app.include_router(ws_router,                prefix="/ws",                 tags=["WebSocket"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/api/docs",
    }


@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "ok"}
