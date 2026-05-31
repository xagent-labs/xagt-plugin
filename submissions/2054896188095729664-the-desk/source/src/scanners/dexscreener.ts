import {
  cleanString,
  compactNumber,
  fetchJson,
  makeOpportunity,
  shortError,
  stableSymbolFromAddress,
  toNumber,
  type ProviderScanResult,
  type ScannerOptions,
} from "./shared.js";

const provider = "dexscreener";
const baseUrl = "https://api.dexscreener.com";
const endpoints = [
  { path: "/token-profiles/latest/v1", skill: "dexscreener-profiles", profileListed: true },
  { path: "/token-boosts/latest/v1", skill: "dexscreener-boosts", boosted: true },
  { path: "/token-boosts/top/v1", skill: "dexscreener-boosts", boosted: true },
];

interface DexScreenerToken {
  chainId?: string;
  tokenAddress?: string;
  address?: string;
  symbol?: string;
  name?: string;
  priceUsd?: string | number;
  liquidityUsd?: string | number;
  volumeUsd?: string | number;
  marketCapUsd?: string | number;
  description?: string | { title?: string; text?: string };
  url?: string;
  amount?: string | number;
  totalAmount?: string | number;
}

export async function fetchDexScreenerOpportunities(options: ScannerOptions = {}): Promise<ProviderScanResult> {
  const urlList = endpoints.map((endpoint) => `${baseUrl}${endpoint.path}`);
  const settled = await Promise.allSettled(urlList.map((url) => fetchJson<unknown>(url, options)));
  const errors = settled
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => shortError(result.reason));
  const rows = settled
    .flatMap((result, index) =>
      result.status === "fulfilled"
        ? normalizeRows(result.value).map((row) => ({ row, endpoint: endpoints[index] }))
        : [],
    );

  const opportunities = rows
    .filter(({ row }) => row.tokenAddress || row.address)
    .map(({ row, endpoint }) => {
      const tokenAddress = String(row.tokenAddress ?? row.address);
      const liquidityUsd = toNumber(row.liquidityUsd);
      const volumeUsd = toNumber(row.volumeUsd);
      const priceUsd = toNumber(row.priceUsd);
      const boostUsd = toNumber(row.totalAmount) ?? toNumber(row.amount);
      const symbol = cleanString(row.symbol) ?? titleFromDescription(row.description) ?? stableSymbolFromAddress(tokenAddress);
      return makeOpportunity({
        provider,
        evidenceSkill: endpoint.skill,
        tokenAddress,
        chain: row.chainId ?? "unknown",
        symbol,
        name: cleanString(row.name) ?? titleFromDescription(row.description),
        source: "DexScreener",
        metrics: {
          priceUsd,
          liquidityUsd,
          volumeUsd,
          marketCapUsd: toNumber(row.marketCapUsd),
          signalAmountUsd: boostUsd,
        },
        signal: {
          profileListed: endpoint.profileListed,
          boosted: endpoint.boosted,
          boostUsd,
        },
        evidenceSummary: `${endpoint.skill} feed${boostUsd !== undefined ? ` with $${compactNumber(boostUsd)} boost signal` : ""}; price ${priceUsd ?? "n/a"}, liquidity $${compactNumber(liquidityUsd)}.`,
        freshness: "live DexScreener snapshot",
      });
    });

  const ok = opportunities.length > 0;
  return {
    ok,
    opportunities,
    mode: ok ? "live" : "degraded",
    reason: ok ? undefined : errors[0] ?? "DexScreener returned no token rows",
    sourceHealth: [
      {
        name: "DexScreener",
        ok,
        command: urlList.join(" + "),
        error: ok ? undefined : errors[0] ?? "no rows",
        detail: errors.length > 1 ? errors.join(" | ") : undefined,
      },
    ],
  };
}

function normalizeRows(payload: unknown): DexScreenerToken[] {
  if (Array.isArray(payload)) return payload as DexScreenerToken[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["tokens", "pairs", "profiles", "boosts", "data"]) {
      if (Array.isArray(record[key])) return record[key] as DexScreenerToken[];
    }
  }
  return [];
}

function titleFromDescription(description: DexScreenerToken["description"]) {
  if (typeof description === "string") return cleanString(description.split(/[.\n]/)[0]);
  if (description && typeof description === "object") return cleanString(description.title ?? description.text);
  return undefined;
}
