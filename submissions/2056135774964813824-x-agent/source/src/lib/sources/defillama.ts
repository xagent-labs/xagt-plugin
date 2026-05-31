/**
 * DeFiLlama — public REST. No API key required.
 *
 * Docs: https://defillama.com/docs/api
 */

const BASE = "https://api.llama.fi";

export interface ProtocolTVL {
  id: string;
  name: string;
  symbol: string;
  slug: string;
  category: string;
  chains: string[];
  tvl: number;
  change_1d: number | null;
  change_7d: number | null;
  mcap: number | null;
}

export async function fetchProtocols(signal?: AbortSignal): Promise<ProtocolTVL[]> {
  const res = await fetch(`${BASE}/protocols`, {
    signal,
    next: { revalidate: 300 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`DeFiLlama protocols failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as ProtocolTVL[];
}

export interface ChainTVL {
  gecko_id: string | null;
  tvl: number;
  tokenSymbol: string | null;
  cmcId: string | null;
  name: string;
  chainId: number | null;
}

export async function fetchChains(signal?: AbortSignal): Promise<ChainTVL[]> {
  const res = await fetch(`${BASE}/v2/chains`, {
    signal,
    next: { revalidate: 300 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`DeFiLlama chains failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as ChainTVL[];
}
