"""
ML Pipeline — Training Entry Point
Trains XGBoost model on FiinQuant data with cross-validation.
"""
import sys
import os
import logging
import json
import joblib
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Add project root
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))

from ml.pipelines.feature_engineering import build_feature_matrix, FEATURE_COLUMNS
from ml.pipelines.fetch_data import fetch_training_data


def train(
    tickers: list = None,
    from_date: str = "2020-01-01",
    to_date: str = None,
    model_version: str = "v1.0",
    target_horizon: int = 5,
):
    if to_date is None:
        to_date = datetime.now().strftime("%Y-%m-%d")
    if tickers is None:
        tickers = ["VNM", "VCB", "HPG", "SSI", "FPT", "MBB", "TCB", "ACB"]

    logger.info(f"Starting training: {tickers} | {from_date} → {to_date}")

    # ── Fetch data ────────────────────────────────────────────────────
    all_dfs = []
    for ticker in tickers:
        try:
            price_df, fund_df, macro_df = fetch_training_data(ticker, from_date, to_date)
            feat_df = build_feature_matrix(price_df, fund_df, macro_df, target_horizon)
            feat_df["ticker"] = ticker
            all_dfs.append(feat_df)
            logger.info(f"  {ticker}: {len(feat_df)} rows")
        except Exception as e:
            logger.warning(f"  {ticker}: FAILED — {e}")

    if not all_dfs:
        raise ValueError("No training data available")

    df = pd.concat(all_dfs, ignore_index=True)
    logger.info(f"Total dataset: {len(df)} rows")

    # ── Prepare X, y ─────────────────────────────────────────────────
    available = [f for f in FEATURE_COLUMNS if f in df.columns]
    X = df[available].fillna(df[available].median())
    y = df["target_binary"]

    logger.info(f"Features: {len(available)} | Class balance: {y.mean():.3f}")

    # ── Time Series Cross-Validation ──────────────────────────────────
    try:
        import xgboost as xgb
    except ImportError:
        logger.error("XGBoost not installed: pip install xgboost")
        raise

    tscv = TimeSeriesSplit(n_splits=5)
    cv_scores = []

    for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model = xgb.XGBClassifier(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            use_label_encoder=False, eval_metric="logloss",
            random_state=42, n_jobs=-1,
        )
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
        preds = model.predict(X_val)
        acc = accuracy_score(y_val, preds)
        cv_scores.append(acc)
        logger.info(f"  Fold {fold+1}: Accuracy = {acc:.4f}")

    logger.info(f"CV Mean Accuracy: {np.mean(cv_scores):.4f} ± {np.std(cv_scores):.4f}")

    # ── Final model on all data ────────────────────────────────────────
    final_model = xgb.XGBClassifier(
        n_estimators=500, max_depth=6, learning_rate=0.04,
        subsample=0.8, colsample_bytree=0.8,
        use_label_encoder=False, eval_metric="logloss",
        random_state=42, n_jobs=-1,
    )
    final_model.fit(X, y)

    # ── SHAP Explainer ─────────────────────────────────────────────────
    try:
        import shap
        explainer = shap.TreeExplainer(final_model)
        logger.info("SHAP explainer created")
    except Exception as e:
        logger.warning(f"SHAP unavailable: {e}")
        explainer = None

    # ── Save artifacts ─────────────────────────────────────────────────
    version_dir = Path(f"ml/registry/versions/{model_version}")
    version_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(final_model, version_dir / "model.pkl")
    if explainer:
        joblib.dump(explainer, version_dir / "shap_explainer.pkl")

    metadata = {
        "version": model_version,
        "train_date": datetime.now().isoformat(),
        "features": available,
        "n_features": len(available),
        "tickers": tickers,
        "from_date": from_date,
        "to_date": to_date,
        "target_horizon_days": target_horizon,
        "cv_accuracy_mean": round(float(np.mean(cv_scores)), 4),
        "cv_accuracy_std": round(float(np.std(cv_scores)), 4),
        "training_samples": len(df),
    }

    with open(version_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"✅ Model saved to {version_dir}")
    return final_model, metadata


if __name__ == "__main__":
    train()
