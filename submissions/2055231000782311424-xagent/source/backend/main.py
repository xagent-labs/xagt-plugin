"""
ArgosX — FastAPI Backend
Autonomous DeFi agent server. Wallet monitoring, risk analysis, signals,
NL swaps, Auto-Pilot, What-If Simulator, Oracle AI with memory, and PDF reports.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import asyncio
import json as json_lib
from dotenv import load_dotenv

from agent.autopilot import AutoPilot
from agent.okx_skills import OKXSkills
from agent.risk_engine import RiskEngine
from agent.signal_engine import SignalEngine
from agent.swap_agent import SwapAgent
from models.portfolio import PortfolioRequest
from models.alerts import SwapRequest
from groq import Groq as GroqClient

load_dotenv()

app = FastAPI(
    title="ArgosX",
    description="Autonomous AI agent for DeFi portfolio monitoring, risk analysis, signals, NL swaps, and Auto-Pilot",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engines
okx = OKXSkills()
risk_engine = RiskEngine()
signal_engine = SignalEngine()
swap_agent = SwapAgent()

# Auto-Pilot instance
autopilot = AutoPilot()
autopilot_task = None

# Strategy templates
STRATEGIES = {
    "conservative": {
        "name": "Conservative Shield",
        "description": "Keeps 40%+ in stablecoins, auto-sells on HIGH risk detection",
        "color": "#00ff88",
        "rules": [
            {"condition": "risk > 70", "action": "swap 30 USDT worth of ETH to USDT safety rebalance"},
            {"condition": "stablecoin < 40%", "action": "swap 50 USDT to USDC rebalance"}
        ]
    },
    "momentum": {
        "name": "Momentum Chaser",
        "description": "Buys bullish assets surging >5%, exits on bearish signals",
        "color": "#00d4ff",
        "rules": [
            {"condition": "ETH bullish > 5%", "action": "swap 50 USDT to ETH momentum buy"},
            {"condition": "BNB bearish < -5%", "action": "swap BNB to USDT exit position"}
        ]
    },
    "yield": {
        "name": "Yield Maximizer",
        "description": "Rotates into highest-momentum assets, exits to safety on critical risk",
        "color": "#ff8800",
        "rules": [
            {"condition": "top signal bullish", "action": "swap 100 USDT to ETH yield position"},
            {"condition": "risk CRITICAL", "action": "swap all volatile to USDT emergency exit"}
        ]
    }
}

# In-memory conversation history for Oracle AI memory
conversation_history = {}


# ─────────────────────────────────────────────
# CORE ENDPOINTS
# ─────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "ArgosX is live", "version": "2.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy", "okx_connected": okx.is_connected()}


@app.get("/portfolio/{wallet_address}")
async def get_portfolio(wallet_address: str):
    try:
        portfolio = await okx.get_portfolio(wallet_address)
        risk_score = await risk_engine.analyze(portfolio)
        return {
            "wallet": wallet_address,
            "portfolio": portfolio,
            "risk": risk_score
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/signals")
async def get_signals():
    try:
        signals = await signal_engine.get_live_signals()
        return {"signals": signals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/risk/{wallet_address}")
async def get_risk_report(wallet_address: str):
    try:
        portfolio = await okx.get_portfolio(wallet_address)
        report = await risk_engine.full_report(portfolio)
        return {"wallet": wallet_address, "risk_report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/swap/nl")
async def natural_language_swap(request: SwapRequest):
    try:
        result = await swap_agent.execute(request.command, request.wallet_address)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/alerts/{wallet_address}")
async def get_alerts(wallet_address: str):
    try:
        portfolio = await okx.get_portfolio(wallet_address)
        risk_alerts = await risk_engine.get_alerts(portfolio)
        signal_alerts = await signal_engine.get_alerts()
        return {
            "wallet": wallet_address,
            "alerts": risk_alerts + signal_alerts,
            "total": len(risk_alerts) + len(signal_alerts)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# AUTO-PILOT ENDPOINTS
# ─────────────────────────────────────────────

@app.post("/autopilot/start")
async def start_autopilot(payload: dict):
    global autopilot_task
    wallet_address = payload.get("wallet_address", "")
    if not wallet_address:
        raise HTTPException(status_code=400, detail="wallet_address required")
    if not autopilot.running:
        autopilot_task = asyncio.create_task(autopilot.start(wallet_address))
        return {"status": "started", "wallet": wallet_address, "message": "Auto-Pilot is now running"}
    return {"status": "already_running", "message": "Auto-Pilot is already active"}


@app.post("/autopilot/stop")
async def stop_autopilot():
    autopilot.stop()
    return {"status": "stopped", "stats": autopilot.stats}


@app.get("/autopilot/logs")
async def get_autopilot_logs():
    return {
        "running": autopilot.running,
        "logs": autopilot.logs[-50:],
        "stats": autopilot.stats,
        "rules": autopilot.rules
    }


@app.post("/autopilot/rule")
async def add_autopilot_rule(rule: dict):
    autopilot.add_rule(rule)
    return {"status": "added", "rules": autopilot.rules}


@app.delete("/autopilot/rules")
async def clear_autopilot_rules():
    autopilot.clear_rules()
    return {"status": "cleared"}


# ─────────────────────────────────────────────
# STRATEGY ENDPOINTS
# ─────────────────────────────────────────────

@app.get("/strategies")
async def get_strategies():
    return {"strategies": STRATEGIES}


@app.post("/strategies/{name}/activate")
async def activate_strategy(name: str, payload: dict):
    strategy = STRATEGIES.get(name)
    if not strategy:
        raise HTTPException(status_code=404, detail=f"Strategy '{name}' not found")
    autopilot.clear_rules()
    for rule in strategy["rules"]:
        autopilot.add_rule(rule)
    autopilot.log(f"Strategy '{strategy['name']}' activated — {len(strategy['rules'])} rules loaded", "STRATEGY")
    return {"status": "activated", "strategy": strategy, "rules_loaded": len(strategy["rules"])}


# ─────────────────────────────────────────────
# WHAT-IF SIMULATION ENDPOINT
# ─────────────────────────────────────────────

@app.post("/simulate")
async def simulate_action(payload: dict):
    wallet_address = payload.get("wallet_address", "")
    action = payload.get("action", "")

    if not action:
        raise HTTPException(status_code=400, detail="action required")

    portfolio = await okx.get_portfolio(wallet_address)
    risk = await risk_engine.analyze(portfolio)
    signals = await signal_engine.get_live_signals()

    groq_client = GroqClient(api_key=os.getenv("GROQ_API_KEY", ""))

    prompt = f"""You are a DeFi portfolio simulator. Simulate the outcome of this action.

