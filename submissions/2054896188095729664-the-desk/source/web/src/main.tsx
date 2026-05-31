import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileText,
  FileCheck2,
  Gauge,
  ListChecks,
  LockKeyhole,
  Newspaper,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import "./styles.css";

type EventType =
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

type AgentName = "Scout" | "Risk Officer" | "Allocator" | "Executor" | "Reporter" | "Yield Manager" | "Orchestrator";
type ExecutionMode = "fixture" | "live-read" | "calldata" | "xlayer-testnet" | "mainnet-capped";
type AdapterMode = "fixture" | "live_read" | "calldata" | "xlayer_testnet" | "cex_paper" | "cex_live_capped" | "dex_mainnet_capped";
type TicketState = "proposed" | "staged" | "quoted" | "confirmed" | "submitted" | "filled" | "canceled" | "failed";
type OrderSide = "buy" | "sell";
type OrderType = "limit" | "post_only";

interface BlackBoxEvent {
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
  okx_skill?: string;
  payload: Record<string, unknown>;
}

interface Policy {
  maxPositionPct: number;
  maxSlippageBps: number;
  allowedChains: string[];
  signingMode: string;
  executionMode: ExecutionMode;
  realFundsCapUsd: number;
  requiresUserConfirmation: boolean;
  requiresTraceIntegrity: boolean;
  requiredEventsBeforeExecution: EventType[];
}

interface Integrity {
  valid: boolean;
  eventCount: number;
  sessionId: string | null;
  sessionHash: string | null;
  lastEventHash: string | null;
  errors: string[];
}

interface GateResult {
  allowed: boolean;
  errors: string[];
  warnings: string[];
}

interface DashboardData {
  events: BlackBoxEvent[];
  policy: Policy;
  integrity: Integrity;
  replay: string;
  digest: string;
  okxEvidence: string;
  opportunityScan: OpportunityScan;
}

interface TamperState {
  active: boolean;
  eventIndex?: number;
  firstInvalidIndex?: number | null;
  errors: string[];
  diff?: {
    field: string;
    before: string;
    after: string;
  };
}

interface TraceUpdateResponse {
  ok: true;
  events: BlackBoxEvent[];
  integrity: Integrity;
  replay: string;
  digest: string;
  tamper?: TamperState;
}

interface TraceRestoreBaseline {
  events: BlackBoxEvent[];
  integrity: Integrity;
  replay: string;
  digest: string;
}

interface EventAppendResponse extends TraceUpdateResponse {
  appended: BlackBoxEvent[];
  signature: string;
}

interface PolicyChangeRequest {
  key: keyof Policy;
  label: string;
  previousValue: Policy[keyof Policy];
  nextValue: Policy[keyof Policy];
  nextPolicy: Policy;
  requiresAcknowledgement: boolean;
}

interface FailureNotice {
  label: string;
  error: string;
  retryIn: number;
}

interface WalletCeremony {
  ticketId: string;
  symbol: string;
  status: "verifying" | "signing" | "success" | "error";
  message: string;
}

interface TradeIntent {
  symbol: string;
  side: "buy" | "sell";
  chain: string;
  sizeUsd: number;
  slippageBps: number;
  riskProfile: "clean" | "risky";
}

interface EventDraft {
  ticket_id: string;
  agent: AgentName;
  type: EventType;
  summary: string;
  okx_skill?: string;
  payload: Record<string, unknown>;
}

interface RawEventDraft {
  ticket_id: string;
  agent: AgentName;
  type: string;
  summary: string;
  okx_skill?: string;
  payload: Record<string, unknown>;
}

interface DeskTicket {
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
  evidence_skills?: string[];
}

interface DeskOrder {
  order_id: string;
  ticket_id: string;
  cl_ord_id: string;
  venue: "okx-cex" | "okx-dex" | "fixture";
  mode: AdapterMode;
  side: OrderSide;
  type: OrderType;
  instrument: string;
  qty: number;
  price?: number;
  notional_usd: number;
  state: TicketState;
  degraded: boolean;
  created_at: string;
  updated_at: string;
  external_id?: string;
}

interface DeskFill {
  fill_id: string;
  order_id: string;
  ticket_id: string;
  qty: number;
  price: number;
  notional_usd: number;
  fees_usd: number;
  timestamp: string;
}

interface DeskPosition {
  symbol: string;
  chain: string;
  qty: number;
  avg_price: number;
  notional_usd: number;
  realized_pnl_usd: number;
  unrealized_pnl_usd: number;
  updated_at: string;
}

interface DeskState {
  schema_version: number;
  tickets: DeskTicket[];
  orders: DeskOrder[];
  fills: DeskFill[];
  positions: DeskPosition[];
  updated_at: string;
}

interface BlotterResponse {
  ok: boolean;
  state: DeskState;
  summary: {
    ticket_count: number;
    open_tickets: number;
    filled_tickets: number;
    order_count: number;
    fill_count: number;
    position_count: number;
    realized_pnl_usd: number;
  };
  integrity: Pick<Integrity, "valid" | "lastEventHash" | "sessionHash">;
  caps: {
    maxNotionalUsd: number;
    dailyNotionalCapUsd: number;
    instrumentAllowlist: string[];
  };
}

interface ReasoningResult {
  status: "idle" | "loading" | "ready" | "error";
  text: string;
  source: "llm" | "template";
  reason_for_degrade?: string;
  model?: string;
  error?: string;
}

interface EthereumProvider {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
}

interface WalletState {
  provider: EthereumProvider | null;
  providerName: "okxwallet" | "ethereum" | null;
  address: string | null;
  chainId: string | null;
  status: "unavailable" | "available" | "connecting" | "connected" | "signing" | "error";
  message: string | null;
}

interface OrderTicketDraft {
  opportunityId: string;
  clusterId?: string;
  symbol: string;
  chain: string;
  side: OrderSide;
  type: OrderType;
  instrument: string;
  qty: number;
  price: number;
  notionalUsd: number;
  reasonText?: string;
}

declare global {
  interface Window {
    okxwallet?: EthereumProvider;
    ethereum?: EthereumProvider;
    __deskMockWalletError?: (error: unknown, chainId?: string) => void;
  }
}

interface OpportunityScan {
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
  clusters?: CandidateCluster[];
  defaultClusterIds?: string[];
  sourceHealth: Array<{ name: string; ok: boolean; command: string; error?: string; detail?: string; cached?: boolean }>;
}

type SourceMode = "okx-scout" | "live-scout" | "degraded-pool-fallback" | "demo-snapshot";

interface CandidateCluster {
  cluster_id: string;
  symbol: string;
  chain: string;
  primary_address: string;
  addresses: string[];
  pool_count: number;
  contract_count: number;
  aggregated_metrics: Record<string, number | string | undefined>;
  top_evidence: Opportunity["evidence"];
  risk: Opportunity["risk"];
  policy: Opportunity["policy"];
  status: Opportunity["status"];
  score: number;
  category?: Opportunity["category"];
  sourceMode_hint?: SourceMode;
  member_ids?: string[];
  quoteStatus?: Opportunity["proposedOrder"]["quoteStatus"];
  proposedOrder: Opportunity["proposedOrder"];
  notReadyReasons: string[];
  cross_chain_siblings?: Array<{
    chain: string;
    chain_address: string;
    pool_count: number;
    contract_count: number;
    liquidityUsd?: number;
    volumeUsd?: number;
    score: number;
    status: Opportunity["status"];
  }>;
  actionLabel?: string;
}

interface Opportunity {
  id: string;
  ticketId: string;
  status: "ready" | "proposed" | "watch" | "blocked";
  action: "quote-buy" | "limit-buy" | "watch" | "avoid";
  actionLabel: string;
  symbol: string;
  name?: string;
  chain: string;
  chainIndex?: string;
  tokenAddress: string;
  source: string;
  thesis: string;
  invalidation: string;
  confidence: number;
  score: number;
  freshness: string;
  metrics: Record<string, number | string | undefined>;
  risk: { level: "low" | "medium" | "high" | "blocked"; verdict: "allow" | "review" | "block"; reasons: string[] };
  policy: { allowed: boolean; reasons: string[] };
  proposedOrder: {
    mode: "quote-only" | "market-swap-capped" | "strategy-order" | "watch-only";
    fromAsset: string;
    toAsset: string;
    amountUsd: number;
    slippageBps: number;
    quoteStatus: "quoted" | "not-quoted" | "unavailable";
    quoteFreshenedAt?: string;
    route?: string;
  };
  evidence: Array<{ source: string; skill: string; summary: string; timestamp?: string }>;
  category?: "new-launch" | "trending" | "blue-chip" | "blocked-risk" | "demo";
  cluster?: CandidateCluster;
}

