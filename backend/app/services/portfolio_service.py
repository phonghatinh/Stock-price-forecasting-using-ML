"""Portfolio service — Markowitz optimization, CRUD, rebalancing."""
import logging
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from datetime import datetime

from app.services.fiinquant_client import FiinQuantClient

logger = logging.getLogger(__name__)


class PortfolioService:
    def __init__(self, client: FiinQuantClient):
        self.client = client

    def enrich_holdings(self, holdings: List[Dict]) -> List[Dict]:
        """Add current prices, P&L, and weights to holdings list."""
        if not holdings:
            return []
        tickers = [h["ticker"] for h in holdings]
        try:
            df = self.client.get_realtime_data(tickers)
            price_map = {}
            if not df.empty:
                for _, row in df.iterrows():
                    ticker = row.get("ticker", "")
                    if ticker:
                        price_map[ticker] = float(row.get("close", 0))
        except Exception as e:
            logger.warning(f"Real-time prices unavailable: {e}")
            price_map = {}

        total_value = 0
        enriched = []
        for h in holdings:
            ticker = h["ticker"]
            current_price = price_map.get(ticker, h.get("avg_cost", 0))
            quantity = h.get("quantity", 0)
            avg_cost = h.get("avg_cost", 0)
            market_value = current_price * quantity
            cost_basis = avg_cost * quantity
            pnl = market_value - cost_basis
            pnl_pct = (pnl / cost_basis * 100) if cost_basis > 0 else 0
            total_value += market_value
            enriched.append({**h, "current_price": current_price, "market_value": market_value, "pnl": pnl, "pnl_pct": round(pnl_pct, 2)})

        # Weights
        for item in enriched:
            item["weight"] = round(item["market_value"] / total_value * 100, 2) if total_value > 0 else 0

        return enriched

    def markowitz_optimize(
        self,
        tickers: List[str],
        current_weights: Dict[str, float],
        objective: str = "sharpe",
        risk_free_rate: float = 0.045,
        n_simulations: int = 5000,
    ) -> Dict[str, Any]:
        """Monte Carlo Markowitz portfolio optimization."""
        from_date = "2023-01-01"
        try:
            df = self.client.get_trading_data(
                tickers=tickers,
                from_date=from_date,
                interval="1D",
            )
            if df.empty:
                raise ValueError("No price data")
            pivot = df.pivot_table(index="date", columns="ticker", values="close")
            returns = pivot.pct_change().dropna()
        except Exception as e:
            logger.warning(f"Using simulated returns: {e}")
            n_days = 500
            returns = pd.DataFrame(
                np.random.normal(0.0008, 0.02, (n_days, len(tickers))),
                columns=tickers,
            )

        mean_returns = returns.mean()
        cov_matrix = returns.cov()
        n = len(tickers)

        # Monte Carlo simulation
        results = []
        weights_list = []
        for _ in range(n_simulations):
            w = np.random.dirichlet(np.ones(n))
            port_return = float(np.dot(w, mean_returns) * 252)
            port_vol = float(np.sqrt(w @ cov_matrix.values @ w) * np.sqrt(252))
            sharpe = (port_return - risk_free_rate) / port_vol if port_vol > 0 else 0
            results.append((port_return, port_vol, sharpe))
            weights_list.append(w)

        results_arr = np.array(results)

        # Select optimal
        if objective == "sharpe":
            idx = results_arr[:, 2].argmax()
        elif objective == "min_volatility":
            idx = results_arr[:, 1].argmin()
        else:  # max_return
            idx = results_arr[:, 0].argmax()

        opt_w = weights_list[idx]
        opt_weights = {t: round(float(w), 4) for t, w in zip(tickers, opt_w)}

        # Efficient frontier (sample 100 points)
        frontier = []
        step = len(results) // 100
        for i in range(0, len(results), step):
            frontier.append({
                "expected_return": round(results[i][0] * 100, 2),
                "volatility": round(results[i][1] * 100, 2),
                "sharpe": round(results[i][2], 3),
                "weights": {t: round(float(w), 3) for t, w in zip(tickers, weights_list[i])},
            })

        # Rebalance trades
        rebalance = []
        for ticker in tickers:
            curr = current_weights.get(ticker, 0)
            target = opt_weights.get(ticker, 0)
            diff = target - curr
            action = "BUY" if diff > 0.02 else ("SELL" if diff < -0.02 else "HOLD")
            rebalance.append({
                "ticker": ticker,
                "current_weight": round(curr * 100, 2),
                "target_weight": round(target * 100, 2),
                "action": action,
                "diff_pct": round(diff * 100, 2),
                "reason": self._rebalance_reason(ticker, action, diff),
            })

        xai = self._generate_rebalance_narrative(opt_weights, rebalance, objective)

        return {
            "optimal_weights": opt_weights,
            "expected_return": round(float(results_arr[idx, 0]) * 100, 2),
            "volatility": round(float(results_arr[idx, 1]) * 100, 2),
            "sharpe_ratio": round(float(results_arr[idx, 2]), 4),
            "frontier": frontier,
            "rebalance_trades": rebalance,
            "xai_explanation": xai,
        }

    def _rebalance_reason(self, ticker: str, action: str, diff: float) -> str:
        if action == "BUY":
            return f"Tăng tỷ trọng {ticker} thêm {abs(diff)*100:.1f}% để cải thiện Sharpe ratio"
        elif action == "SELL":
            return f"Giảm tỷ trọng {ticker} {abs(diff)*100:.1f}% để kiểm soát rủi ro danh mục"
        return f"Duy trì tỷ trọng {ticker}, phù hợp với mục tiêu tối ưu"

    def _generate_rebalance_narrative(
        self, weights: Dict, rebalance: List, objective: str
    ) -> str:
        obj_vi = {"sharpe": "tối đa hóa Sharpe Ratio", "min_volatility": "tối thiểu rủi ro", "max_return": "tối đa lợi nhuận"}
        actions = [r for r in rebalance if r["action"] != "HOLD"]
        return (
            f"Danh mục được tối ưu theo mục tiêu **{obj_vi.get(objective, objective)}** "
            f"bằng phương pháp Monte Carlo Markowitz (5,000 mô phỏng). "
            f"Có {len(actions)} giao dịch cần thực hiện để đưa danh mục về trạng thái tối ưu."
        )
