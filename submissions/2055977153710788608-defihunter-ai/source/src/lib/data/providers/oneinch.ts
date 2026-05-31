import { fetchJson } from "../http";
import { CHAIN_ID_TO_NAME } from "../chain-id-map";
import type { SwapQuoteResult } from "../types";
import { fetchSpotPrice } from "./coingecko";

const ONEINCH = "https://api.1inch.dev";

const TOKEN_ADDRESS: Record<number, Record<string, string>> = {
  1: {
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  },
  42161: {
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548",
  },
};

function getTokenAddress(chainId: number, symbol: string): string | undefined {
  return TOKEN_ADDRESS[chainId]?.[symbol.toUpperCase()];
}

export async function fetchOneInchQuote(
  chainId: number,
  fromSymbol: string,
  toSymbol: string,
  amountIn: number
): Promise<SwapQuoteResult | null> {
  const apiKey = process.env.ONEINCH_API_KEY;
  if (!apiKey) return null;

  const src = getTokenAddress(chainId, fromSymbol);
  const dst = getTokenAddress(chainId, toSymbol);
  if (!src || !dst) return null;

  const decimals = fromSymbol.toUpperCase() === "USDC" || fromSymbol.toUpperCase() === "USDT" ? 6 : 18;
  const amountWei = BigInt(Math.floor(amountIn * 10 ** decimals)).toString();

  try {
    const url = `${ONEINCH}/swap/v6.0/${chainId}/quote?src=${src}&dst=${dst}&amount=${amountWei}`;
    const data = await fetchJson<{
      dstAmount: string;
      gas: number;
    }>(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const outDecimals = toSymbol.toUpperCase() === "USDC" || toSymbol.toUpperCase() === "USDT" ? 6 : 18;
    const amountOut = Number(data.dstAmount) / 10 ** outDecimals;
    const ethPrice = await fetchSpotPrice("ETH");
    const gasUsd = ((data.gas ?? 150_000) * 20 * 1e-9) * ethPrice;

    return {
      from: fromSymbol,
      to: toSymbol,
      amountIn,
      amountOut,
      priceImpactPct: estimateImpact(amountIn, fromSymbol, amountOut, toSymbol),
      route: [fromSymbol, toSymbol],
      gasUsd: Math.round(gasUsd * 100) / 100,
    };
  } catch {
    return null;
  }
}

function estimateImpact(
  amountIn: number,
  from: string,
  amountOut: number,
  to: string
): number {
  if (amountIn <= 0 || amountOut <= 0) return 0;
  return 0.05;
}

export async function fetchSwapQuoteWithFallback(
  chainId: number,
  from: string,
  to: string,
  amountIn: number
): Promise<SwapQuoteResult> {
  const oneInch = await fetchOneInchQuote(chainId, from, to, amountIn);
  if (oneInch) return oneInch;

  const [inPrice, outPrice] = await Promise.all([
    fetchSpotPrice(from),
    fetchSpotPrice(to),
  ]);

  if (inPrice <= 0 || outPrice <= 0) {
    throw new Error(`No live price for ${from} or ${to}`);
  }

  const amountOut = (amountIn * inPrice) / outPrice * 0.997;
  const chain = CHAIN_ID_TO_NAME[chainId] ?? "Ethereum";

  return {
    from,
    to,
    amountIn,
    amountOut,
    priceImpactPct: amountIn * inPrice > 50_000 ? 0.25 : 0.08,
    route: [from, "AGGREGATOR", to],
    gasUsd: chain === "Ethereum" ? 8 : 0.5,
  };
}
