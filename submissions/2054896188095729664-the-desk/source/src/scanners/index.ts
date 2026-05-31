import type { Opportunity, OpportunityScan, SourceMode } from "../types.js";
import { clusterOpportunities, selectDefaultClusters } from "./cluster.js";
import { demoSnapshotOpportunities } from "./demo-snapshot.js";
import { fetchDexPaprikaOpportunities } from "./dexpaprika.js";
import { fetchDexScreenerOpportunities } from "./dexscreener.js";
import { fetchGeckoTerminalOpportunities } from "./geckoterminal.js";
import { dedupeKey, shortError, type ProviderScanResult, type ScannerOptions, type ScannerSourceHealth } from "./shared.js";

export type ProviderName = "dexscreener" | "geckoterminal" | "dexpaprika";

export interface ComposeScanOptions extends ScannerOptions {
  maxOpportunities?: number;
  ttlMs?: number;
  providers?: Array<{
    name: ProviderName | string;
    fetchOpportunities: (options: ScannerOptions) => Promise<ProviderScanResult>;
  }>;
  fallbackOpportunities?: () => Opportunity[];
}

const DEFAULT_TTL_MS = 30_000;

const providerList: NonNullable<ComposeScanOptions["providers"]> = [
  { name: "dexscreener", fetchOpportunities: fetchDexScreenerOpportunities },
  { name: "geckoterminal", fetchOpportunities: fetchGeckoTerminalOpportunities },
  { name: "dexpaprika", fetchOpportunities: fetchDexPaprikaOpportunities },
];

const providerCache = new Map<string, { data: ProviderScanResult; expiresAt: number }>();

export function clearScannerCache() {
  providerCache.clear();
}

export async function composeOpportunityScan(options: ComposeScanOptions = {}): Promise<OpportunityScan> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const providers = options.providers ?? providerList;
  const results = await Promise.all(providers.map((provider) => readProvider(provider.name, provider.fetchOpportunities, options, ttlMs)));
  const deduped = dedupeOpportunities(results.flatMap((result) => result.opportunities));
  const opportunities = rankForRadar(deduped, options.maxOpportunities ?? 12);
  const liveProviders = results.filter((result) => result.ok);
  const sourceHealth = results.flatMap((result) => result.sourceHealth) as ScannerSourceHealth[];
  const sourceMode = classifySourceMode(sourceHealth, opportunities);

  if (opportunities.length === 0) {
    return scanFrom("fixture-fallback", demoSnapshotOpportunities(), sourceHealth, "demo-snapshot");
  }

  if (shouldUseSnapshotInsteadOfDexPaprikaTopPools(sourceMode, opportunities)) {
    return scanFrom("fixture-fallback", demoSnapshotOpportunities(), sourceHealth, "demo-snapshot");
  }

  const mode = liveProviders.length === results.length ? "live" : "live-degraded";
  return scanFrom(mode, opportunities, sourceHealth, sourceMode);
}

export function classifySourceMode(
  sourceHealth: ScannerSourceHealth[],
  opportunities: Opportunity[] = [],
  okxAvailable = false,
): SourceMode {
  const ok = (pattern: RegExp) => sourceHealth.some((source) => source.ok && pattern.test(source.name));
  if (okxAvailable || ok(/okx|onchainos/i)) return "okx-scout";
  if (ok(/dexscreener|geckoterminal/i)) return "live-scout";
  if (ok(/dexpaprika/i)) return "degraded-pool-fallback";
  if (opportunities.length > 0 && opportunities.every((opportunity) => opportunity.category === "demo")) return "demo-snapshot";
  return "demo-snapshot";
}

async function readProvider(
  name: string,
  fetchOpportunities: (options: ScannerOptions) => Promise<ProviderScanResult>,
  options: ScannerOptions,
  ttlMs: number,
): Promise<ProviderScanResult> {
  const cacheKey = `${name}:${options.timeoutMs ?? 5_000}:${Boolean(options.fetchImpl) ? "custom" : "global"}`;
  const cached = providerCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.data,
      sourceHealth: cached.data.sourceHealth.map((source) => ({ ...source, cached: true })),
    };
  }
  let result: ProviderScanResult;
  try {
    result = await fetchOpportunities(options);
  } catch (error) {
    result = {
      ok: false,
      opportunities: [],
      mode: "degraded",
      reason: shortError(error),
      sourceHealth: [
        {
          name,
          ok: false,
          command: name,
          error: shortError(error),
        },
      ],
    };
  }
  providerCache.set(cacheKey, { data: result, expiresAt: Date.now() + ttlMs });
  return result;
}