Current Portfolio:
- Total Value: ${portfolio.get('total_usd', 0):,.2f}
- Tokens: {[t['symbol'] + ' $' + str(t['usd_value']) for t in portfolio.get('tokens', [])]}
- Current Risk Score: {risk.get('score', 50)}/100 ({risk.get('level', 'MEDIUM')})

Proposed Action: {action}

Top Market Signals:
{chr(10).join([f"- {s['pair']}: {s['change_24h_pct']:+.1f}% ({s['signal']})" for s in signals[:4]])}

Return ONLY valid JSON, no markdown, no explanation:
{{
  "projected_risk_level": "LOW or MEDIUM or HIGH or CRITICAL",
  "projected_risk_score": 0-100,
  "projected_value_change_pct": number (positive or negative),
  "recommendation": "one clear sentence",
  "key_risks": ["risk1", "risk2"],
  "key_benefits": ["benefit1", "benefit2"],
  "verdict": "GOOD_MOVE or BAD_MOVE or NEUTRAL"
}}"""

    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        text = resp.choices[0].message.content.strip()
        text = text.replace("```json", "").replace("```", "").strip()
        return json_lib.loads(text)
    except Exception as e:
        return {
            "projected_risk_level": "MEDIUM",
            "projected_risk_score": 55,
            "projected_value_change_pct": 0,
            "recommendation": "Could not simulate — check Groq API key",
            "key_risks": ["API unavailable"],
            "key_benefits": ["N/A"],
            "verdict": "NEUTRAL",
            "error": str(e)
        }


# ─────────────────────────────────────────────
# ORACLE AI WITH MEMORY
# ─────────────────────────────────────────────

@app.post("/ai/chat")
async def ai_chat_with_memory(payload: dict):
    session_id = payload.get("session_id", "default")
    user_msg = payload.get("message", "")
    wallet = payload.get("wallet_address", "")

    if not user_msg:
        raise HTTPException(status_code=400, detail="message required")

    if session_id not in conversation_history:
        conversation_history[session_id] = []

    portfolio = await okx.get_portfolio(wallet)
    risk = await risk_engine.analyze(portfolio)
    signals = await signal_engine.get_live_signals()
    top_signal = signals[0] if signals else {}

    system = f"""You are Oracle, an elite autonomous DeFi AI advisor built on X-Agent.
