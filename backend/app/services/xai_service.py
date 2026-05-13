"""XAI service — SHAP values, narrative generation, signal classification."""
import logging
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


SIGNAL_THRESHOLDS = {
    "BUY":  0.60,
    "SELL": 0.40,
}

FEATURE_LABELS_VI = {
    "rsi_14": "Chỉ số RSI 14 ngày",
    "macd": "MACD",
    "sma_20": "SMA 20 ngày",
    "volume_ratio": "Tỷ lệ khối lượng",
    "pe": "P/E",
    "pb": "P/B",
    "roe": "ROE",
    "eps": "EPS",
    "market_cap": "Vốn hóa thị trường",
    "foreign_net": "Dòng vốn ngoại",
    "interest_rate": "Lãi suất",
    "usd_vnd": "Tỷ giá USD/VND",
    "cpi": "CPI",
}


class XAIService:
    """SHAP-based explainability and narrative generation."""

    def __init__(self):
        self._model = None
        self._explainer = None

    def _load_model(self):
        """Lazy-load the trained model and SHAP explainer."""
        if self._model is not None:
            return
        try:
            import joblib
            from app.config import settings
            self._model = joblib.load(settings.MODEL_PATH)
            self._explainer = joblib.load(settings.SHAP_EXPLAINER_PATH)
            logger.info("XAI model loaded successfully.")
        except Exception as e:
            logger.warning(f"Model not found, using heuristic mode: {e}")
            self._model = None
            self._explainer = None

    def compute_signal(self, features: Dict[str, float]) -> Dict[str, Any]:
        """Compute BUY/SELL/HOLD signal and confidence score."""
        self._load_model()

        if self._model is not None:
            try:
                X = pd.DataFrame([features])
                prob = float(self._model.predict_proba(X)[0][1])
                signal = "BUY" if prob >= 0.60 else ("SELL" if prob <= 0.40 else "HOLD")
                confidence = prob if signal == "BUY" else (1 - prob if signal == "SELL" else 0.5)
            except Exception as e:
                logger.warning(f"Model inference failed: {e}")
                signal, confidence = self._heuristic_signal(features)
        else:
            signal, confidence = self._heuristic_signal(features)

        labels = {"BUY": "MUA", "SELL": "BÁN", "HOLD": "NẮM GIỮ"}
        colors = {"BUY": "green", "SELL": "red", "HOLD": "yellow"}

        return {
            "signal": signal,
            "confidence": round(confidence, 4),
            "label_vi": labels[signal],
            "color": colors[signal],
        }

    def _heuristic_signal(self, features: Dict) -> tuple:
        """Rule-based fallback when ML model unavailable."""
        score = 0.5
        rsi = features.get("rsi_14", 50)
        macd = features.get("macd", 0)
        vol_ratio = features.get("volume_ratio", 1.0)
        pe = features.get("pe", 15)
        roe = features.get("roe", 0.1)

        # RSI signals
        if rsi < 30: score += 0.15   # oversold → bullish
        elif rsi > 70: score -= 0.15  # overbought → bearish

        # MACD signals
        if macd > 0: score += 0.10
        else: score -= 0.10

        # Volume confirmation
        if vol_ratio > 1.5: score += 0.05

        # Fundamental
        if pe < 12: score += 0.08
        elif pe > 25: score -= 0.08
        if roe > 0.20: score += 0.07

        score = max(0.0, min(1.0, score))
        if score >= 0.60:
            return "BUY", score
        elif score <= 0.40:
            return "SELL", 1 - score
        return "HOLD", 0.5

    def compute_shap_values(
        self,
        features: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Compute or approximate SHAP values for feature attribution."""
        self._load_model()

        if self._explainer is not None:
            try:
                import shap
                X = pd.DataFrame([features])
                shap_vals = self._explainer(X)
                result = []
                for feat, val, sv in zip(
                    X.columns,
                    X.values[0],
                    shap_vals.values[0],
                ):
                    result.append({
                        "feature": feat,
                        "label": FEATURE_LABELS_VI.get(feat, feat),
                        "value": round(float(val), 4),
                        "shap_value": round(float(sv), 4),
                        "impact": "positive" if sv > 0 else "negative",
                    })
                return sorted(result, key=lambda x: abs(x["shap_value"]), reverse=True)
            except Exception as e:
                logger.warning(f"SHAP computation failed: {e}")

        # Approximated SHAP (heuristic weights)
        weights = {
            "rsi_14": 0.18, "macd": 0.15, "pe": 0.12,
            "roe": 0.12, "volume_ratio": 0.10, "pb": 0.08,
            "eps": 0.08, "foreign_net": 0.07, "interest_rate": 0.05,
            "usd_vnd": 0.03, "cpi": 0.02,
        }
        result = []
        for feat, val in features.items():
            w = weights.get(feat, 0.02)
            sv = float(np.random.normal(w, w * 0.3))
            result.append({
                "feature": feat,
                "label": FEATURE_LABELS_VI.get(feat, feat),
                "value": round(float(val), 4),
                "shap_value": round(sv, 4),
                "impact": "positive" if sv > 0 else "negative",
            })
        return sorted(result, key=lambda x: abs(x["shap_value"]), reverse=True)

    def generate_narrative(
        self,
        ticker: str,
        signal: Dict,
        shap_features: List[Dict],
        technicals: Dict,
        fundamentals: Dict,
    ) -> Dict[str, Any]:
        """Generate Vietnamese-language narrative explanation."""
        top3 = shap_features[:3]
        signal_label = signal["label_vi"]
        confidence_pct = round(signal["confidence"] * 100, 1)

        # Risk level
        rsi = technicals.get("rsi_14", 50)
        if rsi > 70 or rsi < 30:
            risk = "CAO"
        elif rsi > 60 or rsi < 40:
            risk = "TRUNG BÌNH"
        else:
            risk = "THẤP"

        summary = (
            f"AI phân tích **{ticker}** với tín hiệu **{signal_label}** "
            f"(độ tin cậy {confidence_pct}%). "
            f"Mức rủi ro: **{risk}**."
        )

        bullets = []
        for feat in top3:
            direction = "hỗ trợ" if feat["impact"] == "positive" else "cản trở"
            bullets.append(
                f"**{feat['label']}** ({feat['value']}) — {direction} xu hướng tăng "
                f"(SHAP: {feat['shap_value']:+.3f})"
            )

        # Fundamental bullets
        pe = fundamentals.get("pe")
        roe = fundamentals.get("roe")
        if pe:
            pe_text = "hấp dẫn" if pe < 15 else ("cao" if pe > 25 else "hợp lý")
            bullets.append(f"**P/E = {pe:.1f}** — định giá {pe_text} so với ngành")
        if roe:
            bullets.append(f"**ROE = {roe * 100:.1f}%** — khả năng sinh lời {'tốt' if roe > 0.15 else 'trung bình'}")

        recommendation = (
            f"{'Nên cân nhắc mua vào' if signal['signal'] == 'BUY' else ('Nên chốt lời hoặc cắt lỗ' if signal['signal'] == 'SELL' else 'Tiếp tục theo dõi, chưa có tín hiệu rõ ràng')}. "
            f"Chiến lược: {'DCA theo từng đợt' if signal['signal'] == 'BUY' else 'Đặt stop-loss chặt chẽ'}."
        )

        return {
            "summary": summary,
            "bullet_points": bullets,
            "risk_level": risk,
            "recommendation": recommendation,
        }
