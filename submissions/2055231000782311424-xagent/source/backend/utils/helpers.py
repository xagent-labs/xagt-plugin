"""Shared utility helpers for the ArgosX backend."""


def format_usd(value: float) -> str:
    """Format a float as a USD string."""
    return f"${value:,.2f}"


def truncate_address(address: str, chars: int = 6) -> str:
    """Shorten a wallet address for display: 0x1234...abcd."""
    if len(address) <= chars * 2:
        return address
    return f"{address[:chars]}...{address[-chars:]}"


def chain_name(chain_id: str) -> str:
    """Map chain ID to human-readable name."""
    names = {"1": "Ethereum", "56": "BNB Chain", "137": "Polygon", "42161": "Arbitrum", "10": "Optimism"}
    return names.get(str(chain_id), f"Chain {chain_id}")
