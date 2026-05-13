"""WebSocket real-time market feed handler."""
import asyncio
import json
import logging
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
ws_router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections per topic."""

    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, topic: str):
        await websocket.accept()
        if topic not in self._connections:
            self._connections[topic] = set()
        self._connections[topic].add(websocket)
        logger.info(f"WS connected: {topic} (total: {len(self._connections[topic])})")

    def disconnect(self, websocket: WebSocket, topic: str):
        if topic in self._connections:
            self._connections[topic].discard(websocket)

    async def broadcast(self, topic: str, message: dict):
        if topic not in self._connections:
            return
        dead = set()
        for ws in self._connections[topic]:
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections[topic].discard(ws)


manager = ConnectionManager()


@ws_router.websocket("/market")
async def ws_market_feed(websocket: WebSocket):
    """Real-time market index feed."""
    await manager.connect(websocket, "market")
    try:
        while True:
            # Keep alive + receive any client messages
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                logger.debug(f"WS client message: {data}")
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket, "market")
        logger.info("WS disconnected: market")


@ws_router.websocket("/ticker/{ticker}")
async def ws_ticker_feed(websocket: WebSocket, ticker: str):
    """Real-time feed for a specific ticker."""
    topic = f"ticker_{ticker.upper()}"
    await manager.connect(websocket, topic)
    try:
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "ping", "ticker": ticker}))
    except WebSocketDisconnect:
        manager.disconnect(websocket, topic)


async def broadcast_market_update(data: dict):
    """Called by market_poller worker to push data to all clients."""
    await manager.broadcast("market", {"type": "market_update", "data": data})


async def broadcast_ticker_update(ticker: str, data: dict):
    """Push ticker-specific update."""
    await manager.broadcast(f"ticker_{ticker.upper()}", {"type": "ticker_update", "data": data})