const seats: AgentName[] = ["Scout", "Risk Officer", "Allocator", "Executor", "Yield Manager", "Reporter"];
const chainOptions = ["X Layer", "Solana", "Base", "Ethereum"];
type ModalView = "book" | "tickets" | "agents" | "policy" | "replay" | "digest" | "evidence" | "manual" | "opportunity" | "keymap" | null;
type RadarTab = "new-launches" | "trending" | "blue-chips" | "demo";
const radarTabs: Array<{ id: RadarTab; label: string }> = [
  { id: "new-launches", label: "New Launches" },
  { id: "trending", label: "Trending" },
  { id: "blue-chips", label: "Blue Chips" },
  { id: "demo", label: "Fixture Story" },
];
const XLAYER_TESTNET_HEX = "0x7a0";
const XLAYER_TESTNET_PARAMS = {
  chainId: XLAYER_TESTNET_HEX,
  chainName: "X Layer testnet",
  rpcUrls: ["https://xlayertestrpc.okx.com"],
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  blockExplorerUrls: ["https://www.okx.com/web3/explorer/xlayer-test"],
};

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<BlackBoxEvent[]>([]);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [activeTicket, setActiveTicket] = useState("ticket_clean_xlayer");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [isRefreshingScan, setIsRefreshingScan] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [radarTab, setRadarTab] = useState<RadarTab>("new-launches");
  const [watchedScoutIds, setWatchedScoutIds] = useState<Set<string>>(() => new Set());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [tamperState, setTamperState] = useState<TamperState | null>(null);
  const [isTampering, setIsTampering] = useState(false);
  const [modalView, setModalView] = useState<ModalView>(null);
  const [pendingPolicyChange, setPendingPolicyChange] = useState<PolicyChangeRequest | null>(null);
  const [failureNotice, setFailureNotice] = useState<FailureNotice | null>(null);
  const [dismissedIntegrityHash, setDismissedIntegrityHash] = useState<string | null>(null);
  const [walletCeremony, setWalletCeremony] = useState<WalletCeremony | null>(null);
  const [wallet, setWallet] = useState<WalletState>({
    provider: null,
    providerName: null,
    address: null,
    chainId: null,
    status: "unavailable",
    message: null,
  });
  const [blotter, setBlotter] = useState<BlotterResponse | null>(null);
  const [blotterError, setBlotterError] = useState<string | null>(null);
  const [reasoningByOpportunity, setReasoningByOpportunity] = useState<Record<string, ReasoningResult>>({});
  const [orderTicket, setOrderTicket] = useState<OrderTicketDraft | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const traceRestoreBaseline = useRef<TraceRestoreBaseline | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<BlackBoxEvent[]>("/data/events.json"),
      fetchJson<Policy>("/data/policy.json"),
      fetchJson<Integrity>("/data/integrity.json"),
      fetchText("/data/replay.md"),
      fetchText("/data/digest.md"),
      fetchText("/data/okx-canary.md"),
      fetchJson<OpportunityScan>("/data/opportunities.json"),
    ]).then(([events, loadedPolicy, integrity, replay, digest, okxEvidence, opportunityScan]) => {
      setData({ events, policy: loadedPolicy, integrity, replay, digest, okxEvidence, opportunityScan });
      setEvents(events);
      setPolicy(loadedPolicy);
      const firstTicket = ticketIds(events).find((ticket) => ticket.includes("clean")) ?? ticketIds(events)[0];
      if (firstTicket) setActiveTicket(firstTicket);
      setSelectedOpportunityId(firstRadarOpportunity(opportunityScan, "new-launches")?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const detected = detectWalletProvider();
    setWallet((current) => ({
      ...current,
      provider: detected.provider,
      providerName: detected.name,
      status: detected.provider ? "available" : "unavailable",
      message: detected.provider ? null : "Install OKX Wallet to connect",
    }));
  }, []);

  useEffect(() => {
    window.__deskMockWalletError = (error: unknown, chainId?: string) => {
      setWallet((current) => ({
        ...current,
        chainId: chainId ?? current.chainId,
        status: current.address ? "connected" : "error",
        message: formatWalletError(error, chainId ?? current.chainId, "Signature request failed"),
      }));
    };
    return () => {
      delete window.__deskMockWalletError;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const next = await fetchBlotter();
        if (cancelled) return;
        setBlotter(next);
        setBlotterError(null);
      } catch (error) {
        if (cancelled) return;
        setBlotterError(error instanceof Error ? error.message : String(error));
      }
    };
    void load();
    const id = window.setInterval(load, 2_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!failureNotice) return undefined;
    if (failureNotice.retryIn <= 0) return undefined;
    const id = window.setTimeout(() => {
      setFailureNotice((current) => (current ? { ...current, retryIn: Math.max(0, current.retryIn - 1) } : current));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [failureNotice]);

  const workingIntegrity = useMemo(() => {
    if (!data) return null;
    return buildWorkingIntegrity(events, data.integrity);
  }, [data, events]);
  const tickets = useMemo(() => ticketIds(events), [events]);
  const gate = useMemo(() => {
    if (!workingIntegrity || !policy) return { allowed: false, errors: ["Loading policy"], warnings: [] };
    return evaluateGate(activeTicket, events, policy, workingIntegrity);
  }, [activeTicket, events, policy, workingIntegrity]);

  const applyTraceUpdate = (result: TraceUpdateResponse) => {
    setEvents(result.events);
    setData((current) =>
      current
        ? {
            ...current,
            events: result.events,
            integrity: result.integrity,
            replay: result.replay,
            digest: result.digest,
          }
        : current,
    );
    if (result.tamper) {
      setTamperState(result.tamper);
    } else if (result.integrity.valid) {
      setTamperState(null);
    }
    if (result.integrity.valid) {
      setDismissedIntegrityHash(null);
    }
  };

  const reportOperationFailure = (label: string, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    setFailureNotice({ label, error: message, retryIn: 15 });
    return message;
  };

  const appendDrafts = async (drafts: EventDraft[], nextActiveTicket?: string) => {
    if (drafts.length === 0) {
      if (nextActiveTicket) setActiveTicket(nextActiveTicket);
      return true;
    }
    try {
      const result = await postEventDrafts(drafts);
      applyTraceUpdate(result);
      setFailureNotice(null);
      if (nextActiveTicket) setActiveTicket(nextActiveTicket);
      return true;
    } catch (error) {
      setActionMessage(`Black Box API rejected event append: ${reportOperationFailure("Black Box API", error)}`);
      return false;
    }
  };

  const resetWorkingEvents = () => {
    if (!data) return;
    setEvents(data.events);
    const firstTicket = ticketIds(data.events).find((ticket) => ticket.includes("clean")) ?? ticketIds(data.events)[0];
    if (firstTicket) setActiveTicket(firstTicket);
    setActionMessage(null);
    setTamperState(null);
  };

  const demonstrateTamper = async (eventIndex: number) => {
    setIsTampering(true);
    try {
      if (data && workingIntegrity?.valid) {
        traceRestoreBaseline.current = {
          events,
          integrity: workingIntegrity,
          replay: data.replay,
          digest: data.digest,
        };
      }
      const result = await postTamper(eventIndex);
      applyTraceUpdate(result);
      setFailureNotice(null);
      setActionMessage(`Tamper demo changed event ${eventIndex + 1}; trace integrity is now invalid.`);
    } catch (error) {
      setActionMessage(`Tamper demo failed: ${reportOperationFailure("Tamper demo", error)}`);
    } finally {
      setIsTampering(false);
    }
  };

  const restoreTamper = async () => {
    setIsTampering(true);
    try {
      const result = await postRestore();
      applyTraceUpdate(result);
      traceRestoreBaseline.current = null;
      setFailureNotice(null);
      setActionMessage("Black Box trace restored.");
    } catch (error) {
      const baseline = traceRestoreBaseline.current;
      if (baseline) {
        setEvents(baseline.events);
        setData((current) =>
          current
            ? {
                ...current,
                events: baseline.events,
                integrity: baseline.integrity,
                replay: baseline.replay,
                digest: baseline.digest,
              }
            : current,
        );
        setTamperState(null);
        setDismissedIntegrityHash(null);
        setFailureNotice(null);
        setActionMessage("Black Box trace restored from local baseline after the server snapshot was unavailable.");
        traceRestoreBaseline.current = null;
      } else {
        setActionMessage(`Restore failed: ${reportOperationFailure("Restore trace", error)}`);
      }
    } finally {
      setIsTampering(false);
    }
  };

  const refreshLiveScan = async () => {
    setIsRefreshingScan(true);
    setRefreshError(null);
    try {
      const response = await apiFetch("/api/scan", { method: "POST" });
      if (!response.ok) {
        throw new Error((await response.text()) || `refresh failed with ${response.status}`);
      }
      const opportunityScan = (await response.json()) as OpportunityScan;
      setData((current) => (current ? { ...current, opportunityScan } : current));
      setSelectedOpportunityId(firstRadarOpportunity(opportunityScan, radarTab)?.id ?? null);
      setFailureNotice(null);
      setActionMessage(scannerModeMessage(opportunityScan));
    } catch (error) {
      setRefreshError(reportOperationFailure("Market scan", error));
    } finally {
      setIsRefreshingScan(false);
    }
  };

  const stageOpportunity = async (opportunity: Opportunity) => {
    if (!policy) return;
    const ticketEvents = events.filter((event) => event.ticket_id === opportunity.ticketId);
    const drafts = missingDraftsForTicket(opportunityDrafts(opportunity, policy, { confirm: false, execute: false }), ticketEvents);
    if (drafts.length > 0) {
      const appended = await appendDrafts(drafts, opportunity.ticketId);
      if (!appended) return;
    } else {
      setActiveTicket(opportunity.ticketId);
    }
    setActionMessage(`${opportunity.symbol} staged into the Black Box. Executor remains blocked until confirmation.`);
  };

  const simulateOpportunity = async (opportunity: Opportunity) => {
    if (!policy) return;
    if (opportunity.status !== "ready") {
      await stageOpportunity(opportunity);
      setActionMessage(`${opportunity.symbol} is not ready. The Black Box staged the ticket but did not simulate signing.`);
      return;
    }
    setWalletCeremony({
      ticketId: opportunity.ticketId,
      symbol: opportunity.symbol,
      status: "verifying",
      message: "Verifying gates before wallet simulation.",
    });
    await wait(550);
    const ticketEvents = events.filter((event) => event.ticket_id === opportunity.ticketId);
    const drafts = missingDraftsForTicket(opportunityDrafts(opportunity, policy, { confirm: true, execute: true }), ticketEvents);
    setWalletCeremony({
      ticketId: opportunity.ticketId,
      symbol: opportunity.symbol,
      status: "signing",
      message: "Simulating OKX Agentic Wallet signature.",
    });
    await wait(650);
    if (drafts.length > 0) {
      const appended = await appendDrafts(drafts, opportunity.ticketId);
      if (!appended) {
        setWalletCeremony({
          ticketId: opportunity.ticketId,
          symbol: opportunity.symbol,
          status: "error",
          message: "The Black Box rejected the wallet simulation.",
        });
        return;
      }
    } else {
      setActiveTicket(opportunity.ticketId);
    }
    setWalletCeremony({
      ticketId: opportunity.ticketId,
      symbol: opportunity.symbol,
      status: "success",
      message: "Simulation complete. No mainnet funds were touched.",
    });
    setActionMessage(`${opportunity.symbol} confirmed and simulated via OKX Agentic Wallet. No mainnet funds were touched.`);
  };

  const handlePolicyChange = (request: PolicyChangeRequest) => {
    if (request.requiresAcknowledgement) {
      setPendingPolicyChange(request);
      return;
    }
    const previousPolicy = policy;
    setPolicy(request.nextPolicy);
    if (
      previousPolicy &&
      (request.key === "requiresUserConfirmation" || request.key === "requiresTraceIntegrity") &&
      request.nextValue === true
    ) {
      void policyUpdatedDraft(previousPolicy, request.nextPolicy, request, true).then((draft) => appendDrafts([draft]));
    }
  };

  const acceptPolicyChange = async () => {
    if (!policy || !pendingPolicyChange) return;
    const accepted = pendingPolicyChange;
    const auditDraft = await policyUpdatedDraft(policy, accepted.nextPolicy, accepted, true);
    const appended = await appendDrafts([auditDraft]);
    if (!appended) return;
    setPolicy(accepted.nextPolicy);
    setPendingPolicyChange(null);
    setActionMessage(`${accepted.label} disabled with policy.updated audit event.`);
  };

  const disabledSafetyGates = [
    !policy?.requiresUserConfirmation ? "Human confirmation disabled" : null,
    !policy?.requiresTraceIntegrity ? "Trace integrity disabled" : null,
  ].filter(Boolean) as string[];
  const anchorEvent = useMemo(() => [...events].reverse().find((event) => event.type === "chain.commitment"), [events]);
  const effectiveOpportunityScan = useMemo(
    () => (data?.opportunityScan ? (radarTab === "demo" ? demoOpportunityScan(data.opportunityScan) : data.opportunityScan) : null),
    [data?.opportunityScan, radarTab],
  );
  const visibleRadarOpportunities = useMemo(
    () => (effectiveOpportunityScan ? radarRowsForTab(effectiveOpportunityScan, radarTab) : []),
    [effectiveOpportunityScan, radarTab],
  );

  const selectedOpportunity =
    visibleRadarOpportunities.find((opportunity) => opportunity.id === selectedOpportunityId) ??
    visibleRadarOpportunities[0] ??
    (effectiveOpportunityScan ? radarRowsForTab(effectiveOpportunityScan, "new-launches").find((opportunity) => opportunity.id === selectedOpportunityId) : null) ??
    effectiveOpportunityScan?.opportunities[0] ??
    null;
  const selectedReasoning = selectedOpportunity ? reasoningByOpportunity[selectedOpportunity.id] ?? null : null;
  const uiExecutionMode = getUiExecutionMode(policy);
  const selectedTicketEvents = selectedOpportunity ? events.filter((event) => event.ticket_id === selectedOpportunity.ticketId) : [];
  const selectedTicketGate = selectedOpportunity ? scoutTicketGate(selectedOpportunity, effectiveOpportunityScan.sourceMode) : null;

  const connectWallet = async () => {
    if (!wallet.provider) return;
    setWallet((current) => ({ ...current, status: "connecting", message: "Requesting wallet connection..." }));
    try {
      const accounts = await wallet.provider.request<string[]>({ method: "eth_requestAccounts" });
      const chainId = await wallet.provider.request<string>({ method: "eth_chainId" });
      const address = accounts[0] ?? null;
      if (!address) throw new Error("wallet returned no account");
      setWallet((current) => ({ ...current, address, chainId, status: "connected", message: null }));
    } catch (error) {
      setWallet((current) => ({
        ...current,
        status: "error",
        message: formatWalletError(error, current.chainId, "Connect request failed"),
      }));
    }
  };

  const switchToXLayer = async () => {
    if (!wallet.provider) return;
    try {
      await wallet.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: XLAYER_TESTNET_HEX }],
      });
      const chainId = await wallet.provider.request<string>({ method: "eth_chainId" });
      setWallet((current) => ({ ...current, chainId, status: current.address ? "connected" : "available", message: "Wallet switched to X Layer testnet 1952." }));
    } catch (switchError) {
      if (walletErrorCode(switchError) === 4902) {
        try {
          await wallet.provider.request({
            method: "wallet_addEthereumChain",
            params: [XLAYER_TESTNET_PARAMS],
          });
          const chainId = await wallet.provider.request<string>({ method: "eth_chainId" });
          setWallet((current) => ({ ...current, chainId, status: current.address ? "connected" : "available", message: "X Layer testnet 1952 added." }));
          return;
        } catch (addError) {
          setWallet((current) => ({
            ...current,
            status: current.address ? "connected" : "available",
            message: formatWalletError(addError, current.chainId, "Could not add X Layer testnet"),
          }));
          return;
        }
      }
      setWallet((current) => ({
        ...current,
        status: current.address ? "connected" : "available",
        message: formatWalletError(switchError, current.chainId, "Could not switch network"),
      }));
    }
  };

  const signReceipt = async () => {
    if (!wallet.provider || !wallet.address) return;
    setWallet((current) => ({ ...current, status: "signing", message: "Requesting receipt signature..." }));
    try {
      const latest = await fetchBlotter();
      setBlotter(latest);
      const sessionHash = latest.integrity.sessionHash;
      if (!sessionHash) throw new Error("Black Box session tip hash is missing");
      const sessionHex = sessionHash.startsWith("sha256:") ? `0x${sessionHash.slice("sha256:".length)}` : sessionHash;
      const message = `The Desk · session tip ${sessionHex}`;
      const signature = await wallet.provider.request<string>({
        method: "personal_sign",
        params: [message, wallet.address],
      });
      const ticketId = latest.state.tickets.at(-1)?.ticket_id ?? activeTicket ?? "desk_wallet";
      const draft: RawEventDraft = {
        ticket_id: ticketId,
        agent: "Reporter",
        type: "wallet.receipt.signed",
        summary: `wallet.receipt.signed ${shortAddress(wallet.address)} over ${shortHash(sessionHash)}`,
        okx_skill: "okx-agentic-wallet",
        payload: {
          address: wallet.address,
          signature,
          sessionHash,
          message,
          chainId: wallet.chainId,
          provider: wallet.providerName,
        },
      };
      const result = await postWalletReceiptDraft(draft);
      applyTraceUpdate(result);
      setFailureNotice(null);
      setWallet((current) => ({ ...current, status: "connected", message: "Receipt signature recorded in the trace." }));
      setActionMessage("Wallet receipt signature recorded in the Black Box.");
    } catch (error) {
      setWallet((current) => ({
        ...current,
        status: current.address ? "connected" : "error",
        message: formatWalletError(error, current.chainId, "Signature request failed"),
      }));
    }
  };

  const openOrderTicket = () => {
    if (!selectedOpportunity) return;
    openOrderTicketFor(selectedOpportunity);
  };

  const openOrderTicketFor = (opportunity: Opportunity) => {
    const sourceMode = effectiveOpportunityScan?.sourceMode ?? "demo-snapshot";
    const gate = scoutTicketGate(opportunity, sourceMode);
    setSelectedOpportunityId(opportunity.id);
    setOrderError(gate.allowed ? null : `Cannot execute: ${gate.reasons.slice(0, 3).join("; ")}`);
    const reasoning = reasoningByOpportunity[opportunity.id] ?? null;
    setOrderTicket(orderDraftFromOpportunity(opportunity, reasoning));
  };

  const handleScoutAction = (opportunity: Opportunity) => {
    const sourceMode = effectiveOpportunityScan?.sourceMode ?? "demo-snapshot";
    const cta = scoutCta(opportunity, sourceMode);
    setSelectedOpportunityId(opportunity.id);
    if (cta.kind === "prepare") {
      openOrderTicketFor(opportunity);
      return;
    }
    if (cta.kind === "watch") {
      setWatchedScoutIds((current) => new Set(current).add(opportunity.id));
      setActionMessage(`${opportunity.symbol} added to the session watchlist.`);
      return;
    }
    setActionMessage(`${opportunity.symbol}: investigate evidence before any ticket workflow.`);
  };

  const updateOrderTicket = <K extends keyof OrderTicketDraft>(key: K, value: OrderTicketDraft[K]) => {
    setOrderTicket((current) => (current ? { ...current, [key]: value } : current));
  };

  const submitOrderTicket = async () => {
    if (!orderTicket || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    setOrderError(null);
    try {
      const ticketResult = await postTicket({
        opportunity_id: orderTicket.opportunityId,
        cluster_id: orderTicket.clusterId,
        symbol: orderTicket.symbol,
        chain: orderTicket.chain,
        side: orderTicket.side,
        notional_usd: orderTicket.notionalUsd,
        reasoning: orderTicket.reasonText,
        evidence_skills: selectedOpportunity?.evidence.map((item) => item.skill) ?? [],
      });
      const mode = normalizeAdapterMode(uiExecutionMode);
      const orderResult = await postOrder({
        ticket_id: ticketResult.ticket.ticket_id,
        venue: mode === "calldata" || mode === "xlayer_testnet" || mode === "dex_mainnet_capped" ? "okx-dex" : "fixture",
        mode,
        side: orderTicket.side,
        type: orderTicket.type,
        instrument: orderTicket.instrument,
        qty: orderTicket.qty,
        price: orderTicket.price,
        notional_usd: orderTicket.notionalUsd,
        degraded: mode === "fixture",
      });
      const nextBlotter = await fetchBlotter();
      setBlotter(nextBlotter);
      setOrderTicket(null);
      setFailureNotice(null);
      setActionMessage(`Order ${orderResult.order.order_id} submitted in ${mode} mode.`);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const loadReasoningFor = (opportunity: Opportunity, force = false) => {
    const current = reasoningByOpportunity[opportunity.id];
    if (!force && current && current.status !== "idle") return;
    if (isFixtureOpportunity(opportunity)) {
      setReasoningByOpportunity((previous) => ({
        ...previous,
        [opportunity.id]: {
          status: "ready",
          text: `${opportunity.symbol} is a fixture fallback row for demo mode. Use it to test policy, ticket, and wallet-proof surfaces; live execution still waits for a quality public-source candidate.`,
          source: "template",
          reason_for_degrade: "fixture fallback",
        },
      }));
      return;
    }
    setReasoningByOpportunity((previous) => ({
      ...previous,
      [opportunity.id]: {
        status: "loading",
        text: "Loading agent reasoning...",
        source: previous[opportunity.id]?.source ?? "template",
      },
    }));
    postReasoningWithTimeout(opportunity.id, 6_000)
      .then((result) => {
        setReasoningByOpportunity((previous) => ({
          ...previous,
          [opportunity.id]: {
            status: "ready",
            text: result.reasoning,
            source: result.source === "llm" ? "llm" : "template",
            model: result.model,
            reason_for_degrade: result.reason_for_degrade,
          },
        }));
      })
      .catch((error) => {
        const reason = error instanceof Error ? error.message : String(error);
        setReasoningByOpportunity((previous) => ({
          ...previous,
          [opportunity.id]: {
            status: "error",
            text: `Reasoning unavailable — ${reason}`,
            source: "template",
            reason_for_degrade: reason,
            error: reason,
          },
        }));
      });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (event.key === "?") {
        event.preventDefault();
        setModalView("keymap");
        return;
      }
      if (event.key === "Escape") {
        if (orderTicket) {
          event.preventDefault();
          setOrderTicket(null);
          return;
        }
        if (modalView) {
          event.preventDefault();
          setModalView(null);
        }
        return;
      }
      if (key === "j" || key === "k") {
        if (!visibleRadarOpportunities.length) return;
        event.preventDefault();
        const opportunities = visibleRadarOpportunities;
        const currentIndex = Math.max(0, opportunities.findIndex((opportunity) => opportunity.id === selectedOpportunityId));
        const nextIndex = key === "j" ? Math.min(opportunities.length - 1, currentIndex + 1) : Math.max(0, currentIndex - 1);
        setSelectedOpportunityId(opportunities[nextIndex]?.id ?? selectedOpportunityId);
        return;
      }
      if (key === "n") {
        event.preventDefault();
        openOrderTicket();
        return;
      }
      if (!orderTicket && key === "b") {
        event.preventDefault();
        setModalView("book");
        return;
      }
      if (orderTicket && key === "b") {
        event.preventDefault();
        updateOrderTicket("side", "buy");
        return;
      }
      if (orderTicket && key === "s") {
        event.preventDefault();
        updateOrderTicket("side", "sell");
        return;
      }
      if (orderTicket && event.key === "Enter") {
        event.preventDefault();
        void submitOrderTicket();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visibleRadarOpportunities, modalView, orderTicket, selectedOpportunityId, selectedOpportunity, selectedReasoning, uiExecutionMode, isSubmittingOrder]);

  useEffect(() => {
    if (!visibleRadarOpportunities.length) return;
    if (!visibleRadarOpportunities.some((opportunity) => opportunity.id === selectedOpportunityId)) {
      setSelectedOpportunityId(visibleRadarOpportunities[0]?.id ?? null);
    }
  }, [visibleRadarOpportunities, selectedOpportunityId]);

  if (!data || !policy || !workingIntegrity || !effectiveOpportunityScan) {
    return <div className="loading">Loading Agentic Wallet Ops Center...</div>;
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="cockpit-head">
          <div className="cockpit-title">
            <p className="eyebrow">Agent trading cockpit</p>
            <h1>The Desk</h1>
          </div>
          <div className={`source-mode-banner compact ${effectiveOpportunityScan.sourceMode}`}>{sourceModeBanner(effectiveOpportunityScan)}</div>
          <div className="cockpit-menu">
            <HeaderWalletStatus wallet={wallet} onConnect={connectWallet} />
            <button type="button" className="secondary-action" onClick={() => setModalView("book")}>
              <ListChecks size={16} />
              Book
            </button>
            <button type="button" className="secondary-action" onClick={() => setRadarTab((tab) => (tab === "demo" ? "new-launches" : "demo"))}>
              <Search size={16} />
              Fixture Story
            </button>
            <button type="button" className="secondary-action" onClick={() => setModalView("policy")}>
              <SlidersHorizontal size={16} />
              Settings
            </button>
          </div>
        </header>

        {disabledSafetyGates.length > 0 ? <SafetyBanner disabledSafetyGates={disabledSafetyGates} /> : null}
        {failureNotice ? <FailureBanner notice={failureNotice} onDismiss={() => setFailureNotice(null)} /> : null}

        <section className="cockpit-proof-strip">
          <SelectedProofCard
            opportunity={selectedOpportunity}
            ticketEvents={selectedTicketEvents}
            ticketGate={selectedTicketGate}
            integrity={workingIntegrity}
            anchorEvent={anchorEvent}
            onOpenTrace={() => setModalView("replay")}
          />
          <ExecutionStatusLine scan={effectiveOpportunityScan} selected={selectedOpportunity} gate={selectedTicketGate} wallet={wallet} />
        </section>

        <OpportunityRadar
          scan={effectiveOpportunityScan}
          events={events}
          selectedId={selectedOpportunityId}
          setSelectedId={setSelectedOpportunityId}
          activeTab={radarTab}
          onTabChange={setRadarTab}
          onRefresh={refreshLiveScan}
          isRefreshing={isRefreshingScan}
          refreshError={refreshError}
          actionMessage={actionMessage}
          watchedScoutIds={watchedScoutIds}
          ceremony={walletCeremony}
          onReview={() => selectedOpportunity ? openOrderTicketFor(selectedOpportunity) : undefined}
          reasoning={selectedReasoning}
          onRetryReasoning={() => selectedOpportunity ? loadReasoningFor(selectedOpportunity, true) : undefined}
          onOpenPolicy={() => setModalView("policy")}
          onScoutAction={handleScoutAction}
          wallet={wallet}
        />
      </section>

      <AppModal view={modalView} onClose={() => setModalView(null)} title={modalTitle(modalView)}>
        {modalView === "book" ? <OperationsGrid blotter={blotter} error={blotterError} onNewOrder={() => setModalView("manual")} /> : null}
        {modalView === "tickets" ? (
          <TicketModal
            tickets={tickets}
            events={events}
            activeTicket={activeTicket}
            setActiveTicket={setActiveTicket}
            policy={policy}
            integrity={workingIntegrity}
          />
        ) : null}
        {modalView === "agents" ? (
          <div className="seat-grid modal-grid">
            {seats.map((seat) => (
              <AgentSeat key={seat} seat={seat} events={events} />
            ))}
          </div>
        ) : null}
        {modalView === "policy" ? (
          <PolicyPanel
            policy={policy}
            gate={gate}
            disabledSafetyGates={disabledSafetyGates}
            onPolicyChange={handlePolicyChange}
          />
        ) : null}
        {modalView === "replay" ? (
          <BlackBoxTimeline
            events={events}
            integrity={workingIntegrity}
            tamper={tamperState}
            isBusy={isTampering}
            onTamper={demonstrateTamper}
            onRestore={restoreTamper}
          />
        ) : null}
        {modalView === "digest" ? <DigestCards events={events} integrity={workingIntegrity} scan={effectiveOpportunityScan} /> : null}
        {modalView === "evidence" ? <EvidenceCards events={events} scan={effectiveOpportunityScan} okxEvidence={data.okxEvidence} /> : null}
        {modalView === "manual" ? (
          <TradeConsole
            events={events}
            policy={policy}
            integrity={workingIntegrity}
            appendDrafts={appendDrafts}
            setActiveTicket={setActiveTicket}
            resetWorkingEvents={resetWorkingEvents}
          />
        ) : null}
        {modalView === "opportunity" && selectedOpportunity ? (
          <OpportunityCard
            opportunity={selectedOpportunity}
            ticketEvents={selectedTicketEvents}
            sourceHealth={effectiveOpportunityScan.sourceHealth}
            ceremony={walletCeremony}
            reasoning={selectedReasoning}
            onRetryReasoning={() => loadReasoningFor(selectedOpportunity, true)}
            onStage={stageOpportunity}
            onSimulate={simulateOpportunity}
            onOpenPolicy={() => setModalView("policy")}
            sourceMode={effectiveOpportunityScan.sourceMode}
          />
        ) : null}
        {modalView === "keymap" ? <KeymapModal /> : null}
      </AppModal>
      {orderTicket ? (
        <OrderTicketModal
          draft={orderTicket}
          caps={blotter?.caps ?? defaultCaps()}
          state={blotter?.state ?? emptyDeskState()}
          error={orderError}
          isSubmitting={isSubmittingOrder}
          onUpdate={updateOrderTicket}
          onClose={() => setOrderTicket(null)}
          onSubmit={() => void submitOrderTicket()}
          opportunity={selectedOpportunity}
          sourceMode={effectiveOpportunityScan.sourceMode}
          ticketEvents={selectedTicketEvents}
          wallet={wallet}
          integrity={workingIntegrity}
          anchorEvent={anchorEvent}
          onConnectWallet={connectWallet}
          onSwitchXLayer={switchToXLayer}
          onSignReceipt={signReceipt}
          onStartCeremony={() => selectedOpportunity ? void simulateOpportunity(selectedOpportunity) : undefined}
        />
      ) : null}
      {pendingPolicyChange ? (
        <PolicyChangeModal
          change={pendingPolicyChange}
          onCancel={() => setPendingPolicyChange(null)}
          onAccept={acceptPolicyChange}
        />
      ) : null}
      {!workingIntegrity.valid && dismissedIntegrityHash !== (workingIntegrity.lastEventHash ?? workingIntegrity.sessionHash ?? "invalid") ? (
        <IntegrityTakeoverModal
          integrity={workingIntegrity}
          onOpenBlackBox={() => {
            setModalView("replay");
            setDismissedIntegrityHash(workingIntegrity.lastEventHash ?? workingIntegrity.sessionHash ?? "invalid");
          }}
          onRestore={restoreTamper}
          onDismiss={() => setDismissedIntegrityHash(workingIntegrity.lastEventHash ?? workingIntegrity.sessionHash ?? "invalid")}
        />
      ) : null}
    </main>
  );
}

function Panel(props: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-title">
        {props.icon}
        <h2>{props.title}</h2>
      </div>
      {props.children}
    </section>
  );
}

function ProofCard({
  events,
  integrity,
  gate,
  anchorEvent,
  onOpenTrace,
  compact = false,
}: {
  events: BlackBoxEvent[];
  integrity: Integrity;
  gate: GateResult;
  anchorEvent?: BlackBoxEvent;
  onOpenTrace?: () => void;
  compact?: boolean;
}) {
  const anchorUrl = anchorExplorerUrl(anchorEvent);
  const txHash = typeof anchorEvent?.payload.txHash === "string" ? anchorEvent.payload.txHash : null;
  const anchorSubmitted = String(anchorEvent?.payload.status ?? "") === "submitted";
  const hasRisk = events.some((event) => event.type === "risk.verdict");
  const hasPolicy = gate.allowed || gate.errors.length > 0;
  const hasConfirmation = events.some((event) => event.type === "user.confirmed");
  return (
    <section className={`proof-card ${compact ? "compact" : ""} ${integrity.valid ? "valid" : "invalid"}`}>
      <div className="proof-main">
        <strong>Black Box: {integrity.valid ? "Verified" : "Invalid"}</strong>
        <span>{integrity.eventCount || events.length} events verified</span>
      </div>
      <div className="proof-pills">
        <ProofPill ok={hasPolicy && gate.allowed} label={gate.allowed ? "Policy passed" : "Policy blocked"} />
        <ProofPill ok={hasRisk && !gate.errors.some((error) => /risk/i.test(error))} label={hasRisk ? "Risk passed" : "Risk missing"} />
        <ProofPill ok={hasConfirmation} label={hasConfirmation ? "User confirmed" : "User missing"} />
        <ProofPill ok={anchorSubmitted} label={anchorSubmitted ? "Anchored on X Layer" : "Not anchored"} />
        <ProofPill ok={integrity.valid} label={integrity.valid ? "Integrity valid" : "Integrity invalid"} />
      </div>
      <div className="proof-actions">
        {anchorUrl && txHash ? (
          <a href={anchorUrl} target="_blank" rel="noreferrer">
            Anchor: {shortAddress(txHash)}
          </a>
        ) : null}
        {onOpenTrace ? (
          <button type="button" className="reasoner-link" onClick={onOpenTrace}>
            Show technical trace
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ProofPill({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`proof-pill ${ok ? "ok" : "warn"}`}>{label}</span>;
}

function HeaderWalletStatus({ wallet, onConnect }: { wallet: WalletState; onConnect: () => void }) {
  const installed = Boolean(wallet.provider);
  const connected = Boolean(wallet.address);
  const label = connected
    ? `OKX Wallet ${shortAddress(wallet.address)}`
    : installed
      ? "Connect OKX Wallet"
      : "OKX Wallet not installed";
  return (
    <button
      type="button"
      className={`wallet-status-button ${connected ? "connected" : installed ? "available" : "missing"}`}
      onClick={onConnect}
      disabled={!installed || connected || wallet.status === "connecting"}
      title={installed ? "OKX Wallet is available for the review flow" : "Install OKX Wallet to connect during the demo"}
    >
      <WalletCards size={16} />
      <span>{wallet.status === "connecting" ? "Connecting OKX Wallet..." : label}</span>
    </button>
  );
}

function SelectedProofCard({
  opportunity,
  ticketEvents,
  ticketGate,
  integrity,
  anchorEvent,
  onOpenTrace,
}: {
  opportunity: Opportunity | null;
  ticketEvents: BlackBoxEvent[];
  ticketGate: { allowed: boolean; reasons: string[] } | null;
  integrity: Integrity;
  anchorEvent?: BlackBoxEvent;
  onOpenTrace?: () => void;
}) {
  const traceStarted = ticketEvents.length > 0;
  const allowed = Boolean(ticketGate?.allowed);
  const blockers = ticketGate?.reasons ?? ["No selected ticket"];
  const anchorSubmitted = String(anchorEvent?.payload.status ?? "") === "submitted";
  const hasConfirmation = ticketEvents.some((event) => event.type === "user.confirmed");
  const hasOkxEvidence = opportunity ? opportunityHasOkxEvidence(opportunity) : false;
  const quoteReady = opportunity?.proposedOrder.quoteStatus === "quoted";
  const title = opportunity ? `${opportunity.symbol} gate: ${allowed ? "Ready" : "Blocked"}` : "Selected gate: No ticket";
  const traceCopy = traceStarted ? `${ticketEvents.length} selected-ticket events` : "No selected-ticket trace yet";
  return (
    <section className={`proof-card selected-proof-card ${allowed ? "valid" : "invalid"}`}>
      <div className="proof-main">
        <strong>{title}</strong>
        <span>{traceCopy}</span>
      </div>
      <div className="proof-pills">
        <ProofPill ok={allowed} label={allowed ? "Can review execution" : "Execution blocked"} />
        <ProofPill ok={hasOkxEvidence} label={hasOkxEvidence ? "OKX evidence present" : "Needs OKX evidence"} />
        <ProofPill ok={quoteReady} label={quoteReady ? "Quote ready" : "Quote missing"} />
        <ProofPill ok={hasConfirmation} label={hasConfirmation ? "User confirmed" : "User not confirmed"} />
        <ProofPill ok={anchorSubmitted} label={anchorSubmitted ? "Anchored on X Layer" : "Not anchored"} />
        <ProofPill ok={integrity.valid} label={integrity.valid ? "Session integrity valid" : "Integrity invalid"} />
      </div>
      <div className="proof-actions">
        <span className="proof-reason">{allowed ? "Black Box may proceed to wallet review." : blockers.slice(0, 2).join(" · ")}</span>
        {onOpenTrace ? (
          <button type="button" className="reasoner-link" onClick={onOpenTrace}>
            Show technical trace
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ExecutionStatusLine({
  scan,
  selected,
  gate,
  wallet,
}: {
  scan: OpportunityScan;
  selected: Opportunity | null;
  gate: { allowed: boolean; reasons: string[] } | null;
  wallet: WalletState;
}) {
  const okx = okxEnrichmentHealth(scan.sourceHealth);
  const okxState = okx?.ok ? "live" : `gated${okx?.error ? ` (${shortSourceReason(okx.error)})` : ""}`;
  const quote = selected?.proposedOrder.quoteStatus ?? "unavailable";
  const decision = gate?.allowed ? "agent can trade" : `blocked: ${(gate?.reasons ?? ["no selected ticket"])[0]}`;
  const walletState = wallet.address ? `connected ${shortAddress(wallet.address)}` : wallet.provider ? "detected, not connected" : "not installed";
  return (
    <div className="execution-status-line">
      <span>OKX scout: {okxState}</span>
      <span>Quote: {quote}</span>
      <span>OKX Wallet: {walletState}</span>
      <strong>{decision}</strong>
    </div>
  );
}

function VerdictPill({ label, ok, text, tone }: { label: string; ok?: boolean; text: string; tone?: "allow" | "review" | "block" }) {
  const nextTone = tone ?? (ok ? "allow" : "block");
  return (
    <span className={`verdict-pill ${nextTone}`}>
      {label}: {text}
    </span>
  );
}

function RiskPill({ opportunity }: { opportunity: Opportunity }) {
  const state = opportunity.risk.verdict === "allow" && opportunity.status === "ready" ? "allow" : opportunity.status === "blocked" || opportunity.risk.verdict === "block" ? "blocked" : "watch";
  const label = state === "allow" ? "ALLOW" : state === "blocked" ? "BLOCKED" : "WATCH";
  return <span className={`risk-pill ${state}`}>{label}</span>;
}

function displayGateVerdicts(opportunity: Opportunity, ticketGate: { allowed: boolean; reasons: string[] }) {
  const riskBlocked = opportunity.risk.verdict === "block" || opportunity.risk.level === "blocked" || opportunity.status === "blocked";
  const policyBlocked = !opportunity.policy.allowed;
  const blockedByExecutionGate = !ticketGate.allowed;
  return {
    riskTone: riskBlocked ? "block" as const : blockedByExecutionGate ? "review" as const : "allow" as const,
    riskText: riskBlocked ? "BLOCK" : blockedByExecutionGate ? "REVIEW" : "ALLOW",
    policyTone: policyBlocked ? "block" as const : blockedByExecutionGate ? "review" as const : "allow" as const,
    policyText: policyBlocked ? "BLOCK" : blockedByExecutionGate ? "PENDING" : "PASS",
  };
}

function agentThesisBullets(opportunity: Opportunity, blockers: string[]) {
  const evidenceSummary = opportunity.evidence[0]?.summary;
  const volume = formatCompact(opportunity.metrics.volumeUsd);
  const liquidity = formatCompact(opportunity.metrics.liquidityUsd);
  const whyNow = evidenceSummary || `24h volume $${volume} against $${liquidity} liquidity in the live scout feed.`;
  const riskVerdict = opportunity.risk.verdict === "allow" && blockers.length === 0 ? "ALLOW" : opportunity.status === "blocked" ? "BLOCKED" : "WATCH";
  const riskReason = blockers[0] ?? opportunity.risk.reasons[0] ?? "clean preflight";
  const riskCheck = `${riskVerdict} — ${riskVerdict === "ALLOW" ? "clean preflight" : riskReason}`;
  const proposedAction = `${opportunity.proposedOrder.fromAsset === "USDC" ? "Buy" : "Trade"} ${opportunity.symbol} (${opportunity.chain}) · $${opportunity.proposedOrder.amountUsd} capped · quote: ${opportunity.proposedOrder.quoteStatus}`;
  return { whyNow, riskCheck, proposedAction };
}

function okxExecutionLine(sourceHealth: OpportunityScan["sourceHealth"], opportunity: Opportunity) {
  const okx = okxEnrichmentHealth(sourceHealth);
  const okxState = okx?.ok ? "live" : `gated${okx?.error ? `: ${shortSourceReason(okx.error)}` : ""}`;
  return `OKX scout: ${okxState} · Quote: ${opportunity.proposedOrder.quoteStatus}`;
}

function opportunityHasOkxEvidence(opportunity: Opportunity) {
  const evidence = [...(opportunity.evidence ?? []), ...(opportunity.cluster?.top_evidence ?? [])];
  return evidence.some((item) => /okx|onchainos|wallet/i.test(`${item.source} ${item.skill}`));
}

function OkxSkillPipeline({
  sourceHealth,
  opportunity,
  wallet,
  sourceMode,
}: {
  sourceHealth: OpportunityScan["sourceHealth"];
  opportunity: Opportunity;
  wallet: WalletState;
  sourceMode: SourceMode;
}) {
  const okx = okxEnrichmentHealth(sourceHealth);
  const signalState = sourceMode === "okx-scout" ? "okx live" : sourceMode === "demo-snapshot" ? "fixture story" : "public live";
  const securityState = opportunity.evidence.some((item) => /security|trenches/i.test(item.skill)) ? "checked" : okx?.ok ? "available" : "gated";
  const quoteState = opportunity.proposedOrder.quoteStatus === "quoted" ? "quoted" : "not quoted";
  const walletState = wallet.address ? "connected" : wallet.provider ? "detected" : "not installed";
  const anchorState = sourceMode === "demo-snapshot" ? "simulated" : "pending";
  const steps = [
    { label: "Signals", value: signalState, ok: sourceMode !== "degraded-pool-fallback" },
    { label: "Security", value: securityState, ok: securityState === "checked" || securityState === "available" },
    { label: "DEX Quote", value: quoteState, ok: quoteState === "quoted" },
    { label: "Agentic Wallet", value: walletState, ok: walletState === "connected" || walletState === "detected" },
    { label: "X Layer Anchor", value: anchorState, ok: anchorState === "simulated" },
  ];
  return (
    <div className="okx-skill-pipeline" aria-label="OKX skill pipeline">
      {steps.map((step) => (
        <span key={step.label} className={`okx-skill-step ${step.ok ? "ok" : "pending"}`}>
          <strong>{step.label}</strong>
          <em>{step.value}</em>
        </span>
      ))}
    </div>
  );
}

function agentActionText(opportunity: Opportunity, fallback: string) {
  if (fallback === "Prepare ticket") return "Prepare ticket";
  if (opportunity.status === "blocked") return "Investigate risk cluster";
  if (fallback === "Watch") return `Watch ${opportunity.symbol}`;
  return `Investigate ${opportunity.symbol}`;
}

function percentClass(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "numeric muted";
  return number >= 0 ? "numeric positive" : "numeric negative";
}

function CommandDock({
  events,
  activeTicket,
  gate,
  integrity,
  policy,
  scan,
  anchorEvent,
  wallet,
  mode,
  onOpen,
}: {
  events: BlackBoxEvent[];
  activeTicket: string;
  gate: GateResult;
  integrity: Integrity;
  policy: Policy;
  scan: OpportunityScan;
  anchorEvent?: BlackBoxEvent;
  wallet: WalletState;
  mode: string;
  onOpen: (view: ModalView) => void;
}) {
  const openTickets = ticketIds(events).length;
  return (
    <section className="command-dock">
      <button type="button" onClick={() => onOpen("tickets")}>
        <ListChecks size={18} />
        <span>Tickets</span>
        <strong>{openTickets}</strong>
      </button>
      <button type="button" onClick={() => onOpen("policy")}>
        <ShieldCheck size={18} />
        <span>Policy</span>
        <strong>{gate.allowed ? "Open" : "Blocked"}</strong>
      </button>
      <button type="button" onClick={() => onOpen("replay")}>
        <LockKeyhole size={18} />
        <span>Black Box</span>
        <strong>{integrity.valid ? "Valid" : "Invalid"}</strong>
      </button>
      <button type="button" onClick={() => onOpen("digest")}>
        <Newspaper size={18} />
        <span>Digest</span>
        <strong>{scan.summary.readyCount} ready</strong>
      </button>
      <button type="button" onClick={() => onOpen("evidence")}>
        <ShieldCheck size={18} />
        <span>Evidence</span>
        <strong>{scan.mode}</strong>
      </button>
      <div className="dock-status">
        <div>
          <span>{activeTicket}</span>
          <strong>{modeDisplayLabel(mode || policy.executionMode)}</strong>
        </div>
        <div>
          <span>Wallet</span>
          <strong>{wallet.address ? shortAddress(wallet.address) : "not connected"}</strong>
        </div>
        <SessionAnchorStatus event={anchorEvent} />
      </div>
    </section>
  );
}

function SessionAnchorStatus({ event, compact = false }: { event?: BlackBoxEvent; compact?: boolean }) {
  const status = String(event?.payload.status ?? "not-started");
  const explorerUrl = typeof event?.payload.explorerUrl === "string" ? event.payload.explorerUrl : null;
  const txHash = typeof event?.payload.txHash === "string" ? event.payload.txHash : null;
  const label =
    status === "submitted"
      ? compact
        ? "X Layer anchored"
        : `X Layer anchored ${shortHash(txHash)}`
      : status === "not-configured"
        ? compact
          ? "Local proof mode"
          : "Fixture mode: Local proof only"
        : status === "failed"
          ? "Anchor failed"
          : compact
            ? "Local proof mode"
            : "Fixture mode: Local proof only";

  if (explorerUrl) {
    return (
      <a className={`anchor-status ${compact ? "compact" : ""} submitted`} href={explorerUrl} target="_blank" rel="noreferrer">
      <ExternalLink size={compact ? 12 : 14} />
        <span>{label} ✓</span>
      </a>
    );
  }
  return (
    <span className={`anchor-status ${compact ? "compact" : ""} ${status}`}>
      <LockKeyhole size={compact ? 12 : 14} />
      <span>{label}</span>
    </span>
  );
}

function ReasoningPanel({
  reasoning,
  fallback,
  compact = false,
  onRetry,
}: {
  reasoning: ReasoningResult | null;
  fallback: string;
  compact?: boolean;
  onRetry: () => void;
}) {
  const status = reasoning?.status ?? "loading";
  const text = status === "ready" || status === "error" ? reasoning?.text ?? fallback : "Loading agent reasoning...";
  const source = reasoning?.source ?? "template";
  const reason = reasoning?.reason_for_degrade ?? reasoning?.error ?? (source === "template" ? "deterministic template fallback" : "live model reasoning");
  return (
    <section className={`reasoning-panel ${compact ? "compact" : ""}`}>
      <div className="section-title-row">
        <h4>Reasoning</h4>
        <span className={`reasoning-pill ${source}`} title={reason}>
          {source === "llm" ? "LLM" : "TEMPLATE"}
        </span>
      </div>
      <p>{text}</p>
      {status === "error" ? (
        <button type="button" className="secondary-action compact-action" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </section>
  );
}

function OperationsGrid({ blotter, error, onNewOrder }: { blotter: BlotterResponse | null; error: string | null; onNewOrder: () => void }) {
  const state = blotter?.state ?? emptyDeskState();
  const orders = state.orders.length > 0 ? state.orders : demoOrders();
  const positions = state.positions.length > 0 ? state.positions : demoPositions();
  const usingDemo = state.orders.length === 0;
  return (
    <section className="operations-grid" aria-label="Order blotter and positions">
      <div className="ops-panel">
        <div className="ops-head">
          <div>
            <p className="eyebrow">Execution Blotter</p>
            <h2>Orders</h2>
          </div>
          <div className="ops-head-actions">
            {usingDemo ? <span className="mode-badge">DEMO PREVIEW</span> : null}
            <button type="button" className="primary-action compact-action" onClick={onNewOrder} title="Keyboard shortcut: n">
              New order ticket (n)
            </button>
            <span className={`mode-badge ${blotter?.integrity.valid === false ? "failed" : ""}`}>{blotter ? `${orders.length} orders` : "polling"}</span>
          </div>
        </div>
        {error ? <div className="radar-message blocked">Blotter API unavailable: {error}</div> : null}
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>State</th>
                <th>Instrument</th>
                <th>Side</th>
                <th className="numeric">Qty</th>
                <th className="numeric">Price</th>
                <th className="numeric">Notional</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                  <tr key={order.order_id}>
                    <td>
                      <StateBadge state={order.state} />
                    </td>
                    <td>
                      <strong>{order.instrument}</strong>
                      <span>{order.mode}</span>
                    </td>
                    <td>{order.side}</td>
                    <td className="numeric">{formatNumber(order.qty)}</td>
                    <td className="numeric">{order.price ? formatMoney(order.price) : "n/a"}</td>
                    <td className="numeric">{formatMoney(order.notional_usd)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ops-panel">
        <div className="ops-head">
          <div>
            <p className="eyebrow">Positions</p>
            <h2>Book</h2>
          </div>
          <span className="mode-badge">{positions.length} positions</span>
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table positions-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Chain</th>
                <th className="numeric">Qty</th>
                <th className="numeric">Avg price</th>
                <th className="numeric">Realized PnL</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                  <tr key={`${position.symbol}-${position.chain}`}>
                    <td>{position.symbol}</td>
                    <td>{position.chain}</td>
                    <td className="numeric">{formatNumber(position.qty)}</td>
                    <td className="numeric">{formatMoney(position.avg_price)}</td>
                    <td className={`numeric ${position.realized_pnl_usd >= 0 ? "positive" : "negative"}`}>{formatMoney(position.realized_pnl_usd)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <SimpleSparkline positions={positions} />
      </div>
    </section>
  );
}

function StateBadge({ state }: { state: TicketState }) {
  return <span className={`state-badge ${state}`}>{state}</span>;
}

function SimpleSparkline({ positions }: { positions: DeskPosition[] }) {
  const values = positions.length > 0 ? positions.map((position) => position.realized_pnl_usd + position.unrealized_pnl_usd) : [0, 2, 1, 4, 3];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 28 - ((value - min) / span) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 100 32" role="img" aria-label="Simple PnL sparkline">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function OrderTicketModal({
  draft,
  caps,
  state,
  error,
  isSubmitting,
  onUpdate,
  onClose,
  onSubmit,
  opportunity,
  sourceMode,
  ticketEvents,
  wallet,
  integrity,
  anchorEvent,
  onConnectWallet,
  onSwitchXLayer,
  onSignReceipt,
  onStartCeremony,
}: {
  draft: OrderTicketDraft;
  caps: BlotterResponse["caps"];
  state: DeskState;
  error: string | null;
  isSubmitting: boolean;
  onUpdate: <K extends keyof OrderTicketDraft>(key: K, value: OrderTicketDraft[K]) => void;
  onClose: () => void;
  onSubmit: () => void;
  opportunity: Opportunity | null;
  sourceMode: SourceMode;
  ticketEvents: BlackBoxEvent[];
  wallet: WalletState;
  integrity: Integrity;
  anchorEvent?: BlackBoxEvent;
  onConnectWallet: () => void;
  onSwitchXLayer: () => void;
  onSignReceipt: () => void;
  onStartCeremony: () => void;
}) {
  const preflight = orderPreflight(draft, caps, state);
  const ticketGate = opportunity ? scoutTicketGate(opportunity, sourceMode) : { allowed: false, reasons: ["No scout cluster selected"] };
  const blockers = [...new Set([...ticketGate.reasons, ...preflight.items.filter((item) => !item.ok).map((item) => item.label)])];
  const blocked = blockers.length > 0;
  const thesis = opportunity ? agentThesisBullets(opportunity, blockers) : null;
  const connected = Boolean(wallet.address);
  const providerUnavailable = !wallet.provider;
  const chainMismatch = Boolean(wallet.chainId && wallet.chainId !== XLAYER_TESTNET_HEX);
  return (
    <div className="modal-backdrop order-ticket-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-window order-ticket-window review-order-window" role="dialog" aria-modal="true" aria-label="Review order" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>{blocked ? "Blocked Review" : "Review Order"}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close order ticket">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body order-ticket-body">
          {thesis ? (
            <ul className="agent-thesis-list modal-thesis">
              <li><strong>Why now</strong><span>{thesis.whyNow}</span></li>
              <li><strong>Risk check</strong><span>{thesis.riskCheck}</span></li>
              <li><strong>Proposed action</strong><span>{thesis.proposedAction}</span></li>
            </ul>
          ) : null}
          {opportunity ? <OkxSkillPipeline sourceHealth={[]} opportunity={opportunity} wallet={wallet} sourceMode={sourceMode} /> : null}
          {blocked ? (
            <section className="blocked-review">
              <ShieldAlert size={18} />
              <div>
                <strong>Cannot execute</strong>
                <span>{blockers.slice(0, 4).join("; ")}</span>
              </div>
            </section>
          ) : null}

          <div className="order-ticket-grid">
            <label>
              <span>Side</span>
              <select value={draft.side} onChange={(event) => onUpdate("side", event.target.value as OrderSide)}>
                <option value="buy">buy</option>
                <option value="sell">sell</option>
              </select>
            </label>
            <label>
              <span>Type</span>
              <select value={draft.type} onChange={(event) => onUpdate("type", event.target.value as OrderType)}>
                <option value="limit">limit</option>
                <option value="post_only">post_only</option>
              </select>
            </label>
            <label>
              <span>Instrument</span>
              <input value={draft.instrument} onChange={(event) => onUpdate("instrument", event.target.value.toUpperCase())} />
            </label>
            <label>
              <span>Qty</span>
              <input inputMode="decimal" value={draft.qty} onChange={(event) => onUpdate("qty", Number(event.target.value || 0))} />
            </label>
            <label>
              <span>Price</span>
              <input inputMode="decimal" value={draft.price} onChange={(event) => onUpdate("price", Number(event.target.value || 0))} />
            </label>
            <label>
              <span>Notional USD</span>
              <input inputMode="decimal" value={draft.notionalUsd} onChange={(event) => onUpdate("notionalUsd", Number(event.target.value || 0))} />
            </label>
          </div>

          <section className="preflight-panel">
            <div className="section-title-row">
              <h4>Policy Preflight</h4>
              <span className={`reasoning-pill ${preflight.ok ? "llm" : "template"}`}>{preflight.ok ? "PASS" : "BLOCK"}</span>
            </div>
            <ul>
              {preflight.items.map((item) => (
                <li key={item.label} className={item.ok ? "ok" : "blocked"}>
                  {item.ok ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}
                  <span>{item.label}</span>
                  <strong>{item.detail}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="review-wallet-panel">
            <div className="section-title-row">
              <h4>Wallet and receipt</h4>
              <span className={`reasoning-pill ${connected ? "llm" : "template"}`}>{connected ? "CONNECTED" : "NOT CONNECTED"}</span>
            </div>
            <div className="review-wallet-row">
              {connected ? (
                <span className="wallet-pill" title={wallet.address ?? undefined}>
                  <WalletCards size={15} />
                  {shortAddress(wallet.address)}
                  <code>{walletChainLabel(wallet.chainId)}</code>
                </span>
              ) : (
                <button
                  type="button"
                  className="secondary-action wallet-action"
                  onClick={onConnectWallet}
                  disabled={providerUnavailable || wallet.status === "connecting"}
                  title={providerUnavailable ? "Install OKX Wallet to connect" : undefined}
                >
                  <WalletCards size={16} />
                  {wallet.status === "connecting" ? "Connecting..." : "Connect Wallet"}
                </button>
              )}
              <span className="network-status">Network: {wallet.chainId ? walletChainLabel(wallet.chainId) : "not connected"} · Anchor: X Layer testnet 1952</span>
              {wallet.provider && chainMismatch ? (
                <button type="button" className="secondary-action wallet-action" onClick={onSwitchXLayer}>
                  Switch to X Layer testnet 1952
                </button>
              ) : null}
              <button
                type="button"
                className="secondary-action wallet-action"
                onClick={onSignReceipt}
                disabled={!ticketGate.allowed || !connected || wallet.status === "signing"}
                title={ticketGate.allowed ? undefined : "Cluster is not execution-ready"}
              >
                <FileCheck2 size={16} />
                {wallet.status === "signing" ? "Signing..." : "Sign receipt"}
              </button>
            </div>
            {providerUnavailable ? (
              <a className="wallet-install-link" href="https://www.okx.com/web3/wallet" target="_blank" rel="noreferrer">
                Install OKX Wallet
              </a>
            ) : null}
            {wallet.message ? <p className="wallet-caption">{wallet.message}</p> : null}
          </section>

          <SelectedProofCard
            opportunity={opportunity}
            ticketEvents={ticketEvents.length ? ticketEvents : []}
            ticketGate={ticketGate}
            integrity={integrity}
            anchorEvent={anchorEvent}
          />

          {error ? <div className="radar-message blocked">{error}</div> : null}
          <div className="modal-actions">
            <button type="button" className="secondary-action" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="primary-action" onClick={onSubmit} disabled={isSubmitting || blocked}>
              <Send size={16} />
              {isSubmitting ? "Submitting..." : "Prepare Black Box ticket"}
            </button>
            <button type="button" className="primary-action" onClick={onStartCeremony} disabled={blocked}>
              <WalletCards size={16} />
              Start wallet ceremony
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function KeymapModal() {
  const rows = [
    ["n", "Open order ticket for selected radar row"],
    ["Enter", "Submit the open order ticket"],
    ["Esc", "Cancel modal or ticket"],
    ["b / s", "Toggle buy or sell in the ticket"],
    ["j / k", "Navigate radar rows"],
    ["?", "Open this keymap"],
  ];
  return (
    <div className="keymap-list">
      {rows.map(([key, label]) => (
        <div key={key}>
          <kbd>{key}</kbd>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBar({
  integrity,
  wallet,
  mode,
  agentCount,
  onOpenReplay,
}: {
  integrity: Integrity;
  wallet: WalletState;
  mode: string;
  agentCount: number;
  onOpenReplay: () => void;
}) {
  return (
    <footer className="status-bar">
      <span>session {shortSessionId(integrity.sessionId)}</span>
      <span>{agentCount} agents</span>
      <button type="button" onClick={onOpenReplay} title="Open Black Box replay">
        tip {shortHash(integrity.sessionHash)}
      </button>
      <span>{wallet.address ? `${shortAddress(wallet.address)} ${walletChainLabel(wallet.chainId)}` : "wallet offline"}</span>
      <span className="mode-badge">{modeDisplayLabel(mode)}</span>
    </footer>
  );
}

function SafetyBanner({ disabledSafetyGates }: { disabledSafetyGates: string[] }) {
  return (
    <section className="safety-banner">
      <ShieldAlert size={18} />
      <div>
        <strong>Safety gate override active</strong>
        <span>{disabledSafetyGates.join(" · ")}</span>
      </div>
    </section>
  );
}

function FailureBanner({ notice, onDismiss }: { notice: FailureNotice; onDismiss: () => void }) {
  return (
    <section className="failure-banner">
      <CircleAlert size={18} />
      <div>
        <strong>{notice.label} unavailable</strong>
        <span>{notice.error}</span>
      </div>
      <code>{notice.retryIn > 0 ? `Retry in ${notice.retryIn}s` : "Retry now"}</code>
      <button type="button" className="icon-button" onClick={onDismiss} aria-label="Dismiss failure">
        <X size={16} />
      </button>
    </section>
  );
}

function AppModal({ view, title, onClose, children }: { view: ModalView; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!view) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-window" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

function PolicyChangeModal({
  change,
  onCancel,
  onAccept,
}: {
  change: PolicyChangeRequest;
  onCancel: () => void;
  onAccept: () => void;
}) {
  return (
    <div className="modal-backdrop policy-confirmation" role="presentation" onMouseDown={onCancel}>
      <section className="modal-window warning-window" role="dialog" aria-modal="true" aria-label="Confirm policy override" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>Confirm Policy Override</h2>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Cancel policy override">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body policy-warning-body">
          <div className="takeover-mark">
            <ShieldAlert size={22} />
            <strong>{change.label}</strong>
          </div>
          <p>
            This disables a required signing gate. The Black Box will append a `policy.updated` audit event before the
            operator control changes.
          </p>
          <dl className="policy-diff">
            <div>
              <dt>Before</dt>
              <dd>{formatPolicyValue(change.previousValue)}</dd>
            </div>
            <div>
              <dt>After</dt>
              <dd>{formatPolicyValue(change.nextValue)}</dd>
            </div>
          </dl>
          <div className="modal-actions">
            <button type="button" className="secondary-action" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="danger-action" onClick={onAccept}>
              Accept + audit
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function IntegrityTakeoverModal({
  integrity,
  onOpenBlackBox,
  onRestore,
  onDismiss,
}: {
  integrity: Integrity;
  onOpenBlackBox: () => void;
  onRestore: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="modal-backdrop integrity-takeover" role="presentation" onMouseDown={onDismiss}>
      <section className="modal-window warning-window" role="dialog" aria-modal="true" aria-label="Trace integrity takeover" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>Trace Integrity Failed</h2>
          <button type="button" className="icon-button" onClick={onDismiss} aria-label="Dismiss integrity warning">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body policy-warning-body">
          <div className="takeover-mark">
            <ShieldAlert size={22} />
            <strong>Signing disabled until the trace is restored or reviewed.</strong>
          </div>
          <div className="integrity-summary">
            <code>{shortHash(integrity.sessionHash)}</code>
            <code>{shortHash(integrity.lastEventHash)}</code>
          </div>
          <ul className="integrity-errors">
            {(integrity.errors.length > 0 ? integrity.errors : ["Trace verifier returned invalid without a detailed error."]).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <div className="modal-actions">
            <button type="button" className="secondary-action" onClick={onOpenBlackBox}>
              Open Black Box
            </button>
            <button type="button" className="danger-action" onClick={onRestore}>
              Restore trace
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function TicketModal({
  tickets,
  events,
  activeTicket,
  setActiveTicket,
  policy,
  integrity,
}: {
  tickets: string[];
  events: BlackBoxEvent[];
  activeTicket: string;
  setActiveTicket: (ticket: string) => void;
  policy: Policy;
  integrity: Integrity;
}) {
  const activeEvents = events.filter((event) => event.ticket_id === activeTicket);
  return (
    <div className="ticket-modal-grid">
      <div className="ticket-list">
        {tickets.map((ticket) => {
          const ticketGate = evaluateGate(ticket, events, policy, integrity);
          return (
            <button
              type="button"
              className={`ticket-row ${ticket === activeTicket ? "selected" : ""}`}
              key={ticket}
              onClick={() => setActiveTicket(ticket)}
            >
              <span>{ticket}</span>
              <StatusPill ok={ticketGate.allowed} label={ticketGate.allowed ? "allowed" : "blocked"} compact />
            </button>
          );
        })}
      </div>
      <Panel title="Order Timeline" icon={<FileCheck2 size={18} />}>
        <Timeline events={activeEvents} />
      </Panel>
    </div>
  );
}

function BlackBoxTimeline({
  events,
  integrity,
  tamper,
  isBusy,
  onTamper,
  onRestore,
}: {
  events: BlackBoxEvent[];
  integrity: Integrity;
  tamper: TamperState | null;
  isBusy: boolean;
  onTamper: (eventIndex: number) => void;
  onRestore: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(Math.min(4, Math.max(events.length - 1, 0)));
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const safeSelectedIndex = Math.min(selectedIndex, Math.max(events.length - 1, 0));
  const firstInvalidIndex = tamper?.active && tamper.firstInvalidIndex !== null && tamper.firstInvalidIndex !== undefined ? tamper.firstInvalidIndex : null;
  const anchorEvent = useMemo(() => [...events].reverse().find((event) => event.type === "chain.commitment"), [events]);
  const anchorUrl = anchorExplorerUrl(anchorEvent);
  const runVerify = () => {
    setVerifyMessage(
      integrity.valid
        ? `Green verify: ${events.length} events match session tip ${shortHash(integrity.sessionHash)}.`
        : `Verify failed: ${integrity.errors[0] ?? "Black Box chain is invalid."}`,
    );
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "v") return;
      event.preventDefault();
      runVerify();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [events.length, integrity.errors, integrity.sessionHash, integrity.valid]);

  return (
    <section className="blackbox-timeline">
      <div className={`blackbox-summary-card ${integrity.valid ? "valid" : "invalid"}`}>
        <div>
          <p className="eyebrow">Black Box proof</p>
          <h3>{events.length} events, {integrity.valid ? "all verified ✓" : "verification failed"}</h3>
          <span>{integrity.valid ? "Risk, policy, sizing, quote, confirmation, simulation, and receipt are in one tamper-evident chain." : "A trace mutation was detected. Signing stays blocked until restored."}</span>
          {verifyMessage ? <p className={`verify-message ${integrity.valid ? "valid" : "invalid"}`}>{verifyMessage}</p> : null}
        </div>
        <div className="summary-proof-stack">
          <StatusPill ok={integrity.valid} label={integrity.valid ? "Integrity verified" : "Integrity failed"} />
          <code>{shortHash(integrity.sessionHash)}</code>
          <button type="button" className="secondary-action" onClick={runVerify}>
            <ShieldCheck size={16} />
            Verify (v)
          </button>
          <a className="secondary-action anchor-tx-link" href={anchorUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Anchor TX
          </a>
          <button type="button" className="secondary-action" onClick={() => setTimelineExpanded((value) => !value)}>
            <ListChecks size={16} />
            {timelineExpanded ? "Hide timeline" : "Expand timeline"}
          </button>
        </div>
      </div>

      <div className="tamper-controls">
        <button type="button" className="primary-action" onClick={() => onTamper(safeSelectedIndex)} disabled={isBusy || events.length === 0}>
          <ShieldAlert size={16} />
          Demonstrate tamper
        </button>
        <button type="button" className="secondary-action" onClick={onRestore} disabled={isBusy || !tamper?.active}>
          <RotateCcw size={16} />
          Restore
        </button>
        <span>{tamper?.active ? `Event ${safeSelectedIndex + 1} selected; failure starts at ${Number(firstInvalidIndex ?? 0) + 1}.` : `Event ${safeSelectedIndex + 1} selected.`}</span>
      </div>

      {tamper?.active && tamper.diff ? (
        <div className="tamper-diff">
          <strong>{tamper.diff.field}</strong>
          <span>{tamper.diff.before}</span>
          <span>{tamper.diff.after}</span>
        </div>
      ) : null}

      {integrity.errors.length > 0 ? (
        <ul className="integrity-errors">
          {integrity.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      {timelineExpanded || tamper?.active || !integrity.valid ? (
        <ol className="blackbox-event-list">
          {events.map((event, index) => {
            const isSelected = index === safeSelectedIndex;
            const isInvalid = firstInvalidIndex !== null && index >= firstInvalidIndex;
            const isTarget = tamper?.active && index === tamper.eventIndex;
            return (
              <li key={event.event_id} className={`blackbox-event-card ${isSelected ? "selected" : ""} ${isInvalid ? "invalid" : ""} ${isTarget ? "target" : ""}`}>
                <button type="button" className="event-card-button" onClick={() => setSelectedIndex(index)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{event.type}</strong>
                  <em>{event.agent}</em>
                  <code>{event.ticket_id}</code>
                </button>
                <p>{event.summary}</p>
                <div className="hash-strip">
                  <code>{shortHash(event.prev_event_hash)}</code>
                  <span>{"->"}</span>
                  <code>{shortHash(event.event_hash)}</code>
                </div>
                <details>
                  <summary>Payload</summary>
                  <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                </details>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}

function modalTitle(view: ModalView) {
  switch (view) {
    case "book":
      return "Book";
    case "tickets":
      return "Ticket Queue";
    case "agents":
      return "Agent Status (Advanced)";
    case "policy":
      return "Policy Gate";
    case "replay":
      return "Black Box Replay";
    case "digest":
      return "Reporter Digest";
    case "evidence":
      return "OKX Live Evidence";
    case "manual":
      return "Manual Wallet Intent";
    case "opportunity":
      return "Opportunity Review";
    case "keymap":
      return "Keyboard Map";
    default:
      return "";
  }
}

function AgentSeat({ seat, events }: { seat: AgentName; events: BlackBoxEvent[] }) {
  const latest = [...events].reverse().find((event) => event.agent === seat);
  const status = seatStatus(seat, latest);
  return (
    <div className={`seat ${status.kind}`}>
      <div className="seat-head">
        <span>{seat}</span>
        {status.kind === "ok" ? <CheckCircle2 size={16} /> : status.kind === "blocked" ? <XCircle size={16} /> : <CircleAlert size={16} />}
      </div>
      <p>{status.copy}</p>
      <small>{latest?.okx_skill ?? "read-only"}</small>
    </div>
  );
}

function OpportunityRadar({
  scan,
  events,
  selectedId,
  setSelectedId,
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  refreshError,
  actionMessage,
  watchedScoutIds,
  ceremony,
  reasoning,
  onRetryReasoning,
  onReview,
  onOpenPolicy,
  onScoutAction,
  wallet,
}: {
  scan: OpportunityScan;
  events: BlackBoxEvent[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  activeTab: RadarTab;
  onTabChange: (tab: RadarTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  refreshError: string | null;
  actionMessage: string | null;
  watchedScoutIds: Set<string>;
  ceremony: WalletCeremony | null;
  reasoning: ReasoningResult | null;
  onRetryReasoning: () => void;
  onReview: () => void;
  onOpenPolicy: () => void;
  onScoutAction: (opportunity: Opportunity) => void;
  wallet: WalletState;
}) {
  const radarRows = radarRowsForTab(scan, activeTab);
  const opportunities = activeTab === "demo" ? ensureBlockedTraceOpportunities(radarRows, events) : radarRows;
  const selected = opportunities.find((opportunity) => opportunity.id === selectedId) ?? opportunities[0];
  const modeLabel = scanModeLabel(scan.mode);
  const usingDemo = activeTab === "demo";
  const fixtureCopy = fixtureFallbackCopy(scan);
  const tabs = radarTabsFor(scan);
  const sourceBanner = sourceModeBanner(scan);

  return (
    <section className="radar-shell">
      <div className="radar-head">
        <div>
          <p className="eyebrow">Live Opportunity Radar</p>
          <h2>{radarTitle(scan, activeTab)}</h2>
        </div>
        <div className="radar-actions">
          <div className="radar-stats">
            <Metric label="Mode" value={modeLabel} />
            <Metric label="Clusters" value={String(scan.summary.defaultClusterCount ?? opportunities.length)} />
            <Metric label="Ready" value={String(scan.summary.readyCount)} />
            <Metric label="Updated" value={formatClock(scan.generatedAt)} />
          </div>
          <div className="radar-tabs" role="tablist" aria-label="Radar category">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`radar-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button type="button" className="secondary-action" onClick={onRefresh} disabled={isRefreshing}>
            <RotateCcw size={16} />
            {isRefreshing ? "Scanning..." : "Refresh market scan"}
          </button>
        </div>
      </div>

      {usingDemo ? <div className="demo-banner">FIXTURE STORY — deterministic RUGCAT/CLEAN examples with simulated OKX Agentic Wallet. No live funds.</div> : null}
      {!usingDemo && scan.mode === "fixture-fallback" && scan.sourceMode !== "demo-snapshot" ? <div className="demo-banner warning">{fixtureCopy}</div> : null}
      {refreshError ? <div className="radar-message blocked">Live refresh API unavailable: {refreshError}</div> : null}
      {actionMessage ? <div className="radar-message allowed">{actionMessage}</div> : null}

      <div className="radar-grid">
        <div className="radar-table-wrap">
          <table className="radar-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Move</th>
                <th>Liquidity</th>
                <th>Risk</th>
                <th>Agent Action</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.length > 0 ? opportunities.map((opportunity) => (
                <tr
                  key={opportunity.id}
                  className={opportunity.id === selected?.id ? "selected" : ""}
                  onClick={() => setSelectedId(opportunity.id)}
                >
                  {(() => {
                    const cta = scoutCta(opportunity, scan.sourceMode);
                    const watched = watchedScoutIds.has(opportunity.id);
                    return (
                      <>
                  <td>
                    <strong>{opportunity.symbol}</strong>
                    <span className="chain-pill">{opportunity.chain}</span>
                  </td>
                  <td className={percentClass(opportunity.metrics.priceChangePct)}>{formatPercent(opportunity.metrics.priceChangePct)}</td>
                  <td>${formatCompact(opportunity.metrics.liquidityUsd)}</td>
                  <td><RiskPill opportunity={opportunity} /></td>
                  <td>
                    <button
                      type="button"
                      className={`row-ticket-button ${cta.kind}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onScoutAction(opportunity);
                      }}
                    >
                      {watched && cta.kind === "watch" ? "Watching" : agentActionText(opportunity, cta.label)}
                    </button>
                  </td>
                      </>
                    );
                  })()}
                </tr>
              )) : (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-radar-state">No rows for this radar tab.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selected ? (
          <OpportunitySummaryCard
            opportunity={selected}
            ticketEvents={events.filter((event) => event.ticket_id === selected.ticketId)}
            ceremony={ceremony?.ticketId === selected.ticketId ? ceremony : null}
            reasoning={reasoning}
            onRetryReasoning={onRetryReasoning}
            sourceHealth={scan.sourceHealth}
            onReview={onReview}
            onOpenPolicy={onOpenPolicy}
            sourceMode={scan.sourceMode}
            wallet={wallet}
          />
        ) : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RadarEvidenceLabels({ opportunity, scan }: { opportunity: Opportunity; scan: OpportunityScan }) {
  const sources = sourceProvenanceLabels(opportunity).slice(0, 3);
  const quote = opportunity.proposedOrder.quoteStatus === "quoted" ? "LIVE quote" : "quote pending";
  const mode = scanModeLabel(scan.mode);
  const okx = okxEnrichmentHealth(scan.sourceHealth);
  return (
    <div className="radar-row-evidence">
      {sources.map((source, index) => (
        <span key={source}>{index === 0 ? `Source: ${source}` : source}</span>
      ))}
      <span>{quote}</span>
      {okx ? <span title={sourceHealthDetail(okx)}>{okx.ok ? "OKX enrichment available" : "OKX enrichment gated"}</span> : null}
      <strong>{mode}</strong>
    </div>
  );
}

function SourceProvenanceStrip({ opportunity, sourceHealth }: { opportunity: Opportunity; sourceHealth: OpportunityScan["sourceHealth"] }) {
  const sources = sourceProvenanceLabels(opportunity);
  const okx = okxEnrichmentHealth(sourceHealth);
  return (
    <div className="source-provenance" aria-label="Source provenance">
      {sources.map((source, index) => (
        <span key={source}>{index === 0 ? `Source: ${source}` : source}</span>
      ))}
      {okx ? (
        <span title={sourceHealthDetail(okx)}>
          {okx.ok ? "OKX enrichment available" : `OKX enrichment gated: ${shortSourceReason(okx.error)}`}
        </span>
      ) : null}
    </div>
  );
}

function ClusterAddressEvidence({ opportunity }: { opportunity: Opportunity }) {
  const cluster = opportunity.cluster;
  if (!cluster) return null;
  return (
    <div className="cluster-addresses" aria-label="Candidate cluster addresses">
      <span>{cluster.pool_count} pools</span>
      <span>{cluster.contract_count} contracts</span>
      <span>Primary {shortAddress(cluster.primary_address)}</span>
      {cluster.addresses.slice(0, 4).map((address) => (
        <code key={address}>{shortAddress(address)}</code>
      ))}
      {cluster.cross_chain_siblings?.map((sibling) => (
        <span key={`${sibling.chain}:${sibling.chain_address}`}>
          Also on: {sibling.chain} ({sibling.pool_count} pool, ${formatCompact(sibling.liquidityUsd)} liq)
        </span>
      ))}
    </div>
  );
}

function sourceProvenanceLabels(opportunity: Opportunity) {
  const labels = new Set<string>();
  for (const evidence of opportunity.evidence) {
    const value = `${evidence.skill} ${evidence.source}`.toLowerCase();
    if (value.includes("dexpaprika")) labels.add("dexpaprika");
    if (value.includes("dexscreener")) labels.add("DexScreener");
    if (value.includes("geckoterminal")) labels.add("GeckoTerminal");
    if (value.includes("fixture")) labels.add("FIXTURE");
  }
  if (labels.size === 0) {
    const source = opportunity.source.toLowerCase();
    if (source.includes("dexpaprika")) labels.add("dexpaprika");
    else if (source.includes("dexscreener")) labels.add("DexScreener");
    else if (source.includes("geckoterminal")) labels.add("GeckoTerminal");
    else labels.add(opportunity.source);
  }
  return [...labels];
}

function isFixtureOpportunity(opportunity: Opportunity) {
  return opportunity.category === "demo" || opportunity.source.toLowerCase().includes("fixture");
}

function okxEnrichmentHealth(sourceHealth: OpportunityScan["sourceHealth"]) {
  return sourceHealth.find((source) => /okx|onchainos/i.test(source.name));
}

function sourceHealthDetail(source: OpportunityScan["sourceHealth"][number]) {
  if (/okx|onchainos/i.test(source.name)) {
    return source.error ? `OKX OnchainOS enrichment gated: ${shortSourceReason(source.error)}` : source.command;
  }
  if (source.detail?.trim().startsWith("{") || source.detail?.trim().startsWith("[")) {
    return shortSourceReason(source.error);
  }
  return source.detail || source.error || source.command;
}

function ensureBlockedTraceOpportunities(opportunities: Opportunity[], events: BlackBoxEvent[]) {
  if (opportunities.some((opportunity) => opportunity.status === "blocked" || opportunity.risk.verdict === "block")) {
    return opportunities;
  }
  const veto = events.find((event) => event.type === "risk.verdict" && event.payload?.verdict === "veto");
  const candidate = veto ? events.find((event) => event.ticket_id === veto.ticket_id && event.type === "candidate.created") : null;
  if (!veto || !candidate) return opportunities;
  const symbol = String(candidate.payload.token ?? "RUGCAT");
  const chain = String(candidate.payload.chain ?? "Solana");
  const reason = String(veto.payload.reason ?? veto.summary);
  const blocked: Opportunity = {
    id: `trace-blocked:${veto.ticket_id}`,
    ticketId: veto.ticket_id,
    status: "blocked",
    action: "avoid",
    actionLabel: "Avoid",
    symbol,
    name: "Black Box veto",
    chain,
    tokenAddress: String(candidate.payload.tokenAddress ?? "trace-veto"),
    source: "Black Box veto trace",
    thesis: `Risk Officer vetoed ${symbol}; this row exists so judges can see a blocked path without explanation.`,
    invalidation: "Execution remains blocked unless the risk verdict changes in the trace.",
    confidence: 0,
    score: 0,
    freshness: "trace",
    metrics: {},
    risk: { level: "blocked", verdict: "block", reasons: [reason] },
    policy: { allowed: false, reasons: ["risk veto is final"] },
    proposedOrder: {
      mode: "watch-only",
      fromAsset: "USDC",
      toAsset: symbol,
      amountUsd: 0,
      slippageBps: 0,
      quoteStatus: "unavailable",
    },
    evidence: [
      { source: "risk veto", skill: "okx-security", summary: reason, timestamp: veto.timestamp },
      { source: "black box trace", skill: "report.digest", summary: veto.summary, timestamp: veto.timestamp },
    ],
  };
  return [blocked, ...opportunities];
}

function BlockedSummary({ blockers, onOpenPolicy }: { blockers: string[]; onOpenPolicy: () => void }) {
  return (
    <div className="blocked-summary">
      <ShieldAlert size={16} />
      <span>{blockers.slice(0, 3).join(" · ")}</span>
      <button type="button" onClick={onOpenPolicy}>
        View in Policy Gate
      </button>
    </div>
  );
}

function OpportunitySummaryCard({
  opportunity,
  ticketEvents,
  ceremony,
  reasoning,
  onRetryReasoning,
  sourceHealth,
  onReview,
  onOpenPolicy,
  sourceMode,
  wallet,
}: {
  opportunity: Opportunity;
  ticketEvents: BlackBoxEvent[];
  ceremony: WalletCeremony | null;
  reasoning: ReasoningResult | null;
  onRetryReasoning: () => void;
  sourceHealth: OpportunityScan["sourceHealth"];
  onReview: () => void;
  onOpenPolicy: () => void;
  sourceMode: SourceMode;
  wallet: WalletState;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const ticketGate = scoutTicketGate(opportunity, sourceMode);
  const blockers = opportunityBlockers(opportunity, ticketEvents, ticketGate.reasons);
  const bullets = agentThesisBullets(opportunity, blockers);
  const okx = okxExecutionLine(sourceHealth, opportunity);
  const gateVerdicts = displayGateVerdicts(opportunity, ticketGate);

  return (
    <article className="ticket-brief cockpit-ticket">
      <div className="ticket-brief-head">
        <div>
          <p className="eyebrow">Selected ticket</p>
          <h3>
            {opportunity.symbol}
            <span>{opportunity.name ? ` / ${opportunity.name}` : ""}</span>
          </h3>
        </div>
        <span className={`signal-pill ${opportunity.status}`}>{opportunity.status}</span>
      </div>

      <ul className="agent-thesis-list">
        <li><strong>Why now</strong><span>{bullets.whyNow}</span></li>
        <li><strong>Risk check</strong><span>{bullets.riskCheck}</span></li>
        <li><strong>Proposed action</strong><span>{bullets.proposedAction}</span></li>
      </ul>

      <div className="verdict-row">
        <VerdictPill label="Risk" tone={gateVerdicts.riskTone} text={gateVerdicts.riskText} />
        <VerdictPill label="Policy" tone={gateVerdicts.policyTone} text={gateVerdicts.policyText} />
      </div>
      <p className="execution-line">{okx}</p>
      <OkxSkillPipeline sourceHealth={sourceHealth} opportunity={opportunity} wallet={wallet} sourceMode={sourceMode} />

      <div className="opportunity-actions single">
        <button type="button" className="primary-action" onClick={onReview}>
          <FileText size={16} />
          Review Order
        </button>
      </div>
      {blockers.length > 0 ? <BlockedSummary blockers={blockers} onOpenPolicy={onOpenPolicy} /> : null}
      <button
        type="button"
        className="reasoner-link"
        onClick={() => {
          setNotesOpen((open) => !open);
          if (!notesOpen) onRetryReasoning();
        }}
      >
        {notesOpen ? "Hide reasoner notes" : "Show reasoner notes"}
      </button>
      {notesOpen ? <ReasoningPanel reasoning={reasoning} fallback={opportunity.thesis} compact onRetry={onRetryReasoning} /> : null}
      <div className="selected-source-detail">
        <SourceProvenanceStrip opportunity={opportunity} sourceHealth={sourceHealth} />
        <ClusterAddressEvidence opportunity={opportunity} />
      </div>
    </article>
  );
}

function OpportunityCard({
  opportunity,
  ticketEvents,
  sourceHealth,
  ceremony,
  reasoning,
  onRetryReasoning,
  onStage,
  onSimulate,
  onOpenPolicy,
  sourceMode,
}: {
  opportunity: Opportunity;
  ticketEvents: BlackBoxEvent[];
  sourceHealth: OpportunityScan["sourceHealth"];
  ceremony: WalletCeremony | null;
  reasoning: ReasoningResult | null;
  onRetryReasoning: () => void;
  onStage: (opportunity: Opportunity) => void;
  onSimulate: (opportunity: Opportunity) => void;
  onOpenPolicy: () => void;
  sourceMode: SourceMode;
}) {
  const isStaged = ticketEvents.some((event) => event.type === "candidate.created");
  const isSimulated = ticketEvents.some((event) => event.type === "execution.signed_or_simulated");
  const ticketGate = scoutTicketGate(opportunity, sourceMode);
  const blockers = opportunityBlockers(opportunity, ticketEvents, ticketGate.reasons);
  const isBlocked = blockers.length > 0;

  return (
    <article className="opportunity-card">
      <div className="opportunity-card-head">
        <div>
          <p className="eyebrow">{opportunity.source}</p>
          <h3>
            {opportunity.symbol}
            <span>{opportunity.name ? ` / ${opportunity.name}` : ""}</span>
          </h3>
        </div>
        <StatusPill ok={opportunity.policy.allowed} label={opportunity.policy.allowed ? "policy pass" : "policy blocked"} />
      </div>

      <p className="thesis">{opportunity.thesis}</p>
      <SourceProvenanceStrip opportunity={opportunity} sourceHealth={sourceHealth} />

      <ReasoningPanel reasoning={reasoning} fallback={opportunity.thesis} onRetry={onRetryReasoning} />

      <div className="metric-grid">
        <Metric label="Confidence" value={`${opportunity.confidence}%`} />
        <Metric label="MCap" value={`$${formatCompact(opportunity.metrics.marketCapUsd)}`} />
        <Metric label="Liquidity" value={`$${formatCompact(opportunity.metrics.liquidityUsd)}`} />
        <Metric label="Volume" value={`$${formatCompact(opportunity.metrics.volumeUsd)}`} />
        <Metric label="24h" value={formatPercent(opportunity.metrics.priceChangePct)} />
        <Metric label="Smart $" value={`$${formatCompact(opportunity.metrics.signalAmountUsd)}`} />
        <Metric label="Impact" value={formatPercent(opportunity.metrics.priceImpactPercent)} />
      </div>

      <div className="action-ticket">
        <div>
          <span>Proposed action</span>
          <strong>{opportunity.actionLabel}</strong>
        </div>
        <div>
          <span>Mode</span>
          <strong>{opportunity.proposedOrder.mode}</strong>
        </div>
        <div>
          <span>Cap</span>
          <strong>${opportunity.proposedOrder.amountUsd}</strong>
        </div>
        <div>
          <span>Quote</span>
          <strong>{opportunity.proposedOrder.quoteStatus}</strong>
        </div>
      </div>

      <div className="opportunity-actions">
        <button type="button" className="secondary-action" onClick={() => onStage(opportunity)} disabled={isStaged || !ticketGate.allowed}>
          <FileCheck2 size={16} />
          {isStaged ? "Ticket prepared" : ticketGate.allowed ? "Prepare Black Box ticket" : "Investigate"}
        </button>
        {isBlocked ? (
          <button type="button" className="blocked-action" disabled>
            <ShieldAlert size={16} />
            Execution blocked
          </button>
        ) : (
          <button type="button" className="primary-action" onClick={() => onSimulate(opportunity)} disabled={isSimulated}>
            <Send size={16} />
            {isSimulated ? "Ceremony complete" : "Start wallet ceremony"}
          </button>
        )}
      </div>
      {isBlocked ? <BlockedSummary blockers={blockers} onOpenPolicy={onOpenPolicy} /> : null}
      <WalletCeremonyCard ceremony={ceremony} ticketEvents={ticketEvents} />

      <div className="risk-box">
        <strong>{opportunity.risk.level} risk</strong>
        <p>{opportunity.risk.reasons.join("; ")}</p>
        <small>{opportunity.invalidation}</small>
      </div>

      <div className="evidence-list">
        <h4>Evidence</h4>
        <div className="source-chip-row" aria-label="Source attribution">
          {[...new Set(opportunity.evidence.map((item) => item.skill))].map((skill) => (
            <span key={skill} className="source-chip">
              {skill}
            </span>
          ))}
        </div>
        {opportunity.evidence.map((item) => (
          <div key={`${item.skill}-${item.summary}`}>
            <code>{item.skill}</code>
            <p>{item.summary}</p>
          </div>
        ))}
      </div>

      <div className="source-health">
        {sourceHealth.map((source) => (
          <span key={source.name} className={source.ok ? "ok" : "blocked"} title={sourceHealthDetail(source)}>
            {source.ok ? "PASS" : "FAIL"} {source.name}
          </span>
        ))}
      </div>
    </article>
  );
}

function WalletCeremonyCard({ ceremony, ticketEvents }: { ceremony: WalletCeremony | null; ticketEvents: BlackBoxEvent[] }) {
  if (!ceremony) return null;
  const hasRisk = hasEvent(ticketEvents, "risk.verdict") || ceremony.status !== "verifying";
  const hasQuote = hasEvent(ticketEvents, "route.quoted") || ceremony.status !== "verifying";
  const hasConfirmation = hasEvent(ticketEvents, "user.confirmed") || ceremony.status === "signing" || ceremony.status === "success";
  const hasExecution = hasEvent(ticketEvents, "execution.signed_or_simulated") || ceremony.status === "success";
  return (
    <section className={`wallet-ceremony ${ceremony.status}`}>
      <div className="ceremony-head">
        <WalletCards size={18} />
        <div>
          <strong>
            {ceremony.status === "verifying"
              ? "Verifying gates..."
              : ceremony.status === "signing"
                ? "Simulating OKX Agentic Wallet signature..."
                : ceremony.status === "success"
                  ? "Wallet simulation complete"
                  : "Wallet simulation blocked"}
          </strong>
          <span>{ceremony.message}</span>
        </div>
      </div>
      <div className="ceremony-steps">
        <CeremonyStep done={hasRisk} active={ceremony.status === "verifying"} label="Risk and policy gates checked" />
        <CeremonyStep done={hasQuote} active={ceremony.status === "verifying"} label="Sizing and quote bound to trace" />
        <CeremonyStep done={hasConfirmation} active={ceremony.status === "signing"} label="Human confirmation recorded" />
        <CeremonyStep done={hasExecution} active={ceremony.status === "signing"} label="Simulated signature appended" />
      </div>
    </section>
  );
}

function CeremonyStep({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div className={`ceremony-step ${done ? "done" : ""} ${active && !done ? "active" : ""}`}>
      {done ? <CheckCircle2 size={15} /> : active ? <Activity size={15} /> : <CircleAlert size={15} />}
      <span>{label}</span>
    </div>
  );
}

function TradeConsole({
  events,
  policy,
  integrity,
  appendDrafts,
  setActiveTicket,
  resetWorkingEvents,
}: {
  events: BlackBoxEvent[];
  policy: Policy;
  integrity: Integrity;
  appendDrafts: (drafts: EventDraft[], nextActiveTicket?: string) => Promise<boolean>;
  setActiveTicket: (ticketId: string) => void;
  resetWorkingEvents: () => void;
}) {
  const [intent, setIntent] = useState<TradeIntent>({
    symbol: "CLEAN",
    side: "buy",
    chain: "X Layer",
    sizeUsd: 200,
    slippageBps: 42,
    riskProfile: "clean",
  });
  const [ticketId, setTicketId] = useState("ticket_live_clean_xlayer");
  const [isRunning, setIsRunning] = useState(false);
  const ticketEvents = events.filter((event) => event.ticket_id === ticketId);
  const gate = evaluateGate(ticketId, events, policy, integrity);
  const hasCandidate = hasEvent(ticketEvents, "candidate.created");
  const hasRisk = hasEvent(ticketEvents, "risk.verdict");
  const riskVetoed = [...ticketEvents].reverse().find((event) => event.type === "risk.verdict")?.payload.verdict === "veto";
  const hasAllocation = hasEvent(ticketEvents, "allocation.sized");
  const hasQuote = hasEvent(ticketEvents, "route.quoted");
  const hasSimulation = hasEvent(ticketEvents, "quote.simulation");
  const hasConfirmation = hasEvent(ticketEvents, "user.confirmed");
  const hasExecution = hasEvent(ticketEvents, "execution.signed_or_simulated");

  const updateIntent = <K extends keyof TradeIntent>(key: K, value: TradeIntent[K]) => {
    setIntent({ ...intent, [key]: value });
  };

  const prepareTicket = () => {
    const cleanSymbol = intent.symbol.trim().toUpperCase() || "TOKEN";
    const cleanChain = intent.chain.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const nextTicket = `ticket_live_${cleanSymbol.toLowerCase()}_${cleanChain}`;
    setTicketId(nextTicket);
    setActiveTicket(nextTicket);
    return { cleanSymbol, nextTicket };
  };

  const createTicket = async () => {
    const { cleanSymbol, nextTicket } = prepareTicket();
    if (hasEvent(events.filter((event) => event.ticket_id === nextTicket), "candidate.created")) return;
    await appendDrafts([candidateDraft(nextTicket, cleanSymbol, intent)], nextTicket);
  };

  const runRisk = async () => {
    const { cleanSymbol, nextTicket } = prepareTicket();
    const drafts: EventDraft[] = [];
    if (!hasEvent(events.filter((event) => event.ticket_id === nextTicket), "candidate.created")) {
      drafts.push(candidateDraft(nextTicket, cleanSymbol, intent));
    }
    drafts.push(securityCheckDraft(nextTicket, cleanSymbol, intent));
    drafts.push(riskDraft(nextTicket, cleanSymbol, intent));
    await appendDrafts(drafts, nextTicket);
  };

  const sizeOrder = async () => {
    if (!hasCandidate || !hasRisk || riskVetoed) return;
    await appendDrafts([allocationDraft(ticketId, intent)], ticketId);
  };

  const quoteRoute = async () => {
    if (!hasAllocation || riskVetoed) return;
    await appendDrafts([quoteDraft(ticketId, intent, policy), quoteSimulationDraft(ticketId, intent, policy)], ticketId);
  };

  const confirmOrder = async () => {
    if (!hasQuote || !hasSimulation || riskVetoed) return;
    await appendDrafts([confirmationDraft(ticketId, policy)], ticketId);
  };

  const simulateExecution = async () => {
    if (!gate.allowed || hasExecution) return;
    await appendDrafts([executionDraft(ticketId, policy), receiptDraft(ticketId, policy)], ticketId);
  };

  const runSafePath = async () => {
    const { cleanSymbol, nextTicket } = prepareTicket();
    setIsRunning(true);
    try {
      const risk = riskDraft(nextTicket, cleanSymbol, intent);
      const drafts: EventDraft[] = [candidateDraft(nextTicket, cleanSymbol, intent), securityCheckDraft(nextTicket, cleanSymbol, intent), risk];
      if (risk.payload.verdict !== "veto") {
        drafts.push(allocationDraft(nextTicket, intent));
        drafts.push(quoteDraft(nextTicket, intent, policy));
        drafts.push(quoteSimulationDraft(nextTicket, intent, policy));
        drafts.push(confirmationDraft(nextTicket, policy));
        drafts.push(executionDraft(nextTicket, policy));
        drafts.push(receiptDraft(nextTicket, policy));
      }
      await appendDrafts(drafts, nextTicket);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section className="trade-console">
      <div className="console-head">
        <div>
          <p className="eyebrow">Wallet Action Console</p>
          <h2>Create a trade intent, gate it, then simulate the OKX Agentic Wallet signature.</h2>
        </div>
        <div className="console-actions">
          <button type="button" className="secondary-action" onClick={resetWorkingEvents}>
            <RotateCcw size={16} />
            Reset demo trace
          </button>
          <button type="button" className="primary-action" onClick={runSafePath} disabled={isRunning}>
            <Send size={16} />
            Run safe simulation
          </button>
        </div>
      </div>

      <div className="intent-grid">
        <label>
          <span>Token</span>
          <input value={intent.symbol} onChange={(event) => updateIntent("symbol", event.target.value)} />
        </label>
        <label>
          <span>Side</span>
          <select value={intent.side} onChange={(event) => updateIntent("side", event.target.value as TradeIntent["side"])}>
            <option value="buy">buy</option>
            <option value="sell">sell</option>
          </select>
        </label>
        <label>
          <span>Chain</span>
          <select value={intent.chain} onChange={(event) => updateIntent("chain", event.target.value)}>
            {chainOptions.map((chain) => (
              <option key={chain} value={chain}>
                {chain}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Size</span>
          <input
            inputMode="decimal"
            value={intent.sizeUsd}
            onChange={(event) => updateIntent("sizeUsd", Number(event.target.value || 0))}
          />
          <em>USD</em>
        </label>
        <label>
          <span>Slippage</span>
          <input
            inputMode="numeric"
            value={intent.slippageBps}
            onChange={(event) => updateIntent("slippageBps", Number(event.target.value || 0))}
          />
          <em>bps</em>
        </label>
        <label>
          <span>Risk preset</span>
          <select value={intent.riskProfile} onChange={(event) => updateIntent("riskProfile", event.target.value as TradeIntent["riskProfile"])}>
            <option value="clean">clean</option>
            <option value="risky">risky</option>
          </select>
        </label>
      </div>

      <div className="stepper">
        <button type="button" onClick={createTicket} disabled={hasCandidate}>
          1. Create ticket
        </button>
        <button type="button" onClick={runRisk} disabled={hasRisk}>
          2. Risk check
        </button>
        <button type="button" onClick={sizeOrder} disabled={!hasRisk || riskVetoed || hasAllocation}>
          3. Size
        </button>
        <button type="button" onClick={quoteRoute} disabled={!hasAllocation || riskVetoed || hasQuote}>
          4. Quote
        </button>
        <button type="button" onClick={confirmOrder} disabled={!hasQuote || hasConfirmation}>
          5. Confirm
        </button>
        <button type="button" onClick={simulateExecution} disabled={!gate.allowed || hasExecution}>
          6. Simulate signature
        </button>
      </div>

      <div className={`trade-gate ${gate.allowed ? "allowed" : "blocked"}`}>
        <strong>{gate.allowed ? "Ready for simulated OKX Agentic Wallet signing" : "Executor blocked"}</strong>
        <span>{gate.allowed ? "Default mode is fixture/simulated; no mainnet funds are touched." : gate.errors[0] ?? "Waiting for trace."}</span>
      </div>
    </section>
  );
}

function PolicyPanel({
  policy,
  gate,
  disabledSafetyGates,
  onPolicyChange,
}: {
  policy: Policy;
  gate: GateResult;
  disabledSafetyGates: string[];
  onPolicyChange: (request: PolicyChangeRequest) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const update = <K extends keyof Policy>(key: K, value: Policy[K], label: string, requiresAcknowledgement = false) => {
    onPolicyChange({
      key,
      label,
      previousValue: policy[key],
      nextValue: value,
      nextPolicy: { ...policy, [key]: value },
      requiresAcknowledgement,
    });
  };
  const toggleChain = (chain: string) => {
    const allowedChains = policy.allowedChains.includes(chain)
      ? policy.allowedChains.filter((item) => item !== chain)
      : [...policy.allowedChains, chain];
    update("allowedChains", allowedChains, `Allowed chain ${chain}`);
  };

  return (
    <Panel title="Policy Gate" icon={<SlidersHorizontal size={18} />}>
      <div className={`gate-banner ${gate.allowed ? "allowed" : "blocked"}`}>
        {gate.allowed ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
        <span>{gate.allowed ? "Executor may proceed" : "Executor is blocked"}</span>
      </div>

      {disabledSafetyGates.length > 0 ? <SafetyBanner disabledSafetyGates={disabledSafetyGates} /> : null}

      <div className="policy-status-head">
        <div>
          <p className="eyebrow">Active policy</p>
          <h3>Safety gates are shown as operating status.</h3>
        </div>
        <button type="button" className="secondary-action" onClick={() => setEditMode((value) => !value)}>
          <SlidersHorizontal size={16} />
          {editMode ? "Close edit mode" : "Edit policy"}
        </button>
      </div>

      <div className="policy-status-grid">
        <StatusBadge ok={policy.requiresUserConfirmation} label="Human confirmation" value={policy.requiresUserConfirmation ? "Required ✓" : "Disabled"} />
        <StatusBadge ok={policy.requiresTraceIntegrity} label="Trace integrity" value={policy.requiresTraceIntegrity ? "Required ✓" : "Disabled"} />
        <StatusBadge ok={policy.maxPositionPct <= 5} label="Position cap" value={`${policy.maxPositionPct}% max`} />
        <StatusBadge ok={policy.maxSlippageBps <= 100} label="Slippage cap" value={`${policy.maxSlippageBps} bps`} />
        <StatusBadge ok={policy.allowedChains.includes("X Layer")} label="Allowed chains" value={policy.allowedChains.join(", ")} />
        <StatusBadge ok={policy.signingMode === "simulated"} label="Signing mode" value={policy.signingMode} />
      </div>

      {editMode ? (
        <div className="policy-console-grid">
        <section className="policy-readonly">
          <p className="eyebrow">Immutable Policy</p>
          <dl>
            <div>
              <dt>Required prefix</dt>
              <dd>{policy.requiredEventsBeforeExecution.join(" -> ")}</dd>
            </div>
            <div>
              <dt>Signing mode</dt>
              <dd>{policy.signingMode}</dd>
            </div>
            <div>
              <dt>Caps</dt>
              <dd>
                {policy.maxPositionPct}% max position · {policy.maxSlippageBps} bps slippage · ${policy.realFundsCapUsd} real-funds cap
              </dd>
            </div>
            <div>
              <dt>Allowed chains</dt>
              <dd>{policy.allowedChains.join(", ")}</dd>
            </div>
          </dl>
        </section>

        <section className="operator-controls">
          <p className="eyebrow">Operator Controls</p>
          <div className="control-grid">
            <label>
              <span>Max position</span>
              <input
                type="text"
                inputMode="numeric"
                min="1"
                max="25"
                value={policy.maxPositionPct}
                onChange={(event) => update("maxPositionPct", Number(event.target.value), "Max position")}
              />
              <em>%</em>
            </label>
            <label>
              <span>Max slippage</span>
              <input
                type="text"
                inputMode="numeric"
                min="1"
                max="500"
                value={policy.maxSlippageBps}
                onChange={(event) => update("maxSlippageBps", Number(event.target.value), "Max slippage")}
              />
              <em>bps</em>
            </label>
            <label>
              <span>Real-funds cap</span>
              <input
                type="text"
                inputMode="numeric"
                min="0"
                max="1000"
                value={policy.realFundsCapUsd}
                onChange={(event) => update("realFundsCapUsd", Number(event.target.value), "Real-funds cap")}
              />
              <em>USD</em>
            </label>
            <label>
              <span>Mode</span>
              <select value={policy.executionMode} onChange={(event) => update("executionMode", event.target.value as ExecutionMode, "Execution mode")}>
                <option value="fixture">fixture</option>
                <option value="live-read">live-read</option>
                <option value="calldata">calldata</option>
                <option value="xlayer-testnet">xlayer-testnet</option>
                <option value="mainnet-capped">mainnet-capped</option>
              </select>
            </label>
          </div>

          <div className="chain-controls">
            {chainOptions.map((chain) => (
              <label key={chain}>
                <input type="checkbox" checked={policy.allowedChains.includes(chain)} onChange={() => toggleChain(chain)} />
                <span>{chain}</span>
              </label>
            ))}
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={policy.requiresUserConfirmation}
              onChange={(event) =>
                update("requiresUserConfirmation", event.target.checked, "Require human confirmation", !event.target.checked)
              }
            />
            <span>Require human confirmation</span>
          </label>

          <label className="toggle">
            <input
              type="checkbox"
              checked={policy.requiresTraceIntegrity}
              onChange={(event) =>
                update("requiresTraceIntegrity", event.target.checked, "Require trace integrity", !event.target.checked)
              }
            />
            <span>Require trace integrity</span>
          </label>
        </section>
      </div>
      ) : null}

      <ul className="gate-list">
        {(gate.errors.length > 0 ? gate.errors : ["All required policy checks passed."]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Panel>
  );
}

function Timeline({ events }: { events: BlackBoxEvent[] }) {
  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.event_id}>
          <div>
            <strong>{event.type}</strong>
            <span>{event.agent}</span>
          </div>
          <p>{event.summary}</p>
          <footer>
            <code>{event.okx_skill ?? "orchestrator"}</code>
            <code>{shortHash(event.event_hash)}</code>
          </footer>
        </li>
      ))}
    </ol>
  );
}

function DigestCards({ events, integrity, scan }: { events: BlackBoxEvent[]; integrity: Integrity; scan: OpportunityScan }) {
  const candidates = events.filter((event) => event.type === "candidate.created").length;
  const blocked = events.filter((event) => event.type === "risk.verdict" && event.payload.verdict === "veto").length;
  const simulated = events.filter((event) => event.type === "execution.signed_or_simulated").length;
  const confirmations = events.filter((event) => event.type === "user.confirmed").length;
  return (
    <section className="digest-cards">
      <div className="digest-hero">
        <Newspaper size={22} />
        <div>
          <p className="eyebrow">Reporter digest</p>
          <h3>{candidates} tickets reviewed, {blocked} blocked, {simulated} simulated</h3>
          <span>The default story is risk-gated wallet ops, not raw logs.</span>
        </div>
      </div>
      <div className="metric-grid digest-metrics">
        <Metric label="Tickets reviewed" value={String(candidates)} />
        <Metric label="Blocked by risk" value={String(blocked)} />
        <Metric label="Human confirms" value={String(confirmations)} />
        <Metric label="Wallet simulations" value={String(simulated)} />
        <Metric label="Trace status" value={integrity.valid ? "verified" : "failed"} />
        <Metric label="Radar mode" value={scan.mode} />
      </div>
      <div className="plain-summary-list">
        {events
          .filter((event) => ["risk.verdict", "execution.signed_or_simulated", "chain.commitment", "report.digest"].includes(event.type))
          .slice(-5)
          .map((event) => (
            <div key={event.event_id}>
              <StatusPill ok={event.type !== "risk.verdict" || event.payload.verdict !== "veto"} label={event.type.replace(".", " ")} compact />
              <p>{event.summary}</p>
            </div>
          ))}
      </div>
    </section>
  );
}

function EvidenceCards({ events, scan, okxEvidence }: { events: BlackBoxEvent[]; scan: OpportunityScan; okxEvidence: string }) {
  const okxEvents = events.filter((event) => event.okx_skill);
  const skillNames = [...new Set(okxEvents.map((event) => event.okx_skill).filter(Boolean))];
  const canaryPassed = /PASS|passed|ok|fixture/i.test(okxEvidence);
  return (
    <section className="evidence-cards">
      <div className="digest-hero">
        <ShieldCheck size={22} />
        <div>
          <p className="eyebrow">OKX evidence</p>
          <h3>{canaryPassed ? "OKX evidence available ✓" : "OKX evidence needs review"}</h3>
          <span>{scan.mode === "fixture-fallback" ? "Fixture fallback is active; proof remains local and deterministic." : "Public live sources are feeding the radar; OKX is enrichment and proof."}</span>
        </div>
      </div>
      <div className="policy-status-grid evidence-status-grid">
        <StatusBadge ok={scan.mode === "live"} label="Scanner mode" value={scan.mode} />
        <StatusBadge ok={okxEvents.length > 0} label="Trace-bound OKX events" value={String(okxEvents.length)} />
        <StatusBadge ok={skillNames.length > 0} label="Skills represented" value={skillNames.join(", ") || "none"} />
        <StatusBadge ok={scan.sourceHealth.every((source) => source.ok)} label="Source health" value={`${scan.sourceHealth.filter((source) => source.ok).length}/${scan.sourceHealth.length} passing`} />
      </div>
      <div className="source-card-grid">
        {scan.sourceHealth.map((source) => (
          <div key={source.name} className={`source-card ${source.ok ? "ok" : "blocked"}`}>
            <strong>{source.name}</strong>
            <StatusPill ok={source.ok} label={source.ok ? "available" : "fallback"} compact />
            <span title={sourceHealthDetail(source)}>{sourceHealthCopy(source)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusPill({ ok, label, compact = false }: { ok: boolean; label: string; compact?: boolean }) {
  return <span className={`status-pill ${ok ? "ok" : "blocked"} ${compact ? "compact" : ""}`}>{label}</span>;
}

function StatusBadge({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className={`status-badge ${ok ? "ok" : "blocked"}`}>
      {ok ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function candidateDraft(ticketId: string, symbol: string, intent: TradeIntent): EventDraft {
  return {
    ticket_id: ticketId,
    agent: "Scout",
    type: "candidate.created",
    summary: `Manual ${intent.side} intent opened for ${symbol} on ${intent.chain}.`,
    okx_skill: "okx-dex-signal",
    payload: {
      token: symbol,
      side: intent.side,
      chain: intent.chain,
      requestedSizeUsd: intent.sizeUsd,
      riskProfile: intent.riskProfile,
      source: "mission-control",
    },
  };
}

function riskDraft(ticketId: string, symbol: string, intent: TradeIntent): EventDraft {
  const riskySymbol = /rug|scam|honeypot/i.test(symbol);
  const veto = intent.riskProfile === "risky" || riskySymbol;
  const responseHash = demoSkillHash("okx-security", { ticketId, symbol, chain: intent.chain, verdict: veto ? "blocked" : "clear" });
  return {
    ticket_id: ticketId,
    agent: "Risk Officer",
    type: "risk.verdict",
    summary: veto
      ? `Risk Officer vetoed ${symbol}: preset risk or suspicious token pattern.`
      : `Risk Officer approved ${symbol}: token and route checks are clean.`,
    okx_skill: "okx-security",
    payload: {
      verdict: veto ? "veto" : "approved",
      reason: veto ? "risk preset or suspicious symbol pattern" : "clean fixture-backed security profile",
      checks: ["token-risk", "honeypot", "holder-concentration", "route-safety"],
      securityResponseHash: responseHash,
    },
  };
}

function securityCheckDraft(ticketId: string, symbol: string, intent: TradeIntent): EventDraft {
  const riskySymbol = /rug|scam|honeypot/i.test(symbol);
  const blocked = intent.riskProfile === "risky" || riskySymbol;
  return {
    ticket_id: ticketId,
    agent: "Risk Officer",
    type: "risk.security_check",
    summary: blocked
      ? `OKX security scan flagged ${symbol} before risk verdict.`
      : `OKX security scan cleared ${symbol} before risk verdict.`,
    okx_skill: "okx-security",
    payload: {
      verdict: blocked ? "blocked" : "clear",
      reason: blocked ? "risk preset or suspicious symbol pattern" : "clean fixture-backed security profile",
      checks: ["token-risk", "honeypot", "holder-concentration", "route-safety"],
      responseHash: demoSkillHash("okx-security", { ticketId, symbol, chain: intent.chain, verdict: blocked ? "blocked" : "clear" }),
      mode: "fixture",
    },
  };
}

function opportunityDrafts(
  opportunity: Opportunity,
  policy: Policy,
  options: { confirm: boolean; execute: boolean },
): EventDraft[] {
  const approved = opportunity.risk.verdict === "allow" && opportunity.policy.allowed;
  const drafts: EventDraft[] = [
    {
      ticket_id: opportunity.ticketId,
      agent: "Scout",
      type: "candidate.created",
      summary: `Scout promoted live OKX opportunity ${opportunity.symbol} from ${opportunity.source}.`,
      okx_skill: "okx-dex-signal",
      payload: {
        token: opportunity.symbol,
        name: opportunity.name,
        chain: opportunity.chain,
        chainIndex: opportunity.chainIndex,
        tokenAddress: opportunity.tokenAddress,
        source: opportunity.source,
        score: opportunity.score,
        confidence: opportunity.confidence,
        thesis: opportunity.thesis,
      },
    },
    {
      ticket_id: opportunity.ticketId,
      agent: "Risk Officer",
      type: "risk.security_check",
      summary: approved
        ? `OKX security scan cleared ${opportunity.symbol} before risk verdict.`
        : `OKX security scan flagged ${opportunity.symbol} before risk verdict.`,
      okx_skill: "okx-security",
      payload: {
        verdict: approved ? "clear" : "blocked",
        reason: approved ? opportunity.risk.reasons.join("; ") : [...opportunity.risk.reasons, ...opportunity.policy.reasons].join("; "),
        riskLevel: opportunity.risk.level,
        responseHash: demoSkillHash("okx-security", {
          ticketId: opportunity.ticketId,
          tokenAddress: opportunity.tokenAddress,
          verdict: approved ? "clear" : "blocked",
        }),
        mode: policy.executionMode,
      },
    },
    {
      ticket_id: opportunity.ticketId,
      agent: "Risk Officer",
      type: "risk.verdict",
      summary: approved
        ? `Risk Officer approved ${opportunity.symbol}: ${opportunity.risk.reasons.join("; ")}.`
        : `Risk Officer vetoed ${opportunity.symbol}: ${[...opportunity.risk.reasons, ...opportunity.policy.reasons].join("; ")}.`,
      okx_skill: "okx-security",
      payload: {
        verdict: approved ? "approved" : "veto",
        reason: approved ? opportunity.risk.reasons.join("; ") : [...opportunity.risk.reasons, ...opportunity.policy.reasons].join("; "),
        riskLevel: opportunity.risk.level,
        policyReasons: opportunity.policy.reasons,
        securityResponseHash: demoSkillHash("okx-security", {
          ticketId: opportunity.ticketId,
          tokenAddress: opportunity.tokenAddress,
          verdict: approved ? "clear" : "blocked",
        }),
      },
    },
  ];

  if (!approved) return drafts;

  drafts.push({
    ticket_id: opportunity.ticketId,
    agent: "Allocator",
    type: "allocation.sized",
    summary: `Allocator capped ${opportunity.symbol} at ${opportunity.proposedOrder.amountUsd} USD from the live scanner policy.`,
    okx_skill: "okx-agentic-wallet",
    payload: {
      sizeUsd: opportunity.proposedOrder.amountUsd,
      bookValueUsd: 10000,
      sizePct: Number(((opportunity.proposedOrder.amountUsd / 10000) * 100).toFixed(2)),
      capSource: "opportunity-radar",
      executionMode: policy.executionMode,
    },
  });

  drafts.push({
    ticket_id: opportunity.ticketId,
    agent: "Executor",
    type: "route.quoted",
    summary: `Executor attached OKX quote evidence for ${opportunity.proposedOrder.fromAsset} to ${opportunity.symbol}.`,
    okx_skill: "okx-dex-swap",
    payload: {
      chain: opportunity.chain,
      fromAsset: opportunity.proposedOrder.fromAsset,
      toAsset: opportunity.symbol,
      amountUsd: opportunity.proposedOrder.amountUsd,
      slippageBps: opportunity.proposedOrder.slippageBps,
      route: opportunity.proposedOrder.route ?? `${opportunity.proposedOrder.fromAsset} -> ${opportunity.symbol}`,
      quoteStatus: opportunity.proposedOrder.quoteStatus,
      mode: policy.executionMode,
      source: "live OKX scanner",
    },
  });

  drafts.push({
    ticket_id: opportunity.ticketId,
    agent: "Executor",
    type: "quote.simulation",
    summary: `OKX gateway simulated ${opportunity.chain} route for ${opportunity.symbol}.`,
    okx_skill: "okx-onchain-gateway",
    payload: {
      status: "simulated-ok",
      resultHash: demoSkillHash("okx-onchain-gateway", {
        ticketId: opportunity.ticketId,
        tokenAddress: opportunity.tokenAddress,
        amountUsd: opportunity.proposedOrder.amountUsd,
        route: opportunity.proposedOrder.route,
      }),
      chain: opportunity.chain,
      mode: policy.executionMode,
    },
  });

  if (options.confirm) {
    drafts.push(confirmationDraft(opportunity.ticketId, policy));
  }

  if (options.execute) {
    drafts.push(executionDraft(opportunity.ticketId, policy));
    drafts.push(receiptDraft(opportunity.ticketId, policy));
  }

  return drafts;
}

function missingDraftsForTicket(drafts: EventDraft[], ticketEvents: BlackBoxEvent[]): EventDraft[] {
  const seen = new Set(ticketEvents.map((event) => event.type));
  return drafts.filter((draft) => {
    if (seen.has(draft.type)) return false;
    seen.add(draft.type);
    return true;
  });
}

function allocationDraft(ticketId: string, intent: TradeIntent): EventDraft {
  const bookValueUsd = 10000;
  return {
    ticket_id: ticketId,
    agent: "Allocator",
    type: "allocation.sized",
    summary: `Allocator sized the intent to ${intent.sizeUsd} USD from a ${bookValueUsd} USD book.`,
    okx_skill: "okx-agentic-wallet",
    payload: {
      sizeUsd: intent.sizeUsd,
      bookValueUsd,
      sizePct: Number(((intent.sizeUsd / bookValueUsd) * 100).toFixed(2)),
    },
  };
}

function quoteDraft(ticketId: string, intent: TradeIntent, policy: Policy): EventDraft {
  return {
    ticket_id: ticketId,
    agent: "Executor",
    type: "route.quoted",
    summary: `Executor prepared a ${policy.executionMode} ${intent.chain} quote at ${intent.slippageBps} bps slippage.`,
    okx_skill: "okx-dex-swap",
    payload: {
      chain: intent.chain,
      slippageBps: intent.slippageBps,
      route: `${intent.side.toUpperCase()} USDC -> ${intent.symbol.trim().toUpperCase() || "TOKEN"}`,
      mode: policy.executionMode,
      source: policy.executionMode === "fixture" ? "fixture quote" : "live-read requested with safe fallback",
    },
  };
}

function quoteSimulationDraft(ticketId: string, intent: TradeIntent, policy: Policy): EventDraft {
  const symbol = intent.symbol.trim().toUpperCase() || "TOKEN";
  return {
    ticket_id: ticketId,
    agent: "Executor",
    type: "quote.simulation",
    summary: `OKX gateway simulated the ${policy.executionMode} ${intent.chain} quote before signing.`,
    okx_skill: "okx-onchain-gateway",
    payload: {
      status: "simulated-ok",
      resultHash: demoSkillHash("okx-onchain-gateway", {
        ticketId,
        chain: intent.chain,
        symbol,
        sizeUsd: intent.sizeUsd,
        slippageBps: intent.slippageBps,
      }),
      chain: intent.chain,
      amountUsd: intent.sizeUsd,
      mode: policy.executionMode,
    },
  };
}

function confirmationDraft(ticketId: string, policy: Policy): EventDraft {
  return {
    ticket_id: ticketId,
    agent: "Orchestrator",
    type: "user.confirmed",
    summary: `Human confirmation captured for ${policy.executionMode} mode.`,
    payload: {
      confirmed: true,
      capUsd: policy.realFundsCapUsd,
      confirmationSurface: "mission-control",
    },
  };
}

function executionDraft(ticketId: string, policy: Policy): EventDraft {
  return {
    ticket_id: ticketId,
    agent: "Executor",
    type: "execution.signed_or_simulated",
    summary: `Executor produced a simulated signature via OKX Agentic Wallet in ${policy.executionMode} mode.`,
    okx_skill: "okx-agentic-wallet",
    payload: {
      mode: policy.executionMode,
      simulated: true,
      signer: "via OKX Agentic Wallet",
      signature: `sim_sig_${Math.random().toString(16).slice(2, 10)}`,
    },
  };
}

function receiptDraft(ticketId: string, policy: Policy): EventDraft {
  return {
    ticket_id: ticketId,
    agent: "Executor",
    type: "receipt.verified",
    summary: `Executor recorded a simulated ${policy.executionMode} receipt.`,
    okx_skill: "okx-onchain-gateway",
    payload: {
      mode: policy.executionMode,
      status: "simulated",
      txHash: `sim_tx_${Math.random().toString(16).slice(2, 10)}`,
    },
  };
}

async function policyUpdatedDraft(previousPolicy: Policy, nextPolicy: Policy, change: PolicyChangeRequest, acknowledged: boolean): Promise<EventDraft> {
  const disabled = (change.key === "requiresUserConfirmation" || change.key === "requiresTraceIntegrity") && change.nextValue === false;
  return {
    ticket_id: "desk_policy",
    agent: "Orchestrator",
    type: "policy.updated",
    summary: disabled
      ? `Operator disabled ${change.label}; audit event recorded before control changed.`
      : `Operator updated ${change.label}; audit event recorded.`,
    payload: {
      operatorId: "local-demo-operator",
      key: change.key,
      previousValue: change.previousValue,
      nextValue: change.nextValue,
      acknowledged,
      disabledSafetyGate: disabled,
      policyHashBefore: await sha256Json(previousPolicy),
      policyHashAfter: await sha256Json(nextPolicy),
      recordedAt: new Date().toISOString(),
    },
  };
}

async function sha256Json(value: unknown) {
  const encoded = new TextEncoder().encode(stableStringifyClient(value));
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return `sha256:${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function stableStringifyClient(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringifyClient(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringifyClient(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function demoSkillHash(skill: string, payload: Record<string, unknown>) {
  const input = `${skill}:${JSON.stringify(payload, Object.keys(payload).sort())}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const chunk = (hash >>> 0).toString(16).padStart(8, "0");
  return `sha256:${chunk.repeat(8)}`;
}

function formatPolicyValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "enabled" : "disabled";
  if (value === undefined || value === null) return "n/a";
  return String(value);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function hasEvent(events: BlackBoxEvent[], type: EventType) {
  return events.some((event) => event.type === type);
}

function buildWorkingIntegrity(events: BlackBoxEvent[], baseIntegrity: Integrity): Integrity {
  const errors: string[] = [];
  let previous = "sha256:genesis";
  for (const event of events) {
    if (!event.prev_event_hash) errors.push(`${event.event_id}: missing prev_event_hash`);
    if (!event.event_hash) errors.push(`${event.event_id}: missing event_hash`);
    if (event.prev_event_hash !== previous) errors.push(`${event.event_id}: broken previous hash pointer`);
    previous = event.event_hash;
  }

  return {
    valid: baseIntegrity.valid && errors.length === 0,
    eventCount: events.length,
    sessionId: events[0]?.session_id ?? baseIntegrity.sessionId,
    sessionHash: events.at(-1)?.event_hash ?? baseIntegrity.sessionHash,
    lastEventHash: events.at(-1)?.event_hash ?? baseIntegrity.lastEventHash,
    errors: [...baseIntegrity.errors, ...errors],
  };
}

function evaluateGate(ticketId: string, events: BlackBoxEvent[], policy: Policy, integrity: Integrity): GateResult {
  const ticketEvents = events.filter((event) => event.ticket_id === ticketId);
  const errors: string[] = [];
  const warnings: string[] = [];
  const latest = (type: EventType) => [...ticketEvents].reverse().find((event) => event.type === type);

  if (policy.requiresTraceIntegrity && !integrity.valid) {
    errors.push("trace integrity invalid");
  }

  for (const requiredType of policy.requiredEventsBeforeExecution) {
    if (!latest(requiredType)) errors.push(`missing required event: ${requiredType}`);
  }

  const risk = latest("risk.verdict");
  if (risk?.payload.verdict === "veto") errors.push(`risk veto is final: ${String(risk.payload.reason ?? risk.summary)}`);

  const allocation = latest("allocation.sized");
  if (allocation) {
    const sizeUsd = Number(allocation.payload.sizeUsd);
    const bookValueUsd = Number(allocation.payload.bookValueUsd);
    const maxAllowed = (bookValueUsd * policy.maxPositionPct) / 100;
    if (sizeUsd > maxAllowed) errors.push(`allocation ${sizeUsd} USD exceeds max ${maxAllowed.toFixed(2)} USD`);
    if (policy.executionMode === "mainnet-capped" && sizeUsd > policy.realFundsCapUsd) {
      errors.push(`mainnet allocation ${sizeUsd} USD exceeds ${policy.realFundsCapUsd} USD cap`);
    }
  }

  const quote = latest("route.quoted");
  if (quote) {
    const slippageBps = Number(quote.payload.slippageBps);
    const chain = String(quote.payload.chain);
    if (slippageBps > policy.maxSlippageBps) errors.push(`quote slippage ${slippageBps} bps exceeds ${policy.maxSlippageBps} bps`);
    if (!policy.allowedChains.includes(chain)) errors.push(`${chain} is not an allowed chain`);
  }

  const confirmation = latest("user.confirmed");
  if (policy.requiresUserConfirmation && confirmation?.payload.confirmed !== true) {
    errors.push("missing affirmative human confirmation");
  }

  return { allowed: errors.length === 0, errors, warnings };
}

function seatStatus(seat: AgentName, latest?: BlackBoxEvent) {
  if (!latest) return { kind: "idle", copy: seat === "Yield Manager" ? "coming soon" : "waiting" };
  if (latest.type === "risk.verdict" && latest.payload.verdict === "veto") return { kind: "blocked", copy: "veto issued" };
  if (latest.type === "execution.signed_or_simulated") return { kind: "ok", copy: "signed or simulated" };
  if (latest.type === "receipt.verified") return { kind: "ok", copy: "receipt verified" };
  return { kind: "ok", copy: latest.type.replace(".", " ") };
}

function ticketIds(events: BlackBoxEvent[]) {
  return [...new Set(events.map((event) => event.ticket_id))]
    .filter((ticket) => ticket !== "desk_daily" && ticket !== "desk_policy")
    .sort((a, b) => Number(b.includes("clean")) - Number(a.includes("clean")) || a.localeCompare(b));
}

function shortHash(value?: string | null) {
  if (!value) return "n/a";
  return value.length > 18 ? `${value.slice(0, 13)}...${value.slice(-6)}` : value;
}

function formatCompact(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "n/a";
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`;
  if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return number.toFixed(number >= 10 ? 0 : 2);
}

function formatPercent(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "n/a";
  return `${number.toFixed(Math.abs(number) >= 10 ? 1 : 2)}%`;
}

function firstRadarOpportunity(scan: OpportunityScan, tab: RadarTab) {
  return radarRowsForTab(scan, tab)[0] ?? scan.opportunities[0] ?? null;
}

function radarRowsForTab(scan: OpportunityScan, tab: RadarTab) {
  if (tab === "demo") return filterRadarOpportunities(scan.opportunities, tab);
  const clusters = scan.clusters ?? [];
  if (clusters.length === 0) return filterRadarOpportunities(scan.opportunities, tab);
  let selectedClusters = clusters;
  if (tab === "new-launches") {
    const defaultIds = new Set(scan.defaultClusterIds ?? []);
    selectedClusters = defaultIds.size > 0 ? clusters.filter((cluster) => defaultIds.has(cluster.cluster_id)) : clusters;
  } else if (tab === "blue-chips") {
    selectedClusters = clusters.filter((cluster) => cluster.category === "blue-chip");
  } else if (tab === "trending") {
    selectedClusters = clusters.filter((cluster) => cluster.category === "trending" || cluster.category === "new-launch");
  }
  return selectedClusters.map((cluster) => clusterToOpportunity(cluster, scan));
}

function filterRadarOpportunities(opportunities: Opportunity[], tab: RadarTab) {
  if (tab === "demo") return opportunities.filter((opportunity) => opportunity.category === "demo" || opportunity.source.includes("fixture"));
  if (tab === "blue-chips") return opportunities.filter((opportunity) => opportunity.category === "blue-chip");
  if (tab === "trending") {
    return opportunities.filter((opportunity) => ["trending", "new-launch", "demo"].includes(opportunity.category ?? "trending"));
  }
  return opportunities.filter((opportunity) => {
    const category = opportunity.category ?? "trending";
    return category === "new-launch" || category === "trending" || category === "blocked-risk" || category === "demo";
  });
}

function clusterToOpportunity(cluster: CandidateCluster, scan: OpportunityScan): Opportunity {
  const primary =
    scan.opportunities.find((opportunity) => cluster.member_ids?.includes(opportunity.id)) ??
    scan.opportunities.find((opportunity) => opportunity.tokenAddress === cluster.primary_address && opportunity.chain === cluster.chain);
  const source = cluster.top_evidence[0]?.source ?? primary?.source ?? "candidate cluster";
  const evidence = cluster.top_evidence.length > 0 ? cluster.top_evidence : (primary?.evidence ?? []);
  const cta = scoutCta({ cluster, status: cluster.status, risk: cluster.risk, policy: cluster.policy, proposedOrder: cluster.proposedOrder } as Opportunity, scan.sourceMode);
  return {
    id: cluster.cluster_id,
    ticketId: primary?.ticketId ?? `opp_${cluster.cluster_id.replace(/[^a-z0-9]/gi, "_")}`,
    status: cluster.status,
    action: cta.kind === "prepare" ? "quote-buy" : "watch",
    actionLabel: cta.label,
    symbol: cluster.symbol,
    name: primary?.name,
    chain: cluster.chain,
    chainIndex: primary?.chainIndex,
    tokenAddress: cluster.primary_address,
    source,
    thesis: cluster.notReadyReasons?.length
      ? `${cluster.symbol} is scout-only, not execution-ready: ${cluster.notReadyReasons.slice(0, 3).join("; ")}.`
      : primary?.thesis ??
        `${cluster.symbol} cluster on ${cluster.chain}: ${cluster.pool_count} pools, ${cluster.contract_count} contracts, score ${cluster.score}.`,
    invalidation: primary?.invalidation ?? "Invalidate if source provenance, liquidity, or the quote gate cannot be verified.",
    confidence: primary?.confidence ?? Math.min(cluster.score, 95),
    score: cluster.score,
    freshness: primary?.freshness ?? "clustered scan",
    metrics: cluster.aggregated_metrics,
    risk: cluster.risk,
    policy: cluster.policy,
    proposedOrder: {
      ...(cluster.proposedOrder ?? primary?.proposedOrder ?? {
        mode: "watch-only" as const,
        fromAsset: "USDC",
        toAsset: cluster.symbol,
        amountUsd: 25,
        slippageBps: 250,
      }),
      quoteStatus: cluster.proposedOrder?.quoteStatus ?? cluster.quoteStatus ?? primary?.proposedOrder.quoteStatus ?? "unavailable",
      mode: cta.kind === "prepare" ? "quote-only" : "watch-only",
      route: cta.kind === "prepare" ? cluster.proposedOrder?.route ?? primary?.proposedOrder.route : undefined,
    },
    evidence,
    category: cluster.category,
    cluster,
  };
}

function scoutCta(opportunity: Pick<Opportunity, "cluster" | "status" | "risk" | "policy" | "proposedOrder"> & Partial<Pick<Opportunity, "category" | "evidence">>, sourceMode: SourceMode) {
  const gate = scoutTicketGate(opportunity, sourceMode);
  if (gate.allowed) return { kind: "prepare" as const, label: "Prepare ticket" };
  if (opportunity.status === "watch" && gate.reasons.every((reason) => !/blocked|not allowed|risk verdict is block/i.test(reason))) {
    return { kind: "watch" as const, label: "Watch" };
  }
  return { kind: "investigate" as const, label: "Investigate" };
}

function scoutTicketGate(opportunity: Pick<Opportunity, "cluster" | "status" | "risk" | "policy" | "proposedOrder"> & Partial<Pick<Opportunity, "category" | "evidence">>, sourceMode: SourceMode) {
  const cluster = opportunity.cluster;
  const evidence = cluster?.top_evidence ?? opportunity.evidence ?? [];
  const fixtureSimulation = sourceMode === "demo-snapshot" && opportunity.category === "demo";
  const reasons: string[] = [];
  if (cluster?.notReadyReasons?.length) reasons.push(...cluster.notReadyReasons);
  if (opportunity.status !== "ready") reasons.push(`status is ${opportunity.status}; execution requires a ready cluster`);
  if (opportunity.risk.verdict !== "allow") reasons.push(`risk verdict is ${opportunity.risk.verdict}`);
  if (!opportunity.policy.allowed) reasons.push("policy gate is not allowed");
  if (sourceMode !== "okx-scout" && sourceMode !== "live-scout" && !fixtureSimulation) reasons.push(`source mode ${sourceMode} is not executable`);
  if (!evidence.some((item) => /okx|onchainos|wallet/i.test(`${item.source} ${item.skill}`))) reasons.push("missing OKX or wallet evidence");
  if (opportunity.proposedOrder.quoteStatus !== "quoted") reasons.push(`quote status is ${opportunity.proposedOrder.quoteStatus}`);
  if (opportunity.proposedOrder.quoteStatus === "quoted" && !quoteIsFresh(opportunity.proposedOrder.quoteFreshenedAt, 60)) reasons.push("stale quote");
  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)] };
}

function quoteIsFresh(quoteFreshenedAt: string | undefined, maxQuoteAgeSeconds: number) {
  if (!quoteFreshenedAt) return false;
  const timestamp = Date.parse(quoteFreshenedAt);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= maxQuoteAgeSeconds * 1_000;
}

function radarTabsFor(scan: OpportunityScan): Array<{ id: RadarTab; label: string }> {
  const firstLabel = scan.sourceMode === "degraded-pool-fallback" ? "Top Pool View" : scan.sourceMode === "demo-snapshot" ? "Fixture Snapshot" : "New Launches";
  return radarTabs.map((tab) => (tab.id === "new-launches" ? { ...tab, label: firstLabel } : tab));
}

function radarTitle(scan: OpportunityScan, activeTab: RadarTab) {
  if (activeTab === "blue-chips") return "Blue Chips";
  if (activeTab === "trending") return "Trending Candidates";
  if (activeTab === "demo") return "Fixture Story";
  if (scan.sourceMode === "degraded-pool-fallback") return "Degraded Pool Fallback";
  if (scan.sourceMode === "demo-snapshot") return "Fixture Snapshot";
  return "Emerging Scout Radar";
}

function sourceModeBanner(scan: OpportunityScan) {
  const okx = okxEnrichmentHealth(scan.sourceHealth);
  const okxCopy = okx ? `OKX OnchainOS enrichment: ${okx.ok ? "available" : `gated (${shortSourceReason(okx.error)})`}` : "OKX OnchainOS enrichment: not reported";
  if (scan.sourceMode === "okx-scout") return `Source mode: OKX scout — OKX OnchainOS skill data is the primary signal. ${okxCopy}.`;
  if (scan.sourceMode === "live-scout") return `Source mode: Live scout — DexScreener or GeckoTerminal supplied emerging-token signals; OKX remains enrichment and execution only. ${okxCopy}.`;
  if (scan.sourceMode === "degraded-pool-fallback") {
    const failures = scan.sourceHealth
      .filter((source) => !source.ok && !/dexpaprika/i.test(source.name))
      .map((source) => `${source.name}: ${shortSourceReason(source.error)}`)
      .join("; ");
    return `Source mode: Degraded pool fallback — DexPaprika top pools only; not a new-launch scout. ${okxCopy}${failures ? `, ${failures}.` : "."}`;
  }
  return "Fixture story — simulated OKX Agentic Wallet path for demo recording. No live funds or mainnet execution.";
}

function categoryLabel(category: Opportunity["category"]) {
  if (category === "new-launch") return "New";
  if (category === "blue-chip") return "Blue chip";
  if (category === "blocked-risk") return "Blocked risk";
  if (category === "demo") return "Demo";
  return "Trending";
}

function scanModeLabel(mode: OpportunityScan["mode"]) {
  if (mode === "live") return "LIVE";
  if (mode === "live-degraded") return "LIVE DEGRADED";
  return "FIXTURE";
}

function demoOpportunityScan(base: OpportunityScan): OpportunityScan {
  const opportunities = demoFixtureOpportunities();
  return {
    ...base,
    generatedAt: base.generatedAt,
    mode: "fixture-fallback",
    sourceMode: "demo-snapshot",
    summary: {
      scannedSources: ["Demo fixtures", ...base.summary.scannedSources],
      opportunityCount: opportunities.length,
      readyCount: opportunities.filter((opportunity) => opportunity.status === "ready").length,
      blockedCount: opportunities.filter((opportunity) => opportunity.status === "blocked").length,
      clusterCount: opportunities.length,
      defaultClusterCount: opportunities.length,
    },
    opportunities,
    clusters: [],
    defaultClusterIds: [],
    sourceHealth: [
      { name: "Demo fixtures", ok: true, command: "UI demo toggle" },
      ...base.sourceHealth,
    ],
  };
}

function demoFixtureOpportunities(): Opportunity[] {
  return [
    {
      id: "demo:fixture:clean",
      ticketId: "opp_demo_clean",
      status: "ready",
      action: "quote-buy",
      actionLabel: "Quote buy $25 CLEAN",
      symbol: "CLEAN",
      name: "Clean Route",
      chain: "X Layer",
      tokenAddress: "fixture-clean-xlayer",
      source: "fixture fallback",
      thesis: "Demo fixture: clean X Layer route with OKX-style security, quote, and gateway simulation evidence.",
      invalidation: "Invalidate if live scanner returns risk flags, quote slippage rises, or trace verification fails.",
      confidence: 72,
      score: 72,
      freshness: "fixture",
      metrics: { liquidityUsd: 54_000, volumeUsd: 18_000, priceChangePct: 2.4, priceImpactPercent: 0.42 },
      risk: { level: "low", verdict: "allow", reasons: ["fixture fallback has no blocking risk"] },
      policy: { allowed: true, reasons: ["all fixture policy gates pass"] },
      proposedOrder: {
        mode: "market-swap-capped",
        fromAsset: "USDC",
        toAsset: "CLEAN",
        amountUsd: 25,
        slippageBps: 42,
        quoteStatus: "quoted",
        quoteFreshenedAt: new Date().toISOString(),
        route: "USDC -> CLEAN",
      },
      evidence: [
        { source: "fixture", skill: "okx-dex-signal", summary: "Fallback smart-money signal used for demo mode." },
        { source: "fixture", skill: "okx-security", summary: "Fixture security check clears token and route for demo ceremony." },
      ],
      category: "demo",
    },
    {
      id: "demo:fixture:rugcat",
      ticketId: "opp_demo_rugcat",
      status: "blocked",
      action: "watch",
      actionLabel: "Watch RUGCAT",
      symbol: "RUGCAT",
      name: "Rug Cat",
      chain: "Solana",
      tokenAddress: "fixture-rugcat-solana",
      source: "fixture fallback",
      thesis: "Demo fixture: suspicious launch pattern intentionally demonstrates a blocked ticket.",
      invalidation: "Do not execute until holder concentration, quote status, and risk evidence clear.",
      confidence: 88,
      score: 18,
      freshness: "fixture",
      metrics: { liquidityUsd: 1_200, volumeUsd: 400, priceChangePct: -48, top10HolderPercent: 72, holders: 8 },
      risk: { level: "blocked", verdict: "block", reasons: ["top-10 holder concentration 72%", "only 8 holders", "no executable quote"] },
      policy: { allowed: false, reasons: ["fixture blocked by risk policy"] },
      proposedOrder: {
        mode: "watch-only",
        fromAsset: "USDC",
        toAsset: "RUGCAT",
        amountUsd: 25,
        slippageBps: 250,
        quoteStatus: "unavailable",
      },
      evidence: [
        { source: "fixture", skill: "okx-dex-trenches", summary: "Fallback launchpad evidence shows concentrated holders." },
        { source: "fixture", skill: "okx-security", summary: "Fixture security check blocks the ticket before allocation." },
      ],
      category: "demo",
    },
  ];
}

function formatClock(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "n/a";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scannerModeMessage(scan: OpportunityScan) {
  if (scan.sourceMode === "okx-scout") return `OKX scout refreshed: ${scan.summary.defaultClusterCount ?? scan.summary.opportunityCount} clusters.`;
  if (scan.sourceMode === "live-scout") return `Live scout refreshed: ${scan.summary.defaultClusterCount ?? scan.summary.opportunityCount} clusters.`;
  if (scan.sourceMode === "degraded-pool-fallback") return `Showing degraded pool fallback — DexPaprika top pools only: ${firstSourceFailure(scan) ?? "OKX/DexScreener/GeckoTerminal unavailable"}.`;
  if (scan.sourceMode === "demo-snapshot") return "Live scout degraded — showing deterministic demo snapshot.";
  if (scan.mode === "live") return `Live market scan refreshed: ${scan.summary.opportunityCount} opportunities.`;
  const reason = firstSourceFailure(scan) ?? "source unavailable";
  if (scan.mode === "fixture-fallback") return `${fixtureFallbackCopy(scan)}: ${reason}`;
  return `Degraded source: ${reason}`;
}

function fixtureFallbackCopy(scan: OpportunityScan) {
  if (scan.sourceMode === "demo-snapshot") return "Live scout degraded — showing deterministic demo snapshot";
  if (scan.sourceMode === "degraded-pool-fallback") return "DexPaprika top pools only — degraded pool fallback";
  const publicLive = scan.sourceHealth.some((source) => source.ok && !/okx|onchainos/i.test(source.name));
  return publicLive
    ? "Live sources returned fewer than 3 quality emerging candidates — showing fixtures"
    : "All live sources unavailable — showing fixtures";
}

function firstSourceFailure(scan: OpportunityScan) {
  const failedPublic = scan.sourceHealth.find((source) => !source.ok && !/okx|onchainos/i.test(source.name));
  const failed = failedPublic ?? scan.sourceHealth.find((source) => !source.ok);
  if (!failed) return null;
  return /okx|onchainos/i.test(failed.name)
    ? `OKX OnchainOS enrichment gated: ${shortSourceReason(failed.error)}`
    : `${failed.name}: ${shortSourceReason(failed.error)}`;
}

function sourceHealthCopy(source: OpportunityScan["sourceHealth"][number]) {
  if (source.ok) return source.cached ? "Live source responded from the 30s cache." : "Live source responded.";
  const reason = shortSourceReason(source.error);
  if (/okx|onchainos/i.test(source.name)) return `OKX OnchainOS enrichment gated: ${reason}`;
  return `${source.name} unavailable: ${reason}`;
}

function shortSourceReason(value?: string) {
  const message = (value ?? "source unavailable").replace(/\s+/g, " ").trim();
  if (/quota|MARKET_API_OLD_USER_POST_GRACE_OVER_QUOTA|payment/i.test(message)) return "payment/grace quota gate";
  if (/ERR_SSL|TLS|ALPN|APPLICATION_PROTOCOL/i.test(message)) return "TLS/ALPN handshake failed";
  if (/timeout/i.test(message)) return "request timed out";
  if (/fetch failed|ECONN|ENOTFOUND|EAI_AGAIN|blocked|network/i.test(message)) return "network unreachable";
  if (message.startsWith("{") || message.startsWith("[")) return "provider returned a structured error";
  return message.slice(0, 120);
}

function detectWalletProvider(): { provider: EthereumProvider | null; name: WalletState["providerName"] } {
  if (window.okxwallet) return { provider: window.okxwallet, name: "okxwallet" };
  if (window.ethereum) return { provider: window.ethereum, name: "ethereum" };
  return { provider: null, name: null };
}

function walletErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "number" ? code : Number(code);
  }
  return undefined;
}

function walletErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "string" && error.trim()) return error.trim();
  return "Wallet returned no message";
}

function formatWalletError(error: unknown, chainId: string | null | undefined, context: string) {
  const code = walletErrorCode(error);
  const base =
    code === 4001
      ? context.toLowerCase().includes("signature")
        ? "Signature request cancelled"
        : "Wallet rejected request"
      : walletErrorMessage(error);
  const chain = walletChainLabel(chainId);
  const hint =
    code === 4001
      ? "No wallet action was recorded."
      : context.toLowerCase().includes("switch")
        ? "You can continue in fallback mode."
        : "Check the wallet popup and try again.";
  return `${base} · wallet chain ${chain} · ${hint}`;
}

function walletChainLabel(chainId?: string | null) {
  if (!chainId) return "unknown chain";
  const normalized = chainId.toLowerCase();
  if (normalized === "0x1") return "Ethereum 0x1";
  if (normalized === XLAYER_TESTNET_HEX) return "X Layer testnet 0x7a0 / 1952";
  const decimal = Number.parseInt(normalized, 16);
  return Number.isFinite(decimal) ? `Chain ${chainId} / ${decimal}` : `Chain ${chainId}`;
}

function anchorExplorerUrl(event?: BlackBoxEvent) {
  const explorer = typeof event?.payload.explorerUrl === "string" ? event.payload.explorerUrl : null;
  return explorer || "https://www.okx.com/web3/explorer/xlayer-test";
}

function orderDraftFromOpportunity(opportunity: Opportunity, reasoning: ReasoningResult | null): OrderTicketDraft {
  const cleanSymbol = opportunity.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "") || "TOKEN";
  const price = positiveNumber(opportunity.metrics.priceUsd) ?? 1;
  const notionalUsd = positiveNumber(opportunity.proposedOrder.amountUsd) ?? 25;
  return {
    opportunityId: opportunity.id,
    clusterId: opportunity.cluster?.cluster_id,
    symbol: opportunity.symbol,
    chain: opportunity.chain,
    side: "buy",
    type: "limit",
    instrument: `${cleanSymbol}-USDT`,
    qty: Number((notionalUsd / price).toFixed(8)),
    price,
    notionalUsd,
    reasonText: reasoning?.text ?? opportunity.thesis,
  };
}

function opportunityBlockers(opportunity: Opportunity, ticketEvents: BlackBoxEvent[], extraReasons: string[] = []) {
  const veto = [...ticketEvents].reverse().find((event) => event.type === "risk.verdict" && event.payload?.verdict === "veto");
  const blockers = [
    ...(veto ? [String(veto.payload.reason ?? veto.summary)] : []),
    ...extraReasons,
    ...(opportunity.risk.verdict === "block" || opportunity.risk.level === "blocked" || opportunity.status === "blocked" ? opportunity.risk.reasons : []),
    ...(!opportunity.policy.allowed ? opportunity.policy.reasons : []),
    ...(opportunity.status !== "ready" ? [`status is ${opportunity.status}; execution requires a ready ticket`] : []),
  ].filter(Boolean);
  return [...new Set(blockers)].slice(0, 3);
}

function orderPreflight(draft: OrderTicketDraft, caps: BlotterResponse["caps"], state: DeskState) {
  const dailyUsed = dailyNotionalUsed(state);
  const items = [
    {
      label: "Instrument allowlist",
      ok: caps.instrumentAllowlist.length === 0 || caps.instrumentAllowlist.includes(draft.instrument),
      detail: caps.instrumentAllowlist.length === 0 ? "no allowlist configured" : draft.instrument,
    },
    {
      label: "Max notional cap",
      ok: draft.notionalUsd <= caps.maxNotionalUsd,
      detail: `${formatMoney(draft.notionalUsd)} / ${formatMoney(caps.maxNotionalUsd)}`,
    },
    {
      label: "Daily notional cap",
      ok: dailyUsed + draft.notionalUsd <= caps.dailyNotionalCapUsd,
      detail: `${formatMoney(dailyUsed + draft.notionalUsd)} / ${formatMoney(caps.dailyNotionalCapUsd)}`,
    },
    {
      label: "Order type",
      ok: draft.type === "limit" || draft.type === "post_only",
      detail: draft.type,
    },
  ];
  return { ok: items.every((item) => item.ok), items };
}

function dailyNotionalUsed(state: DeskState) {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  return state.orders
    .filter((order) => new Date(order.created_at).getTime() >= since)
    .reduce((sum, order) => sum + order.notional_usd, 0);
}

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function normalizeAdapterMode(mode: string): AdapterMode {
  const normalized = mode.replaceAll("-", "_");
  if (
    normalized === "fixture" ||
    normalized === "live_read" ||
    normalized === "calldata" ||
    normalized === "xlayer_testnet" ||
    normalized === "cex_paper" ||
    normalized === "cex_live_capped" ||
    normalized === "dex_mainnet_capped"
  ) {
    return normalized;
  }
  return "fixture";
}

function modeDisplayLabel(mode: string) {
  return normalizeAdapterMode(mode) === "fixture" ? "PAPER-FALLBACK" : mode;
}

function getUiExecutionMode(policy: Policy | null) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="execution-mode"], meta[name="desk-execution-mode"]');
  return meta?.content?.trim() || policy?.executionMode || "fixture";
}

function defaultCaps(): BlotterResponse["caps"] {
  return {
    maxNotionalUsd: 200,
    dailyNotionalCapUsd: 1000,
    instrumentAllowlist: ["BTC-USDT", "ETH-USDT", "SOL-USDT", "USDC-USDT", "CLEAN-USDT"],
  };
}

function emptyDeskState(): DeskState {
  return {
    schema_version: 1,
    tickets: [],
    orders: [],
    fills: [],
    positions: [],
    updated_at: new Date(0).toISOString(),
  };
}

function demoOrders(): DeskOrder[] {
  const now = new Date().toISOString();
  return [
    {
      order_id: "demo_ord_btc_001",
      ticket_id: "demo_tkt_btc",
      cl_ord_id: "demo_cli_btc_001",
      venue: "fixture",
      mode: "fixture",
      side: "buy",
      type: "limit",
      instrument: "BTC-USDT",
      qty: 0.012,
      price: 103200,
      notional_usd: 1238.4,
      state: "filled",
      degraded: true,
      created_at: now,
      updated_at: now,
    },
    {
      order_id: "demo_ord_eth_002",
      ticket_id: "demo_tkt_eth",
      cl_ord_id: "demo_cli_eth_002",
      venue: "fixture",
      mode: "fixture",
      side: "sell",
      type: "post_only",
      instrument: "ETH-USDT",
      qty: 0.32,
      price: 3860,
      notional_usd: 1235.2,
      state: "submitted",
      degraded: true,
      created_at: now,
      updated_at: now,
    },
    {
      order_id: "demo_ord_sol_003",
      ticket_id: "demo_tkt_sol",
      cl_ord_id: "demo_cli_sol_003",
      venue: "fixture",
      mode: "fixture",
      side: "buy",
      type: "limit",
      instrument: "SOL-USDT",
      qty: 4.8,
      price: 167.2,
      notional_usd: 802.56,
      state: "confirmed",
      degraded: true,
      created_at: now,
      updated_at: now,
    },
  ];
}

function demoPositions(): DeskPosition[] {
  const now = new Date().toISOString();
  return [
    { symbol: "BTC", chain: "OKX CEX paper", qty: 0.012, avg_price: 103200, notional_usd: 1238.4, realized_pnl_usd: 42.8, unrealized_pnl_usd: 18.2, updated_at: now },
    { symbol: "ETH", chain: "OKX CEX paper", qty: 0.68, avg_price: 3814, notional_usd: 2593.52, realized_pnl_usd: -11.4, unrealized_pnl_usd: 7.9, updated_at: now },
    { symbol: "SOL", chain: "OKX CEX paper", qty: 12.4, avg_price: 164.1, notional_usd: 2034.84, realized_pnl_usd: 28.6, unrealized_pnl_usd: 15.1, updated_at: now },
  ];
}

function isEditableTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null;
  if (!element) return false;
  return Boolean(element.closest("input, textarea, select, [contenteditable='true']"));
}

function formatNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "n/a";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(number);
}

function formatMoney(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "n/a";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: Math.abs(number) >= 100 ? 0 : 2 }).format(number);
}

function shortAddress(value?: string | null) {
  if (!value) return "n/a";
  return value.length > 14 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function shortSessionId(value?: string | null) {
  if (!value) return "n/a";
  return value.length > 14 ? value.slice(-10) : value;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetchWithTimeout(url);
  if (!response.ok) return "";
  return response.text();
}

async function postEventDrafts(drafts: EventDraft[]): Promise<EventAppendResponse> {
  const response = await apiFetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drafts }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(renderApiError(text, response.status));
  }
  return response.json() as Promise<EventAppendResponse>;
}

async function postWalletReceiptDraft(draft: RawEventDraft): Promise<EventAppendResponse> {
  const first = await apiFetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drafts: [draft] }),
  });
  if (first.ok) return first.json() as Promise<EventAppendResponse>;
  const firstText = await first.text();
  if (!/unsupported event type/i.test(firstText)) {
    throw new Error(renderApiError(firstText, first.status));
  }
  const fallback: RawEventDraft = {
    ...draft,
    type: "report.digest",
    summary: "wallet.receipt.signed",
    payload: { ...draft.payload, originalType: draft.type, degradedTo: "report.digest" },
  };
  const second = await apiFetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drafts: [fallback] }),
  });
  if (!second.ok) {
    const secondText = await second.text();
    throw new Error(renderApiError(secondText, second.status));
  }
  return second.json() as Promise<EventAppendResponse>;
}

async function postReasoning(opportunityId: string): Promise<{
  ok: boolean;
  opportunity_id: string;
  reasoning: string;
  source: "llm" | "template";
  model?: string;
  degraded?: boolean;
  reason_for_degrade?: string;
}> {
  const response = await apiFetch("/api/reason", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ opportunity_id: opportunityId }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(renderApiError(text, response.status));
  }
  return response.json();
}

async function postReasoningWithTimeout(opportunityId: string, timeoutMs: number) {
  let timer: number | undefined;
  try {
    return await Promise.race([
      postReasoning(opportunityId),
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(`request timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

async function fetchBlotter(): Promise<BlotterResponse> {
  const response = await apiFetch("/api/blotter");
  if (!response.ok) {
    const text = await response.text();
    throw new Error(renderApiError(text, response.status));
  }
  return response.json() as Promise<BlotterResponse>;
}

async function postTicket(body: {
  opportunity_id: string;
  cluster_id?: string;
  symbol: string;
  chain: string;
  side: OrderSide;
  notional_usd: number;
  reasoning?: string;
  evidence_skills: string[];
}): Promise<{ ok: true; ticket: DeskTicket; state: DeskState }> {
  const response = await apiFetch("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(renderApiError(text, response.status));
  }
  return response.json();
}

async function postOrder(body: {
  ticket_id: string;
  venue: DeskOrder["venue"];
  mode: AdapterMode;
  side: OrderSide;
  type: OrderType;
  instrument: string;
  qty: number;
  price: number;
  notional_usd: number;
  degraded: boolean;
}): Promise<{ ok: true; order: DeskOrder; state: DeskState }> {
  const response = await apiFetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(renderApiError(text, response.status));
  }
  return response.json();
}

async function postTamper(eventIndex: number): Promise<TraceUpdateResponse> {
  const response = await apiFetch(`/api/demo/tamper?eventIndex=${eventIndex}`, { method: "POST" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(renderApiError(text, response.status));
  }
  return response.json() as Promise<TraceUpdateResponse>;
}

async function postRestore(): Promise<TraceUpdateResponse> {
  const response = await apiFetch("/api/demo/restore", { method: "POST" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(renderApiError(text, response.status));
  }
  return response.json() as Promise<TraceUpdateResponse>;
}

const DESK_API_PORT = "4181";

function getDeskApiOrigins() {
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const currentHost = window.location.hostname ? `${protocol}//${window.location.hostname}:${DESK_API_PORT}` : "";
  return Array.from(new Set([currentHost, `http://127.0.0.1:${DESK_API_PORT}`, `http://localhost:${DESK_API_PORT}`].filter(Boolean)));
}

async function apiFetch(path: string, init: RequestInit = {}, timeoutMs = 8_000) {
  const failures: string[] = [];
  for (const origin of getDeskApiOrigins()) {
    try {
      return await fetchWithTimeout(`${origin}${path}`, init, timeoutMs);
    } catch (error) {
      failures.push(`${origin}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(failures.join(" | "));
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function renderApiError(text: string, status: number) {
  if (!text) return `HTTP ${status}`;
  try {
    const parsed = JSON.parse(text) as { error?: string; errors?: string[] };
    return [parsed.error, ...(parsed.errors ?? [])].filter(Boolean).join("; ") || `HTTP ${status}`;
  } catch {
    return text;
  }
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-error">
        <div>
          <p className="eyebrow">Render failure</p>
          <h1>The Desk could not render</h1>
          <p>{this.state.error.message}</p>
          <button type="button" className="primary-action" onClick={() => window.location.reload()}>
            <RotateCcw size={16} />
            Reload
          </button>
        </div>
      </main>
    );
  }
}

type RootContainer = HTMLElement & { __opsCenterRoot?: Root };

const rootElement = document.getElementById("root")! as RootContainer;
rootElement.__opsCenterRoot = rootElement.__opsCenterRoot ?? createRoot(rootElement);
rootElement.__opsCenterRoot.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
