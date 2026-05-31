from dataclasses import dataclass, field
from typing import List, Optional
import time


@dataclass
class SignalSnapshot:
    dev_wallet: float = 0.0
    smart_money: float = 0.0
    holder_concentration: float = 0.0
    liquidity_withdrawal: float = 0.0
    trade_flow_toxicity: float = 0.0
    timestamp: float = field(default_factory=time.time)


@dataclass
class TokenState:
    address: str
    chain: str
    symbol: str = ""
    name: str = ""
    dev_wallet_address: Optional[str] = None
    wallet_address: str = ""
    exit_threshold: float = 0.80
    warn_threshold: float = 0.65
    baseline_liquidity: Optional[float] = None
    baseline_holder_top10_pct: Optional[float] = None
    rug_score: float = 0.0
    signals: SignalSnapshot = field(default_factory=SignalSnapshot)
    score_history: List[dict] = field(default_factory=list)
    events: List[dict] = field(default_factory=list)
    exited: bool = False
    active: bool = True
    added_at: float = field(default_factory=time.time)
