import asyncio
import json
import logging
import subprocess
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import auth
import config
import db
from app_state import state
from auth import SessionInfo, require_auth
from logging_config import setup_logging
from monitor import start_monitoring
from scorer import compute_rug_score
from state import TokenState
import wallet as agentic_wallet

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(config.LOG_LEVEL)
    logger.info("RugWatch API starting up")

    await db.init_db()
    await state.load_from_db()

    # Restart monitoring loops for active, non-exited tokens
    for token in await state.get_all_tokens():
        if token.active and not token.exited:
            await start_monitoring(token)
            logger.info("resumed monitoring %s (%s)", token.symbol, token.address[:10])

    yield

    await db.close_db()
    logger.info("RugWatch API shutting down")


app = FastAPI(title="RugWatch API", version="1.0.0", lifespan=lifespan)

# CORS — allow frontend origin (configurable per environment)
_origins = [config.FRONTEND_URL]
if config.FRONTEND_URL != "http://localhost:3000":
    _origins.append("http://localhost:3000")  # always allow local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── global error handler ───────────────────────────────────────────────────

from fastapi.requests import Request
from fastapi.responses import JSONResponse


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ── request models ──────────────────────────────────────────────────────────

class AddTokenRequest(BaseModel):
    address: str
    chain: str = "xlayer"
    wallet_address: str = ""
    exit_threshold: float = 0.80
    warn_threshold: float = 0.65


class SimulateRugRequest(BaseModel):
    address: str
    dev_wallet: float = 1.0
    smart_money: float = 1.0
    holder_concentration: float = 1.0
    liquidity_withdrawal: float = 1.0
    trade_flow_toxicity: float = 1.0
    trigger_exit: bool = False


class WalletLoginRequest(BaseModel):
    email: str
    locale: str = "en-US"


class WalletVerifyRequest(BaseModel):
    code: str


class WalletBuyRequest(BaseModel):
    token_address: str
    chain: str = "xlayer"
    amount_usdc: str = "10"
    slippage: Optional[str] = None


# ── helpers ──────────────────────────────────────────────────────────────────

def _token_dict(token: TokenState) -> dict:
    return {
        "address": token.address,
        "chain": token.chain,
        "symbol": token.symbol,
        "name": token.name,
        "rug_score": token.rug_score,
        "signals": {
            "dev_wallet": token.signals.dev_wallet,
            "smart_money": token.signals.smart_money,
            "holder_concentration": token.signals.holder_concentration,
            "liquidity_withdrawal": token.signals.liquidity_withdrawal,
            "trade_flow_toxicity": token.signals.trade_flow_toxicity,
            "ts": token.signals.timestamp,
        },
        "score_history": token.score_history[-30:],
        "events": token.events[-15:],
        "exited": token.exited,
        "active": token.active,
        "exit_threshold": token.exit_threshold,
        "warn_threshold": token.warn_threshold,
        "dev_wallet_address": token.dev_wallet_address,
        "added_at": token.added_at,
    }


def _resolve_token_info(address: str, chain: str) -> tuple[str, str, Optional[str]]:
    """Returns (symbol, name, dev_wallet_address)."""
    symbol, name, dev_wallet = address[:8] + "...", "Unknown Token", None
    try:
        r = subprocess.run(
            ["onchainos", "token", "info", "--address", address, "--chain", chain],
            capture_output=True, text=True, timeout=30,
        )
        if r.returncode == 0:
            raw = json.loads(r.stdout).get("data", {})
            d = raw[0] if isinstance(raw, list) and raw else raw
            symbol = d.get("tokenSymbol") or d.get("symbol") or symbol
            name = d.get("tokenName") or d.get("name") or name
    except Exception:
        logger.warning("token info lookup failed for %s", address[:10])

    try:
        r = subprocess.run(
            ["onchainos", "token", "advanced-info", "--address", address, "--chain", chain],
            capture_output=True, text=True, timeout=30,
        )
        if r.returncode == 0:
            d = json.loads(r.stdout).get("data", {})
            dev_wallet = d.get("creatorAddress") or d.get("deployerAddress") or d.get("devAddress")
    except Exception:
        logger.warning("token advanced-info lookup failed for %s", address[:10])

    return symbol, name, dev_wallet


# ── routes ───────────────────────────────────────────────────────────────────

