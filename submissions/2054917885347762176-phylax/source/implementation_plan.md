# PhylaX Premium UI Redesign — Implementation Plan

## Current State Assessment

The UI already has a solid foundation:
- Working sidebar with 5 main views (Agent, Portfolio, Activity, Settings, About)
- Agent Console with 5 tabs (Chat, Analysis, Signals, Execution, Wallet)
- Mobile bottom nav with 4 items
- Theme toggle (dark/light)
- Chat with SSE streaming, Markdown rendering via react-markdown + rehype-sanitize
- Pipeline cards (QuoteCard, RiskResultCard, TradePlanCard) inside chat
- PortfolioPanel with live balance fetching
- All execution logic (QuoteCard → /api/execute → wallet signing) working

## Key Issues to Fix

### Typography & Readability
1. **Inconsistent heading sizes** — some panels use `text-lg`, others `text-xl`, Portfolio uses `text-3xl`
2. **Low contrast text** — `var(--app-text-tertiary)` and opacity modifiers making text too faint
3. **Skill tags** too small (`text-[9px]`) and low contrast
4. **Missing font-display on numbers** — portfolio values should use `tabular-nums`

### Visual Hierarchy & Spacing
1. **Card consistency** — Analysis/Signals cards use inline styles vs app-card utility
2. **Section spacing** not uniform across panels
3. **Pipeline step connectors** (ExecutionPanel) feel disconnected
4. **Agent tab chips** missing on mobile inside Agent Console

### Navigation & Mobile
1. **Mobile Agent tabs** need horizontal scrollable chips
2. **About** missing from mobile nav (should nest in Settings)
3. **Sidebar footer** version text too small

### Card Design
1. **QuoteCard** mixes Tailwind `text-foreground` with inline oklch — needs unification
2. **RiskResultCard** risk meter bar needs better visibility
3. **PortfolioPanel** sparkline placeholder needs visual polish

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Break execution flow | LOW | CRITICAL | Not touching QuoteCard logic, only visual props |
| Break chat streaming | LOW | HIGH | ChatPanel changes are CSS-only + layout |
| Mobile layout regression | MEDIUM | MEDIUM | Test mobile nav carefully |
| Theme inconsistency | LOW | LOW | Use CSS variables consistently |
| Build failure | LOW | HIGH | Run `tsc --noEmit` after changes |

## Implementation Order

1. **globals.css** — Enhance design tokens, improve contrast, add new utility classes
2. **ChatMessage.tsx** — Improve markdown rendering styles, heading hierarchy in prose
3. **AppSidebar.tsx** — Mobile agent tab chips, polish nav indicators
4. **app/page.tsx** — Add mobile agent tab bar inside Agent Console
5. **AnalysisPanel.tsx** — Premium card redesign
6. **SignalsPanel.tsx** — Premium card redesign
7. **ExecutionPanel.tsx** — Better pipeline visualization
8. **AgentWalletPanel.tsx** — Polish preview state
9. **PortfolioPanel.tsx** — Improve number readability, card hierarchy
10. **ActivityPanel.tsx** — Better empty states
11. **SettingsPanel.tsx** — Add Billing/API preview sections
12. **AboutPanel.tsx** — Polish roadmap cards
13. **QuoteCard.tsx** — Visual polish only (no logic changes)
14. **RiskResultCard.tsx** — Improve contrast
15. **TradePlanCard.tsx** — Visual consistency

## Files NOT Modified
- `app/api/execute/route.ts` — Execution logic
- `lib/risk-policy.ts` — Risk checks
- `lib/approval-store.ts` — Approval persistence
- `lib/privy-auth.ts` — Auth logic
- `lib/tools/registry.ts` — Tool registry
- All test files
- All API routes
