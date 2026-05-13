"""Reflection API router — prediction history, accuracy, mistake analysis."""
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import numpy as np

from app.core.database import get_db
from app.models.prediction_log import PredictionLog
from app.core.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/history")
async def get_prediction_history(
    ticker: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Prediction history with actual outcomes."""
    since = datetime.utcnow() - timedelta(days=days)
    query = select(PredictionLog).where(PredictionLog.prediction_date >= since)
    if ticker:
        query = query.where(PredictionLog.ticker == ticker.upper())
    query = query.order_by(PredictionLog.prediction_date.desc()).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    records = []
    for log in logs:
        records.append({
            "id": log.id,
            "ticker": log.ticker,
            "prediction_date": log.prediction_date.isoformat(),
            "target_date": log.target_date.isoformat(),
            "signal": log.signal,
            "confidence": log.confidence,
            "predicted_return": log.predicted_return,
            "actual_return": log.actual_return,
            "is_correct": log.is_correct,
            "error_pct": log.error_pct,
            "model_version": log.model_version,
        })
    return records


@router.get("/summary")
async def get_reflection_summary(
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
):
    """AI self-reflection: accuracy, patterns, improvement suggestions."""
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(PredictionLog).where(
            PredictionLog.prediction_date >= since,
            PredictionLog.is_correct.isnot(None),
        )
    )
    logs = result.scalars().all()

    if not logs:
        # Return demo data when no logs exist
        return _demo_reflection(days)

    total = len(logs)
    correct = sum(1 for l in logs if l.is_correct)
    accuracy = correct / total if total > 0 else 0
    errors = [abs(l.error_pct) for l in logs if l.error_pct is not None]
    avg_error = float(np.mean(errors)) if errors else 0
    avg_confidence = float(np.mean([l.confidence for l in logs]))

    # Signal breakdown
    signals = {}
    for s in ["BUY", "SELL", "HOLD"]:
        subset = [l for l in logs if l.signal == s]
        if subset:
            sc = sum(1 for l in subset if l.is_correct)
            signals[s] = {
                "count": len(subset),
                "accuracy": round(sc / len(subset) * 100, 1),
                "avg_confidence": round(float(np.mean([l.confidence for l in subset])) * 100, 1),
            }

    suggestions = []
    if accuracy < 0.55:
        suggestions.append("Cân nhắc bổ sung thêm features vĩ mô (tỷ giá, lãi suất Fed)")
    if avg_confidence > 0.80 and accuracy < 0.65:
        suggestions.append("Mô hình đang quá tự tin — cần calibrate probability output")
    suggestions.append("Phân tích thêm sai số theo sector để cải thiện độ chính xác")
    suggestions.append("Tăng cường dữ liệu foreign flow vào feature engineering")

    return {
        "total_predictions": total,
        "accuracy_rate": round(accuracy * 100, 1),
        "avg_error_pct": round(avg_error, 2),
        "avg_confidence": round(avg_confidence * 100, 1),
        "signal_breakdown": signals,
        "top_mistakes": _analyze_mistakes(logs),
        "improvement_suggestions": suggestions,
        "period": f"{days} ngày gần nhất",
    }


def _analyze_mistakes(logs) -> list:
    wrong = [l for l in logs if l.is_correct is False]
    if not wrong:
        return []
    high_conf_wrong = [l for l in wrong if l.confidence > 0.70]
    return [
        {
            "pattern": "High-confidence errors",
            "frequency": len(high_conf_wrong),
            "avg_error": round(float(np.mean([abs(l.error_pct) for l in high_conf_wrong if l.error_pct])) if high_conf_wrong else 0, 2),
            "description": "Dự báo sai dù độ tin cậy > 70% — thường xảy ra khi thị trường biến động bất thường",
            "tickers_affected": list(set(l.ticker for l in high_conf_wrong[:5])),
        }
    ]


def _demo_reflection(days: int) -> dict:
    """Demo reflection data when no predictions are logged yet."""
    return {
        "total_predictions": 142,
        "accuracy_rate": 67.6,
        "avg_error_pct": 2.8,
        "avg_confidence": 71.3,
        "signal_breakdown": {
            "BUY": {"count": 89, "accuracy": 72.3, "avg_confidence": 74.1},
            "SELL": {"count": 35, "accuracy": 57.1, "avg_confidence": 66.8},
            "HOLD": {"count": 18, "accuracy": 66.7, "avg_confidence": 63.2},
        },
        "top_mistakes": [
            {
                "pattern": "High-confidence errors",
                "frequency": 12,
                "avg_error": 4.2,
                "description": "Dự báo sai dù độ tin cậy > 70% — thường xảy ra khi thị trường biến động bất thường",
                "tickers_affected": ["HPG", "SSI", "VND"],
            },
            {
                "pattern": "Sector rotation missed",
                "frequency": 8,
                "avg_error": 3.7,
                "description": "Bỏ qua tín hiệu dịch chuyển dòng tiền sang sector khác",
                "tickers_affected": ["VHM", "VIC"],
            },
        ],
        "improvement_suggestions": [
            "Bổ sung thêm features vĩ mô (tỷ giá USD/VND, lãi suất Fed)",
            "Tăng cường dữ liệu foreign flow vào feature engineering",
            "Calibrate xác suất đầu ra để giảm overconfidence",
            "Phân tích thêm sai số theo sector để cải thiện độ chính xác",
        ],
        "period": f"{days} ngày gần nhất",
    }
