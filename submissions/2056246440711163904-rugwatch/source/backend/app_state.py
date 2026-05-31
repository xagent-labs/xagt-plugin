"""Thread-safe application state with asyncio locks and DB persistence."""

import asyncio
import logging
import time
from typing import Optional

import db
from state import TokenState, SignalSnapshot

logger = logging.getLogger(__name__)


class AppState:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self.watched_tokens: dict[str, TokenState] = {}
        self.global_events: list[dict] = []
        self.pending_login_email: str = ""
        self.kill_switch: bool = False

    # ── Lifecycle ───────────────────────────────────────────────────────────

    async def load_from_db(self) -> None:
        async with self._lock:
            self.watched_tokens = await db.load_tokens()
            self.global_events = await db.load_events(limit=200)
            logger.info(
                "state restored: %d tokens, %d events",
                len(self.watched_tokens),
                len(self.global_events),
            )

    # ── Token access ────────────────────────────────────────────────────────

    async def get_token(self, address: str) -> Optional[TokenState]:
        async with self._lock:
            return self.watched_tokens.get(address)

    async def has_token(self, address: str) -> bool:
        async with self._lock:
            return address in self.watched_tokens

    async def add_token(self, token: TokenState) -> None:
        async with self._lock:
            self.watched_tokens[token.address] = token
        await db.save_token(token)
        logger.info("watching %s (%s)", token.symbol, token.address[:10])

    async def remove_token(self, address: str) -> Optional[TokenState]:
        async with self._lock:
            token = self.watched_tokens.pop(address, None)
        if token:
            token.active = False
            await db.deactivate_token(address)
            logger.info("removed %s", address[:10])
        return token

    async def get_snapshot(self) -> dict:
        """Return a copy of current state for the status endpoint."""
        async with self._lock:
            tokens = {addr: t for addr, t in self.watched_tokens.items()}
            events = self.global_events[-30:]
        return {"tokens": tokens, "events": events}

    async def get_all_tokens(self) -> list[TokenState]:
        async with self._lock:
            return list(self.watched_tokens.values())

    # ── Score updates (called from monitor loop) ────────────────────────────

    async def update_score(
        self, address: str, rug_score: float, signals: dict, score_history: list
    ) -> None:
        await db.update_token_score(address, rug_score, signals, score_history)

    async def mark_exited(self, address: str) -> None:
        async with self._lock:
            token = self.watched_tokens.get(address)
            if token:
                token.exited = True
        await db.mark_exited(address)

    # ── Events ──────────────────────────────────────────────────────────────

    async def emit_event(
        self, token: TokenState, kind: str, message: str, tx_hash: str = ""
    ) -> dict:
        ev = {
            "type": kind,
            "token": token.address,
            "symbol": token.symbol,
            "score": token.rug_score,
            "ts": time.time(),
            "message": message,
            "tx_hash": tx_hash,
        }
        async with self._lock:
            token.events.append(ev)
            self.global_events.append(ev)
        await db.save_event(ev)
        return ev

    async def append_event(self, ev: dict) -> None:
        async with self._lock:
            self.global_events.append(ev)
        await db.save_event(ev)

    async def get_global_events(self) -> list[dict]:
        async with self._lock:
            return list(self.global_events)


# Singleton instance
state = AppState()
