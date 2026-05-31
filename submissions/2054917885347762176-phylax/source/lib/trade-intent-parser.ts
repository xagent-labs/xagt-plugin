import { z } from "zod";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

export const TradeIntentSchema = z.object({
  intentType: z.enum(["swap", "scan", "quote", "unknown"]),
  chain: z.string().nullable().default(null),
  fromToken: z.string().nullable().default(null),
  toToken: z.string().nullable().default(null),
  amount: z.number().nullable().default(null),
  amountUsd: z.number().nullable().default(null),
  maxSlippagePercent: z.number().nullable().default(null),
  riskTolerance: z.enum(["conservative", "moderate", "degen"]).nullable().default(null),
  executionMode: z.enum(["simulate", "live"]).nullable().default("simulate"),
  needsClarification: z.boolean().default(false),
  missingFields: z.array(z.string()).default([]),
  clarificationQuestion: z.string().nullable().default(null),
});

export type TradeIntent = z.infer<typeof TradeIntentSchema>;

// ─── Token aliases ────────────────────────────────────────────────────────────

const TOKEN_ALIASES: Record<string, string> = {
  usdc: "USDC",
  usdt: "USDT",
  eth: "ETH",
  weth: "WETH",
  okb: "OKB",
  btc: "BTC",
  wbtc: "WBTC",
  sol: "SOL",
  matic: "MATIC",
  dai: "DAI",
};

/**
 * Hardcoded X Layer token addresses for the top tokens.
 * Prevents CLI calls for common symbol → address resolution.
 */
export const XLAYER_TOKEN_ADDRESSES: Record<string, string> = {
  OKB:  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  USDC: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
  USDT: "0x1e4a5963abfd975d8c9021ce480b42188849d41d",
  WETH: "0x5a77f1443d16ee5761d310e38b62f77f726bc71c",
  WBTC: "0x8f8526dbfd6e38e3d8307702ca8469bae6c56c15",
};

const CHAIN_ALIASES: Record<string, string> = {
  "x layer": "xlayer",
  xlayer: "xlayer",
  "x-layer": "xlayer",
  ethereum: "ethereum",
  eth: "ethereum",
  base: "base",
  bsc: "bsc",
  arbitrum: "arbitrum",
  polygon: "polygon",
  solana: "solana",
};

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parses a natural-language user message into a structured TradeIntent.
 *
 * This is a keyword/regex-based parser (no LLM required).
 * It is intentionally conservative — when in doubt, it asks for clarification
 * rather than guessing.
 *
 * Rules:
 * - Missing amount → asks clarification
 * - Missing fromToken → asks clarification
 * - Vague "safe token" / "low risk" → triggers signal discovery (scan intent)
 * - "Execute now" → still requires explicit UI confirmation + wallet signature
 * - Never approves autonomous execution
 */
