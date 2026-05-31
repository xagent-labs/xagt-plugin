# Direction Feedback — Production Sprint Framing

**Audience:** Leon (founder), Claude Code + Codex (sprint executors)
**Status:** Pre-sprint direction memo. Read before opening any code.
**Triggering concern:** "Agentic Wallet Ops Center / Black Box… sounds kinda like what we already have."

---

## TL;DR — Leon is right

The research report leads with the **cryptographic ceremony** and pitches the product as "the agent-authority layer." That framing is **too close to the existing prototype** and will make judges/investors say "I think I saw this last week."

**Reframe:** Ship **The Desk** as the product — a Bloomberg-style **agent trading terminal** that scans live markets, proposes trades with reasoning, and executes them. The Black Box stops being the headline and becomes a **trust badge** in the corner: "every action ships with a verifiable receipt."

That single re-framing changes nothing about the research's stack, gates, or build order. It changes what we *demo first*, what the README's first paragraph says, and which surfaces we polish hardest.

---

## 1. Framing decision

> **The product is The Desk — a live agent trading terminal. The Black Box is the safety layer that makes the terminal trustworthy. The Ops Center is the parent platform name, mentioned once, not pitched.**

| Framing option | Verdict |
|---|---|
| **A. Agentic Wallet Ops Center (Black Box headline)** | ❌ Reject. This is what we already have. Sounds like compliance/audit middleware. Investors hear "feature, not company." |
| **B. The Desk — agent trading terminal (Black Box as moat)** | ✅ **Adopt.** Concrete product, concrete buyer, clear demo arc. The cryptographic gate becomes the *defensible* answer to "why won't this blow up?" rather than the punchline. |
| **C. Hybrid: lead with Ops Center, demo The Desk** | ❌ Reject. Splits the message. Judges have 90 seconds. |

**One-line product description (use everywhere — README, pitch, replies):**
> *The Desk is a Bloomberg-style terminal for AI trading agents. Agents scan markets, propose trades with reasoning, and execute — every action backed by a tamper-evident receipt anchored on-chain.*

**Wedge sentence (replace the "agent authority" line):**
> *Anyone can build an agent. We built the cockpit that lets you trust one with your wallet.*

---

## 2. What's actually different vs. the current build

The risk Leon flagged is real. If we strip out the new things, here's what's left versus what's new:

| Already in prototype | New in production sprint |
|---|---|
| Opportunity Radar UI (limited sources) | **Live multi-source scanner**: OKX OnchainOS + Dexscreener + GeckoTerminal + GoPlus + CryptoPanic, streaming via SSE |
| Simulated OKX Agentic Wallet ceremony | **Real OKX execution** (paper trading at minimum, capped live as stretch); **DEX calldata** for mainnet story |
| Hash-chained Black Box trace | Same chain, now **backed by Postgres**, **anchored to X Layer testnet**, integrity-gated against execution |
| Replay / digest / verify | **Pro trader UX**: order ticket, blotter with 7 states, positions, PnL, alerts, evidence drawer, keyboard map |
| Local API, in-memory | **Persistent backend**: Neon + Drizzle + Inngest jobs; durable across restarts |
| No agent reasoning surfaced | **Agent reasoning panel** on every proposed ticket — visible AI work |

**The honest gap:** if we lead the demo with the ceremony interstitial, the new 70% of the build is invisible in the first 30 seconds. We have to lead with what's *new* and let the ceremony be the "oh, and it's safe" beat.

---

## 3. Highest-leverage features, ranked

Ranking is by **demo impact × business credibility**, not by build difficulty. Numbers in brackets are research gate IDs from `CLAUDE_PRODUCTION_SPRINT_RESEARCH.md`.

1. **Live multi-source scanner streaming into the radar** [G5]. Without this, "Bloomberg for agents" is a lie. Demo opens with rows appearing in real time. Mandatory: OnchainOS `signal` + `trenches` + `security`, Dexscreener, GoPlus.
2. **Order ticket → real OKX paper-trade round-trip in <10s** [G6 + G7]. The "it actually trades" moment. Press `n`, `Enter`, watch SUBMITTED → FILLED. This is the proof.
3. **Agent reasoning panel on the selected ticket** [G5 reasoner]. One short LLM-written paragraph: "Bought because X signal + Y on-chain + Z risk passed." Without this, agents are invisible and the product looks like a scanner.
4. **Blotter + positions + PnL** [G6 + G8]. The persistence story. Reload the page, your trade is still there. Equity line drawn from real fills.
5. **Black Box trust badge in the status bar + click-to-replay** [G3 + G8]. Small, ever-present, clickable. *Not* a forced interstitial. Becomes the "how do I trust this?" answer when judges ask.
6. **X Layer anchor link on session close** [G9]. One-line proof: "this session's receipt is on-chain → [OKLink ↗]." Fifteen seconds in the demo. Massive credibility per second.
7. **Kill-switch banner that visibly catches a cap breach** [G5 guard]. Optional demo beat: deliberately request an oversized order, watch the gate refuse. Turns safety from a claim into a visible feature.
8. **Keyboard-driven UX** [G2 + G6]. Terminal feel. Cheap to build (one `useKeymap` hook), enormous perception lift.
9. **Live OKX `cex_live_capped` at $50–$200** [G7]. Only if Gate 1 IP binding works. Risk-reward marginal vs. paper for a 90-second demo; cut without regret.
10. **Public verifier page** (paste a tip hash, validate). Cut to v2.

