import asyncio
import json
import logging
import subprocess
import time
from typing import Optional

from state import TokenState

logger = logging.getLogger(__name__)

WINDOW_MINUTES = 10   # lookback for dev wallet / smart money signals
TRADE_WINDOW = 50     # last N trades for flow toxicity


def run_cli(args: list[str]) -> Optional[dict]:
    """Run an onchainos command, return parsed JSON or None on failure."""
    try:
        r = subprocess.run(
            ["onchainos"] + args,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if r.returncode == 0 and r.stdout.strip():
            return json.loads(r.stdout)
        if r.returncode != 0:
            logger.warning("onchainos %s failed (code %d): %s", args[0], r.returncode, r.stderr[:200])
    except subprocess.TimeoutExpired:
        logger.warning("onchainos %s timed out", args[0])
    except json.JSONDecodeError:
        logger.warning("onchainos %s returned invalid JSON", args[0])
    except FileNotFoundError:
        logger.error("onchainos CLI not found — run xagt setup first")
    return None


async def dev_wallet_signal(token: TokenState) -> float:
    """Score 0-1: has the dev wallet sold tokens recently?"""
    if not token.dev_wallet_address:
        return 0.0

    result = await asyncio.to_thread(
        run_cli,
        [
            "tracker", "activities",
            "--tracker-type", "multi_address",
            "--wallet-address", token.dev_wallet_address,
            "--trade-type", "2",
            "--chain", token.chain,
        ],
    )
    if not result:
        return 0.0

    # data can be a list or dict with "trades" key
    raw = result.get("data", [])
    trades = raw.get("trades", raw) if isinstance(raw, dict) else raw

    cutoff_ms = (time.time() - WINDOW_MINUTES * 60) * 1000
    sells = [
        t for t in trades
        if _trade_time(t) >= cutoff_ms
        and t.get("tokenContractAddress", "").lower() == token.address.lower()
    ]
    if not sells:
        return 0.0

    most_recent_ms = max(_trade_time(t) for t in sells)
    age_minutes = (time.time() * 1000 - most_recent_ms) / 60_000
    return max(0.3, 1.0 - (age_minutes / WINDOW_MINUTES) * 0.7)


async def smart_money_signal(token: TokenState) -> float:
    """Score 0-1: how many distinct smart money wallets have sold this token?"""
    result = await asyncio.to_thread(
        run_cli,
        [
            "tracker", "activities",
            "--tracker-type", "smart_money",
            "--trade-type", "2",
            "--chain", token.chain,
        ],
    )
    if not result:
        return 0.0

    raw = result.get("data", [])
    trades = raw.get("trades", raw) if isinstance(raw, dict) else raw

    cutoff_ms = (time.time() - 30 * 60) * 1000
    token_sells = [
        t for t in trades
        if t.get("tokenContractAddress", "").lower() == token.address.lower()
        and _trade_time(t) >= cutoff_ms
    ]
    unique_wallets = {t.get("walletAddress") or t.get("userAddress") for t in token_sells}
    unique_wallets.discard(None)
    return min(1.0, len(unique_wallets) / 5)


async def holder_concentration_signal(token: TokenState) -> float:
    """Score 0-1: has the top-holder concentration spiked vs baseline?"""
    result = await asyncio.to_thread(
        run_cli,
        [
            "token", "cluster-overview",
            "--address", token.address,
            "--chain", token.chain,
        ],
    )
    if not result:
        return 0.0

    data = result.get("data", {})

    # direct risk field
    if "rugPullRisk" in data:
        return float(data["rugPullRisk"])

    # parse top holder percent — API returns top100HoldingsPercent as decimal (0.997)
    # or top10HolderPercent as percentage (96.6)
    top = 0.0
    if "top100HoldingsPercent" in data:
        v = float(data["top100HoldingsPercent"])
        top = v * 100 if v <= 1 else v  # normalize: 0.997 → 99.7
    elif "top10HolderPercent" in data:
        v = float(data["top10HolderPercent"])
        top = v * 100 if v <= 1 else v

    # also check holderSameFundSourcePercent — high value = coordinated wallets
    same_fund = float(data.get("holderSameFundSourcePercent", 0) or 0)
    same_fund_pct = same_fund * 100 if same_fund <= 1 else same_fund

    if token.baseline_holder_top10_pct is None:
        token.baseline_holder_top10_pct = top
        # on first read, still score if concentration is extreme
        if top > 80:
            return min(1.0, (top - 50) / 50)
        if same_fund_pct > 50:
            return min(1.0, same_fund_pct / 100)
        return 0.0

    delta = top - token.baseline_holder_top10_pct
    # base score from concentration increase
    score = max(0.0, min(1.0, delta / 20.0))
    # boost if absolute concentration is very high
    if top > 90:
        score = max(score, 0.7)
    elif top > 70:
        score = max(score, 0.4)
    # boost from coordinated wallets
    if same_fund_pct > 50:
        score = max(score, min(1.0, same_fund_pct / 100))
    return score


async def liquidity_signal(token: TokenState) -> float:
    """Score 0-1: how much liquidity has been withdrawn vs the baseline?"""
    result = await asyncio.to_thread(
        run_cli,
        [
            "token", "liquidity",
            "--address", token.address,
            "--chain", token.chain,
        ],
    )
    if not result:
        return 0.0

    pools = result.get("data", [])
    if isinstance(pools, dict):
        pools = [pools]
    # API uses "liquidityUsd" not "liquidity"
    total = sum(float(p.get("liquidityUsd", 0) or p.get("liquidity", 0)) for p in pools)

    if token.baseline_liquidity is None:
        token.baseline_liquidity = total
        return 0.0

    if token.baseline_liquidity == 0:
        return 0.0

    drop = (token.baseline_liquidity - total) / token.baseline_liquidity
    return max(0.0, min(1.0, drop))


async def trade_flow_signal(token: TokenState) -> float:
    """Score 0-1: is sell pressure dominating the recent trade window?"""
    result = await asyncio.to_thread(
        run_cli,
        [
            "token", "trades",
            "--address", token.address,
            "--chain", token.chain,
            "--limit", str(TRADE_WINDOW),
        ],
    )
    if not result:
        return 0.0

    trades = result.get("data", [])
    if not trades:
        return 0.0

    buy_vol = 0.0
    sell_vol = 0.0
    for t in trades:
        vol = float(t.get("volume", 0) or t.get("amountUsd", 0) or 0)
        trade_type = t.get("type", t.get("tradeType", ""))
        if trade_type in ("buy", 1, "1"):
            buy_vol += vol
        elif trade_type in ("sell", 2, "2"):
            sell_vol += vol

    total = buy_vol + sell_vol
    if total == 0:
        return 0.0

    sell_ratio = sell_vol / total
    # above 50% sell pressure starts scoring; 100% sell = 1.0
    return max(0.0, (sell_ratio - 0.5) / 0.5)


def _trade_time(t: dict) -> float:
    """Extract trade timestamp in ms from various field names."""
    return float(t.get("tradeTime", 0) or t.get("timestamp", 0) or t.get("time", 0) or 0)


async def fetch_all_signals(token: TokenState) -> dict:
    dev_w, sm, hc, liq, tf = await asyncio.gather(
        dev_wallet_signal(token),
        smart_money_signal(token),
        holder_concentration_signal(token),
        liquidity_signal(token),
        trade_flow_signal(token),
        return_exceptions=True,
    )
    results = {
        "dev_wallet": dev_w,
        "smart_money": sm,
        "holder_concentration": hc,
        "liquidity_withdrawal": liq,
        "trade_flow_toxicity": tf,
    }
    for name, val in results.items():
        if isinstance(val, Exception):
            logger.warning("signal %s failed for %s: %s", name, token.address[:8], val)
            results[name] = 0.0
    return results
