import asyncio
import logging
import time

import config
from app_state import state
from scorer import compute_rug_score
from signals import fetch_all_signals
from state import TokenState

logger = logging.getLogger(__name__)

POLL_INTERVAL = config.POLL_INTERVAL


async def _monitor_loop(token: TokenState) -> None:
    while token.active:
        try:
            sigs = await fetch_all_signals(token)

            token.signals.dev_wallet = sigs["dev_wallet"]
            token.signals.smart_money = sigs["smart_money"]
            token.signals.holder_concentration = sigs["holder_concentration"]
            token.signals.liquidity_withdrawal = sigs["liquidity_withdrawal"]
            token.signals.trade_flow_toxicity = sigs["trade_flow_toxicity"]
            token.signals.timestamp = time.time()

            prev = token.rug_score
            token.rug_score = compute_rug_score(sigs)
            token.score_history.append({"score": token.rug_score, "ts": time.time()})
            if len(token.score_history) > 120:
                token.score_history.pop(0)

            # Persist score + signals to DB
            await state.update_score(token.address, token.rug_score, sigs, token.score_history)

            # warning threshold crossed upward
            if token.rug_score >= token.warn_threshold > prev:
                await state.emit_event(token, "WARNING", f"RugScore {token.rug_score:.2f} — warning threshold crossed")

            # exit threshold crossed
            if token.rug_score >= token.exit_threshold and not token.exited:
                if state.kill_switch:
                    await state.emit_event(token, "EXIT_BLOCKED", f"RugScore {token.rug_score:.2f} — kill switch active")
                elif token.wallet_address:
                    import exit as exit_mod
                    tx = await exit_mod.exit_position(token, kill_switch=state.kill_switch)
                    if tx == "kill_switch_active":
                        await state.emit_event(token, "EXIT_BLOCKED", f"RugScore {token.rug_score:.2f} — kill switch active")
                    elif tx == "dry_run":
                        await state.emit_event(token, "EXIT_DRY_RUN", f"RugScore {token.rug_score:.2f} — dry run, no swap executed")
                    elif tx.startswith("failed:") or tx == "no_balance" or tx == "timeout":
                        await state.emit_event(token, "EXIT_FAILED", f"RugScore {token.rug_score:.2f} — exit failed: {tx}")
                    else:
                        await state.emit_event(token, "EXIT", f"RugScore {token.rug_score:.2f} — autonomous exit executed", tx)
                        await state.mark_exited(token.address)
                else:
                    await state.emit_event(token, "EXIT_BLOCKED", f"RugScore {token.rug_score:.2f} — no wallet configured")

        except Exception as exc:
            logger.exception("monitor %s error: %s", token.address[:8], exc)

        await asyncio.sleep(POLL_INTERVAL)


async def start_monitoring(token: TokenState) -> None:
    asyncio.create_task(_monitor_loop(token))
