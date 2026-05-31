export type EventType =
  | "candidate.created"
  | "risk.security_check"
  | "risk.verdict"
  | "allocation.sized"
  | "route.quoted"
  | "quote.simulation"
  | "user.confirmed"
  | "execution.signed_or_simulated"
  | "receipt.verified"
  | "policy.updated"
  | "chain.commitment"
  | "report.digest";

export type AgentName =
  | "Scout"
  | "Risk Officer"
  | "Allocator"
  | "Executor"
  | "Reporter"
  | "Yield Manager"
  | "Orchestrator";

export type SigningMode = "simulated" | "xlayer-testnet" | "mainnet-capped";
export type ExecutionMode = "fixture" | "live-read" | "calldata" | "xlayer-testnet" | "mainnet-capped";
export type IntegrityStatus = "valid" | "invalid";

export interface BlackBoxEvent {
  event_id: string;
  session_id: string;
  ticket_id: string;
  timestamp: string;
  agent: AgentName;
  type: EventType;
  summary: string;
  input_hash: string;
  prev_event_hash: string;
  event_hash: string;
  integrity_status?: IntegrityStatus;
  okx_skill?: string;
  payload: Record<string, unknown>;
}

export interface BlackBoxPolicy {
  maxPositionPct: number;
  maxSlippageBps: number;
  maxQuoteAgeSeconds?: number;
  allowedChains: string[];
  signingMode: SigningMode;
  executionMode: ExecutionMode;
  realFundsCapUsd: number;
  requiresUserConfirmation: boolean;
  requiresTraceIntegrity: boolean;
  requiredEventsBeforeExecution: EventType[];
}

export interface ValidationResult {
  allowed: boolean;
  errors: string[];
  warnings: string[];
}

export interface ChainVerificationResult {
  valid: boolean;
  eventCount: number;
  sessionId: string | null;
  sessionHash: string | null;
  lastEventHash: string | null;
  errors: string[];
}

export interface DemoPaths {
  eventsPath: string;
  policyPath: string;
  digestPath: string;
  replayPath: string;
  dashboardDataDir?: string;
}

export type OpportunityStatus = "ready" | "proposed" | "watch" | "blocked";
export type OpportunityAction = "quote-buy" | "limit-buy" | "watch" | "avoid";
export type OpportunityCategory = "new-launch" | "trending" | "blue-chip" | "blocked-risk" | "demo";
export type SourceMode = "okx-scout" | "live-scout" | "degraded-pool-fallback" | "demo-snapshot";

export interface OpportunityEvidence {
  source: string;
  skill: string;
  summary: string;
  timestamp?: string;
}

export interface OpportunityMetrics {
  priceUsd?: number;
  marketCapUsd?: number;
  liquidityUsd?: number;
  volumeUsd?: number;
  freshness_minutes?: number;
  inflowUsd?: number;
  holders?: number;
  top10HolderPercent?: number;
  triggerWalletCount?: number;
  signalAmountUsd?: number;
  soldRatioPercent?: number;
  priceChangePct?: number;
  bondingPercent?: number;
  buyTxCount1h?: number;
  sellTxCount1h?: number;
  priceImpactPercent?: number;
  estimatedGasFee?: string;
}

export interface OpportunityRisk {
  level: "low" | "medium" | "high" | "blocked";
  verdict: "allow" | "review" | "block";
  reasons: string[];
}

export interface OpportunityPolicyVerdict {
  allowed: boolean;
  reasons: string[];
}

export interface ProposedOrder {
  mode: "quote-only" | "market-swap-capped" | "strategy-order" | "watch-only";
  fromAsset: string;
  toAsset: string;
  amountUsd: number;
  slippageBps: number;
  quoteStatus: "quoted" | "not-quoted" | "unavailable";
  quoteFreshenedAt?: string;
  route?: string;
}

