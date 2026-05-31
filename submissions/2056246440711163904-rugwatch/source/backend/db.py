"""SQLite persistence layer using aiosqlite."""

import json
import logging
import time
from pathlib import Path
from typing import Optional

import aiosqlite

import config
from state import SignalSnapshot, TokenState

logger = logging.getLogger(__name__)

# Extract file path from sqlite:/// URL
_db_path: str = config.DATABASE_URL.replace("sqlite:///", "")

_conn: Optional[aiosqlite.Connection] = None


async def init_db() -> None:
    """Create tables if they don't exist and store the connection."""
    global _conn
    path = Path(_db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    _conn = await aiosqlite.connect(str(path))
    _conn.row_factory = aiosqlite.Row
    await _conn.execute("PRAGMA journal_mode=WAL")
    await _conn.executescript(_SCHEMA)
    await _conn.commit()
    logger.info("database initialized at %s", path)


async def close_db() -> None:
    global _conn
    if _conn:
        await _conn.close()
        _conn = None


def _get_conn() -> aiosqlite.Connection:
    if _conn is None:
        raise RuntimeError("database not initialized — call init_db() first")
    return _conn


# ── Schema ──────────────────────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS tokens (
    address       TEXT PRIMARY KEY,
    chain         TEXT NOT NULL,
    symbol        TEXT DEFAULT '',
    name          TEXT DEFAULT '',
    dev_wallet_address TEXT,
    wallet_address TEXT DEFAULT '',
    exit_threshold REAL DEFAULT 0.80,
    warn_threshold REAL DEFAULT 0.65,
    baseline_liquidity REAL,
    baseline_holder_top10_pct REAL,
    rug_score     REAL DEFAULT 0.0,
    signals_json  TEXT DEFAULT '{}',
    score_history_json TEXT DEFAULT '[]',
    exited        INTEGER DEFAULT 0,
    active        INTEGER DEFAULT 1,
    added_at      REAL,
    updated_at    REAL
);

CREATE TABLE IF NOT EXISTS events (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    type     TEXT NOT NULL,
    token    TEXT,
    symbol   TEXT,
    score    REAL,
    ts       REAL,
    message  TEXT,
    tx_hash  TEXT DEFAULT ''
);
"""


# ── Token CRUD ──────────────────────────────────────────────────────────────

async def save_token(token: TokenState) -> None:
    """Insert or replace a token row."""
    conn = _get_conn()
    signals = {
        "dev_wallet": token.signals.dev_wallet,
        "smart_money": token.signals.smart_money,
        "holder_concentration": token.signals.holder_concentration,
        "liquidity_withdrawal": token.signals.liquidity_withdrawal,
        "trade_flow_toxicity": token.signals.trade_flow_toxicity,
        "timestamp": token.signals.timestamp,
    }
    await conn.execute(
        """INSERT OR REPLACE INTO tokens
           (address, chain, symbol, name, dev_wallet_address, wallet_address,
            exit_threshold, warn_threshold, baseline_liquidity, baseline_holder_top10_pct,
            rug_score, signals_json, score_history_json, exited, active, added_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            token.address, token.chain, token.symbol, token.name,
            token.dev_wallet_address, token.wallet_address,
            token.exit_threshold, token.warn_threshold,
            token.baseline_liquidity, token.baseline_holder_top10_pct,
            token.rug_score, json.dumps(signals), json.dumps(token.score_history[-120:]),
            int(token.exited), int(token.active), token.added_at, time.time(),
        ),
    )
    await conn.commit()


async def load_tokens() -> dict[str, TokenState]:
    """Load all active tokens from the database."""
    conn = _get_conn()
    tokens: dict[str, TokenState] = {}
    async with conn.execute("SELECT * FROM tokens WHERE active = 1") as cursor:
        async for row in cursor:
            sigs = json.loads(row["signals_json"] or "{}")
            token = TokenState(
                address=row["address"],
                chain=row["chain"],
                symbol=row["symbol"] or "",
                name=row["name"] or "",
                dev_wallet_address=row["dev_wallet_address"],
                wallet_address=row["wallet_address"] or "",
                exit_threshold=row["exit_threshold"],
                warn_threshold=row["warn_threshold"],
                baseline_liquidity=row["baseline_liquidity"],
                baseline_holder_top10_pct=row["baseline_holder_top10_pct"],
                rug_score=row["rug_score"] or 0.0,
                signals=SignalSnapshot(
                    dev_wallet=sigs.get("dev_wallet", 0.0),
                    smart_money=sigs.get("smart_money", 0.0),
                    holder_concentration=sigs.get("holder_concentration", 0.0),
                    liquidity_withdrawal=sigs.get("liquidity_withdrawal", 0.0),
                    trade_flow_toxicity=sigs.get("trade_flow_toxicity", 0.0),
                    timestamp=sigs.get("timestamp", 0.0),
                ),
                score_history=json.loads(row["score_history_json"] or "[]"),
                exited=bool(row["exited"]),
                active=True,
                added_at=row["added_at"] or time.time(),
            )
            tokens[token.address] = token
    logger.info("loaded %d active tokens from database", len(tokens))
    return tokens


async def update_token_score(address: str, rug_score: float, signals: dict, score_history: list) -> None:
    """Update score and signals after a monitoring cycle."""
    conn = _get_conn()
    await conn.execute(
        """UPDATE tokens
           SET rug_score = ?, signals_json = ?, score_history_json = ?, updated_at = ?
           WHERE address = ?""",
        (rug_score, json.dumps(signals), json.dumps(score_history[-120:]), time.time(), address),
    )
    await conn.commit()


async def mark_exited(address: str) -> None:
    conn = _get_conn()
    await conn.execute(
        "UPDATE tokens SET exited = 1, updated_at = ? WHERE address = ?",
        (time.time(), address),
    )
    await conn.commit()


async def deactivate_token(address: str) -> None:
    conn = _get_conn()
    await conn.execute(
        "UPDATE tokens SET active = 0, updated_at = ? WHERE address = ?",
        (time.time(), address),
    )
    await conn.commit()


# ── Events ──────────────────────────────────────────────────────────────────

async def save_event(event: dict) -> None:
    conn = _get_conn()
    await conn.execute(
        "INSERT INTO events (type, token, symbol, score, ts, message, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            event.get("type", ""),
            event.get("token", ""),
            event.get("symbol", ""),
            event.get("score", 0.0),
            event.get("ts", time.time()),
            event.get("message", ""),
            event.get("tx_hash", ""),
        ),
    )
    await conn.commit()


async def load_events(limit: int = 100) -> list[dict]:
    conn = _get_conn()
    rows = []
    async with conn.execute(
        "SELECT type, token, symbol, score, ts, message, tx_hash FROM events ORDER BY ts DESC LIMIT ?",
        (limit,),
    ) as cursor:
        async for row in cursor:
            rows.append({
                "type": row["type"],
                "token": row["token"],
                "symbol": row["symbol"],
                "score": row["score"],
                "ts": row["ts"],
                "message": row["message"],
                "tx_hash": row["tx_hash"],
            })
    rows.reverse()  # chronological order
    logger.info("loaded %d events from database", len(rows))
    return rows
