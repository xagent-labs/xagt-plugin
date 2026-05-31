"""Autonomous exit — swaps full token balance to USDC with safety rails."""

import asyncio
import json
import logging
import subprocess

import config
from state import TokenState

logger = logging.getLogger(__name__)


async def exit_position(token: TokenState, kill_switch: bool = False, dry_run: bool | None = None) -> str:
    """
    Exit the monitored position by swapping full token balance to USDC.

    Safety rails:
    - kill_switch: blocks execution entirely
    - dry_run: logs the command without executing (falls back to config.DRY_RUN)
    - slippage guard: uses config.MAX_SLIPPAGE (default 0.5%)

    Returns tx hash on success, or a status string.
    """
    if dry_run is None:
        dry_run = config.DRY_RUN

    # ── Kill switch ─────────────────────────────────────────────────────────
    if kill_switch:
        logger.warning("EXIT BLOCKED by kill switch — %s (%s) score=%.2f",
                        token.symbol, token.address[:10], token.rug_score)
        return "kill_switch_active"

    # ── Get balance ─────────────────────────────────────────────────────────
    balance = await _get_balance(token)
    if not balance or float(balance) == 0:
        logger.warning("EXIT skipped — no balance for %s (%s)",
                        token.symbol, token.address[:10])
        return "no_balance"

    # ── Build swap command ──────────────────────────────────────────────────
    cmd = [
        "onchainos", "swap", "execute",
        "--from", token.address,
        "--to", "usdc",
        "--readable-amount", balance,
        "--chain", token.chain,
        "--wallet", token.wallet_address,
        "--gas-level", "fast",
        "--slippage", config.MAX_SLIPPAGE,
        "--force",
    ]

    logger.info(
        "EXIT %s — %s (%s) balance=%s score=%.2f slippage=%s%s",
        "DRY RUN" if dry_run else "EXECUTING",
        token.symbol, token.address[:10], balance,
        token.rug_score, config.MAX_SLIPPAGE,
        f" kill_switch=off" if not kill_switch else "",
    )

    # ── Dry run ─────────────────────────────────────────────────────────────
    if dry_run:
        logger.info("DRY RUN command: %s", " ".join(cmd))
        return "dry_run"

    # ── Execute swap ────────────────────────────────────────────────────────
    try:
        result = await asyncio.to_thread(
            subprocess.run,
            cmd,
            capture_output=True,
            text=True,
            timeout=90,
        )
    except subprocess.TimeoutExpired:
        logger.error("EXIT timed out for %s (%s)", token.symbol, token.address[:10])
        return "timeout"

    if result.returncode == 0:
        try:
            data = json.loads(result.stdout)
            tx_hash = data.get("data", {}).get("swapTxHash", "broadcast_pending")
            logger.info("EXIT success — %s tx=%s", token.symbol, tx_hash)
            return tx_hash
        except (json.JSONDecodeError, KeyError):
            logger.warning("EXIT broadcast sent but couldn't parse tx hash for %s", token.symbol)
            return "broadcast_pending"

    logger.error("EXIT failed for %s — %s", token.symbol, result.stderr[:200])
    return f"failed: {result.stderr[:200]}"


async def _get_balance(token: TokenState) -> str:
    try:
        r = await asyncio.to_thread(
            subprocess.run,
            [
                "onchainos", "wallet", "balance",
                "--chain", token.chain,
                "--token-address", token.address,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except subprocess.TimeoutExpired:
        logger.warning("balance check timed out for %s", token.address[:10])
        return ""

    if r.returncode != 0:
        logger.warning("balance check failed for %s: %s", token.address[:10], r.stderr[:100])
        return ""

    try:
        data = json.loads(r.stdout)
        assets = data.get("data", {}).get("tokenAssets", [])
        for a in assets:
            if a.get("tokenContractAddress", "").lower() == token.address.lower():
                return a.get("balance", "0")
    except (json.JSONDecodeError, KeyError):
        logger.warning("balance parse failed for %s", token.address[:10])
    return ""
