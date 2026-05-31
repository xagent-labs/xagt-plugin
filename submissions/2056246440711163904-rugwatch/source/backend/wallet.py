"""OKX Agentic Wallet — wraps onchainos wallet CLI."""

import json
import subprocess
from typing import Any, Optional


def _run(args: list[str], timeout: int = 60) -> tuple[int, Optional[dict], str]:
    try:
        r = subprocess.run(
            ["onchainos"] + args,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        stderr = (r.stderr or "").strip()
        if r.stdout.strip():
            try:
                return r.returncode, json.loads(r.stdout), stderr
            except json.JSONDecodeError:
                return r.returncode, None, r.stdout.strip() or stderr
        return r.returncode, None, stderr
    except FileNotFoundError:
        return 127, None, "onchainos CLI not found — run xagt setup first"
    except subprocess.TimeoutExpired:
        return 124, None, "command timed out"


def _data(payload: Optional[dict]) -> dict:
    if not payload:
        return {}
    return payload.get("data", payload)


def get_status() -> dict:
    code, payload, err = _run(["wallet", "status"])
    d = _data(payload)
    logged_in = bool(d.get("loggedIn") or d.get("isLogin"))
    evm = ""
    for addr in d.get("addressList", []) or []:
        if isinstance(addr, dict):
            a = addr.get("address", "")
            if a.startswith("0x") and not evm:
                evm = a
        elif isinstance(addr, str) and addr.startswith("0x"):
            evm = addr
            break
    if not evm:
        evm = d.get("evmAddress") or d.get("address") or ""

    # wallet status doesn't return addresses — fetch from wallet addresses
    if not evm and logged_in:
        _, addr_payload, _ = _run(["wallet", "addresses"])
        ad = _data(addr_payload)
        # check evm list first, then xlayer
        for key in ("evm", "xlayer"):
            for entry in ad.get(key, []) or []:
                if isinstance(entry, dict):
                    a = entry.get("address", "")
                    if a.startswith("0x"):
                        evm = a
                        break
            if evm:
                break

    return {
        "ok": code == 0,
        "logged_in": logged_in,
        "email": d.get("email", ""),
        "account_name": d.get("accountName", ""),
        "account_id": d.get("accountId", ""),
        "login_type": d.get("loginType", ""),
        "evm_address": evm,
        "is_new": d.get("isNew", False),
        "error": err if code != 0 else "",
        "raw": d,
    }


def login(email: str, locale: str = "en-US") -> dict:
    code, payload, err = _run(["wallet", "login", email, "--locale", locale])
    d = _data(payload)
    return {
        "ok": code == 0,
        "message": d.get("message") or ("verification code sent" if code == 0 else err),
        "error": err if code != 0 else "",
    }


def verify(code: str) -> dict:
    exit_code, payload, err = _run(["wallet", "verify", code])
    d = _data(payload)
    status = get_status()
    return {
        "ok": exit_code == 0,
        "logged_in": status["logged_in"],
        "evm_address": status["evm_address"],
        "email": status["email"],
        "is_new": d.get("isNew", False),
        "message": d.get("message") or ("logged in" if exit_code == 0 else err),
        "error": err if exit_code != 0 else "",
    }


def logout() -> dict:
    code, _, err = _run(["wallet", "logout"])
    return {"ok": code == 0, "error": err if code != 0 else ""}


def get_balance(chain: Optional[str] = None) -> dict:
    args = ["wallet", "balance"]
    if chain:
        args += ["--chain", chain]
    code, payload, err = _run(args)
    d = _data(payload)
    total = d.get("totalAssetUsd") or d.get("totalUsd") or d.get("totalValueUsd") or "0"
    assets = d.get("tokenAssets") or d.get("assets") or []
    return {
        "ok": code == 0,
        "total_usd": str(total),
        "assets": assets,
        "error": err if code != 0 else "",
    }


def get_addresses(chain: Optional[str] = None) -> dict:
    args = ["wallet", "addresses"]
    if chain:
        args += ["--chain", chain]
    code, payload, err = _run(args)
    d = _data(payload)
    return {
        "ok": code == 0,
        "addresses": d.get("addressList") or d.get("addresses") or d,
        "error": err if code != 0 else "",
    }


def swap_buy(
    token_address: str,
    chain: str,
    wallet: str,
    readable_amount: str,
    slippage: Optional[str] = None,
) -> dict:
    """Buy token with USDC via OKX DEX aggregator."""
    args = [
        "swap", "execute",
        "--from", "usdc",
        "--to", token_address,
        "--readable-amount", readable_amount,
        "--chain", chain,
        "--wallet", wallet,
        "--gas-level", "fast",
        "--force",
    ]
    if slippage:
        args += ["--slippage", slippage]
    code, payload, err = _run(args, timeout=120)
    d = _data(payload)
    return {
        "ok": code == 0,
        "swap_tx_hash": d.get("swapTxHash", ""),
        "to_amount": d.get("toAmount", ""),
        "price_impact": d.get("priceImpact", ""),
        "error": err if code != 0 else "",
        "raw": d,
    }
