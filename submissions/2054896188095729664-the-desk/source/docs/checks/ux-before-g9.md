# UX Baseline — Before G9

Captured: 2026-05-18 against running app (API PID 4895 on 4181, Vite PID 4898 on 4173).
Tests: 72/72 PASS · Source: G8 ship state with state-machine + cross-chain dedupe live.
Headless DOM dump: /tmp/g9-before-dom.html (66 KB, 2908 lines).

## First viewport issues found in default mode

DOM dump matches against the things Leon called out:

| Pattern | Occurrences | Note |
|---|---|---|
| `PAPER-FALLBACK` badge | 2 | CEX mode badge bleeding into default first viewport |
| `DEMO PREVIEW` badge | 1 | Demo-mode label visible in default Order blotter |
| `Order blotter` heading | 1 | Operations grid (orders + positions) is in first viewport |
| `Positions` heading | 1 | Same — should be in a Book drawer per G9.1 |
| `New order ticket` CTA | 1 | Manual intent on main screen — should move under secondary action |
| `wallet offline` status pill | 1 | Top wallet status visible in global header |
| Raw `sha256:4df613...` hash | 1 | "tip" hash shown in default — should be hidden behind technical trace |
| `Black Box receipt — signs on your wallet...` | 1 | Verbose Black Box label clutter on first viewport |
| `Black Box receipts anchor to X Layer...` | 1 | Same |
| `Black Box replay` link | 1 | Direct technical link in default — should be Show technical trace |

## G9 problem statement reduction

- First viewport is **trying to be a full trading dashboard** (radar + ticket + orders + positions + wallet + status + replay) instead of answering the only question that matters: *can this agent trade, and why?*
- Cards from secondary flows (CEX PAPER-FALLBACK, DEMO PREVIEW, wallet ceremony verbose labels) pollute the live default story.
- Raw sha256 hash visible on first paint, breaks trader-cockpit feel.
