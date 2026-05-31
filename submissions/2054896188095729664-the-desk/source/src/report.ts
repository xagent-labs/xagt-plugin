import type { BlackBoxEvent } from "./types.js";

export function renderDigest(events: BlackBoxEvent[]): string {
  const vetoes = events.filter((event) => event.type === "risk.verdict" && event.payload.verdict === "veto");
  const approvals = events.filter((event) => event.type === "risk.verdict" && event.payload.verdict === "approved");
  const executions = events.filter((event) => event.type === "execution.signed_or_simulated");

  return `# Agentic Wallet Ops Center Daily Memo

## Summary

- Candidates reviewed: ${events.filter((event) => event.type === "candidate.created").length}
- Risk vetoes: ${vetoes.length}
- Risk approvals: ${approvals.length}
- Executions: ${executions.length}

## Wallet Black Box

Every wallet-affecting decision passed through the Black Box event trace. Executor actions are labeled as signed or simulated via OKX Agentic Wallet.

## Notable Tickets

${renderTickets(events)}
`;
}

function renderTickets(events: BlackBoxEvent[]): string {
  const ticketIds = [...new Set(events.map((event) => event.ticket_id))].sort();
  return ticketIds
    .map((ticketId) => {
      const ticketEvents = events.filter((event) => event.ticket_id === ticketId);
      const last = ticketEvents.at(-1);
      return `- ${ticketId}: ${last?.summary ?? "no activity"}`;
    })
    .join("\n");
}
