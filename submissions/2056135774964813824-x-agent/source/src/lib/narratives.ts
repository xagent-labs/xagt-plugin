/**
 * Narrative *categories* — these are the buckets the narrative agent clusters
 * RSS mentions into. Counts, momentum, sentiment, sparklines etc. are NEVER
 * defined here — they are computed at request time from real public sources
 * (see /src/lib/sources/narratives.ts + /api/narratives).
 */
import type { Narrative } from "./types";

export interface NarrativeCategory {
  id: Narrative["id"];
  name: string;
  description: string;
  color: Narrative["color"];
  /** Lowercase keywords matched against RSS title + summary. */
  keywords: string[];
  /** Optional token tickers — populated where universally recognized. */
  topTokens: string[];
}

export const NARRATIVE_CATEGORIES: NarrativeCategory[] = [
  {
    id: "ai",
    name: "AI",
    description: "AI agents, on-chain compute and decentralized inference networks.",
    color: "electric",
    keywords: ["ai", "agent", "agents", "inference", "model", "gpu", "compute", "agentic"],
    topTokens: ["FET", "TAO", "RNDR", "AGIX", "WLD"],
  },
  {
    id: "rwa",
    name: "RWA",
    description: "Real-world assets, tokenized treasuries, institutional rails.",
    color: "plasma",
    keywords: ["rwa", "real-world", "tokenized", "treasury", "treasuries", "blackrock", "institutional"],
    topTokens: ["ONDO", "MKR", "POLYX"],
  },
  {
    id: "defi",
    name: "DeFi",
    description: "Lending, perps, AMMs and on-chain credit primitives.",
    color: "cyan",
    keywords: ["defi", "lending", "perp", "perps", "amm", "dex", "uniswap", "aave", "yield"],
    topTokens: ["AAVE", "UNI", "GMX", "PENDLE"],
  },
  {
    id: "l2",
    name: "Layer 2",
    description: "Optimistic + ZK rollups, app-chains and modular execution.",
    color: "success",
    keywords: ["layer 2", "layer-2", "l2", "rollup", "arbitrum", "optimism", "base", "starknet", "zksync"],
    topTokens: ["ARB", "OP", "BASE", "STRK", "MATIC"],
  },
  {
    id: "infra",
    name: "Infrastructure",
    description: "Data availability, sequencers, restaking, oracle layers.",
    color: "electric",
    keywords: ["restaking", "eigenlayer", "celestia", "data availability", "oracle", "chainlink", "sequencer"],
    topTokens: ["TIA", "EIGEN", "LINK"],
  },
  {
    id: "gaming",
    name: "Gaming",
    description: "On-chain games, NFTs and play-and-earn ecosystems.",
    color: "warning",
    keywords: ["gaming", "nft", "nfts", "play-to-earn", "p2e", "game", "ronin", "immutable"],
    topTokens: ["IMX", "RON", "BEAM"],
  },
  {
    id: "stables",
    name: "Stablecoins",
    description: "Yield-bearing stables, CDP designs, regulated rails.",
    color: "cyan",
    keywords: ["stablecoin", "stablecoins", "usdc", "usdt", "dai", "frax", "usde", "tether", "circle"],
    topTokens: ["USDe", "FRAX", "crvUSD"],
  },
  {
    id: "meme",
    name: "Memecoins",
    description: "Liquidity-driven memecoins, launchpads, retail rotation.",
    color: "plasma",
    keywords: ["meme", "memecoin", "memecoins", "pepe", "bonk", "wif", "doge", "shib", "popcat"],
    topTokens: ["WIF", "BONK", "PEPE", "POPCAT"],
  },
];

// Back-compat: some downstream code imports NARRATIVES expecting the live shape.
// Re-export the categories as zero-state Narratives so the type stays compatible.
// Live data is fetched from /api/narratives.
export const NARRATIVES: Narrative[] = NARRATIVE_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  color: c.color,
  topTokens: c.topTokens,
  momentum: 0,
  sentiment: 0,
  volume24h: 0,
  mentions: 0,
  spark: [],
}));
