"""
Auto-Pilot Agent — Autonomous DeFi monitoring + execution loop.
Runs every 60 seconds, checks portfolio risk, evaluates signals,
executes user-defined rules automatically. Core X-Agent skill demo.
"""

import asyncio
from datetime import datetime
from agent.okx_skills import OKXSkills
from agent.risk_engine import RiskEngine
from agent.signal_engine import SignalEngine
from agent.swap_agent import SwapAgent


class AutoPilot:
    """
    Autonomous agent that monitors portfolio and executes rules without human input.
    Demonstrates X-Agent autonomous capability.
    """

    def __init__(self):
        self.okx = OKXSkills()
        self.risk = RiskEngine()
        self.signals = SignalEngine()
        self.swap = SwapAgent()
        self.running = False
        self.logs = []
        self.rules = []
        self.stats = {
            "ticks": 0,
            "swaps_executed": 0,
            "alerts_triggered": 0,
            "started_at": None
        }

    def add_rule(self, rule: dict):
        self.rules.append({
            **rule,
            "id": len(self.rules),
            "triggered": 0,
            "created_at": datetime.utcnow().isoformat()
        })

    def clear_rules(self):
        self.rules = []

    def log(self, msg: str, level: str = "INFO"):
        entry = {
            "time": datetime.utcnow().isoformat(),
            "level": level,
            "msg": msg
        }
        self.logs.append(entry)
        if len(self.logs) > 200:
            self.logs.pop(0)
        print(f"[AUTOPILOT] [{level}] {msg}")

    async def start(self, wallet_address: str):
        self.running = True
        self.stats["started_at"] = datetime.utcnow().isoformat()
        self.log(f"Auto-Pilot STARTED for wallet {wallet_address[:10]}...", "START")

        while self.running:
            try:
                await self._tick(wallet_address)
            except Exception as e:
                self.log(f"Tick error: {str(e)}", "ERROR")
            await asyncio.sleep(60)

    def stop(self):
        self.running = False
        self.log("Auto-Pilot STOPPED by user.", "STOP")

    async def _tick(self, wallet_address: str):
        self.stats["ticks"] += 1
        self.log(f"Tick #{self.stats['ticks']} — scanning portfolio...")

        portfolio = await self.okx.get_portfolio(wallet_address)
        risk = await self.risk.analyze(portfolio)
        signals = await self.signals.get_live_signals()

        total_usd = portfolio.get("total_usd", 0)
        risk_score = risk.get("score", 0)
        risk_level = risk.get("level", "UNKNOWN")

        self.log(f"Portfolio: ${total_usd:,.2f} | Risk: {risk_level} ({risk_score}/100)")

        if risk_score >= 80:
            self.stats["alerts_triggered"] += 1
            self.log("CRITICAL RISK DETECTED — auto-rebalancing triggered", "ALERT")
            result = await self.swap.execute(
                "swap 25% of ETH to USDT emergency rebalance",
                wallet_address
            )
            self.stats["swaps_executed"] += 1
            self.log(f"Emergency rebalance: {result.get('status', 'unknown')}", "ACTION")

        bullish = [s for s in signals if s["signal"] == "BULLISH" and s["change_24h_pct"] > 7]
        for sig in bullish[:1]:
            asset = sig["pair"].replace("-USDT", "")
            self.stats["alerts_triggered"] += 1
            self.log(f"BULLISH SIGNAL: {asset} surged +{sig['change_24h_pct']:.1f}% in 24h", "SIGNAL")

        bearish = [s for s in signals if s["signal"] == "BEARISH" and s["change_24h_pct"] < -7]
        for sig in bearish[:1]:
            asset = sig["pair"].replace("-USDT", "")
            self.stats["alerts_triggered"] += 1
            self.log(f"BEARISH SIGNAL: {asset} dropped {sig['change_24h_pct']:.1f}% in 24h", "SIGNAL")

        for rule in self.rules:
            try:
                result = await self.swap.execute(rule["action"], wallet_address)
                rule["triggered"] += 1
                self.stats["swaps_executed"] += 1
                self.log(
                    f"Rule '{rule.get('condition', 'custom')}' executed → {result.get('status')}",
                    "RULE"
                )
            except Exception as e:
                self.log(f"Rule execution error: {str(e)}", "ERROR")

        self.log(f"Tick #{self.stats['ticks']} complete.", "DONE")
