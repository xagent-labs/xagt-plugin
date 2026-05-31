# UX REPAIR SPRINT — Make It Understandable in 10 Seconds

**Sprint Started:** 2026-05-17
**Implementation Lead:** Codex
**Review Lead:** Claude Code
**User Feedback:** "Outside of the radar tab everything is so confusing to me."

---

## Goal

Make the product understandable to a non-engineer in under 10 seconds after they leave Radar. Clear product surfaces, not raw markdown or power-user controls.

---

## Current Status

| Milestone | Status | Gate Result | Last Updated |
|-----------|--------|-------------|--------------|
| U1 Wallet Ceremony Flow | completed | passed | 2026-05-17 |
| U2 Black Box Summary Card | completed | passed | 2026-05-17 |
| U3 Policy as Status, Not Console | completed | passed | 2026-05-17 |
| U4 Digest + Evidence Polish | completed | passed | 2026-05-17 |
| U5 Anchor Setup/Complete State | completed | passed | 2026-05-17 |
| U6 Hide/Label Non-Critical Features | completed | passed | 2026-05-17 |
| U7 Final Browser Walkthrough | in_progress | command gates passing; browser walkthrough pending | 2026-05-17 |

---

## Milestone Definitions

### U1 — Wallet Ceremony Flow
**Problem:** Stage / Confirm + simulate is too abrupt.
**Fix:** Replace with a visible wallet-control ceremony:
1. "Verifying gates..." with checklist of passed gates
2. "Simulating OKX Agentic Wallet signature..."
3. Success/error state with clear outcome

**Hard Gate:** User can see step-by-step ceremony, not instant jump to "simulated".

---

### U2 — Black Box Summary Card
**Problem:** Black Box modal opens to raw timeline, confusing for non-engineers.
**Fix:** Add summary card at top:
- "14 events, all verified ✓"
- Session hash (truncated with copy)
- "Expand timeline" to see details
- Visual integrity indicator (green/red)

**Hard Gate:** Modal opens with summary first, timeline is expandable.

---

### U3 — Policy as Status, Not Console
**Problem:** Policy panel looks like a developer console.
**Fix:**
- Show policy as status badges: "Human confirmation: Required ✓"
- "Safety gates: All enabled ✓"
- Edit mode only on explicit "Edit policy" action
- Remove raw JSON appearance

**Hard Gate:** Policy tab shows status badges, not form controls by default.

---

### U4 — Digest + Evidence Polish
**Problem:** Digest and Evidence show raw markdown, confusing.
**Fix:**
- Digest: Show summary cards with key metrics (tickets reviewed, blocked, executed)
- Evidence: Show OKX canary status as a status badge, not raw markdown
- Add friendly labels and icons

**Hard Gate:** No raw markdown visible in default view.

---

### U5 — Anchor Setup/Complete State
**Problem:** Anchor status is confusing when not configured.
**Fix:**
- If no anchor: Show "Fixture mode: Local proof only" badge (not error)
- If anchor configured: Show "X Layer anchored ✓" with explorer link
- Remove confusing "Anchor not configured" warning tone

**Hard Gate:** Non-configured anchor looks intentional, not broken.

---

### U6 — Hide/Label Non-Critical Features
**Problem:** Agents tab / Yield Manager confuses the story.
**Fix:**
- Either hide Agents tab from main nav (move to settings/advanced)
- Or label clearly: "Agent Status (Advanced)"
- Yield Manager marked as "Coming Soon" or hidden

**Hard Gate:** Main nav focuses on: Radar → Tickets → Policy → Black Box

---

### U7 — Final Browser Walkthrough
**Hard Gates:**
- `npm run demo` passes
- `npm test` passes
- `npm run web:build` passes
- `node dist/blackbox/verify-chain.js` passes
- Browser walkthrough: Radar → Review → Confirm ceremony → Black Box summary → Tamper red → Restore green → Digest cards → Evidence cards
- No raw markdown or confusing controls visible in main flow

---

## Blockers

- U7 still needs live browser walkthrough evidence after starting the local app.

---

## Milestone Log

### U1 — Wallet Ceremony Flow

**Status:** completed

**Changed Files:**
- `web/src/main.tsx`
- `web/src/styles.css`

**Verification Commands:**
```bash
npm run build
rg -n "Start wallet ceremony|Verifying gates|Simulating OKX Agentic Wallet signature" web/src/main.tsx
```

**Gate Result:** passed

- Radar and ticket modals now use `Start wallet ceremony` instead of an abrupt `Confirm + simulate`.
- The click path shows a visible ceremony with `Verifying gates...`, a checklist, `Simulating OKX Agentic Wallet signature...`, then success/error copy.

### U2 — Black Box Summary Card

**Status:** completed

**Changed Files:**
- `web/src/main.tsx`
- `web/src/styles.css`

**Verification Commands:**
```bash
npm run build
rg -n "Black Box proof|all verified|Expand timeline" web/src/main.tsx
```