def _wallet_payload() -> dict:
    ws = agentic_wallet.get_status()
    # Always include a session token if wallet is logged in
    if ws.get("logged_in") and ws.get("evm_address"):
        existing = auth.find_session_for_wallet(ws["evm_address"])
        if not existing:
            existing = auth.create_session(ws["evm_address"], ws.get("email", ""))
        ws["session_token"] = existing
    return ws


@app.get("/api/status")
async def get_status():
    snapshot = await state.get_snapshot()
    return {
        "tokens": {addr: _token_dict(t) for addr, t in snapshot["tokens"].items()},
        "global_events": snapshot["events"],
        "wallet": _wallet_payload(),
    }


@app.get("/api/status/{address}")
async def get_token_status(address: str):
    addr = address.lower()
    token = await state.get_token(addr)
    if not token:
        raise HTTPException(404, "Token not found")
    return _token_dict(token)


@app.post("/api/watch")
async def add_token(req: AddTokenRequest, _session: SessionInfo = Depends(require_auth)):
    addr = req.address.lower()
    if await state.has_token(addr):
        raise HTTPException(400, "Token already watched")

    symbol, name, dev_wallet = _resolve_token_info(addr, req.chain)

    wallet_addr = req.wallet_address.strip()
    if not wallet_addr:
        ws = agentic_wallet.get_status()
        if not ws["logged_in"]:
            raise HTTPException(
                401,
                "Connect OKX Agentic Wallet first, or paste a wallet address for auto-exit.",
            )
        wallet_addr = ws["evm_address"]
        if not wallet_addr:
            raise HTTPException(400, "Logged in but no EVM address found — run onchainos wallet status")

    token = TokenState(
        address=addr,
        chain=req.chain,
        symbol=symbol,
        name=name,
        dev_wallet_address=dev_wallet,
        wallet_address=wallet_addr,
        exit_threshold=req.exit_threshold,
        warn_threshold=req.warn_threshold,
    )
    await state.add_token(token)
    await start_monitoring(token)

    return {
        "status": "watching",
        "address": addr,
        "symbol": symbol,
        "name": name,
        "dev_wallet": dev_wallet,
    }


@app.delete("/api/watch/{address}")
async def remove_token(address: str, _session: SessionInfo = Depends(require_auth)):
    addr = address.lower()
    token = await state.remove_token(addr)
    if not token:
        raise HTTPException(404, "Token not found")
    return {"status": "removed", "address": addr}


@app.post("/api/simulate-rug")
async def simulate_rug(req: SimulateRugRequest, _session: SessionInfo = Depends(require_auth)):
    """
    Injects artificial signal values for demo purposes.
    Lets judges see the full detection → warning → exit flow instantly.
    """
    addr = req.address.lower()
    token = await state.get_token(addr)
    if not token:
        raise HTTPException(404, "Token not found")

    sigs = {
        "dev_wallet": req.dev_wallet,
        "smart_money": req.smart_money,
        "holder_concentration": req.holder_concentration,
        "liquidity_withdrawal": req.liquidity_withdrawal,
        "trade_flow_toxicity": req.trade_flow_toxicity,
    }

    token.signals.dev_wallet = sigs["dev_wallet"]
    token.signals.smart_money = sigs["smart_money"]
    token.signals.holder_concentration = sigs["holder_concentration"]
    token.signals.liquidity_withdrawal = sigs["liquidity_withdrawal"]
    token.signals.trade_flow_toxicity = sigs["trade_flow_toxicity"]
    token.signals.timestamp = time.time()

    token.rug_score = compute_rug_score(sigs)
    token.score_history.append({"score": token.rug_score, "ts": time.time()})

    kind = "SIMULATE_EXIT" if token.rug_score >= token.exit_threshold else "SIMULATE_WARN" if token.rug_score >= token.warn_threshold else "SIMULATE"
    await state.emit_event(token, kind, f"Simulated rug: RugScore {token.rug_score:.2f}")

    if req.trigger_exit and token.rug_score >= token.exit_threshold and not token.exited:
        if token.wallet_address:
            import exit as exit_mod
            tx = await exit_mod.exit_position(token)
            await state.emit_event(token, "EXIT", f"Simulated exit executed — RugScore {token.rug_score:.2f}", tx)
            await state.mark_exited(token.address)
        else:
            await state.emit_event(token, "EXIT_BLOCKED", "Exit threshold crossed but no wallet configured")

    return {"rug_score": token.rug_score, "signals": sigs, "event": kind}


