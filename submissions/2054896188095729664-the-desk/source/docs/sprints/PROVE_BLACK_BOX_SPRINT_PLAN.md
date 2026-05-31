# PROVE THE BLACK BOX — Sprint Plan

**Sprint Lead:** Claude Code (product/architecture)
**Implementation Lead:** Codex
**Created:** 2026-05-17
**Status:** Active

---

## Product Thesis (3 bullets)

1. **The only durable wedge is verifiable, policy-gated, agent decision provenance** — a signed audit trail that a signing layer can require before it signs.
2. **The tamper-evident Black Box is the product.** Scanner, UI, and agent seats are supporting evidence.
3. **The tamper-flip demo moment is the close.** A judge sees red propagation on mutation, green on restore — proof the wallet is gated on cryptographic discipline, not vibes.

---

## Sprint Non-Goals

- No mainnet signing or real-funds execution
- No EigenLayer AVS or zkML integration
- No multi-chain scanner expansion beyond Solana
- No additional agent seats beyond the existing five
- No conversational chat UI
- No AI-generated policy suggestions
- No Telegram bot frontend

---

## Milestone Table

| # | Milestone | Goal | Hours |
|---|-----------|------|-------|
| M1 | Policy & Spec Lock | Single policy module shared by scanner and verifier; threat-model README | 0–6 |
| M2 | Server-Side Gate | Browser cannot write execution events; all appends via API with verifier | 6–16 |
| M3 | Verifier Hardening | Veto-final, ordered-prefix, malformed-payload fail-closed | 16–24 |
| M4 | Black Box Modal + Tamper UX | Timeline-card design; in-UI tamper button with red propagation | 24–32 |
| M5 | Scanner-Policy Parity + OKX Skills | Same policy verdict; `okx-security` and `okx-onchain-gateway` in trace | 32–40 |
| M6 | Policy Console + Failure UI | Gated disable flow; timeout/error states; audit events for policy edits | 40–48 |
| M7 | X Layer Anchor | On-chain `session_hash` commitment; explorer link in UI | 48–54 |
| M8 | Demo Video + Submission | 90-second video; threat-model finalized; submission form | 54–60 |

---

## Milestone Details

### M1 — Policy & Spec Lock (Hours 0–6)

**Goal:** Lock the threat model and policy schema as the single source of truth.

**Implementation Scope:**
- Create `src/policy/index.ts` exporting shared policy constants and `evaluatePolicy()` function
- Scanner and verifier both import from this module (no duplicate cap constants)
- Create `docs/black-box-spec.md` defining event types, ordered semantics, veto-finality, signature scheme
- Create threat-model section mapping Freysa/AIXBT/BasisOS/Banana Gun/ElizaOS to specific gates

**Hard Review Gate:**
- `grep` confirms scanner and verifier import same policy module
- `docs/black-box-spec.md` exists with all required sections
- Threat-model maps all 5 named incidents to gates

**Commands/Checks:**
```bash
grep -r "from.*policy" src/ | grep -v node_modules
cat docs/black-box-spec.md | head -50
```

**Claude Review:** Threat-model completeness; spec clarity
**Codex Implementation:** Extract policy module; write spec skeleton
**Stop Condition:** Two copies of policy logic detected; any incident unmapped

---

### M2 — Server-Side Gate (Hours 6–16)

**Goal:** Browser cannot write `execution.signed_or_simulated`. All trace writes go through `127.0.0.1:4181/api/events`.

**Implementation Scope:**
- New API endpoint `POST /api/events` in `scripts/dev-app.mjs`
- Endpoint validates ordering + veto-finality + confirmation-precedes-execution
- Endpoint signs response with session key and appends to JSONL
- Refactor `web/src/main.tsx` to call API instead of building events locally
- Remove `appendDrafts` client-side event fabrication

**Hard Review Gate:**
- With server stopped, no UI action produces a new trace event
- Chaos test: 10 forged client-side writes → 10/10 rejected

**Commands/Checks:**
```bash
# Stop server, try to stage+confirm in browser, check events.jsonl unchanged
curl -X POST http://127.0.0.1:4181/api/events -d '{"forged": true}' # expect 4xx
```

**Claude Review:** "Executor may proceed" only renders on fresh server signature
**Codex Implementation:** API endpoint; client refactor; chaos test
**Stop Condition:** Any forged write lands in events.jsonl

---

### M3 — Verifier Hardening (Hours 16–24)

**Goal:** Veto is final; required events must precede execution in order; malformed payloads fail closed.

**Implementation Scope:**
- Refactor `validateExecutionGate` to walk events in order, not by `latestEvent()`
- Any `risk.verdict = veto` blocks regardless of later events
- `execution.signed_or_simulated` must have all required events at earlier indices
- Schema-validate payloads; schema errors return gate errors, not throws
- Add adversarial tests: veto-then-approve, execution-before-confirmation, malformed payload