**Demo arc rewrite (90s, scanner-forward, gate as backbeat):**
1. *(0–15s)* Open The Desk. Radar is already streaming. Status bar pulses with new signals. "This is a Bloomberg terminal for AI trading agents."
2. *(15–35s)* Click a high-score row. Drawer opens with **agent reasoning**, signal evidence, risk score. "The agents are scanning ~6 live feeds and writing their thesis in plain English."
3. *(35–55s)* Press `n` → order ticket → `Enter`. Blotter shows SUBMITTED → FILLED on real OKX. "And it can actually trade — that's a real fill on OKX, paper-mode, capped."
4. *(55–75s)* Click the tip hash in the status bar → Black Box replay slides in → green verify → "Anchor TX ↗". OKLink opens. "Every action ships with a tamper-evident receipt anchored to X Layer. That's why you can let an agent touch a wallet."
5. *(75–90s)* Closer: *"Anyone can build an agent. We built the cockpit that lets you trust one with your wallet."*

---

## 4. What to cut (in addition to the research's existing cut list)

- **The 1.5-second "Black Box interstitial" in the demo path.** Replace with the always-on status bar badge that judges can click *if curious*. Forced ceremony = "feels like the old demo."
- **Pitch language built around "agent authority layer," "cryptographic ceremony," "Sigstore Rekor-style transparency log."** All accurate. None of them are how you sell a *terminal*. Move to the technical-deep-dive doc, out of the README's first paragraph.
- **Policy Console and Risk Console as headline surfaces.** Keep them reachable via `g p` / `g x` for judges who poke around. Do not feature them in the demo arc. They read as compliance UI.
- **Anchoring every N events** (research's open question #8). Anchor once per session, end of session, one tx. Faster, cleaner, cheaper, more demoable.
- **Any time spent on the "novel cryptography" angle.** The research already warns against this; reinforce: SHA-256 + EVM anchor is *deliberately boring*. The pitch should never mention crypto-theory.
- **Multi-agent swimlane timeline as a primary surface.** Looks busy on small screens and competes with the radar for attention. Keep it as a tab inside the evidence drawer, not a top-level pane.

---

## 5. What stays (do not re-litigate)

Everything in the research's §4 architecture, §3 setup checklist, §5 execution modes, §6 risk register, and §7 sprint gate sequence is sound. **The reframing is a marketing/UX change, not an engineering change.** Do not rewrite `db/schema.ts`, do not redo the adapter contract, do not move off Neon/Drizzle/Inngest. The Black Box code, X Layer anchor, and policy gate all ship — they just stop being the demo's opening line.

---

## 6. Open questions for Leon (additive to research §9)

1. **Tagline preference.** Three candidates — pick one or veto all three:
   a) *"Bloomberg for AI trading agents."*
   b) *"The cockpit for autonomous wallets."*
   c) *"Anyone can build an agent. We built the terminal that lets you trust one."*
2. **Demo emphasis split.** Of the 90s demo, what's the right time allocation? My recommendation: 55s scanner + execution, 20s Black Box + anchor, 15s closer. If you want to lean harder into the gate (because judges are OKX-internal and care most about the X Layer story), flip to 35s execution / 40s gate + anchor / 15s closer. Pick now so we polish the right surfaces.
3. **Product-name commitment.** Going forward, do we say:
   - "The Desk" (product) — recommended public name.
   - "Agentic Wallet Ops Center" — internal/platform name, mentioned once in README, not on stage.
   - Or unify to one name? Two names is fine if disciplined, confusing if not.
4. **Reasoning-text source.** OK to spend one Claude API call per displayed reasoning paragraph (~$0.001/ticket, deterministic enough at temp 0.2)? Or template-only for the demo? Recommendation: live LLM, cached per opportunity ID, fall back to template if call fails.

---

## 7. Sprint instructions that follow from this memo

When the sprint plan is opened (next step, not now):

- Keep the gate sequence from research §7 as-is.
- In Gate 4 (Radar + status bar), **the status bar shows the trust badge from day 1** — no separate "Black Box surface" gate.
- In Gate 8, **the Black Box replay is a side-drawer, not a forced modal**. Triggered by clicking the tip hash, never auto-opened.
- In Gate 10, the **Modes & Caps panel is reachable but not in the demo path**. It exists so judges who ask "what about safety?" can be shown live.
- In Gate 12, the README's first paragraph is the one-line product description from §1 of this memo. The cryptographic explanation comes in section 3, not section 1.
- The pitch script is the demo arc from §3 of this memo.

The build doesn't change. The story does. Ship the terminal. The gate is how it stays trustworthy — not what it is.
