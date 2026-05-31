"""
Signal Engine
Fetches and processes live DeFi signals: price momentum,
volume spikes, trending assets, and market sentiment.
Uses OKX market data endpoints.
"""

import httpx
import asyncio
from datetime import datetime


class SignalEngine:
    """
    Processes live DeFi market signals from OKX.
    Identifies: momentum, volume spikes, trend changes, and opportunities.
    """

    OKX_BASE = "https://www.okx.com"

    TRACKED_PAIRS = [
        "ETH-USDT", "BTC-USDT", "BNB-USDT", "MATIC-USDT",
        "SOL-USDT", "ARB-USDT", "OP-USDT", "LINK-USDT"
    ]

    async def get_live_signals(self) -> list:
        """Fetch and process live signals for all tracked pairs."""
        signals = []
        async with httpx.AsyncClient(timeout=10.0) as client:
            tasks = [self._fetch_ticker(client, pair) for pair in self.TRACKED_PAIRS]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        for pair, result in zip(self.TRACKED_PAIRS, results):
            if isinstance(result, Exception):
                signals.append(self._mock_signal(pair))
                continue
            signal = self._process_ticker(pair, result)
            if signal:
                signals.append(signal)

        signals.sort(key=lambda s: abs(s.get("change_24h_pct", 0)), reverse=True)
        return signals

    async def get_alerts(self) -> list:
        """Return actionable signal alerts — big moves, volume spikes."""
        signals = await self.get_live_signals()
        alerts = []

        for sig in signals:
            change = sig.get("change_24h_pct", 0)
            if abs(change) >= 5.0:
                direction = "📈 Surge" if change > 0 else "📉 Drop"
                severity = "HIGH" if abs(change) >= 10 else "MEDIUM"
                alerts.append({
                    "type": "PRICE_MOVEMENT",
                    "severity": severity,
                    "asset": sig["pair"].replace("-USDT", ""),
                    "message": f"{direction}: {sig['pair']} moved {change:+.1f}% in 24h",
                    "current_price": sig.get("last_price"),
                    "change_pct": change
                })

        return alerts

    async def _fetch_ticker(self, client: httpx.AsyncClient, pair: str) -> dict:
        response = await client.get(
            f"{self.OKX_BASE}/api/v5/market/ticker",
            params={"instId": pair}
        )
        return response.json()

    def _process_ticker(self, pair: str, data: dict) -> dict | None:
        try:
            if data.get("code") != "0" or not data.get("data"):
                return self._mock_signal(pair)

            ticker = data["data"][0]
            last_price = float(ticker.get("last", 0))
            open_24h = float(ticker.get("open24h", last_price))
            vol_24h = float(ticker.get("vol24h", 0))

            change_pct = ((last_price - open_24h) / open_24h * 100) if open_24h > 0 else 0

            signal_type = "NEUTRAL"
            if change_pct >= 5:
                signal_type = "BULLISH"
            elif change_pct <= -5:
                signal_type = "BEARISH"
            elif change_pct >= 2:
                signal_type = "MILDLY_BULLISH"
            elif change_pct <= -2:
                signal_type = "MILDLY_BEARISH"

            return {
                "pair": pair,
                "last_price": last_price,
                "change_24h_pct": round(change_pct, 2),
                "volume_24h": vol_24h,
                "signal": signal_type,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception:
            return self._mock_signal(pair)

    def _mock_signal(self, pair: str) -> dict:
        """Mock signal data for demo mode."""
        mock_data = {
            "ETH-USDT": {"price": 3820.5, "change": 2.4, "signal": "MILDLY_BULLISH"},
            "BTC-USDT": {"price": 65200.0, "change": -1.2, "signal": "MILDLY_BEARISH"},
            "BNB-USDT": {"price": 578.3, "change": 5.7, "signal": "BULLISH"},
            "MATIC-USDT": {"price": 0.654, "change": -6.3, "signal": "BEARISH"},
            "SOL-USDT": {"price": 172.8, "change": 3.1, "signal": "MILDLY_BULLISH"},
            "ARB-USDT": {"price": 1.23, "change": 8.9, "signal": "BULLISH"},
            "OP-USDT": {"price": 2.87, "change": -0.4, "signal": "NEUTRAL"},
            "LINK-USDT": {"price": 14.52, "change": 1.8, "signal": "MILDLY_BULLISH"},
        }
        d = mock_data.get(pair, {"price": 1.0, "change": 0.0, "signal": "NEUTRAL"})
        return {
            "pair": pair,
            "last_price": d["price"],
            "change_24h_pct": d["change"],
            "volume_24h": 1000000,
            "signal": d["signal"],
            "timestamp": datetime.utcnow().isoformat(),
            "is_mock": True
        }
