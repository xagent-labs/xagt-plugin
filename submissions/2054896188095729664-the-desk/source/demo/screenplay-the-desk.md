# The Desk — 90-Second Demo Screenplay

> Locked arc: **55s scanner + reasoning + ticket + execution/blotter · 20s Black Box trust badge + replay + anchor · 15s closer.**
> The Black Box is never the opening line. Lead with the terminal.

| Time | Frame | Narration |
| --- | --- | --- |
| 0:00–0:08 | Open The Desk. Radar streams. Status bar pulses. | "The Desk is a Bloomberg-style terminal for AI trading agents." |
| 0:08–0:18 | Source-attribution chips visible (OnchainOS signal · trenches · security). | "Six live feeds are streaming into the radar — OnchainOS signal, DEX trenches, security checks, hot-tape, on-chain flow." |
| 0:18–0:30 | Click a high-score row. Drawer opens with **agent reasoning** paragraph + evidence chips. | "The agent ranked this opportunity, pulled the OKX-skill evidence, and wrote its thesis in plain English. Let's act on it." |
| 0:30–0:42 | Press `n` → order ticket modal pre-fills (side · qty · price · cap preview). Press `Enter`. | "Caps and the instrument allowlist are pre-flighted. One keystroke confirms." |
| 0:42–0:55 | Blotter row appears: SUBMITTED → FILLED on OKX paper/demo (or `PAPER-FALLBACK` badge if creds absent). | "That's a real fill on OKX paper trading — real market data, capped notional, never withdrawal-permissioned." |
| 0:55–1:05 | Click the tip hash in the status bar → Black Box replay slides in. Press `v` → green chain. | "Every action ships with a tamper-evident receipt. The chain just verified." |
| 1:05–1:15 | Click **Anchor TX ↗ X Layer**. OKLink opens in a new tab. (Fallback: cached anchor link disclosed honestly.) | "Anchored on X Layer testnet. That's why you can let an agent touch a wallet." |
| 1:15–1:30 | Hover the wallet pill — OKX Wallet address visible. (Or "Install OKX Wallet" CTA if no extension.) | "Connect your OKX Wallet, sign your own receipt. Anyone can build an agent. **We built the cockpit that lets you trust one with your wallet.** That's The Desk." |

## Pre-roll checklist (off-camera, before record)

- [ ] `npm run app` running.
- [ ] OKX Wallet extension visible in toolbar.
- [ ] OKX paper-trading subaccount loaded (or `PAPER-FALLBACK` badge expected — rehearse honest disclosure).
- [ ] Scanner has at least 3 live rows.
- [ ] Status bar shows session id + tip hash + agent count.
- [ ] Anchor adapter mode confirmed: `xlayer_testnet` (live), `not-configured` (badge), or cached tx hash from prior rehearsal.

## Fallback acceptance

- OKX live not reachable → `cex_paper` (PAPER-FALLBACK badge). Disclose on stage.
- X Layer RPC down → Anvil-fork or cached anchor tx. Disclose.
- OKX Wallet not installed on demo machine → screenshot of completed flow in evidence drawer; demo continues server-side.
- LLM reasoning fails → TEMPLATE pill visible; deterministic paragraph renders.

## Cut order if time slips on stage

1. Drop wallet connect/sign beat (close with the anchor link).
2. Drop the cap-breach kill-switch beat (was optional).
3. Never cut: ticket → fill, status-bar trust badge, anchor link.
