from sqlalchemy import Column, Integer, String, Float, Date, Index, UniqueConstraint
from app.core.database import Base

class DailyPrice(Base):
    __tablename__ = "daily_prices"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    open = Column(Float, nullable=True)
    high = Column(Float, nullable=True)
    low = Column(Float, nullable=True)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=True)
    value = Column(Float, nullable=True)

    __table_args__ = (
        UniqueConstraint('ticker', 'date', name='uix_ticker_date'),
    )

class MarketBreadth(Base):
    __tablename__ = "market_breadth"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True, nullable=False)
    advance = Column(Integer, default=0)
    decline = Column(Integer, default=0)
    unchanged = Column(Integer, default=0)
    total_value = Column(Float, default=0)
