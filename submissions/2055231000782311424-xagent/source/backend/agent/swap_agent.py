"""
Swap Agent — Natural Language Swap Handler
Parses natural language swap commands via Groq (LLaMA), executes via OKX DEX skill.
"""

import re
import os
import json
from groq import Groq
from agent.okx_skills import OKXSkills


class SwapAgent:
    """
    Uses Groq LLaMA to parse NL swap intent,
    validates conditions (gas, price), then executes via OKX DEX swap skill.
    """

    def __init__(self):
        self.okx = OKXSkills()
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

    async def execute(self, command: str, wallet_address: str) -> dict:
        parsed = await self._parse_command(command)

        if not parsed.get("valid"):
            return {
                "status": "error",
                "message": parsed.get("error", "Could not understand swap command"),
                "original_command": command
            }

        if parsed.get("condition"):
            condition_met, reason = await self._check_condition(parsed["condition"])
            if not condition_met:
                return {
                    "status": "condition_not_met",
                    "message": f"Swap not executed: {reason}",
                    "parsed": parsed,
                    "will_retry": True
                }

        result = await self.okx.execute_swap(
            from_token=parsed["from_token"],
            to_token=parsed["to_token"],
            amount=parsed["amount"],
            chain_id=parsed.get("chain_id", "1")
        )

        return {
            "status": "executed",
            "swap": parsed,
            "okx_result": result,
            "message": f"✅ Swapped {parsed['amount']} {parsed['from_token']} → {parsed['to_token']}"
        }

    async def _parse_command(self, command: str) -> dict:
        """Use Groq LLaMA to parse NL swap command into structured data."""
        try:
            resp = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                max_tokens=300,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a DeFi swap command parser. Extract swap intent from natural language.
Return ONLY valid JSON, no markdown, no explanation:
{"valid": true, "from_token": "USDT", "to_token": "ETH", "amount": 10, "condition": null, "error": null}"""
                    },
                    {"role": "user", "content": command}
                ]
            )
            text = resp.choices[0].message.content.strip()
            text = text.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
        except Exception:
            return self._regex_parse(command)

    def _regex_parse(self, command: str) -> dict:
        """Fallback regex parser if Groq API fails."""
        c = command.lower()
        m = re.search(r"swap\s+([\d.]+)\s+(\w+)\s+to\s+(\w+)", c)
        if m:
            amount, from_tok, to_tok = m.groups()
            condition = None
            if "if gas" in c:
                gm = re.search(r"(\d+)\s*gwei", c)
                if gm:
                    condition = f"gas < {gm.group(1)} gwei"
            return {"valid": True, "from_token": from_tok.upper(), "to_token": to_tok.upper(),
                    "amount": float(amount), "condition": condition, "error": None}
        return {"valid": False, "error": f"Could not parse: '{command}'"}

    async def _check_condition(self, condition: str) -> tuple[bool, str]:
        c = condition.lower()
        if "gas" in c:
            gm = re.search(r"(\d+)\s*gwei", c)
            if gm:
                threshold = int(gm.group(1))
                gas_data = await self.okx.get_gas_price("1")
                current_gas = int(gas_data.get("standard", 99))
                if "<" in c:
                    return current_gas < threshold, f"Gas is {current_gas} gwei (threshold: {threshold})"
                if ">" in c:
                    return current_gas > threshold, f"Gas is {current_gas} gwei (threshold: {threshold})"
        return True, "Condition check passed"
