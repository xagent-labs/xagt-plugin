WEIGHTS = {
    "dev_wallet": 0.30,
    "smart_money": 0.25,
    "holder_concentration": 0.20,
    "liquidity_withdrawal": 0.15,
    "trade_flow_toxicity": 0.10,
}


def compute_rug_score(signals: dict) -> float:
    return round(sum(signals.get(k, 0.0) * w for k, w in WEIGHTS.items()), 4)