export interface Opportunity {
  id: string;
  ticketId: string;
  status: OpportunityStatus;
  action: OpportunityAction;
  actionLabel: string;
  symbol: string;
  name?: string;
  chain: string;
  chainIndex: string;
  tokenAddress: string;
  source: string;
  thesis: string;
  invalidation: string;
  confidence: number;
  score: number;
  freshness: string;
  metrics: OpportunityMetrics;
  risk: OpportunityRisk;
  policy: OpportunityPolicyVerdict;
  proposedOrder: ProposedOrder;
  evidence: OpportunityEvidence[];
  category?: OpportunityCategory;
}

export interface CandidateCluster {
  cluster_id: string;
  symbol: string;
  chain: string;
  primary_address: string;
  addresses: string[];
  pool_count: number;
  contract_count: number;
  aggregated_metrics: OpportunityMetrics;
  top_evidence: OpportunityEvidence[];
  risk: OpportunityRisk;
  policy: OpportunityPolicyVerdict;
  status: OpportunityStatus;
  score: number;
  category?: OpportunityCategory;
  sourceMode_hint?: SourceMode;
  member_ids?: string[];
  quoteStatus?: ProposedOrder["quoteStatus"];
  proposedOrder: ProposedOrder;
  notReadyReasons: string[];
  cross_chain_siblings?: CrossChainSibling[];
  actionLabel?: string;
}

export interface CrossChainSibling {
  chain: string;
  chain_address: string;
  pool_count: number;
  contract_count: number;
  liquidityUsd?: number;
  volumeUsd?: number;
  score: number;
  status: OpportunityStatus;
}

export interface OpportunityScan {
  generatedAt: string;
  mode: "live" | "live-degraded" | "fixture-fallback";
  sourceMode: SourceMode;
  summary: {
    scannedSources: string[];
    opportunityCount: number;
    readyCount: number;
    blockedCount: number;
    clusterCount?: number;
    defaultClusterCount?: number;
  };
  opportunities: Opportunity[];
  clusters: CandidateCluster[];
  defaultClusterIds: string[];
  sourceHealth: Array<{
    name: string;
    ok: boolean;
    command: string;
    error?: string;
    detail?: string;
    cached?: boolean;
  }>;
}

export type TicketState =
  | "proposed"
  | "staged"
  | "quoted"
  | "confirmed"
  | "submitted"
  | "filled"
  | "canceled"
  | "failed";

export type OrderSide = "buy" | "sell";
export type OrderType = "limit" | "post_only";
export type OrderVenue = "okx-cex" | "okx-dex" | "fixture";
export type ExecutionAdapterMode =
  | "fixture"
  | "live_read"
  | "calldata"
  | "xlayer_testnet"
  | "cex_paper"
  | "cex_live_capped"
  | "dex_mainnet_capped";

export interface Ticket {
  ticket_id: string;
  opportunity_id?: string;
  symbol: string;
  chain: string;
  state: TicketState;
  side: OrderSide;
  notional_usd: number;
  created_at: string;
  updated_at: string;
  reasoning?: string;
  evidence_skills: string[];
}

export interface Order {
  order_id: string;
  ticket_id: string;
  cl_ord_id: string;
  venue: OrderVenue;
  mode: ExecutionAdapterMode;
  side: OrderSide;
  type: OrderType;
  instrument: string;
  qty: number;
  price?: number;
  notional_usd: number;
  state: TicketState;
  external_id?: string;
  degraded?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Fill {
  fill_id: string;
  order_id: string;
  ticket_id: string;
  qty: number;
  price: number;
  notional_usd: number;
  fees_usd: number;
  timestamp: string;
}

export interface Position {
  symbol: string;
  chain: string;
  qty: number;
  avg_price: number;
  notional_usd: number;
  realized_pnl_usd: number;
  unrealized_pnl_usd: number;
  updated_at: string;
}

export interface DeskState {
  schema_version: 1;
  tickets: Ticket[];
  orders: Order[];
  fills: Fill[];
  positions: Position[];
  updated_at: string;
}
