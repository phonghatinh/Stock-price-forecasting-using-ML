"""Settings & Notifications API router."""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory store for demo (would be DB in production)
_alert_store: dict = {}   # user_id -> list of alerts
_settings_store: dict = {}  # user_id -> settings dict

RISK_PROFILES = [
    {"id": "conservative", "label": "Bảo thủ", "description": "Ưu tiên bảo toàn vốn, chấp nhận lợi nhuận thấp", "color": "#10b981"},
    {"id": "moderate", "label": "Trung lập", "description": "Cân bằng giữa rủi ro và lợi nhuận", "color": "#f59e0b"},
    {"id": "aggressive", "label": "Tích cực", "description": "Chấp nhận rủi ro cao để đạt lợi nhuận cao", "color": "#ef4444"},
]


class UserSettings(BaseModel):
    risk_appetite: str = "moderate"  # conservative / moderate / aggressive
    benchmark: str = "VN30"
    notification_email: Optional[str] = None
    theme: str = "dark"
    auto_refresh_interval: int = 60  # seconds
    default_horizon: int = 5  # prediction horizon days


class PriceAlert(BaseModel):
    ticker: str
    alert_type: str  # "above" | "below" | "change_pct"
    threshold: float
    label: Optional[str] = None


class SignalAlert(BaseModel):
    ticker: str
    alert_signals: List[str] = ["BUY", "SELL"]  # which signal changes to notify


@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get user profile and settings."""
    uid = current_user["user_id"]
    stored = _settings_store.get(uid, {})
    return {
        "user_id": uid,
        "email": current_user.get("email", "user@fiinquant.vn"),
        "name": current_user.get("name", "Nhà đầu tư"),
        "risk_appetite": stored.get("risk_appetite", "moderate"),
        "benchmark": stored.get("benchmark", "VN30"),
        "theme": stored.get("theme", "dark"),
        "auto_refresh_interval": stored.get("auto_refresh_interval", 60),
        "default_horizon": stored.get("default_horizon", 5),
        "risk_profiles": RISK_PROFILES,
    }


@router.put("/profile")
async def update_profile(
    body: UserSettings,
    current_user: dict = Depends(get_current_user),
):
    """Update user settings."""
    uid = current_user["user_id"]
    _settings_store[uid] = body.dict()
    return {"message": "Cập nhật thành công", "settings": body.dict()}


@router.get("/alerts")
async def get_alerts(current_user: dict = Depends(get_current_user)):
    """Get user's price alerts and signal alerts."""
    uid = current_user["user_id"]
    alerts = _alert_store.get(uid, [])
    if not alerts:
        # Return demo alerts
        return [
            {
                "id": "demo-1",
                "ticker": "VNM",
                "type": "price_below",
                "threshold": 70000,
                "label": "VNM hỗ trợ 70k",
                "active": True,
                "created_at": "2026-05-01T09:00:00",
            },
            {
                "id": "demo-2",
                "ticker": "HPG",
                "type": "signal_change",
                "threshold": None,
                "label": "HPG tín hiệu mới",
                "active": True,
                "created_at": "2026-05-02T14:00:00",
            },
        ]
    return alerts


@router.post("/alerts/price")
async def create_price_alert(
    body: PriceAlert,
    current_user: dict = Depends(get_current_user),
):
    """Create a price alert for a ticker."""
    uid = current_user["user_id"]
    if uid not in _alert_store:
        _alert_store[uid] = []

    alert_id = f"alert-{len(_alert_store[uid]) + 1}"
    alert = {
        "id": alert_id,
        "ticker": body.ticker.upper(),
        "type": f"price_{body.alert_type}",
        "threshold": body.threshold,
        "label": body.label or f"{body.ticker.upper()} {'>' if body.alert_type == 'above' else '<'} {body.threshold:,.0f}",
        "active": True,
    }
    _alert_store[uid].append(alert)
    return {"message": "Đã tạo cảnh báo giá", "alert": alert}


@router.post("/alerts/signal")
async def create_signal_alert(
    body: SignalAlert,
    current_user: dict = Depends(get_current_user),
):
    """Create a signal change notification."""
    uid = current_user["user_id"]
    if uid not in _alert_store:
        _alert_store[uid] = []

    alert_id = f"alert-sig-{len(_alert_store[uid]) + 1}"
    alert = {
        "id": alert_id,
        "ticker": body.ticker.upper(),
        "type": "signal_change",
        "threshold": None,
        "label": f"{body.ticker.upper()} tín hiệu: {', '.join(body.alert_signals)}",
        "signals": body.alert_signals,
        "active": True,
    }
    _alert_store[uid].append(alert)
    return {"message": "Đã tạo cảnh báo tín hiệu", "alert": alert}


@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete an alert."""
    uid = current_user["user_id"]
    alerts = _alert_store.get(uid, [])
    _alert_store[uid] = [a for a in alerts if a["id"] != alert_id]
    return {"message": "Đã xóa cảnh báo"}


@router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get recent notifications (demo)."""
    return [
        {
            "id": "n1",
            "type": "signal",
            "ticker": "VCB",
            "message": "VCB: Tín hiệu thay đổi từ HOLD → BUY",
            "confidence": 82.4,
            "timestamp": "2026-05-11T09:15:00",
            "read": False,
        },
        {
            "id": "n2",
            "type": "price",
            "ticker": "HPG",
            "message": "HPG: Giá chạm ngưỡng kháng cự 26,000 VND",
            "threshold": 26000,
            "timestamp": "2026-05-11T10:30:00",
            "read": False,
        },
        {
            "id": "n3",
            "type": "ai",
            "ticker": None,
            "message": "AI phát hiện cơ hội: SSI – mô hình tương tự giai đoạn Q3/2024",
            "timestamp": "2026-05-10T15:00:00",
            "read": True,
        },
        {
            "id": "n4",
            "type": "signal",
            "ticker": "FPT",
            "message": "FPT: Tín hiệu BUY mạnh – Confidence 88%",
            "confidence": 88.0,
            "timestamp": "2026-05-10T09:00:00",
            "read": True,
        },
    ]
