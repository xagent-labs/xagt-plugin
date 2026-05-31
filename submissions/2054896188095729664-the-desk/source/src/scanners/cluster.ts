import type {
  CandidateCluster,
  CrossChainSibling,
  Opportunity,
  OpportunityCategory,
  OpportunityEvidence,
  OpportunityMetrics,
  OpportunityPolicyVerdict,
  OpportunityRisk,
  OpportunityScan,
  OpportunityStatus,
  ProposedOrder,
  SourceMode,
} from "../types.js";

const DEFAULT_MAX_QUOTE_AGE_SECONDS = 60;
const statusRank: Record<OpportunityStatus, number> = { blocked: 3, watch: 2, proposed: 1, ready: 0 };
const riskRank: Record<OpportunityRisk["level"], number> = { blocked: 4, high: 3, medium: 2, low: 1 };
const categoryRank: Record<OpportunityCategory, number> = {
  trending: 5,
  "new-launch": 4,
  "blocked-risk": 3,
  "blue-chip": 2,
  demo: 1,
};

export interface ReadyGateContext {
  sourceMode?: SourceMode;
  maxQuoteAgeSeconds?: number;
  reasoningText?: string;
}

export function clusterOpportunities(opportunities: Opportunity[], sourceMode?: SourceMode, context: Omit<ReadyGateContext, "sourceMode"> = {}): CandidateCluster[] {
  const grouped = new Map<string, Opportunity[]>();
  for (const opportunity of opportunities) {
    const key = `${opportunity.chain.toLowerCase()}:${opportunity.symbol.toLowerCase()}`;
    grouped.set(key, [...(grouped.get(key) ?? []), opportunity]);
  }
  return [...grouped.values()]
    .map((members) => buildCluster(members, { ...context, sourceMode }))
    .sort((left, right) => right.score - left.score || left.symbol.localeCompare(right.symbol));
}

export function selectDefaultClusters(clusters: CandidateCluster[], sourceMode: SourceMode, maxClusters = 7): CandidateCluster[] {
  const includeDemo = sourceMode === "demo-snapshot";
  const withoutBlueChips = clusters.filter((cluster) => cluster.category !== "blue-chip" && (includeDemo || cluster.category !== "demo"));
  const nonBlocked = withoutBlueChips.filter((cluster) => cluster.status === "ready" || cluster.status === "watch");
  const candidates =
    nonBlocked.length >= 3
      ? withoutBlueChips.filter((cluster) => cluster.status !== "blocked")
      : [
          ...nonBlocked,
          ...withoutBlueChips
            .filter((cluster) => cluster.status === "blocked")
            .sort((left, right) => right.score - left.score)
            .slice(0, 1),
        ];

  const deduped = dedupeDefaultSymbolsAcrossChains(dedupeClusterSymbols(candidates));
  return deduped.slice(0, maxClusters);
}

export function clusterTicketGate(cluster: CandidateCluster | undefined, sourceMode: SourceMode): { allowed: boolean; reasons: string[] } {
  if (!cluster) return { allowed: false, reasons: ["source cluster not found"] };
  const gate = readyGate(cluster, { sourceMode });
  if (!gate.ready) return { allowed: false, reasons: gate.reasons };
  return { allowed: true, reasons: [] };
}

