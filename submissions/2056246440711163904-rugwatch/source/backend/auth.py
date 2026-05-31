"""Wallet session auth — OKX wallet login IS the authentication."""

import logging
import secrets
import time
from dataclasses import dataclass
from typing import Optional

from fastapi import Header, HTTPException

import config

logger = logging.getLogger(__name__)


@dataclass
class SessionInfo:
    wallet_address: str
    email: str
    created_at: float
    expires_at: float


# In-memory session store (single server, no need for Redis)
_sessions: dict[str, SessionInfo] = {}


def create_session(wallet_address: str, email: str) -> str:
    """Create a new session after wallet verify, return the token."""
    token = secrets.token_hex(32)
    now = time.time()
    _sessions[token] = SessionInfo(
        wallet_address=wallet_address,
        email=email,
        created_at=now,
        expires_at=now + config.SESSION_TTL_HOURS * 3600,
    )
    logger.info("session created for %s (%s)", wallet_address[:10], email)
    return token


def get_session(token: str) -> Optional[SessionInfo]:
    """Look up a session, return None if expired or missing."""
    session = _sessions.get(token)
    if not session:
        return None
    if time.time() > session.expires_at:
        _sessions.pop(token, None)
        return None
    return session


def destroy_session(token: str) -> None:
    """Remove a session on logout."""
    session = _sessions.pop(token, None)
    if session:
        logger.info("session destroyed for %s", session.email)


def find_session_for_wallet(wallet_address: str) -> Optional[str]:
    """Return an existing valid session token for a wallet, or None."""
    now = time.time()
    for token, session in _sessions.items():
        if session.wallet_address == wallet_address and now < session.expires_at:
            return token
    return None


def destroy_sessions_for_wallet(wallet_address: str) -> None:
    """Remove all sessions for a wallet (used on logout when we don't have the token)."""
    to_remove = [k for k, v in _sessions.items() if v.wallet_address == wallet_address]
    for k in to_remove:
        _sessions.pop(k, None)


# ── FastAPI dependency ──────────────────────────────────────────────────────

async def require_auth(authorization: str = Header(default="")) -> SessionInfo:
    """Extract Bearer token from Authorization header, validate session."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid Authorization header")
    token = authorization[7:]
    session = get_session(token)
    if not session:
        raise HTTPException(401, "Invalid or expired session — reconnect wallet")
    return session