You have memory of this conversation and live portfolio access.

LIVE CONTEXT:
- Portfolio Value: ${portfolio.get('total_usd', 0):,.2f}
- Risk Level: {risk.get('level', 'UNKNOWN')} (Score: {risk.get('score', 0)}/100)
- Risk Summary: {risk.get('summary', 'N/A')}
- Top Signal: {top_signal.get('pair', 'N/A')} at {top_signal.get('change_24h_pct', 0):+.1f}% ({top_signal.get('signal', 'N/A')})
- Auto-Pilot: {'RUNNING' if autopilot.running else 'STOPPED'}

Be concise (max 3 sentences), sharp, and actionable. Never hedge excessively.
If asked about swaps, suggest exact commands. If asked about risk, give a clear verdict."""

    history = conversation_history[session_id]
    history.append({"role": "user", "content": user_msg})

    try:
        groq_client = GroqClient(api_key=os.getenv("GROQ_API_KEY", ""))
        messages_with_system = [{"role": "system", "content": system}] + history[-10:]
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=300,
            messages=messages_with_system
        )
        reply = resp.choices[0].message.content
    except Exception as e:
        reply = f"Oracle offline: {str(e)}"

    history.append({"role": "assistant", "content": reply})
    conversation_history[session_id] = history

    return {
        "reply": reply,
        "session_id": session_id,
        "history_length": len(history)
    }


@app.delete("/ai/chat/{session_id}")
async def clear_chat_history(session_id: str):
    if session_id in conversation_history:
        del conversation_history[session_id]
    return {"status": "cleared", "session_id": session_id}


# ─────────────────────────────────────────────
# PORTFOLIO REPORT EXPORT
# ─────────────────────────────────────────────

@app.get("/report/{wallet_address}")
async def generate_report(wallet_address: str):
    from fastapi.responses import HTMLResponse
    from datetime import datetime

    portfolio = await okx.get_portfolio(wallet_address)
    risk = await risk_engine.full_report(portfolio)
    signals = await signal_engine.get_live_signals()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    rc = {"LOW": "#00ff88", "MEDIUM": "#ffcc00", "HIGH": "#ff8800", "CRITICAL": "#ff2244"}.get(risk.get("level", "MEDIUM"), "#888")

    tokens_rows = "".join([
        f"<tr><td><strong>{t['symbol']}</strong></td><td>{t['balance']:.6f}</td>"
        f"<td>${t['usd_value']:,.2f}</td>"
        f"<td>{(t['usd_value'] / portfolio.get('total_usd', 1) * 100):.1f}%</td>"
        f"<td>Chain {t['chain']}</td></tr>"
        for t in portfolio.get("tokens", [])
    ])

    signals_rows = "".join([
        f"<tr><td><strong>{s['pair']}</strong></td><td>${s['last_price']:,.4f}</td>"
        f"<td style=\"color:{'#00ff88' if s['change_24h_pct'] > 0 else '#ff4444'}\">{s['change_24h_pct']:+.2f}%</td>"
        f"<td>{s['signal']}</td></tr>"
        for s in signals[:8]
    ])

    recs_html = "".join([f"<li>{r}</li>" for r in risk.get("recommendations", [])])
    checks = risk.get("checks", {})
    checks_html = "".join([
        f"<li>{'✅' if v.get('passed') else '⚠️'} <strong>{k.replace('_', ' ').title()}</strong>: {v.get('detail', '')}</li>"
        for k, v in checks.items()
    ])

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OKX DeFi Report — {now}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap');
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:'IBM Plex Mono',monospace;background:#050508;color:#e8eaf0;padding:48px;max-width:900px;margin:0 auto}}
  h1{{color:#00d4ff;font-size:1.6rem;margin-bottom:4px}}
  h2{{color:#00d4ff;font-size:1rem;margin:32px 0 12px;text-transform:uppercase;letter-spacing:.1em}}
  .meta{{color:#555;font-size:.75rem;margin-bottom:32px}}
  .stat-grid{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:32px}}
  .stat-card{{background:#0a0a14;border:1px solid #1a1a2e;border-radius:8px;padding:16px}}
  .stat-label{{font-size:.65rem;color:#555;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}}
  .stat-value{{font-size:1.8rem;font-weight:700;color:#00d4ff}}
  .risk-value{{color:{rc}}}
  table{{width:100%;border-collapse:collapse;margin-bottom:24px}}
  th{{background:#0d0d1a;color:#555;font-size:.7rem;text-transform:uppercase;padding:10px;text-align:left;border-bottom:1px solid #1a1a2e}}
  td{{padding:10px;border-bottom:1px solid #0d0d1a;font-size:.85rem}}
  ul{{padding-left:20px}}
  li{{padding:6px 0;font-size:.85rem;color:#aaa}}
  .footer{{margin-top:48px;padding-top:16px;border-top:1px solid #1a1a2e;color:#333;font-size:.7rem}}
  .badge{{display:inline-block;padding:3px 12px;border-radius:12px;font-size:.7rem;font-weight:700;background:{rc};color:#000}}
  @media print{{body{{background:white;color:black}}}}
</style>
</head>
<body>
<h1>ArgosX</h1>
<p class="meta">Portfolio Report · Generated {now} · Wallet: {wallet_address}</p>
<div class="stat-grid">
  <div class="stat-card"><div class="stat-label">Total Portfolio Value</div><div class="stat-value">${portfolio.get('total_usd', 0):,.2f}</div></div>
  <div class="stat-card"><div class="stat-label">Risk Score</div><div class="stat-value risk-value">{risk.get('score', 0)}/100</div><span class="badge">{risk.get('level', 'UNKNOWN')}</span></div>
  <div class="stat-card"><div class="stat-label">Assets Monitored</div><div class="stat-value">{portfolio.get('token_count', 0)}</div></div>
</div>
<h2>Token Holdings</h2>
<table><thead><tr><th>Asset</th><th>Balance</th><th>USD Value</th><th>% of Portfolio</th><th>Chain</th></tr></thead><tbody>{tokens_rows}</tbody></table>
<h2>Risk Analysis</h2><ul>{checks_html}</ul>
<h2>Recommendations</h2><ul>{recs_html}</ul>
<h2>Live Market Signals</h2>
<table><thead><tr><th>Pair</th><th>Price</th><th>24h Change</th><th>Signal</th></tr></thead><tbody>{signals_rows}</tbody></table>
<div class="footer">Built with X-Agent OKX Agentic Wallet Skill Suite · Build X-Agent Hackathon 2026 · Ctrl+P to save as PDF</div>
</body>
</html>"""

    return HTMLResponse(content=html)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
