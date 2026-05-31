import { fetchJson } from "../http";
import { CHAIN_ID_TO_NAME } from "../chain-id-map";

export interface GasSnapshot {
  chainId: number;
  chainName: string;
  slowGwei: number;
  standardGwei: number;
  fastGwei: number;
  estimatedTransferUsd: number;
  congestion: "low" | "medium" | "high";
  source: string;
  updatedAt: string;
}

const L2_DEFAULTS: Record<number, GasSnapshot> = {
  42161: {
    chainId: 42161,
    chainName: "Arbitrum",
    slowGwei: 0.01,
    standardGwei: 0.02,
    fastGwei: 0.05,
    estimatedTransferUsd: 0.02,
    congestion: "low",
    source: "estimate",
    updatedAt: new Date().toISOString(),
  },
  8453: {
    chainId: 8453,
    chainName: "Base",
    slowGwei: 0.01,
    standardGwei: 0.02,
    fastGwei: 0.04,
    estimatedTransferUsd: 0.01,
    congestion: "low",
    source: "estimate",
    updatedAt: new Date().toISOString(),
  },
  10: {
    chainId: 10,
    chainName: "Optimism",
    slowGwei: 0.01,
    standardGwei: 0.02,
    fastGwei: 0.05,
    estimatedTransferUsd: 0.02,
    congestion: "low",
    source: "estimate",
    updatedAt: new Date().toISOString(),
  },
};

export async function fetchGasSnapshot(chainId: number, ethPriceUsd = 3400): Promise<GasSnapshot> {
  const l2 = L2_DEFAULTS[chainId];
  if (l2) return { ...l2, updatedAt: new Date().toISOString() };

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (chainId === 1 && apiKey) {
    try {
      const data = await fetchJson<{
        status: string;
        result: {
          SafeGasPrice: string;
          ProposeGasPrice: string;
          FastGasPrice: string;
          suggestBaseFee?: string;
        };
      }>(
        `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${apiKey}`
      );

      if (data.status === "1" && data.result) {
        const slow = parseFloat(data.result.SafeGasPrice);
        const standard = parseFloat(data.result.ProposeGasPrice);
        const fast = parseFloat(data.result.FastGasPrice);
        const gwei = standard;
        const ethCost = (21_000 * gwei * 1e-9);
        const usd = ethCost * ethPriceUsd;

        return {
          chainId: 1,
          chainName: "Ethereum",
          slowGwei: slow,
          standardGwei: standard,
          fastGwei: fast,
          estimatedTransferUsd: Math.round(usd * 100) / 100,
          congestion: fast > 50 ? "high" : fast > 25 ? "medium" : "low",
          source: "etherscan",
          updatedAt: new Date().toISOString(),
        };
      }
    } catch {
      /* fallback below */
    }
  }

  return {
    chainId: 1,
    chainName: "Ethereum",
    slowGwei: 12,
    standardGwei: 18,
    fastGwei: 28,
    estimatedTransferUsd: 1.2,
    congestion: "medium",
    source: "estimate",
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchMultiChainGas(
  chainIds: number[] = [1, 42161, 8453]
): Promise<GasSnapshot[]> {
  return Promise.all(chainIds.map((id) => fetchGasSnapshot(id)));
}
