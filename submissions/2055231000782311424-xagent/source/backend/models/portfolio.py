"""Data models for portfolio requests and responses."""
from pydantic import BaseModel
from typing import Optional


class PortfolioRequest(BaseModel):
    wallet_address: str
    chains: Optional[list[str]] = ["1", "56", "137"]


class Token(BaseModel):
    symbol: str
    balance: float
    usd_value: float
    chain: str
    contract: str


class Portfolio(BaseModel):
    wallet: str
    tokens: list[Token]
    total_usd: float
    token_count: int
