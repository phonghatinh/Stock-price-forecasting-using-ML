"""
ML Pipeline — Feature Engineering
Computes RSI, MACD, Bollinger Bands, P/E, EPS, macro vars.
"""
import pandas as pd
import numpy as np
from typing import Optional


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def compute_macd(series: pd.Series, fast=12, slow=26, signal=9):
    ema_fast = series.ewm(span=fast).mean()
    ema_slow = series.ewm(span=slow).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def compute_bollinger(series: pd.Series, period=20, std_mult=2):
    sma = series.rolling(period).mean()
    std = series.rolling(period).std()
    upper = sma + std_mult * std
    lower = sma - std_mult * std
    bb_pct = (series - lower) / (upper - lower)  # %B
    return upper, lower, bb_pct


def compute_atr(high: pd.Series, low: pd.Series, close: pd.Series, period=14) -> pd.Series:
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs(),
    ], axis=1).max(axis=1)
    return tr.rolling(period).mean()


def build_feature_matrix(
    price_df: pd.DataFrame,
    fundamental_df: Optional[pd.DataFrame] = None,
    macro_df: Optional[pd.DataFrame] = None,
    target_horizon: int = 5,
) -> pd.DataFrame:
    """
    Builds complete feature matrix from price + fundamental + macro data.
    Returns DataFrame with all features aligned by date.
    """
    df = price_df.copy()
    df = df.sort_values("date").reset_index(drop=True)

    close = df["close"].astype(float)
    high = df["high"].astype(float) if "high" in df else close
    low = df["low"].astype(float)  if "low" in df else close
    volume = df["volume"].astype(float) if "volume" in df else pd.Series(np.ones(len(df)))

    # ── Technical Features ──────────────────────────────────────────
    df["rsi_14"]     = compute_rsi(close, 14)
    df["rsi_7"]      = compute_rsi(close, 7)
    df["macd"], df["macd_signal"], df["macd_hist"] = compute_macd(close)
    df["bb_upper"], df["bb_lower"], df["bb_pct"] = compute_bollinger(close)
    df["atr_14"]     = compute_atr(high, low, close, 14)

    df["sma_5"]  = close.rolling(5).mean()
    df["sma_20"] = close.rolling(20).mean()
    df["sma_50"] = close.rolling(50).mean()
    df["ema_20"] = close.ewm(span=20).mean()

    df["price_vs_sma20"] = (close / df["sma_20"]) - 1
    df["price_vs_sma50"] = (close / df["sma_50"]) - 1

    # Returns
    for lag in [1, 3, 5, 10, 20]:
        df[f"return_{lag}d"] = close.pct_change(lag)

    df["volume_ratio_20"] = volume / volume.rolling(20).mean()
    df["volatility_20"]   = close.pct_change().rolling(20).std() * np.sqrt(252)

    # ── Fundamental Features ────────────────────────────────────────
    if fundamental_df is not None and not fundamental_df.empty:
        fund_cols = ["pe", "pb", "eps", "roe", "roa", "ev_ebitda", "debt_equity", "current_ratio"]
        for col in fund_cols:
            if col in fundamental_df.columns:
                df[col] = fundamental_df[col].iloc[0] if len(fundamental_df) > 0 else np.nan

    # ── Macro Features ──────────────────────────────────────────────
    if macro_df is not None and not macro_df.empty:
        for col in ["interest_rate", "cpi", "usd_vnd", "gdp_growth"]:
            if col in macro_df.columns:
                df[col] = macro_df[col].iloc[-1] if len(macro_df) > 0 else np.nan

    # ── Target Variable ─────────────────────────────────────────────
    future_return = close.pct_change(target_horizon).shift(-target_horizon)
    df["target_return"] = future_return
    df["target_signal"] = np.where(future_return > 0.03, 1,
                          np.where(future_return < -0.03, -1, 0))
    df["target_binary"] = (future_return > 0.01).astype(int)

    return df.dropna()


FEATURE_COLUMNS = [
    "rsi_14", "rsi_7", "macd", "macd_signal", "macd_hist",
    "bb_pct", "atr_14", "price_vs_sma20", "price_vs_sma50",
    "return_1d", "return_3d", "return_5d", "return_10d",
    "volume_ratio_20", "volatility_20",
    "pe", "pb", "eps", "roe", "roa",
    "interest_rate", "cpi", "usd_vnd",
]
