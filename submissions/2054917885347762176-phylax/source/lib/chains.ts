/**
 * Centralized supported-chain configuration.
 * Single source of truth for chain metadata across:
 *   - Navbar chain selector
 *   - Thesis parser defaults
 *   - Agent Console parsed configuration
 *   - API request payloads
 *   - Source/debug display
 */

export interface ChainConfig {
  /** Internal ID used in UI state and API payloads (e.g. "x-layer") */
  id: string;
  /** Human-readable display name */
  name: string;
  /** OKX chain index used in onchainos CLI (e.g. "196") */
  chainIndex: string;
  /** OKX chain slug used in onchainos CLI (e.g. "xlayer") */
  chainSlug: string;
  /** Short icon label for the chain selector (rendered as styled text icon) */
  iconLabel: string;
  /** Default source token address for swap quotes */
  defaultFromToken: string;
  /** Default source token symbol */
  defaultFromSymbol: string;
  /** Whether this chain is currently enabled for use */
  enabled: boolean;
  /** If disabled, show this reason */
  disabledReason?: string;
  /**
   * Fallback native token USD price used for gas estimation
   * when OKX API does not return nativeTokenPrice.
   * Keep loosely up-to-date — it's only a display fallback, not execution logic.
   */
  nativeFallbackPrice: number;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: "x-layer",
    name: "X Layer",
    chainIndex: "196",
    chainSlug: "xlayer",
    iconLabel: "/assets/x-layer.jpg",
    defaultFromToken: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
    defaultFromSymbol: "USDC",
    enabled: true,
    nativeFallbackPrice: 83, // OKB ~$83 (fallback only, runtime fetches live price)
  },
  {
    id: "base",
    name: "Base",
    chainIndex: "8453",
    chainSlug: "base",
    iconLabel: "/assets/base.png",
    defaultFromToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    defaultFromSymbol: "USDC",
    enabled: false,
    disabledReason: "Coming Soon",
    nativeFallbackPrice: 2500, // ETH ~$2500
  },
  {
    id: "bsc",
    name: "BSC",
    chainIndex: "56",
    chainSlug: "bsc",
    iconLabel: "/assets/bsc.png",
    defaultFromToken: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    defaultFromSymbol: "USDC",
    enabled: false,
    disabledReason: "Coming Soon",
    nativeFallbackPrice: 600, // BNB ~$600
  },
  {
    id: "solana",
    name: "Solana",
    chainIndex: "501",
    chainSlug: "solana",
    iconLabel: "/assets/solana.png",
    defaultFromToken: "So11111111111111111111111111111111111111112",
    defaultFromSymbol: "SOL",
    enabled: false,
    disabledReason: "Coming Soon",
    nativeFallbackPrice: 160, // SOL ~$160
  },
];

export const DEFAULT_CHAIN = SUPPORTED_CHAINS[0];

/** Look up a chain config by ID. Returns DEFAULT_CHAIN if not found. */
export function getChainById(id: string): ChainConfig {
  return SUPPORTED_CHAINS.find((c) => c.id === id) ?? DEFAULT_CHAIN;
}

/** Look up a chain config by chainIndex. Returns DEFAULT_CHAIN if not found. */
export function getChainByIndex(index: string): ChainConfig {
  return SUPPORTED_CHAINS.find((c) => c.chainIndex === index) ?? DEFAULT_CHAIN;
}

export function normalizeChain(input: string | undefined | null): ChainConfig {
  if (!input) {
    throw new Error("Chain input is missing.");
  }
  const clean = input.toLowerCase().trim();
  
  if (clean === "xlayer" || clean === "x-layer" || clean === "196" || clean === "x layer") {
    return SUPPORTED_CHAINS[0];
  }
  if (clean === "base" || clean === "8453") {
    return SUPPORTED_CHAINS[1];
  }
  if (clean === "bsc" || clean === "binance" || clean === "56") {
    return SUPPORTED_CHAINS[2];
  }
  
  if (clean === "solana" || clean === "sol" || clean === "501") {
    return SUPPORTED_CHAINS[3];
  }

  throw new Error(`Unsupported chain: ${input}. Allowed chains: X Layer, Base, BSC, Solana.`);
}