function dedupeOpportunities(opportunities: Opportunity[]) {
  const byKey = new Map<string, Opportunity>();
  for (const opportunity of opportunities) {
    const key = dedupeKey(opportunity);
    const existing = byKey.get(key);
    if (!existing || opportunity.score > existing.score) {
      byKey.set(key, mergeOpportunity(existing, opportunity));
    }
  }
  return [...byKey.values()];
}

function rankForRadar(opportunities: Opportunity[], maxDefaultRows: number) {
  const sorted = [...opportunities].sort((left, right) => right.score - left.score);
  const defaultRows = sorted.filter(isDefaultRadarOpportunity).slice(0, maxDefaultRows);
  const blueChips = sorted.filter((opportunity) => opportunity.category === "blue-chip").slice(0, Math.min(12, maxDefaultRows));
  const blueKeys = new Set(defaultRows.map((opportunity) => dedupeKey(opportunity)));
  return [...defaultRows, ...blueChips.filter((opportunity) => !blueKeys.has(dedupeKey(opportunity)))];
}

function isDefaultRadarOpportunity(opportunity: Opportunity) {
  return opportunity.category !== "blue-chip" && opportunity.category !== "demo";
}

function shouldUseSnapshotInsteadOfDexPaprikaTopPools(sourceMode: SourceMode, opportunities: Opportunity[]) {
  if (sourceMode !== "degraded-pool-fallback") return false;
  const clusters = clusterOpportunities(opportunities, sourceMode);
  const defaultClusters = selectDefaultClusters(clusters, sourceMode);
  return defaultClusters.length < 5;
}

function mergeOpportunity(existing: Opportunity | undefined, incoming: Opportunity) {
  if (!existing) return incoming;
  return {
    ...incoming,
    evidence: [...existing.evidence, ...incoming.evidence].slice(0, 8),
    source: [...new Set([existing.source, incoming.source])].join(" + "),
    score: Math.max(existing.score, incoming.score),
    metrics: {
      ...existing.metrics,
      ...incoming.metrics,
      liquidityUsd: max(existing.metrics.liquidityUsd, incoming.metrics.liquidityUsd),
      volumeUsd: max(existing.metrics.volumeUsd, incoming.metrics.volumeUsd),
      marketCapUsd: max(existing.metrics.marketCapUsd, incoming.metrics.marketCapUsd),
    },
  };
}

export function buildClusteredScan(
  mode: OpportunityScan["mode"],
  opportunities: Opportunity[],
  sourceHealth: ScannerSourceHealth[],
  sourceMode = classifySourceMode(sourceHealth, opportunities),
  maxQuoteAgeSeconds = 60,
): OpportunityScan {
  const clusters = clusterOpportunities(opportunities, sourceMode, { maxQuoteAgeSeconds });
  const defaultClusters = selectDefaultClusters(clusters, sourceMode);
  return {
    generatedAt: new Date().toISOString(),
    mode,
    sourceMode,
    summary: {
      scannedSources: [...new Set(sourceHealth.map((source) => source.name))],
      opportunityCount: opportunities.length,
      readyCount: clusters.filter((cluster) => cluster.status === "ready").length,
      blockedCount: clusters.filter((cluster) => cluster.status === "blocked").length,
      clusterCount: clusters.length,
      defaultClusterCount: defaultClusters.length,
    },
    opportunities,
    clusters,
    defaultClusterIds: defaultClusters.map((cluster) => cluster.cluster_id),
    sourceHealth,
  };
}

function scanFrom(mode: OpportunityScan["mode"], opportunities: Opportunity[], sourceHealth: ScannerSourceHealth[], sourceMode?: SourceMode): OpportunityScan {
  return buildClusteredScan(mode, opportunities, sourceHealth, sourceMode);
}

function max(left?: number, right?: number) {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return Math.max(left, right);
}

export { fetchDexPaprikaOpportunities, fetchDexScreenerOpportunities, fetchGeckoTerminalOpportunities };