**Hard Review Gate:**
- Test: `risk.veto → risk.approved` returns `allowed: false`
- Test: `execution` before `user.confirmed` returns `allowed: false`
- Test: malformed `allocation.sized` returns gate error, not exception

**Commands/Checks:**
```bash
npm test
node --test dist/tests/blackbox.test.js
```

**Claude Review:** Verifier logic matches spec; no edge cases missed
**Codex Implementation:** Verifier refactor; adversarial tests
**Stop Condition:** Any adversarial test fails; verifier throws on bad payload

---

### M4 — Black Box Modal + Tamper UX (Hours 24–32)

**Goal:** Replace raw `<pre>` with timeline-card design; ship in-UI tamper button.

**Implementation Scope:**
- New `BlackBoxTimeline` component with event cards
- Each card: decoded header, `prev_event_hash → event_hash` strip, expandable JSON
- Session-hash signature pill at top with signer fingerprint
- "Demonstrate tamper" button calls `POST /api/demo/tamper?eventIndex=N`
- Tamper mutates one event; verifier returns mismatch position
- Affected card + downstream cards flash red with diff
- "Restore" button next to tamper

**Hard Review Gate:**
- Non-engineer runs tamper demo unaided in under 30 seconds
- Red propagation visible within 1 second of tamper click

**Commands/Checks:**
```bash
npm run app
# Manual: Open Black Box modal → Tamper → see red → Restore → see green
```

**Claude Review:** Decoded headers use Anchorage pattern; hash strip visible; failure UI clear
**Codex Implementation:** Timeline component; tamper API; restore flow
**Stop Condition:** Tamper requires console steps; red not visible

---

### M5 — Scanner-Policy Parity + OKX Skills (Hours 32–40)

**Goal:** No `policy:allowed` ticket can violate the cap. Trace gains `okx-security` and `okx-onchain-gateway` events.

**Implementation Scope:**
- Scanner `evaluatePolicy` calls shared policy module (M1)
- Property test: 1,000 random orders near boundaries; scanner verdict = verifier verdict
- Add `okx-security` skill call before simulated execution
- Add `okx-onchain-gateway` simulation result hash as `quote.simulation` event
- Both skill response hashes bound into `prev_event_hash` chain

**Hard Review Gate:**
- Property test green 1,000/1,000
- `grep` of recent JSONL shows `risk.security_check` and `quote.simulation` in every execution

**Commands/Checks:**
```bash
npm test
grep "risk.security_check" blackbox/events.jsonl
grep "quote.simulation" blackbox/events.jsonl
```

**Claude Review:** Skill calls not decorative; hashes bound into chain
**Codex Implementation:** Scanner refactor; skill adapter; property test
**Stop Condition:** Property test mismatch; skill events missing from traces

---

### M6 — Policy Console + Failure UI (Hours 40–48)

**Goal:** Operator cannot disable safety gates without confirmation + audit event. All failure paths render explicit state.

**Implementation Scope:**
- Split policy panel: immutable policy (left) vs operator controls (right)
- Disabling `required_user_confirmation` or `required_trace_integrity` triggers modal
- Modal acceptance creates `policy.updated` trace event with operator id
- Red banner persists until re-enabled
- Timeouts on every fetch; abort-controller wiring
- Rate-limit/stale event in trace + countdown UI
- Integrity failure shows takeover modal with hash diff

**Hard Review Gate:**
- Manual checklist: (a) disable confirmation → see modal → accept → see banner + trace event
- (b) Kill OKX skill server → see rate-limit countdown
- (c) Force integrity failure → see takeover modal

**Commands/Checks:**
```bash
npm run app
# Manual: Toggle off confirmation, check trace for policy.updated event
grep "policy.updated" blackbox/events.jsonl
```

**Claude Review:** Copy doesn't blame operator; explains consequence
**Codex Implementation:** Panel split; modal flow; failure states; timeout wiring
**Stop Condition:** Any silent state; policy edit without trace event

---

### M7 — X Layer Anchor (Hours 48–54)

**Goal:** Eligible for "Most Active Agent" prize; on-chain `session_hash` commitment per demo session.

**Implementation Scope:**
- Minimal `SessionAnchor.sol` contract on X Layer with `commit(bytes32)`
- Backend signs and sends from funded deploy key after execution
- `chain.commitment` trace event with tx hash
- Explorer link in Mission Control footer
- Commitment failure logged but does not block simulated execution

**Hard Review Gate:**
- Explorer link resolves on X Layer
- Trace contains `chain.commitment` event with tx hash

**Commands/Checks:**
```bash
grep "chain.commitment" blackbox/events.jsonl
# Check explorer URL in browser
```

