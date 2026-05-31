import https from "node:https";
import {
  cleanString,
  compactNumber,
  fetchJson,
  makeOpportunity,
  shortError,
  toNumber,
  type ProviderScanResult,
  type ScannerOptions,
} from "./shared.js";

const provider = "geckoterminal";
const baseUrl = "https://api.geckoterminal.com/api/v2";
const networks = ["eth", "solana", "base"];
const poolKinds = ["trending", "new"] as const;
type PoolKind = (typeof poolKinds)[number];

interface GeckoResponse {
  data?: GeckoPool[];
  included?: GeckoIncluded[];
}

interface GeckoPool {
  id?: string;
  type?: string;
  attributes?: {
    address?: string;
    name?: string;
    base_token_price_usd?: string | number;
    reserve_in_usd?: string | number;
    volume_usd?: { h24?: string | number };
    price_change_percentage?: { h24?: string | number };
    transactions?: { h24?: { buys?: number | string; sells?: number | string } };
    pool_created_at?: string;
  };
  relationships?: {
    base_token?: { data?: { id?: string; type?: string } };
  };
}

interface GeckoIncluded {
  id?: string;
  type?: string;
  attributes?: {
    address?: string;
    name?: string;
    symbol?: string;
  };
}

export async function fetchGeckoTerminalOpportunities(options: ScannerOptions = {}): Promise<ProviderScanResult> {
  const settled = await Promise.allSettled(networks.map((network) => fetchNetwork(network, options)));
  const errors = settled
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => shortError(result.reason));
  const opportunities = settled
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchNetwork>>> => result.status === "fulfilled")
    .flatMap((result) => result.value);

  const ok = opportunities.length > 0;
  return {
    ok,
    opportunities,
    mode: ok ? "live" : "degraded",
    reason: ok ? undefined : errors[0] ?? "GeckoTerminal returned no trending pools",
    sourceHealth: [
      {
        name: "GeckoTerminal",
        ok,
        command: networks.flatMap((network) => poolKinds.map((kind) => `${baseUrl}/networks/${network}/${kind}_pools`)).join(" | "),
        error: ok ? undefined : errors[0] ?? "no rows",
        detail: errors.length > 0 ? errors.join(" | ") : undefined,
      },
    ],
  };
}

async function fetchNetwork(network: string, options: ScannerOptions) {
  const settled = await Promise.allSettled(poolKinds.map((kind) => fetchNetworkKind(network, kind, options)));
  const rejected = settled.find((result): result is PromiseRejectedResult => result.status === "rejected");
  const opportunities = settled
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchNetworkKind>>> => result.status === "fulfilled")
    .flatMap((result) => result.value);
  if (opportunities.length === 0 && rejected) throw rejected.reason;
  return opportunities;
}

async function fetchNetworkKind(network: string, kind: PoolKind, options: ScannerOptions) {
  const url = `${baseUrl}/networks/${network}/${kind}_pools`;
  let payload: GeckoResponse;
  try {
    payload = await fetchJson<GeckoResponse>(url, options);
  } catch (error) {
    if (options.fetchImpl) throw error;
    payload = await fetchJsonHttp1(url, options.timeoutMs ?? 5_000);
  }

  const includedById = new Map((payload.included ?? []).map((item) => [item.id, item]));
  return (payload.data ?? []).map((pool) => normalizePool(network, kind, pool, includedById));
}

function normalizePool(network: string, kind: PoolKind, pool: GeckoPool, includedById: Map<string | undefined, GeckoIncluded>) {
  const baseToken = includedById.get(pool.relationships?.base_token?.data?.id);
  const attributes = pool.attributes ?? {};
  const tokenAddress = baseToken?.attributes?.address ?? attributes.address ?? pool.id;
  const buys = toNumber(attributes.transactions?.h24?.buys) ?? 0;
  const sells = toNumber(attributes.transactions?.h24?.sells) ?? 0;
  return makeOpportunity({
    provider,
    evidenceSkill: kind === "new" ? "geckoterminal-new" : "geckoterminal-trending",
    tokenAddress: tokenAddress ?? "unknown",
    chain: network,
    symbol: cleanString(baseToken?.attributes?.symbol) ?? poolNameSymbol(attributes.name),
    name: cleanString(baseToken?.attributes?.name) ?? cleanString(attributes.name),
    source: "GeckoTerminal",
    externalId: pool.id,
    metrics: {
      priceUsd: toNumber(attributes.base_token_price_usd),
      liquidityUsd: toNumber(attributes.reserve_in_usd),
      volumeUsd: toNumber(attributes.volume_usd?.h24),
      priceChangePct: toNumber(attributes.price_change_percentage?.h24),
      buyTxCount1h: buys,
      sellTxCount1h: sells,
    },
    signal: {
      trending: kind === "trending",
      newPool: kind === "new",
      poolCreatedAt: attributes.pool_created_at,
    },
    evidenceSummary: `GeckoTerminal ${kind} pool with $${compactNumber(toNumber(attributes.reserve_in_usd))} reserve and $${compactNumber(toNumber(attributes.volume_usd?.h24))} 24h volume.`,
    freshness: `live GeckoTerminal ${kind} snapshot`,
  });
}

function fetchJsonHttp1(url: string, timeoutMs: number): Promise<GeckoResponse> {
  const agent = new https.Agent({ ALPNProtocols: ["http/1.1"] });
  return new Promise<GeckoResponse>((resolve, reject) => {
    const request = https.get(
      url,
      {
        agent,
        headers: {
          accept: "application/json",
          "user-agent": "TheDesk/0.1 live-market-radar",
        },
        timeout: timeoutMs,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`HTTP ${response.statusCode ?? "unknown"}: ${body.slice(0, 180)}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as GeckoResponse);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.on("timeout", () => {
      request.destroy(new Error(`timeout after ${timeoutMs}ms`));
    });
    request.on("error", reject);
  }).finally(() => agent.destroy());
}

function poolNameSymbol(name?: string) {
  if (!name) return undefined;
  const first = name.split(/[ /-]/).find(Boolean);
  return first ? first.toUpperCase().slice(0, 16) : undefined;
}
