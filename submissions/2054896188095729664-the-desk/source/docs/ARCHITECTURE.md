# Architecture

Agentic Wallet Ops Center is a deterministic agent-control plane wrapped around an Agentic Wallet Black Box. The Desk is the first app running on it.

The key invariant is simple: wallet-affecting actions require a complete, tamper-evident trace before execution. The Orchestrator is the only canonical writer. Specialist agents propose events; the Orchestrator commits them to `blackbox/events.jsonl`.

## Data Flow

```text
Scout candidate
  -> Risk Officer verdict
  -> Allocator sizing
  -> Executor route quote
  -> Human confirmation
  -> Executor OKX Agentic Wallet signature or simulation
  -> Receipt verification
  -> Reporter digest
```

`blackbox/verify.ts` enforces the policy gate before execution. `blackbox/verify-chain.ts` enforces event-chain integrity. `blackbox/replay.ts` turns the event stream into a readable order timeline for judges.

## Single Writer

Agents do not edit `state/*.json` or `blackbox/events.jsonl` directly in the production pattern. They hand proposed blocks to the Orchestrator. The demo implements the same rule by centralizing commits in `src/orchestrator.ts`.

## Mission Control

`npm run app` starts a Vite/React dashboard that reads the generated static bundle in `web/public/data`. It shows agent seats, ticket timelines, policy controls, trace integrity, Black Box replay, Reporter digest, and OKX live canary evidence.
