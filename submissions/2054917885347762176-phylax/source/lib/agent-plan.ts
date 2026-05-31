export interface AgentPlan {
  goal: string;
  plan: string[];
  decisionMode: "risk_first";
  nextAction: "scan" | "quote_preview" | "ask_clarification" | "refuse";
}

export interface CandidateComparison {
  symbol: string;
  chain: string;
  riskLevel: string;
  isBlocked: boolean;
  reason: string;
  quoteAvailable: boolean;
  recommendation: "avoid" | "review" | "quote_preview";
}
