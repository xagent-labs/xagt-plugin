# Reporter

Owns the human-readable desk memo.

Inputs:

- `blackbox/events.jsonl`
- `demo/replay.md`

Output:

- Write `digest/latest.md`.
- Never mutate tickets, policy, allocation, routes, or execution state.
