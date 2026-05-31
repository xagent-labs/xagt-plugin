# Verdict Rules — how stages combine into BUY / CAUTION / AVOID

The verdict is computed deterministically. Security is a **gate**, not a vote: it can
veto. Everything else can only downgrade or support — nothing upgrades past a security veto.

## Step 1 — Security gate (Stage 1 result is authoritative)

`token-scan` returns a server-computed `riskLevel`. Buy-side mapping:

| `riskLevel` | Gate result |
|---|---|
| `CRITICAL` | **AVOID (hard veto).** Pipeline stops. No execution without an explicit, written, informed user override — and even then restate the exact risk first. |
| `HIGH` | **CAUTION floor + hard pause.** Best possible verdict is now CAUTION. Execution needs an explicit yes/no. |
| `MEDIUM` | No floor change. Record the risk for the summary. |
| `LOW` | No floor change. |

`isHoneyPot = true` on the buy side → treat as CRITICAL (AVOID), regardless of `riskLevel`.

If the scan **did not complete**, there is no gate result → it is NOT `LOW`. Mark
"security: unverified", warn the user, and require explicit acknowledgement before any
later execution.

## Step 2 — Start from a base verdict

If the gate did not veto, start at **BUY** and apply downgrades. One downgrade = one
level (BUY → CAUTION → AVOID). Multiple downgrades stack.

| Signal (from later stages) | Effect |
|---|---|
| Liquidity < $10,000 | downgrade 1 |
| Tax rate > 10% (buy or sell) | downgrade 1 |
| `devRugPullTokenCount` > 0 | downgrade 1 |
| Token age < 24h | downgrade 1 (extra caution on buy) |
| Holder cluster: rug-pull % high OR top-cluster concentration high | downgrade 1 |
| Memepump: bundler/sniper concentration high | downgrade 1 |
| Smart money net-distributing (top traders selling) | downgrade 1 |
| `riskLevel = HIGH` from Step 1 | floor at CAUTION (cannot be BUY) |

| Supporting signal | Effect |
|---|---|
| Smart money freshly accumulating | note as positive; does NOT cancel a downgrade |
| Deep liquidity + real volume + established age | note as positive |

> Supporting signals never upgrade a verdict above its downgraded/floored level. They
> only enrich the explanation. This asymmetry is intentional: on the buy side, being
> wrong is expensive and being cautious is cheap.

## Step 3 — Final verdict

- No veto, zero downgrades, no HIGH floor → 🟢 **BUY**
- Any single downgrade, or HIGH floor, or unverified security → 🟡 **CAUTION**
- Security veto (CRITICAL / honeypot-on-buy), or ≥2 downgrades → 🔴 **AVOID**

## Step 4 — Presentation contract

Always output, in this order:

1. The verdict emoji + word (🟢 BUY / 🟡 CAUTION / 🔴 AVOID).
2. **The single biggest risk**, one sentence, plain language.
3. 3–6 evidence bullets (security, liquidity, holders, signals, age).
4. For CAUTION/AVOID: the explicit list of every triggered downgrade/veto.
5. The execution question — only if verdict is BUY or CAUTION:
   *"Do you want me to execute this buy? (yes / no)"*
   For AVOID: do not offer execution; only proceed on an explicit informed override.

Never present a number or label as fact if the stage that would produce it failed —
say "unavailable (stage skipped)" instead.
