import type {
  ChainMarketSnapshot,
  IChainDataProvider,
  NarrativeSignal,
  ProtocolRiskProfile,
  ProtocolYieldRow,
  SmartMoneyWallet,
  SwapQuoteResult,
  TokenMarketRow,
  WalletBalanceResult,
} from "./types";

export type {
  ChainMarketSnapshot,
  TokenMarketRow,
  ProtocolYieldRow,
  NarrativeSignal,
  SmartMoneyWallet,
  ProtocolRiskProfile,
  WalletBalanceResult,
  SwapQuoteResult,
} from "./types";

const CHAINS: ChainMarketSnapshot[] = [
  {
    chainId: 1,
    chainName: "Ethereum",
    blockHeight: 19_842_100,
    gasGwei: 18.4,
    totalTvlUsd: 52_400_000_000,
    volume24hUsd: 8_200_000_000,
    topTokens: [
      { symbol: "ETH", address: "0x0", priceUsd: 3420.5, change24hPct: 2.1, volume24hUsd: 4_100_000_000, marketCapUsd: 410_000_000_000 },
      { symbol: "WBTC", address: "0x2260", priceUsd: 96800, change24hPct: 1.4, volume24hUsd: 890_000_000, marketCapUsd: 180_000_000_000 },
    ],
    updatedAt: new Date().toISOString(),
  },
  {
    chainId: 42161,
    chainName: "Arbitrum",
    blockHeight: 268_400_000,
    gasGwei: 0.12,
    totalTvlUsd: 3_800_000_000,
    volume24hUsd: 1_100_000_000,
    topTokens: [
      { symbol: "ETH", address: "0x0", priceUsd: 3420.5, change24hPct: 2.1, volume24hUsd: 620_000_000, marketCapUsd: 410_000_000_000 },
      { symbol: "ARB", address: "0x912c", priceUsd: 0.82, change24hPct: 5.8, volume24hUsd: 180_000_000, marketCapUsd: 3_200_000_000 },
    ],
    updatedAt: new Date().toISOString(),
  },
];

const YIELDS: ProtocolYieldRow[] = [
  { id: "aave-usdc-eth", protocol: "Aave V3", pool: "USDC", chain: "Ethereum", chainId: 1, asset: "USDC", apy: 4.82, tvlUsd: 1_240_000_000, riskScore: 22, audited: true },
  { id: "curve-3pool", protocol: "Curve", pool: "3pool", chain: "Ethereum", chainId: 1, asset: "3CRV", apy: 3.15, tvlUsd: 890_000_000, riskScore: 28, audited: true },
  { id: "gmx-glp-arb", protocol: "GMX", pool: "GLP", chain: "Arbitrum", chainId: 42161, asset: "GLP", apy: 18.4, tvlUsd: 420_000_000, riskScore: 45, audited: true },
];

const NARRATIVES: NarrativeSignal[] = [
  { id: "restaking", name: "Liquid Restaking", strength: 88, momentum: "rising", relatedTokens: ["ETH", "EIGEN", "REZ"], socialMentions24h: 12400 },
  { id: "ai-agents", name: "AI Agent Tokens", strength: 91, momentum: "rising", relatedTokens: ["VIRTUAL", "FET"], socialMentions24h: 18900 },
];

const SMART_MONEY: SmartMoneyWallet[] = [
  { address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", label: "Alpha Router", pnl30dUsd: 2_400_000, winRate: 0.68, topHoldings: ["ETH", "WBTC", "USDC"], lastActive: new Date().toISOString() },
];

const RISKS: ProtocolRiskProfile[] = [
  { protocol: "Aave V3", chain: "Ethereum", auditScore: 95, tvlUsd: 12_000_000_000, exploitHistory: false, centralizationRisk: 15, liquidityRisk: 10, overallRisk: 22 },
];

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class MockChainDataProvider implements IChainDataProvider {
  constructor(private readonly latencyMs = 80) {}

  async getMarketSnapshot(chainId?: number): Promise<ChainMarketSnapshot[]> {
    await delay(this.latencyMs);
    if (chainId) return CHAINS.filter((c) => c.chainId === chainId);
    return CHAINS.map((c) => ({ ...c, updatedAt: new Date().toISOString() }));
  }

  async getYieldOpportunities(minApy = 0, maxRisk = 100): Promise<ProtocolYieldRow[]> {
    await delay(this.latencyMs);
    return YIELDS.filter((y) => y.apy >= minApy && y.riskScore <= maxRisk).sort((a, b) => b.apy - a.apy);
  }

  async getNarratives(): Promise<NarrativeSignal[]> {
    await delay(this.latencyMs);
    return [...NARRATIVES];
  }

  async getSmartMoneyWallets(limit = 10): Promise<SmartMoneyWallet[]> {
    await delay(this.latencyMs);
    return SMART_MONEY.slice(0, limit);
  }

  async getProtocolRisks(protocol?: string): Promise<ProtocolRiskProfile[]> {
    await delay(this.latencyMs);
    if (protocol) return RISKS.filter((r) => r.protocol.toLowerCase().includes(protocol.toLowerCase()));
    return RISKS;
  }

  async getWalletBalances(address: string, chainId: number): Promise<WalletBalanceResult> {
    await delay(this.latencyMs);
    const hash = address.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const scale = (hash % 100) / 100 + 0.5;
    return {
      address,
      chainId,
      balances: [
        { symbol: "ETH", amount: 12.4 * scale, usdValue: 12.4 * scale * 3420 },
        { symbol: "USDC", amount: 45000 * scale, usdValue: 45000 * scale },
      ],
      recentTxCount: Math.floor(hash % 40) + 5,
    };
  }

  async getSwapQuote(from: string, to: string, amountIn: number): Promise<SwapQuoteResult> {
    await delay(this.latencyMs);
    const prices: Record<string, number> = { ETH: 3420, USDC: 1, ARB: 0.82, WBTC: 96800 };
    const inPrice = prices[from] ?? 1;
    const outPrice = prices[to] ?? 1;
    return {
      from,
      to,
      amountIn,
      amountOut: (amountIn * inPrice) / outPrice * 0.997,
      priceImpactPct: 0.12,
      route: [from, "WETH", to],
      gasUsd: 4.2,
    };
  }
}
