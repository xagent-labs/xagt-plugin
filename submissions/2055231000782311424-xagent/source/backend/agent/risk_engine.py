"""
Risk Engine
Analyzes DeFi portfolios for concentration risk, liquidity risk,
and unusual movement patterns. Core intelligence layer.
"""

from typing import Any


class RiskEngine:
    """
    Analyzes wallet portfolios and generates risk scores + alerts.
    Risk levels: LOW (0-30), MEDIUM (31-60), HIGH (61-80), CRITICAL (81-100)
    """

    CONCENTRATION_THRESHOLD = 0.50   # >50% in one asset = HIGH risk
    LOW_LIQUIDITY_THRESHOLD = 100.0  # <$100 USD value = low liquidity flag
    SMALL_PORTFOLIO_THRESHOLD = 500.0  # <$500 total = limited diversification

    async def analyze(self, portfolio: dict) -> dict:
        """Run quick risk analysis. Returns score + level."""
        score = await self._calculate_score(portfolio)
        return {
            "score": score,
            "level": self._score_to_level(score),
            "summary": self._score_to_summary(score)
        }

    async def full_report(self, portfolio: dict) -> dict:
        """Run complete risk report with all checks."""
        tokens = portfolio.get("tokens", [])
        total_usd = portfolio.get("total_usd", 0)
        score = await self._calculate_score(portfolio)

        checks = {
            "concentration": self._check_concentration(tokens, total_usd),
            "liquidity": self._check_liquidity(tokens),
            "diversification": self._check_diversification(tokens, total_usd),
            "stablecoin_ratio": self._check_stablecoin_ratio(tokens, total_usd),
        }

        recommendations = self._generate_recommendations(checks)

        return {
            "score": score,
            "level": self._score_to_level(score),
            "checks": checks,
            "recommendations": recommendations,
            "portfolio_value_usd": total_usd,
            "assets_monitored": len(tokens)
        }

    async def get_alerts(self, portfolio: dict) -> list:
        """Return list of active risk alerts for the portfolio."""
        alerts = []
        tokens = portfolio.get("tokens", [])
        total_usd = portfolio.get("total_usd", 0)

        if total_usd == 0:
            return alerts

        # Concentration alert
        for token in tokens:
            pct = token["usd_value"] / total_usd
            if pct > self.CONCENTRATION_THRESHOLD:
                alerts.append({
                    "type": "CONCENTRATION",
                    "severity": "HIGH",
                    "message": f"⚠️ {token['symbol']} makes up {pct*100:.1f}% of your portfolio",
                    "asset": token["symbol"],
                    "value": pct
                })

        # Low portfolio value alert
        if total_usd < self.SMALL_PORTFOLIO_THRESHOLD:
            alerts.append({
                "type": "LOW_VALUE",
                "severity": "MEDIUM",
                "message": f"📉 Portfolio total is only ${total_usd:.2f} — limited risk buffer",
                "value": total_usd
            })

        # No stablecoin alert
        stablecoins = ["USDT", "USDC", "DAI", "BUSD", "TUSD"]
        has_stable = any(t["symbol"].upper() in stablecoins for t in tokens)
        if not has_stable:
            alerts.append({
                "type": "NO_STABLECOIN",
                "severity": "MEDIUM",
                "message": "💡 No stablecoin detected — consider holding some USDT/USDC as a safety buffer",
            })

        return alerts

    async def _calculate_score(self, portfolio: dict) -> int:
        tokens = portfolio.get("tokens", [])
        total_usd = portfolio.get("total_usd", 0)

        if total_usd == 0 or not tokens:
            return 50

        score = 0

        # Concentration risk (0-40 points)
        max_single_pct = max((t["usd_value"] / total_usd for t in tokens), default=0)
        if max_single_pct > 0.8:
            score += 40
        elif max_single_pct > 0.6:
            score += 28
        elif max_single_pct > 0.4:
            score += 15
        else:
            score += 5

        # Diversification (0-20 points)
        if len(tokens) == 1:
            score += 20
        elif len(tokens) <= 2:
            score += 10
        elif len(tokens) <= 4:
            score += 5

        # Portfolio size risk (0-20 points)
        if total_usd < 100:
            score += 20
        elif total_usd < 500:
            score += 10
        elif total_usd < 1000:
            score += 5

        # Stablecoin ratio (0-20 points)
        stablecoins = ["USDT", "USDC", "DAI", "BUSD"]
        stable_value = sum(t["usd_value"] for t in tokens if t["symbol"].upper() in stablecoins)
        stable_ratio = stable_value / total_usd
        if stable_ratio == 0:
            score += 15
        elif stable_ratio < 0.05:
            score += 10
        elif stable_ratio > 0.8:
            score += 5

        return min(score, 100)

    def _check_concentration(self, tokens: list, total_usd: float) -> dict:
        if not tokens or total_usd == 0:
            return {"passed": True, "detail": "No assets to check"}
        max_token = max(tokens, key=lambda t: t["usd_value"])
        pct = max_token["usd_value"] / total_usd
        passed = pct <= self.CONCENTRATION_THRESHOLD
        return {
            "passed": passed,
            "top_asset": max_token["symbol"],
            "concentration": f"{pct*100:.1f}%",
            "detail": f"{max_token['symbol']} is {pct*100:.1f}% of portfolio"
        }

    def _check_liquidity(self, tokens: list) -> dict:
        low_liq = [t for t in tokens if t["usd_value"] < self.LOW_LIQUIDITY_THRESHOLD]
        return {
            "passed": len(low_liq) == 0,
            "low_liquidity_assets": [t["symbol"] for t in low_liq],
            "detail": f"{len(low_liq)} asset(s) below ${self.LOW_LIQUIDITY_THRESHOLD} liquidity threshold"
        }

    def _check_diversification(self, tokens: list, total_usd: float) -> dict:
        count = len(tokens)
        return {
            "passed": count >= 3,
            "asset_count": count,
            "detail": f"Portfolio has {count} asset(s). Recommended minimum: 3"
        }

    def _check_stablecoin_ratio(self, tokens: list, total_usd: float) -> dict:
        stablecoins = ["USDT", "USDC", "DAI", "BUSD", "TUSD"]
        stable_value = sum(t["usd_value"] for t in tokens if t["symbol"].upper() in stablecoins)
        ratio = stable_value / total_usd if total_usd > 0 else 0
        return {
            "passed": 0.05 <= ratio <= 0.50,
            "ratio": f"{ratio*100:.1f}%",
            "stable_usd": stable_value,
            "detail": f"Stablecoin ratio: {ratio*100:.1f}% of portfolio"
        }

    def _generate_recommendations(self, checks: dict) -> list:
        recs = []
        if not checks["concentration"]["passed"]:
            asset = checks["concentration"].get("top_asset", "top asset")
            recs.append(f"Reduce {asset} concentration below 50% by diversifying into other assets")
        if not checks["diversification"]["passed"]:
            recs.append("Add at least 3 different assets to reduce single-asset exposure")
        if not checks["stablecoin_ratio"]["passed"]:
            recs.append("Hold 5–20% of portfolio in stablecoins (USDT/USDC) as a safety buffer")
        if not checks["liquidity"]["passed"]:
            assets = ", ".join(checks["liquidity"]["low_liquidity_assets"])
            recs.append(f"Consider exiting low-value positions: {assets}")
        if not recs:
            recs.append("Portfolio risk profile looks healthy. Continue monitoring.")
        return recs

    def _score_to_level(self, score: int) -> str:
        if score <= 30:
            return "LOW"
        elif score <= 60:
            return "MEDIUM"
        elif score <= 80:
            return "HIGH"
        return "CRITICAL"

    def _score_to_summary(self, score: int) -> str:
        level = self._score_to_level(score)
        summaries = {
            "LOW": "Portfolio is well-diversified with manageable risk.",
            "MEDIUM": "Some risk factors detected. Review recommendations.",
            "HIGH": "High risk detected. Action recommended.",
            "CRITICAL": "Critical risk level. Immediate attention required."
        }
        return summaries[level]
