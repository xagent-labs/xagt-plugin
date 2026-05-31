/** DeFiLlama chain name ↔ EVM chainId */
export const CHAIN_NAME_TO_ID: Record<string, number> = {
  Ethereum: 1,
  Arbitrum: 42161,
  Optimism: 10,
  Base: 8453,
  Polygon: 137,
  Avalanche: 43114,
  BSC: 56,
  Fantom: 250,
};

export const CHAIN_ID_TO_NAME: Record<number, string> = Object.fromEntries(
  Object.entries(CHAIN_NAME_TO_ID).map(([name, id]) => [id, name])
);

export const COINGECKO_PLATFORM: Record<number, string> = {
  1: "ethereum",
  42161: "arbitrum-one",
  10: "optimistic-ethereum",
  8453: "base",
  137: "polygon-pos",
};

export const NATIVE_TOKEN_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export const TOKEN_SYMBOL_TO_COINGECKO: Record<string, string> = {
  ETH: "ethereum",
  WETH: "ethereum",
  BTC: "bitcoin",
  WBTC: "wrapped-bitcoin",
  USDC: "usd-coin",
  USDT: "tether",
  ARB: "arbitrum",
  OP: "optimism",
  LINK: "chainlink",
  DAI: "dai",
};