export function readyGate(cluster: CandidateCluster | undefined, scanOrContext: Pick<OpportunityScan, "sourceMode"> | ReadyGateContext = {}): { ready: boolean; reasons: string[] } {
  if (!cluster) return { ready: false, reasons: ["source cluster not found"] };
  const context = scanOrContext as ReadyGateContext & Pick<OpportunityScan, "sourceMode">;
  const sourceMode = context.sourceMode ?? cluster.sourceMode_hint;
  const maxQuoteAgeSeconds = context.maxQuoteAgeSeconds ?? DEFAULT_MAX_QUOTE_AGE_SECONDS;
  const reasons = [];
  if (cluster.status !== "ready") reasons.push(`status is ${cluster.status}; execution requires a ready cluster`);
  if (cluster.risk.verdict !== "allow") reasons.push(`risk verdict is ${cluster.risk.verdict}`);
  if (!cluster.policy.allowed) reasons.push("policy gate is not allowed");
  if (sourceMode !== "okx-scout" && sourceMode !== "live-scout") reasons.push(`source mode ${sourceMode} is not executable`);
  if (!clusterHasOkxOrWalletEvidence(cluster)) reasons.push("missing OKX or wallet evidence");
  const quoteStatus = cluster.proposedOrder?.quoteStatus ?? cluster.quoteStatus;
  if (quoteStatus !== "quoted") reasons.push(`quote status is ${quoteStatus ?? "missing"}`);
  if (quoteStatus === "quoted" && !quoteIsFresh(cluster.proposedOrder?.quoteFreshenedAt, maxQuoteAgeSeconds)) reasons.push("stale quote");
  if (containsNotActionable(cluster, context.reasoningText)) reasons.push("NOT ACTIONABLE reasoning");
  return { ready: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function clusterHasOkxOrWalletEvidence(cluster: CandidateCluster) {
  return cluster.top_evidence.some((evidence) => /okx|onchainos|wallet/i.test(`${evidence.source} ${evidence.skill}`));
}

function buildCluster(members: Opportunity[], context: ReadyGateContext): CandidateCluster {
  const primary = [...members].sort((left, right) => (right.metrics.liquidityUsd ?? 0) - (left.metrics.liquidityUsd ?? 0))[0] ?? members[0];
  const addresses = [...new Set(members.map((member) => member.tokenAddress).filter(Boolean))];
  const baseStatus = mostRestrictiveStatus(members);
  const risk = worstRisk(members);
  const policy = aggregatePolicy(members);
  const aggregated_metrics = aggregateMetrics(members);
  const category = modeCategory(members);
  const topMember = [...members].sort((left, right) => right.score - left.score)[0] ?? primary;
  const quoteStatus = aggregateQuoteStatus(members);
  const proposedOrder = aggregateProposedOrder(topMember, members, quoteStatus);
  const worstReason = risk.reasons[0] ?? "none";
  const top_evidence: OpportunityEvidence[] = [
    ...topMember.evidence.slice(0, 3),
    {
      source: "candidate-cluster",
      skill: "candidate-cluster",
      summary: `${members.length} pools / ${addresses.length} contracts (worst-risk: ${worstReason})`,
      timestamp: new Date().toISOString(),
    },
  ].slice(0, 4);

  const draft: CandidateCluster = {
    cluster_id: `cluster:${slug(primary.chain)}:${slug(primary.symbol)}`,
    symbol: primary.symbol,
    chain: primary.chain,
    primary_address: primary.tokenAddress,
    addresses,
    pool_count: members.length,
    contract_count: addresses.length,
    aggregated_metrics,
    top_evidence,
    risk,
    policy,
    status: baseStatus,
    score: Math.max(...members.map((member) => member.score)),
    category,
    sourceMode_hint: context.sourceMode,
    member_ids: members.map((member) => member.id),
    quoteStatus,
    proposedOrder,
    notReadyReasons: [],
    actionLabel: actionLabel(primary.symbol, baseStatus),
  };
  const gate = readyGate(draft, context);
  const status = gatedStatus(baseStatus, risk, policy, gate);
  const score = capScore(draft.score, status);
  const finalRisk = riskForGate(risk, status, gate);
  const finalProposedOrder = status === "ready" ? proposedOrder : { ...proposedOrder, mode: "watch-only" as const };

  return {
    ...draft,
    status,
    score,
    risk: finalRisk,
    quoteStatus: finalProposedOrder.quoteStatus,
    proposedOrder: finalProposedOrder,
    notReadyReasons: gate.ready ? [] : gate.reasons,
    actionLabel: actionLabel(primary.symbol, status),
  };
}

function aggregateMetrics(members: Opportunity[]): OpportunityMetrics {
  const liquidityUsd = sum(members, (member) => member.metrics.liquidityUsd);
  const volumeUsd = sum(members, (member) => member.metrics.volumeUsd);
  const priceChangePct = weightedAverage(members, (member) => member.metrics.priceChangePct, (member) => member.metrics.liquidityUsd);
  const priceUsd = weightedAverage(members, (member) => member.metrics.priceUsd, (member) => member.metrics.liquidityUsd);
  const marketCapUsd = max(members, (member) => member.metrics.marketCapUsd);
  const top10HolderPercent = max(members, (member) => member.metrics.top10HolderPercent);
  const holders = max(members, (member) => member.metrics.holders);
  const buyTxCount1h = sum(members, (member) => member.metrics.buyTxCount1h);
  const sellTxCount1h = sum(members, (member) => member.metrics.sellTxCount1h);
  const freshness_minutes = min(members, (member) => member.metrics.freshness_minutes);
  return compactMetrics({
    priceUsd,
    marketCapUsd,
    liquidityUsd,
    volumeUsd,
    priceChangePct,
    top10HolderPercent,
    holders,
    buyTxCount1h,
    sellTxCount1h,
    freshness_minutes,
  });
}

function worstRisk(members: Opportunity[]): OpportunityRisk {
  const worst = [...members].sort((left, right) => riskRank[right.risk.level] - riskRank[left.risk.level])[0] ?? members[0];
  const reasons = [...new Set(members.flatMap((member) => member.risk.reasons))];
  return { ...worst.risk, reasons: reasons.length > 0 ? reasons : worst.risk.reasons };
}

function aggregatePolicy(members: Opportunity[]): OpportunityPolicyVerdict {
  const blockedReasons = members.filter((member) => !member.policy.allowed).flatMap((member) => member.policy.reasons);
  if (blockedReasons.length > 0) return { allowed: false, reasons: [...new Set(blockedReasons)] };
  return { allowed: true, reasons: [...new Set(members.flatMap((member) => member.policy.reasons))] };
}

function mostRestrictiveStatus(members: Opportunity[]): OpportunityStatus {
  return [...members].sort((left, right) => statusRank[right.status] - statusRank[left.status])[0]?.status ?? "watch";
}

function modeCategory(members: Opportunity[]): OpportunityCategory | undefined {
  const counts = new Map<OpportunityCategory, number>();
  for (const member of members) {
    if (!member.category) continue;
    counts.set(member.category, (counts.get(member.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || categoryRank[right[0]] - categoryRank[left[0]] || left[0].localeCompare(right[0]))[0]?.[0];
}

function aggregateQuoteStatus(members: Opportunity[]): ProposedOrder["quoteStatus"] {
  if (members.some((member) => member.proposedOrder.quoteStatus === "quoted")) return "quoted";
  if (members.some((member) => member.proposedOrder.quoteStatus === "not-quoted")) return "not-quoted";
  return "unavailable";
}

function aggregateProposedOrder(topMember: Opportunity, members: Opportunity[], quoteStatus: ProposedOrder["quoteStatus"]): ProposedOrder {
  const quotedFreshenedAt = latestTimestamp(members.map((member) => member.proposedOrder.quoteFreshenedAt));
  return {
    ...topMember.proposedOrder,
    quoteStatus,
    quoteFreshenedAt: quotedFreshenedAt ?? topMember.proposedOrder.quoteFreshenedAt,
  };
}

function dedupeClusterSymbols(clusters: CandidateCluster[]) {
  const byKey = new Map<string, CandidateCluster>();
  for (const cluster of clusters.sort((left, right) => right.score - left.score)) {
    const key = `${cluster.chain.toLowerCase()}:${cluster.symbol.toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, cluster);
  }
  return [...byKey.values()].sort((left, right) => right.score - left.score || left.symbol.localeCompare(right.symbol));
}

function dedupeDefaultSymbolsAcrossChains(clusters: CandidateCluster[]) {
  const grouped = new Map<string, CandidateCluster[]>();
  for (const cluster of clusters.sort((left, right) => right.score - left.score || left.symbol.localeCompare(right.symbol))) {
    const key = cluster.symbol.toLowerCase();
    grouped.set(key, [...(grouped.get(key) ?? []), cluster]);
  }

  return [...grouped.values()]
    .map((group) => {
      const [kept, ...siblings] = group.sort((left, right) => right.score - left.score || (right.aggregated_metrics.liquidityUsd ?? 0) - (left.aggregated_metrics.liquidityUsd ?? 0));
      return {
        ...kept,
        cross_chain_siblings: [
          ...(kept.cross_chain_siblings ?? []),
          ...siblings.map(crossChainSibling),
        ],
      };
    })
    .sort((left, right) => right.score - left.score || left.symbol.localeCompare(right.symbol));
}

function crossChainSibling(cluster: CandidateCluster): CrossChainSibling {
  return {
    chain: cluster.chain,
    chain_address: cluster.primary_address,
    pool_count: cluster.pool_count,
    contract_count: cluster.contract_count,
    liquidityUsd: cluster.aggregated_metrics.liquidityUsd,
    volumeUsd: cluster.aggregated_metrics.volumeUsd,
    score: cluster.score,
    status: cluster.status,
  };
}

function gatedStatus(
  baseStatus: OpportunityStatus,
  risk: OpportunityRisk,
  policy: OpportunityPolicyVerdict,
  gate: { ready: boolean; reasons: string[] },
): OpportunityStatus {
  if (baseStatus === "blocked" || risk.verdict === "block" || !policy.allowed || gate.reasons.some((reason) => /NOT ACTIONABLE/i.test(reason))) return "blocked";
  if (!gate.ready) return "watch";
  return "ready";
}

function capScore(score: number, status: OpportunityStatus) {
  if (status === "blocked") return Math.min(score, 25);
  if (status === "watch") return Math.min(score, 60);
  return Math.max(score, 80);
}

function riskForGate(risk: OpportunityRisk, status: OpportunityStatus, gate: { ready: boolean; reasons: string[] }): OpportunityRisk {
  if (gate.ready || risk.verdict !== "allow") return risk;
  const reasons = [...new Set([...risk.reasons, ...gate.reasons])];
  if (status === "blocked" || gate.reasons.some((reason) => /NOT ACTIONABLE/i.test(reason))) {
    return {
      level: "blocked",
      verdict: "block",
      reasons,
    };
  }
  return {
    level: "medium",
    verdict: "review",
    reasons,
  };
}

function actionLabel(symbol: string, status: OpportunityStatus) {
  if (status === "ready") return `Investigate ${symbol}`;
  if (status === "blocked") return `Investigate risk cluster`;
  return `Watch ${symbol}`;
}

function sum(members: Opportunity[], pick: (member: Opportunity) => number | undefined) {
  const values = members.map(pick).filter((value): value is number => Number.isFinite(value));
  return values.length ? values.reduce((total, value) => total + value, 0) : undefined;
}

function max(members: Opportunity[], pick: (member: Opportunity) => number | undefined) {
  const values = members.map(pick).filter((value): value is number => Number.isFinite(value));
  return values.length ? Math.max(...values) : undefined;
}

function min(members: Opportunity[], pick: (member: Opportunity) => number | undefined) {
  const values = members.map(pick).filter((value): value is number => Number.isFinite(value));
  return values.length ? Math.min(...values) : undefined;
}

function weightedAverage(members: Opportunity[], pick: (member: Opportunity) => number | undefined, weight: (member: Opportunity) => number | undefined) {
  let totalWeight = 0;
  let weighted = 0;
  for (const member of members) {
    const value = pick(member);
    const memberWeight = weight(member) ?? 0;
    if (value === undefined || !Number.isFinite(value) || memberWeight <= 0) continue;
    weighted += value * memberWeight;
    totalWeight += memberWeight;
  }
  return totalWeight > 0 ? weighted / totalWeight : undefined;
}

function compactMetrics(metrics: OpportunityMetrics): OpportunityMetrics {
  return Object.fromEntries(Object.entries(metrics).filter(([, value]) => value !== undefined)) as OpportunityMetrics;
}

function quoteIsFresh(quoteFreshenedAt: string | undefined, maxQuoteAgeSeconds: number) {
  if (!quoteFreshenedAt) return false;
  const timestamp = Date.parse(quoteFreshenedAt);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= maxQuoteAgeSeconds * 1_000;
}

function containsNotActionable(cluster: CandidateCluster, reasoningText?: string) {
  const text = [
    reasoningText,
    ...cluster.risk.reasons,
    ...cluster.policy.reasons,
    ...cluster.top_evidence.map((evidence) => evidence.summary),
  ]
    .filter(Boolean)
    .join(" ");
  return /NOT ACTIONABLE|not actionable/i.test(text);
}

function latestTimestamp(values: Array<string | undefined>) {
  const timestamps = values
    .map((value) => ({ value, time: value ? Date.parse(value) : Number.NaN }))
    .filter((item): item is { value: string; time: number } => Boolean(item.value) && Number.isFinite(item.time))
    .sort((left, right) => right.time - left.time);
  return timestamps[0]?.value;
}

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "unknown";
}