export function parseTradeIntent(message: string): TradeIntent {
  const lower = message.toLowerCase().trim();

  // ── Detect intent type ──────────────────────────────────────────────────
  let intentType: TradeIntent["intentType"] = "unknown";

  // Scan / safety check patterns
  const scanPatterns = [
    /scan\s+(this\s+)?token/i,
    /check\s+(this\s+)?token/i,
    /is\s+(this|it)\s+safe/i,
    /risk\s+(check|scan|report)/i,
    /security\s+(scan|check)/i,
    /honeypot/i,
    /explain\s+the\s+risk/i,
    /safe\s+token/i,
    /low[\s-]risk/i,
    /find\s+(a\s+)?(safe|low[\s-]risk)/i,
  ];

  const quotePatterns = [
    /quote\s+\d/i,
    /get\s+(a\s+)?quote/i,
    /how\s+much\s+(would|will|do)/i,
    /price\s+for/i,
    /estimate/i,
  ];

  const swapPatterns = [
    /\b(swap|trade|exchange|convert)\b\s+(?:\d|\b(?:my|all)\b)/i,
    /\bbuy\b\s+\w+\s+with/i,
    /\bsell\b\s+(?:\d|\b(?:my|all)\b)/i,
    /\b(swap|trade|exchange)\b\s+\w+\s+(?:to|for)\s+\w+/i,
  ];

  if (scanPatterns.some((p) => p.test(lower))) {
    intentType = "scan";
  } else if (quotePatterns.some((p) => p.test(lower))) {
    intentType = "quote";
  } else if (swapPatterns.some((p) => p.test(lower))) {
    intentType = "swap";
  }

  // ── Extract tokens ──────────────────────────────────────────────────────
  let fromToken: string | null = null;
  let toToken: string | null = null;

  const STOP_WORDS = new Set(["safe", "how", "way", "best", "where", "what", "buy", "sell", "trade", "swap", "ready", "going", "need", "want", "like", "able", "is", "it", "the", "a", "an", "good", "bad", "time", "much"]);

  // "X to Y" / "X for Y" / "X → Y"
  const pairMatch = lower.match(
    /(\b\w+)\s+(?:to|for|→|->)\s+(\b\w+)/i
  );
  if (pairMatch) {
    const fromRaw = pairMatch[1].toLowerCase();
    const toRaw = pairMatch[2].toLowerCase();
    if (!STOP_WORDS.has(fromRaw) && !STOP_WORDS.has(toRaw)) {
      const from = TOKEN_ALIASES[fromRaw] ?? fromRaw.toUpperCase();
      const to = TOKEN_ALIASES[toRaw] ?? toRaw.toUpperCase();
      // Only assign if they look like token symbols (<=8 chars)
      if (from.length <= 8) fromToken = from;
      if (to.length <= 8) toToken = to;
    }
  }

  // ── Extract amount ──────────────────────────────────────────────────────
  let amount: number | null = null;
  let amountUsd: number | null = null;

  // "$100" or "100 usd" or "100 dollars"
  const usdMatch = lower.match(/\$\s*(\d+(?:\.\d+)?)/);
  if (usdMatch) {
    amountUsd = parseFloat(usdMatch[1]);
  } else {
    const usdSuffixMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:usd|dollars?)/i);
    if (usdSuffixMatch) {
      amountUsd = parseFloat(usdSuffixMatch[1]);
    }
  }

  // "100 USDC" (amount in token units, not USD)
  const tokenAmountMatch = lower.match(/(\d+(?:\.\d+)?)\s+([a-zA-Z]{2,6})\b/);
  if (tokenAmountMatch && !amountUsd) {
    amount = parseFloat(tokenAmountMatch[1]);
    const tokenSym = TOKEN_ALIASES[tokenAmountMatch[2]] ?? tokenAmountMatch[2].toUpperCase();
    // If fromToken not set, use the token next to the number
    if (!fromToken && tokenSym.length <= 6) {
      fromToken = tokenSym;
    }
  }

  // ── Extract chain ───────────────────────────────────────────────────────
  let chain: string | null = null;
  for (const [alias, slug] of Object.entries(CHAIN_ALIASES)) {
    if (lower.includes(alias)) {
      chain = slug;
      break;
    }
  }

  // ── Extract slippage ────────────────────────────────────────────────────
  let maxSlippagePercent: number | null = null;
  const slipMatch = lower.match(/(\d+(?:\.\d+)?)\s*%?\s*slippage/i);
  if (slipMatch) {
    maxSlippagePercent = parseFloat(slipMatch[1]);
  }

  // ── Extract risk tolerance ──────────────────────────────────────────────
  let riskTolerance: TradeIntent["riskTolerance"] = null;
  if (/conservative|careful|safe/i.test(lower)) riskTolerance = "conservative";
  else if (/moderate|balanced/i.test(lower)) riskTolerance = "moderate";
  else if (/degen|aggressive|yolo/i.test(lower)) riskTolerance = "degen";

  // ── Clarification logic ─────────────────────────────────────────────────
  const missingFields: string[] = [];
  let clarificationQuestion: string | null = null;
  let needsClarification = false;

  // Vague "safe token" / "find a safe token" → signal discovery
  if (/(?:find|show|suggest|discover)\s+(?:a\s+)?(?:safe|low[\s-]risk|good)\s+token/i.test(lower)) {
    intentType = "scan";
    // No clarification needed — this triggers signal discovery
  } else if (intentType === "swap" || intentType === "quote") {
    if (!amount && !amountUsd) {
      missingFields.push("amount");
      needsClarification = true;
    }
    if (!fromToken) {
      missingFields.push("fromToken");
      needsClarification = true;
    }
    if (needsClarification) {
      const parts: string[] = [];
      if (missingFields.includes("amount")) parts.push("how much do you want to trade");
      if (missingFields.includes("fromToken")) parts.push("which token are you trading from");
      clarificationQuestion = `I need a bit more info: ${parts.join(", and ")}?`;
    }
  }

  // ── Execution mode ──────────────────────────────────────────────────────
  // "execute now" still returns simulate — execution requires explicit UI confirmation
  const executionMode: TradeIntent["executionMode"] = "simulate";

  // ── Build result ────────────────────────────────────────────────────────
  const raw = {
    intentType,
    chain,
    fromToken,
    toToken,
    amount,
    amountUsd,
    maxSlippagePercent,
    riskTolerance,
    executionMode,
    needsClarification,
    missingFields,
    clarificationQuestion,
  };

  return TradeIntentSchema.parse(raw);
}