# ── kill switch ─────────────────────────────────────────────────────────────

@app.get("/api/kill-switch")
async def get_kill_switch(_session: SessionInfo = Depends(require_auth)):
    return {"kill_switch": state.kill_switch}


@app.post("/api/kill-switch")
async def toggle_kill_switch(_session: SessionInfo = Depends(require_auth)):
    state.kill_switch = not state.kill_switch
    logger.warning("Kill switch toggled to %s by %s", state.kill_switch, _session.email)
    return {"kill_switch": state.kill_switch}


# ── agentic wallet ───────────────────────────────────────────────────────────

@app.get("/api/wallet/status")
def wallet_status():
    ws = agentic_wallet.get_status()
    # If wallet is logged in on CLI but no active session exists, issue one
    # so the frontend can restore auth after a backend restart
    if ws.get("logged_in") and ws.get("evm_address"):
        existing = auth.find_session_for_wallet(ws["evm_address"])
        if not existing:
            token = auth.create_session(ws["evm_address"], ws.get("email", ""))
            ws["session_token"] = token
        else:
            ws["session_token"] = existing
    return ws


@app.post("/api/wallet/login")
def wallet_login(req: WalletLoginRequest):
    result = agentic_wallet.login(req.email.strip(), req.locale)
    if result["ok"]:
        state.pending_login_email = req.email.strip()
    else:
        raise HTTPException(400, result.get("error") or result.get("message") or "login failed")
    return {**result, "email": req.email.strip()}


@app.post("/api/wallet/verify")
def wallet_verify(req: WalletVerifyRequest):
    result = agentic_wallet.verify(req.code.strip())
    if not result["ok"]:
        raise HTTPException(400, result.get("error") or result.get("message") or "verification failed")
    state.pending_login_email = ""
    balance = agentic_wallet.get_balance()

    # Issue session token
    evm_address = result.get("evm_address", "")
    email = result.get("email", "")
    session_token = auth.create_session(evm_address, email)

    return {**result, "balance": balance, "session_token": session_token}


@app.post("/api/wallet/logout")
def wallet_logout(session: SessionInfo = Depends(require_auth)):
    state.pending_login_email = ""
    auth.destroy_sessions_for_wallet(session.wallet_address)
    result = agentic_wallet.logout()
    if not result["ok"]:
        raise HTTPException(400, result.get("error") or "logout failed")
    return result


@app.get("/api/wallet/balance")
def wallet_balance(chain: Optional[str] = None, _session: SessionInfo = Depends(require_auth)):
    ws = agentic_wallet.get_status()
    if not ws["logged_in"]:
        raise HTTPException(401, "Not logged in to OKX Agentic Wallet")
    return agentic_wallet.get_balance(chain)


@app.post("/api/wallet/buy")
async def wallet_buy(req: WalletBuyRequest, _session: SessionInfo = Depends(require_auth)):
    ws = agentic_wallet.get_status()
    if not ws["logged_in"]:
        raise HTTPException(401, "Connect OKX Agentic Wallet first")
    wallet_addr = ws["evm_address"]
    if not wallet_addr:
        raise HTTPException(400, "No EVM address on connected wallet")

    result = agentic_wallet.swap_buy(
        token_address=req.token_address.lower(),
        chain=req.chain,
        wallet=wallet_addr,
        readable_amount=req.amount_usdc,
        slippage=req.slippage,
    )
    if not result["ok"]:
        raise HTTPException(400, result.get("error") or "swap failed")

    ev = {
        "type": "BUY",
        "token": req.token_address.lower(),
        "symbol": "",
        "score": 0,
        "ts": time.time(),
        "message": f"Bought position — {req.amount_usdc} USDC → token",
        "tx_hash": result.get("swap_tx_hash", ""),
    }
    await state.append_event(ev)
    return result


@app.get("/api/events")
async def sse_stream():
    """Server-Sent Events stream for real-time event delivery."""
    async def stream():
        events = await state.get_global_events()
        last = len(events)
        try:
            while True:
                events = await state.get_global_events()
                if len(events) > last:
                    for ev in events[last:]:
                        yield f"data: {json.dumps(ev)}\n\n"
                    last = len(events)
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.debug("SSE client disconnected")

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/health")
async def health():
    snapshot = await state.get_snapshot()
    return {
        "status": "ok",
        "watched": len(snapshot["tokens"]),
        "events": len(snapshot["events"]),
    }
