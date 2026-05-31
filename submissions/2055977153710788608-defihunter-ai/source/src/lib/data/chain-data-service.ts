import type { IChainDataProvider } from "./types";
import { MockChainDataProvider } from "./mock-chain-provider";
import {
  fetchYieldOpportunities,
  fetchChainSnapshots,
  enrichSnapshotsWithPrices,
  fetchProtocolRisks,
} from "./providers/defillama";
import {
  fetchTopMarkets,
  fetchNarrativesFromTrending,
  fetchGlobalSentiment,
} from "./providers/coingecko";
import { fetchSwapQuoteWithFallback } from "./providers/oneinch";
import {
  fetchWalletBalances,
  fetchSmartMoneyWallets,
  hasWalletProvider,
} from "./providers/alchemy";
import { fetchMultiChainGas, type GasSnapshot } from "./providers/gas";

const mock = new MockChainDataProvider(0);

function useLiveApis(): boolean {
  return process.env.USE_MOCK_DATA !== "true";
}

async function withFallback<T>(
  live: () => Promise<T>,
  fallback: () => Promise<T>,
  label: string
): Promise<T> {
  if (!useLiveApis()) return fallback();
  try {
    return await live();
  } catch (err) {
    console.warn(`[chain-data] ${label} live API failed, using mock:`, err);
    return fallback();
  }
}

export class ChainDataService implements IChainDataProvider {
  async getMarketSnapshot(chainId?: number) {
    return withFallback(
      async () => {
        const [markets, global] = await Promise.all([
          fetchTopMarkets(12),
          fetchGlobalSentiment(),
        ]);
        let snapshots = await fetchChainSnapshots(chainId, markets);

        const eth = markets.find((m) => m.symbol === "ETH");
        if (eth) {
          snapshots = snapshots.map((s) => ({
            ...s,
            topTokens: s.topTokens.map((t) =>
              t.symbol === "ETH" || t.priceUsd === 0
                ? { ...t, ...eth, symbol: t.symbol }
                : t
            ),
            volume24hUsd: global.totalVolume / Math.max(snapshots.length, 1),
          }));
        }

        return enrichSnapshotsWithPrices(snapshots, markets);
      },
      () => mock.getMarketSnapshot(chainId),
      "getMarketSnapshot"
    );
  }

  async getYieldOpportunities(minApy = 0, maxRisk = 100, chainId?: number) {
    return withFallback(
      () => fetchYieldOpportunities(minApy, maxRisk, chainId),
      () => mock.getYieldOpportunities(minApy, maxRisk),
      "getYieldOpportunities"
    );
  }

  async getNarratives() {
    return withFallback(
      () => fetchNarrativesFromTrending(),
      () => mock.getNarratives(),
      "getNarratives"
    );
  }

  async getSmartMoneyWallets(limit = 10) {
    return withFallback(
      () => fetchSmartMoneyWallets(limit),
      () => mock.getSmartMoneyWallets(limit),
      "getSmartMoneyWallets"
    );
  }

  async getProtocolRisks(protocol?: string) {
    return withFallback(
      () => fetchProtocolRisks(protocol),
      () => mock.getProtocolRisks(protocol),
      "getProtocolRisks"
    );
  }

  async getWalletBalances(address: string, chainId: number) {
    if (!useLiveApis() || !hasWalletProvider()) {
      if (!hasWalletProvider() && useLiveApis()) {
        console.warn("[chain-data] No ALCHEMY/ETHERSCAN key — wallet mock fallback");
      }
      return mock.getWalletBalances(address, chainId);
    }
    try {
      return await fetchWalletBalances(address, chainId);
    } catch (err) {
      console.warn("[chain-data] wallet live failed:", err);
      return mock.getWalletBalances(address, chainId);
    }
  }

  async getSwapQuote(from: string, to: string, amountIn: number, chainId = 1) {
    return withFallback(
      () => fetchSwapQuoteWithFallback(chainId, from, to, amountIn),
      () => mock.getSwapQuote(from, to, amountIn),
      "getSwapQuote"
    );
  }

  async getGasSnapshots(chainIds = [1, 42161, 8453]): Promise<GasSnapshot[]> {
    if (!useLiveApis()) return [];
    try {
      return await fetchMultiChainGas(chainIds);
    } catch {
      return [];
    }
  }
}

export const chainData = new ChainDataService();

export function getDataSourceStatus() {
  return {
    liveEnabled: useLiveApis(),
    providers: {
      defillama: useLiveApis(),
      coingecko: useLiveApis(),
      oneinch: Boolean(process.env.ONEINCH_API_KEY),
      alchemy: Boolean(process.env.ALCHEMY_API_KEY),
      etherscan: Boolean(process.env.ETHERSCAN_API_KEY),
    },
  };
}
