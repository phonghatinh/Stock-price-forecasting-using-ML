"""SQLAlchemy ORM — Prediction log for AI Reflection module."""
from datetime import datetime
from sqlalchemy import String, Float, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    prediction_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    target_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Prediction output
    signal: Mapped[str] = mapped_column(String(20), nullable=False)         # BUY / SELL / HOLD
    confidence: Mapped[float] = mapped_column(Float, nullable=False)        # 0-1
    predicted_return: Mapped[float] = mapped_column(Float, nullable=True)   # expected %
    predicted_price: Mapped[float] = mapped_column(Float, nullable=True)

    # Actual outcome (filled after target_date)
    actual_return: Mapped[float] = mapped_column(Float, nullable=True)
    actual_price: Mapped[float] = mapped_column(Float, nullable=True)
    is_correct: Mapped[bool] = mapped_column(nullable=True)
    error_pct: Mapped[float] = mapped_column(Float, nullable=True)

    # XAI artifacts
    shap_values: Mapped[dict] = mapped_column(JSON, nullable=True)
    top_features: Mapped[dict] = mapped_column(JSON, nullable=True)
    narrative: Mapped[str] = mapped_column(Text, nullable=True)

    # Model metadata
    model_version: Mapped[str] = mapped_column(String(50), nullable=True)
    feature_snapshot: Mapped[dict] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
