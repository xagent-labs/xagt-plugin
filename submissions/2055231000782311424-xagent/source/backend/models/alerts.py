"""Data models for alerts and swap requests."""
from pydantic import BaseModel
from typing import Optional


class SwapRequest(BaseModel):
    command: str
    wallet_address: str


class Alert(BaseModel):
    type: str
    severity: str
    message: str
    asset: Optional[str] = None
    value: Optional[float] = None


class AIRequest(BaseModel):
    message: str
    wallet_address: str
