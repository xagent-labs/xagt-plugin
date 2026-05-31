export interface ChainMarketSnapshot {
  chainId: number;
  chainName: string;
  blockHeight: number;
  gasGwei: number;
  totalTvlUsd: number;
  volume24hUsd: number;
  topTokens: TokenMarketRow[];
  updatedAt: string;
}

export interface TokenMarketRow {
  symbol: string;
  address: string;
  priceUsd: number;
  change24hPct: number;
  volume24hUsd: number;
  marketCapUsd: number;
}

export interface ProtocolYieldRow {
  id: string;
  protocol: string;
  pool: string;
  chain: string;
  chainId: number;
  asset: string;
  apy: number;
  tvlUsd: number;
  riskScore: number;
  audited: boolean;
}

export interface NarrativeSignal {
  id: string;
  name: string;
  strength: number;
  momentum: "rising" | "stable" | "cooling";
  relatedTokens: string[];
  socialMentions24h: number;
}

export interface SmartMoneyWallet {
  address: string;
  label: string;
  pnl30dUsd: number;
  winRate: number;
  topHoldings: string[];
  lastActive: string;
}

export interface ProtocolRiskProfile {
  protocol: string;
  chain: string;
  auditScore: number;
  tvlUsd: number;
  exploitHistory: boolean;
  centralizationRisk: number;
  liquidityRisk: number;
  overallRisk: number;
}

export interface WalletBalanceResult {
  address: string;
  chainId: number;
  balances: { symbol: string; amount: number; usdValue: number }[];
  recentTxCount: number;
}

export interface SwapQuoteResult {
  from: string;
  to: string;
  amountIn: number;
  amountOut: number;
  priceImpactPct: number;
  route: string[];
  gasUsd: number;
}

export interface IChainDataProvider {
  getMarketSnapshot(chainId?: number): Promise<ChainMarketSnapshot[]>;
  getYieldOpportunities(
    minApy?: number,
    maxRisk?: number,
    chainId?: number
  ): Promise<ProtocolYieldRow[]>;
  getNarratives(): Promise<NarrativeSignal[]>;
  getSmartMoneyWallets(limit?: number): Promise<SmartMoneyWallet[]>;
  getProtocolRisks(protocol?: string): Promise<ProtocolRiskProfile[]>;
  getWalletBalances(address: string, chainId: number): Promise<WalletBalanceResult>;
  getSwapQuote(
    from: string,
    to: string,
    amountIn: number,
    chainId?: number
  ): Promise<SwapQuoteResult>;
}
