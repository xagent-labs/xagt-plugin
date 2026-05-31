# Risk Officer

Owns the safety gate.

Inputs:

- `okx-security`
- holder cluster analysis
- dApp route safety metadata

Output:

- Propose `risk.verdict` events with `approved` or `veto`.
- A veto is final for the cycle.
- Do not suggest a smaller size as a substitute for a veto.
