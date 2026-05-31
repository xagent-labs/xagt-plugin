"""Centralized configuration loaded from environment variables / .env file."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv(Path(__file__).parent / ".env")


def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default)


def _env_float(key: str, default: float) -> float:
    v = os.getenv(key)
    return float(v) if v else default


def _env_int(key: str, default: int) -> int:
    v = os.getenv(key)
    return int(v) if v else default


def _env_bool(key: str, default: bool) -> bool:
    v = os.getenv(key, "").lower()
    if v in ("1", "true", "yes"):
        return True
    if v in ("0", "false", "no"):
        return False
    return default


# ── Server ──────────────────────────────────────────────────────────────────
FRONTEND_URL: str = _env("FRONTEND_URL", "http://localhost:3000")
LOG_LEVEL: str = _env("LOG_LEVEL", "INFO")

# ── Database ────────────────────────────────────────────────────────────────
DATABASE_URL: str = _env("DATABASE_URL", f"sqlite:///{Path(__file__).parent / 'rugwatch.db'}")

# ── OKX OnchainOS ──────────────────────────────────────────────────────────
OKX_API_KEY: str = _env("OKX_API_KEY")
OKX_SECRET_KEY: str = _env("OKX_SECRET_KEY")
OKX_API_PASSPHRASE: str = _env("OKX_API_PASSPHRASE")
OKX_PROJECT_ID: str = _env("OKX_PROJECT_ID")

# ── Monitoring ──────────────────────────────────────────────────────────────
DEFAULT_CHAIN: str = _env("DEFAULT_CHAIN", "xlayer")
POLL_INTERVAL: int = _env_int("POLL_INTERVAL", 60)

# ── Exit Safety Rails ──────────────────────────────────────────────────────
MAX_LOSS_PCT: float = _env_float("MAX_LOSS_PCT", 50.0)
MAX_SLIPPAGE: str = _env("MAX_SLIPPAGE", "0.5")
KILL_SWITCH: bool = _env_bool("KILL_SWITCH", False)
DRY_RUN: bool = _env_bool("DRY_RUN", False)

# ── Auth ────────────────────────────────────────────────────────────────────
SESSION_TTL_HOURS: int = _env_int("SESSION_TTL_HOURS", 24)