**Claude Review:** Copy distinguishes "session anchor" from "execution"
**Codex Implementation:** Contract; deploy script; commitment flow
**Stop Condition:** Explorer 404; tx hash missing from trace

---

### M8 — Demo Video + Submission (Hours 54–60)

**Goal:** 90-second video matching research §4 script; threat-model README; submission complete.

**Implementation Scope:**
- Record 90-second demo video per research script
- Finalize threat-model README mapping incidents to gates
- Update `demo/screenplay.md` to radar-first flow
- Complete submission form: X Layer deploy address + repo + video link
- Backup screen recording uploaded
- `make demo` brings up full stack including tamper button

**Hard Review Gate:**
- 3 cold viewers answer "what does this product do?" correctly (2/3 pass)
- Video uploaded; submission timestamp before deadline; cold-browser demo loads <5s

**Commands/Checks:**
```bash
npm run app
# Verify http://127.0.0.1:4173 loads in fresh browser
ls demo/recording.mp4
```

**Claude Review:** Video omits cut features; pitches distinct; README complete
**Codex Implementation:** Demo seed data deterministic; `make demo` script; property tests pass on fresh checkout
**Stop Condition:** Video missing; submission late; demo fails cold start

---

## Visible Terminal Progress Protocol

Progress will be shown in this terminal using the following format:

```
══════════════════════════════════════════════════════════════════════════
MILESTONE PROGRESS — PROVE THE BLACK BOX
══════════════════════════════════════════════════════════════════════════

[passed]      M1  Policy & Spec Lock
[in_progress] M2  Server-Side Gate
[planned]     M3  Verifier Hardening
[planned]     M4  Black Box Modal + Tamper UX
[planned]     M5  Scanner-Policy Parity + OKX Skills
[planned]     M6  Policy Console + Failure UI
[planned]     M7  X Layer Anchor
[planned]     M8  Demo Video + Submission

Last check: npm test → 14/14 passed
Next gate:  Chaos test — 10 forged writes rejected
══════════════════════════════════════════════════════════════════════════
```

Claude will update this checklist after each milestone gate passes or blocks. Codex will update `docs/sprints/SPRINT_PROGRESS.md` after completing implementation work.

---

## Codex /goal Prompt

The exact prompt to send to Codex via `/goal`:

```
/goal Implement the PROVE THE BLACK BOX sprint.

Context: You are the implementation lead. Claude Code is the product/architecture lead and reviewer. The sprint plan is at docs/sprints/PROVE_BLACK_BOX_SPRINT_PLAN.md.

Safety Rails (MUST follow):
- Do not inspect, print, copy, or summarize .env contents or secrets
- No real-funds/mainnet trading — sim/testnet only
- No destructive git commands (no git reset, checkout over user files, delete unrelated work)
- Stay focused on the sprint — no re-pivots away from the validated spine

Implementation Order:
1. M1: Extract shared policy module to src/policy/index.ts; both scanner and verifier import it
2. M2: Add POST /api/events endpoint in scripts/dev-app.mjs; refactor web/src/main.tsx to use it
3. M3: Refactor validateExecutionGate for veto-finality and ordered-prefix; add adversarial tests
4. M4: Build BlackBoxTimeline component; add tamper API endpoint; wire restore flow
5. M5: Scanner calls shared policy; add okx-security and okx-onchain-gateway skill events
6. M6: Split policy panel; add policy.updated events; wire failure states
7. M7: Deploy SessionAnchor.sol to X Layer; add chain.commitment event
8. M8: Finalize demo artifacts; ensure make demo works from fresh checkout

After Each Milestone:
- Update docs/sprints/SPRINT_PROGRESS.md with: milestone status, changed files, verification commands run, gate result
- Report any blockers immediately
- Do not proceed to next milestone if current gate fails

Hard Gates (each must pass before advancing):
- M1: grep confirms single policy import; spec file exists
- M2: chaos test 10/10 forged writes rejected
- M3: adversarial tests pass (veto-then-approve blocked, execution-before-confirm blocked, malformed fails closed)
- M4: non-engineer runs tamper demo in <30s
- M5: property test 1000/1000; skill events in every execution trace
- M6: manual checklist passes (disable → modal → banner → trace event)
- M7: explorer link resolves; chain.commitment in trace
- M8: submission before deadline; cold-browser demo loads <5s

Start with M1 now. Report changed files and verification commands after each milestone.
```

---

## Safety Rails (Binding)

- Do not inspect, print, copy, or summarize `.env` contents
- No real-funds/mainnet execution — sim/testnet only
- No destructive git commands
- Every execution claim must match implementation
- Policy edits must produce audit events
- Malformed payloads must fail closed, not throw