**Gate Result:** passed

- The Black Box modal opens with a summary card: event count, verified/failed state, truncated session hash, visual integrity badge, and `Expand timeline`.
- Timeline cards are collapsed by default unless tamper or integrity failure requires them.

### U3 — Policy as Status, Not Console

**Status:** completed

**Changed Files:**
- `web/src/main.tsx`
- `web/src/styles.css`

**Verification Commands:**
```bash
npm run build
rg -n "Active policy|Human confirmation|Edit policy|policy-status-grid" web/src/main.tsx web/src/styles.css
```

**Gate Result:** passed

- Policy defaults to status badges for human confirmation, trace integrity, caps, chains, and signing mode.
- Operator controls are hidden until the explicit `Edit policy` action.

### U4 — Digest + Evidence Polish

**Status:** completed

**Changed Files:**
- `web/src/main.tsx`
- `web/src/styles.css`

**Verification Commands:**
```bash
npm run build
rg -n "DigestCards|EvidenceCards|digest-cards|evidence-cards" web/src/main.tsx web/src/styles.css
```

**Gate Result:** passed

- Digest view now shows summary cards and metric cards instead of raw markdown.
- Evidence view now shows OKX status, skill coverage, source health cards, and fallback/live labels instead of raw markdown.

### U5 — Anchor Setup/Complete State

**Status:** completed

**Changed Files:**
- `web/src/main.tsx`
- `web/src/styles.css`

**Verification Commands:**
```bash
npm run build
rg -n "Fixture mode: Local proof only|X Layer anchored" web/src/main.tsx
```

**Gate Result:** passed

- Not-configured anchor state now reads `Fixture mode: Local proof only` and uses neutral styling.
- Submitted anchors read `X Layer anchored ... ✓` with the explorer link.

### U6 — Hide/Label Non-Critical Features

**Status:** completed

**Changed Files:**
- `web/src/main.tsx`
- `web/src/styles.css`

**Verification Commands:**
```bash
npm run build
rg -n "Radar|Tickets|Policy|Black Box|Agent Status \\(Advanced\\)|coming soon" web/src/main.tsx
```

**Gate Result:** passed

- Main sidebar nav is now focused on `Radar -> Tickets -> Policy -> Black Box`.
- Agents are removed from the main nav and labeled `Agent Status (Advanced)` if opened indirectly.
- Yield Manager idle copy is `coming soon`, not a live feature stub.

### U7 — Final Browser Walkthrough

**Status:** in_progress

**Changed Files So Far:**
- `src/opportunity-scanner.ts`
- `web/src/main.tsx`
- `web/src/styles.css`
- `docs/sprints/UX_REPAIR_PROGRESS.md`
- Generated by verification commands: `web/public/data/opportunities.json`, `docs/evidence/opportunity-scan.md`, `web-dist/*`, `blackbox/events.jsonl`, `demo/replay.md`, `digest/latest.md`

**Verification Commands Run So Far:**
```bash
npm run scan
npm test
npm run web:build
node dist/blackbox/verify-chain.js
```

**Gate Result:** in_progress

- `npm run scan`: passed with fixture fallback now producing 2 opportunities, 1 ready and 1 blocked, so the offline browser walkthrough has a Radar ticket to operate.
- `npm test`: passed 27/27.
- `npm run web:build`: passed.
- `node dist/blackbox/verify-chain.js`: passed.
- Remaining: start the app and complete the browser walkthrough: Radar -> ceremony -> Black Box summary -> Tamper -> Restore -> Digest cards -> Evidence cards, with no raw markdown or confusing controls in the main flow.

---

## Notes

### U1-U6 Implementation (2026-05-17)

**Changed files:**
- `web/src/main.tsx` — Added WalletCeremonyCard, CeremonyStep, StatusBadge, DigestCards, EvidenceCards components
- `web/src/styles.css` — Added ceremony, policy-status-grid, digest-metrics, source-card styling

**Key changes:**
- U1: `WalletCeremonyCard` component with verifying → signing → success/error states and checklist
- U2: `blackbox-summary-card` with event count, session hash, "Expand timeline" toggle
- U3: `policy-status-grid` with `StatusBadge` components for human confirmation, trace integrity, caps
- U4: `DigestCards` and `EvidenceCards` components replace raw markdown rendering
- U5: Changed "Anchor not configured" → "Fixture mode: Local proof only"
- U6: Removed Agents button from nav/command-dock; Yield Manager shows "coming soon"

**Label changes:**
- "Stage" → "Prepare ticket"
- "Confirm + simulate" → "Start wallet ceremony"
- "Simulated" → "Ceremony complete"

**Verification commands:**
```bash
npm run build    # passes
npm test         # 27/27 pass
npm run web:build # passes
node dist/blackbox/verify-chain.js # PASS
```

**Implementation lead:** Codex (via tmux bridge /goal)
