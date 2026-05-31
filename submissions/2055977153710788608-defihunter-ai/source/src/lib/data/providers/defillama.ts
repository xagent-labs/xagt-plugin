import { fetchJson } from "../http";
import { CHAIN_NAME_TO_ID } from "../chain-id-map";
import {
  computePoolRiskScore,
  computeProtocolRiskFromTvl,
  filterYields,
  isAuditedProject,
} from "../risk-scoring";
import type {
  ChainMarketSnapshot,
  ProtocolRiskProfile,
  ProtocolYieldRow,
  TokenMarketRow,
} from "../types";

const LLAMA = "https://api.llama.fi";
const YIELDS = "https://yields.llama.fi";

interface LlamaChain {
  name: string;
  chainId?: number | null;
  tvl: number;
  tokenSymbol?: string;
}

interface LlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  ilRisk?: string;
  stablecoin?: boolean;
  exposure?: string;
}

interface LlamaProtocol {
  name: string;
  slug: string;
  tvl: number;
  chainTvls?: Record<string, number>;
  category?: string;
}

interface LlamaHack {
  name: string;
  date: number;
  amount: number;
}

let poolsCache: { data: LlamaPool[]; at: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getPools(): Promise<LlamaPool[]> {
  if (poolsCache && Date.now() - poolsCache.at < CACHE_TTL_MS) {
    return poolsCache.data;
  }
  const res = await fetchJson<{ data: LlamaPool[] }>(`${YIELDS}/pools`);
  const active = res.data.filter(
    (p) => p.tvlUsd > 50_000 && (p.apy ?? 0) > 0 && !Number.isNaN(p.apy)
  );
  poolsCache = { data: active, at: Date.now() };
  return active;
}

function poolToYieldRow(p: LlamaPool): ProtocolYieldRow {
  const chainId = CHAIN_NAME_TO_ID[p.chain] ?? 0;
  const apy = p.apy ?? p.apyBase ?? 0;
  return {
    id: p.pool,
    protocol: formatProjectName(p.project),
    pool: p.symbol,
    chain: p.chain,
    chainId,
    asset: p.symbol.split("-")[0] ?? p.symbol,
    apy: Math.round(apy * 100) / 100,
    tvlUsd: p.tvlUsd,
    riskScore: computePoolRiskScore({
      tvlUsd: p.tvlUsd,
      apy,
      ilRisk: p.ilRisk,
      project: p.project,
      stablecoin: p.stablecoin,
    }),
    audited: isAuditedProject(p.project),
  };
}

function formatProjectName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function fetchYieldOpportunities(
  minApy = 0,
  maxRisk = 100,
  chainId?: number
): Promise<ProtocolYieldRow[]> {
  const pools = await getPools();
  let rows = pools.map(poolToYieldRow).filter((r) => r.chainId > 0);
  if (chainId && chainId > 0) {
    rows = rows.filter((r) => r.chainId === chainId);
  }
  return filterYields(rows, minApy, maxRisk).slice(0, 50);
}

export async function fetchChainSnapshots(
  chainId?: number,
  topMarkets?: TokenMarketRow[]
): Promise<ChainMarketSnapshot[]> {
  const chains = await fetchJson<LlamaChain[]>(`${LLAMA}/v2/chains`);
  const targetNames = chainId
    ? [Object.entries(CHAIN_NAME_TO_ID).find(([, id]) => id === chainId)?.[0]].filter(Boolean)
    : ["Ethereum", "Arbitrum", "Base", "Optimism"];

  return chains
    .filter((c) => targetNames.includes(c.name))
    .map((c) => {
      const id = CHAIN_NAME_TO_ID[c.name] ?? c.chainId ?? 0;
      const tokens =
        topMarkets?.filter((t) => true).slice(0, 5) ??
        buildDefaultTokens(c.tokenSymbol ?? "ETH");

      return {
        chainId: id,
        chainName: c.name,
        blockHeight: 0,
        gasGwei: estimateGas(c.name),
        totalTvlUsd: c.tvl,
        volume24hUsd: c.tvl * 0.08,
        topTokens: tokens,
        updatedAt: new Date().toISOString(),
      };
    })
    .filter((s) => s.chainId > 0);
}

function buildDefaultTokens(nativeSymbol: string): TokenMarketRow[] {
  return [
    {
      symbol: nativeSymbol,
      address: "native",
      priceUsd: 0,
      change24hPct: 0,
      volume24hUsd: 0,
      marketCapUsd: 0,
    },
  ];
}

function estimateGas(chain: string): number {
  const map: Record<string, number> = {
    Ethereum: 15,
    Arbitrum: 0.1,
    Base: 0.05,
    Optimism: 0.05,
    Polygon: 30,
  };
  return map[chain] ?? 1;
}

export async function enrichSnapshotsWithPrices(
  snapshots: ChainMarketSnapshot[],
  priceRows: TokenMarketRow[]
): Promise<ChainMarketSnapshot[]> {
  const priceBySymbol = new Map(priceRows.map((p) => [p.symbol.toUpperCase(), p]));

  return snapshots.map((s) => ({
    ...s,
    topTokens: s.topTokens.map((t) => {
      const live = priceBySymbol.get(t.symbol.toUpperCase());
      return live ? { ...t, ...live, symbol: t.symbol } : t;
    }),
    updatedAt: new Date().toISOString(),
  }));
}

export async function fetchProtocolRisks(protocolFilter?: string): Promise<ProtocolRiskProfile[]> {
  const [protocols, hacks, pools] = await Promise.all([
    fetchJson<LlamaProtocol[]>(`${LLAMA}/protocols`),
    fetchJson<LlamaHack[]>(`${LLAMA}/hacks`).catch(() => [] as LlamaHack[]),
    getPools(),
  ]);

  const hackedNames = new Set(
    hacks.map((h) => h.name.toLowerCase())
  );

  const tvlByProject = new Map<string, { tvl: number; chain: string }>();
  for (const p of pools) {
    const key = p.project.toLowerCase();
    const cur = tvlByProject.get(key);
    if (!cur || p.tvlUsd > cur.tvl) {
      tvlByProject.set(key, { tvl: p.tvlUsd, chain: p.chain });
    }
  }

  let list = protocols
    .filter((p) => p.tvl > 1_000_000)
    .slice(0, 80)
    .map((p) => {
      const slug = p.slug.toLowerCase();
      const poolMeta = tvlByProject.get(slug);
      const hasExploit = [...hackedNames].some(
        (h) => slug.includes(h) || h.includes(slug) || p.name.toLowerCase().includes(h)
      );
      const chain = poolMeta?.chain ?? Object.keys(p.chainTvls ?? {})[0] ?? "Ethereum";
      const tvl = p.tvl ?? poolMeta?.tvl ?? 0;
      const risk = computeProtocolRiskFromTvl(p.name, chain, tvl, hasExploit);
      return {
        protocol: p.name,
        chain,
        ...risk,
      };
    });

  if (protocolFilter) {
    const q = protocolFilter.toLowerCase();
    list = list.filter((r) => r.protocol.toLowerCase().includes(q));
  }

  return list.sort((a, b) => b.tvlUsd - a.tvlUsd).slice(0, 25);
}

export async function fetchTopPoolsByTvl(limit = 20): Promise<ProtocolYieldRow[]> {
  const pools = await getPools();
  return pools
    .sort((a, b) => b.tvlUsd - a.tvlUsd)
    .slice(0, limit)
    .map(poolToYieldRow);
}
