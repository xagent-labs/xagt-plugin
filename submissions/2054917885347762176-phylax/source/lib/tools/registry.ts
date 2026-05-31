import { getSignals, scanToken, searchToken, getQuotePreflight } from "../okx";
import { determineRiskAction } from "../risk-scoring";
import { normalizeChain } from "../chains";

export interface ToolDefinition<T = unknown> {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  validate?: (input: T) => void | string;
  execute: (input: T, context: ToolContext) => Promise<unknown>;
}

export interface ToolContext {
  conversationId: string;
  walletAddress?: string;
  // Can add more context like user id if needed
}

export const registry = new Map<string, ToolDefinition>();

export function registerTool<T>(tool: ToolDefinition<T>) {
  registry.set(tool.name, tool as ToolDefinition<unknown>);
}

// 0. get_wallet_balance
registerTool({
  name: "get_wallet_balance",
  description: "Get the user's real-time wallet balances (Native OKB and popular ERC20 tokens like USDC, USDT, WETH, WBTC) on a specific chain.",
  input_schema: {
    type: "object",
    properties: {
      chain: { type: "string", description: "Chain to get balances for, e.g. x-layer" },
      address: { type: "string", description: "Optional wallet address to check. If not provided, checks the user's connected wallet." }
    },
    required: ["chain"],
  },
  execute: async (input: { chain: string, address?: string }, context?: ToolContext) => {
    try {
      const targetAddress = input.address || context?.walletAddress;
      if (!targetAddress) {
        return { error: "No wallet address connected. Tell the user to connect their wallet first." };
      }
      const chainConfig = normalizeChain(input.chain || "x-layer");
      if (chainConfig.id !== "x-layer") {
        return { error: `Balance lookups for ${chainConfig.name} are coming soon. Switch to X Layer.` };
      }

      const { runCli } = await import("../cli-runner");
      const { createPublicClient, http, formatUnits } = await import("viem");

      // ── 1. Native OKB balance via RPC ────────────────────────────────────
      const client = createPublicClient({ transport: http("https://rpc.xlayer.tech") });
      const okbRaw = await client.getBalance({ address: targetAddress as `0x${string}` });
      const okbAmount = Number(formatUnits(okbRaw, 18));

      // ── 2. ERC20 balances via onchainos portfolio token-balances ──────────
      // Dynamic decimals from OKX — no hardcoding needed
      const erc20Tokens = [
        { symbol: "USDC", address: "0x74b7f16337b8972027f6196a17a631ac6de26d22" },
        { symbol: "USDT", address: "0x1e4a5963abfd975d8c9021ce480b42188849d41d" },
      ];
      const tokenAmounts: Record<string, number> = { OKB: okbAmount };

      for (const token of erc20Tokens) {
        try {
          const tokenArg = `${chainConfig.chainIndex}:${token.address}`;
          const raw = await runCli([
            "portfolio", "token-balances",
            "--address", targetAddress.toLowerCase(),
            "--tokens", tokenArg,
          ]);
          const obj = raw as Record<string, unknown>;
          const items: unknown[] = Array.isArray(obj.data) ? obj.data : [];
          if (items.length > 0) {
            const item = items[0] as Record<string, unknown>;
            const assets = Array.isArray(item.tokenAssets) ? item.tokenAssets : [item];
            if (assets.length > 0) {
              const asset = assets[0] as Record<string, unknown>;
              tokenAmounts[token.symbol] = parseFloat(String(asset.balance ?? asset.amount ?? "0"));
            } else {
              tokenAmounts[token.symbol] = 0;
            }
          } else {
            tokenAmounts[token.symbol] = 0;
          }
        } catch {
          tokenAmounts[token.symbol] = 0;
        }
      }

      // ── 3. OKB price via onchainos market price ──────────────────────
      // Falls back to CoinGecko, then hardcoded if both fail
      const pricesUsd: Record<string, number> = { USDC: 1, USDT: 1 };
      let okbPriceUsd = 0;

      try {
        const priceRaw = await runCli([
          "market", "price",
          "--chain", chainConfig.chainSlug,
          "--address", "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        ]);
        const obj = priceRaw as Record<string, unknown>;
        const items: unknown[] = Array.isArray(obj.data) ? obj.data : [];
        if (items.length > 0) {
          const info = items[0] as Record<string, unknown>;
          okbPriceUsd = parseFloat(String(info.price ?? info.priceUsd ?? info.tokenPrice ?? "0"));
        }
      } catch {}

      if (!okbPriceUsd || isNaN(okbPriceUsd)) {
        // Fallback: CoinGecko
        try {
          const cgRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=okb&vs_currencies=usd");
          if (cgRes.ok) {
            const cgData = await cgRes.json();
            if (cgData?.okb?.usd) okbPriceUsd = cgData.okb.usd;
          }
        } catch {}
      }

      pricesUsd["OKB"] = okbPriceUsd > 0 ? okbPriceUsd : 83; // last-resort fallback (~current OKB price)

      // ── 4. Estimated USD values ───────────────────────────────────────────
      const estimatedUsd: Record<string, string> = {};
      let total = 0;
      for (const [sym, amount] of Object.entries(tokenAmounts)) {
        const usd = amount * (pricesUsd[sym] ?? 1);
        estimatedUsd[sym] = usd.toFixed(2);
        total += usd;
      }
      estimatedUsd["total"] = total.toFixed(2);

      return {
        walletAddress: targetAddress,
        chain: chainConfig.name,
        balances: {
          "OKB": okbAmount.toFixed(4),
          "USDC": (tokenAmounts["USDC"] ?? 0).toFixed(2),
          "USDT": (tokenAmounts["USDT"] ?? 0).toFixed(2),
        },
        prices_usd: pricesUsd,
        estimated_usd: estimatedUsd,
      };
    } catch (err: any) {
      return { error: err.message };
    }
  },
});

// 1. get_signals
registerTool({
  name: "get_signals",
  description: "Get trending or high-potential token signals on a specific chain. Use token_filter to search for a specific token's signals.",
  input_schema: {
    type: "object",
    properties: {
      chain: { type: "string", description: "Chain to get signals for, e.g. x-layer or base" },
      max_tokens: { type: "number", description: "Maximum number of tokens to return" },
      token_filter: { type: "string", description: "Optional token symbol to filter signals for (e.g. OKB). If provided, results will be separated into matched and other signals." },
    },
    required: ["chain"],
  },
  execute: async (input: { chain: string; max_tokens?: number; token_filter?: string }) => {
    try {
      const chainConfig = normalizeChain(input.chain || "x-layer");
      const maxTokens = input.max_tokens || 5;
      const filter = input.token_filter?.toUpperCase() || null;

      console.log(`[signal-debug] get_signals called: chain=${chainConfig.id}, token_filter=${filter || "none"}, max_tokens=${maxTokens}`);

      const { signals, meta } = await getSignals(chainConfig.id, maxTokens);

      // If a token filter was requested, separate matched vs other signals
      if (filter) {
        const matched = signals.filter((s) =>
          String(s.symbol || "").toUpperCase() === filter
        );
        const other = signals.filter((s) =>
          String(s.symbol || "").toUpperCase() !== filter
        );

        console.log(`[signal-debug] token_filter=${filter}: matched=${matched.length}, other=${other.length}`);

        return {
          tokenFilter: filter,
          tokenSpecificSignals: matched,
          otherSignals: other,
          hasTokenSpecificData: matched.length > 0,
          meta,
          resultType: matched.length > 0 ? "token_specific" : "general_market",
        };
      }

      console.log(`[signal-debug] general signal discovery: ${signals.length} signals found`);
      return { signals, meta, resultType: "general_market" };
    } catch (err: any) {
      console.error(`[signal-debug] get_signals error: ${err.message}`);
      return { error: err.message, providerError: true };
    }
  },
});

// 2. scan_token
registerTool({
  name: "scan_token",
  description: "Scan a token for security risks (e.g. honeypot, rugged). Must use address.",
  input_schema: {
    type: "object",
    properties: {
      address: { type: "string", description: "Token contract address (0x...)" },
      chain: { type: "string", description: "Chain the token is on" },
      risk_mode: { type: "string", description: "User's risk tolerance (conservative, moderate, degen)" },
    },
    required: ["address", "chain"],
  },
  execute: async (input: { address: string; chain: string; risk_mode?: string }) => {
    try {
      const chainConfig = normalizeChain(input.chain);
      const scanResult = await scanToken(input.address, chainConfig.id);
      const riskMode = (input.risk_mode || "conservative") as "conservative" | "moderate" | "degen";
      const action = determineRiskAction(scanResult.decision, riskMode);
      return {
        address: input.address,
        chain: chainConfig.id,
        action,
        riskLevel: scanResult.riskLevel,
        isHoneypot: scanResult.isHoneypot,
        executionAllowed: scanResult.executionAllowed,
        triggeredLabels: scanResult.triggeredLabels,
        meta: scanResult.meta,
      };
    } catch (err: any) {
      return { error: err.message };
    }
  },
});

// 3. search_token
registerTool({
  name: "search_token",
  description: "Search for a token by symbol to get its contract address.",
  input_schema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: "Token symbol (e.g. USDC, OKB)" },
      chain: { type: "string", description: "Chain to search on" },
    },
    required: ["symbol", "chain"],
  },
  execute: async (input: { symbol: string; chain: string }) => {
    try {
      const chainConfig = normalizeChain(input.chain);
      const results = await searchToken(input.symbol, chainConfig.id);
      
      // Block ambiguous symbols
      if (results.length > 1) {
        return { 
          error: "Symbol is ambiguous. Multiple tokens found. Please ask the user to provide the exact contract address to proceed securely.", 
          blocked: true,
          candidates: results 
        };
      }

      return { results };
    } catch (err: any) {
      return { error: err.message };
    }
  },
});

// 4. get_swap_quote
registerTool({
  name: "get_swap_quote",
  description: "Get a swap quote to exchange tokens. Will perform a security scan first and block if high risk.",
  input_schema: {
    type: "object",
    properties: {
      to_address: { type: "string", description: "Target token contract address (0x...)" },
      from_address: { type: "string", description: "Source token contract address (0x...), leave undefined to use default" },
      from_symbol: { type: "string", description: "Source token symbol (e.g. USDC)" },
      amount: { type: "number", description: "Amount of fromToken to swap. Use this OR amount_usd, not both." },
      amount_usd: { type: "number", description: "Amount in USD to swap. The tool will auto-convert to token amount using live prices. Use this if the user specifies a fiat amount like '$1'." },
      chain: { type: "string", description: "Chain for the swap" },
      slippage: { type: "number", description: "Slippage tolerance in percent (e.g. 3)" },
      risk_mode: { type: "string", description: "Risk mode: conservative, moderate, degen" },
    },
    required: ["to_address", "chain"],
  },
  execute: async (input: { to_address: string; from_address?: string; from_symbol?: string; amount?: number; amount_usd?: number; chain: string, slippage?: number, risk_mode?: string }, context?: ToolContext) => {
    let chainConfig;
    try {
      chainConfig = normalizeChain(input.chain);
    } catch (err: any) {
      return { error: err.message, blocked: true };
    }

    if (chainConfig.id !== "x-layer") {
      return {
        error: `Execution for ${chainConfig.name} is Coming Soon. Switch to X Layer to proceed.`,
        blocked: true
      };
    }
    const chain = chainConfig.id;
    const fromSymbol = (input.from_symbol || chainConfig.defaultFromSymbol).toUpperCase();
    let fromAddress = input.from_address || chainConfig.defaultFromToken;
    if (!input.from_address && fromSymbol === "OKB") {
      fromAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    }

    let amount = input.amount || 0;
    if (input.amount_usd) {
      try {
        const symbolMap: Record<string, string> = { "OKB": "okb", "ETH": "ethereum", "USDC": "usd-coin", "USDT": "tether", "WBTC": "wrapped-bitcoin" };
        const cgId = symbolMap[fromSymbol] || "okb";
        const cgRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
        const cgData = await cgRes.json();
        const price = cgData[cgId]?.usd || 1;
        amount = input.amount_usd / price;
      } catch (err) {
        return { error: "Failed to fetch live fiat price for conversion.", blocked: true };
      }
    }

    if (amount <= 0) {
      return { error: "Amount must be greater than 0", blocked: true };
    }

    if (!context?.walletAddress) {
      return {
        error: "Verified wallet address is required for execution. Connect your wallet first.",
        blocked: true
      };
    }

    const { checkBalance } = await import("../okx");
    const balanceCheck = await checkBalance(chain, context.walletAddress, fromAddress, amount);
    if (!balanceCheck.hasSufficient) {
      return {
        error: `Insufficient balance: verified wallet has ${balanceCheck.balance} ${fromSymbol}. Reduce amount or top up.`,
        blocked: true
      };
    }

    // Enforce scan before quote
    let scanDecision: "safe" | "high_risk" | "unknown" | "skipped" = "safe";
    try {
      const scanResultTo = await scanToken(input.to_address, chain);
      const scanResultFrom = await scanToken(fromAddress, chain);
      
      if (scanResultTo.decision === "unknown" || scanResultFrom.decision === "unknown") {
        return {
          error: "Token safety scan unavailable. Quote blocked for security.",
          blocked: true
        };
      }

      if (!scanResultTo.executionAllowed || scanResultTo.isHoneypot || !scanResultFrom.executionAllowed || scanResultFrom.isHoneypot) {
        return {
          error: "High risk or honeypot token detected. Quote blocked for security.",
          blocked: true,
          scanResultTo: {
            riskLevel: scanResultTo.riskLevel,
            triggeredLabels: scanResultTo.triggeredLabels,
            meta: scanResultTo.meta
          },
          scanResultFrom: {
            riskLevel: scanResultFrom.riskLevel,
            triggeredLabels: scanResultFrom.triggeredLabels,
            meta: scanResultFrom.meta
          }
        };
      }

      const riskMode = (input.risk_mode || "conservative") as "conservative" | "moderate" | "degen";
      const decisionTo = determineRiskAction(scanResultTo.decision, riskMode);
      const decisionFrom = determineRiskAction(scanResultFrom.decision, riskMode);

      if (decisionTo === "skipped" || decisionFrom === "skipped") {
        return {
          error: "Token risk exceeds current risk mode tolerance. Quote blocked.",
          blocked: true,
        };
      }
      scanDecision = decisionTo === "high_risk" || decisionFrom === "high_risk" ? "high_risk" : "safe";
    } catch (err) {
      return {
        error: "Token safety scan unavailable. Quote blocked for security.",
        blocked: true
      };
    }

    try {
      const quoteResult = await getQuotePreflight(input.to_address, amount, chain, fromAddress, fromSymbol.toUpperCase());
      
      const SERVER_HARD_CAP = Math.max(1, parseFloat(process.env.MAX_TRADE_USD_HARD_CAP || "1"));
      if (quoteResult.fromAmountUsd > SERVER_HARD_CAP) {
        return {
          error: `Requested amount ($${quoteResult.fromAmountUsd.toFixed(2)}) exceeds server hard cap ($${SERVER_HARD_CAP}). Quote blocked.`,
          blocked: true
        };
      }

      const { getSwapTxData, checkAllowance, getApproveTxData, getTokenDecimals, toMinimalUnits } = await import("../okx");
      const slippageLimit = input.slippage !== undefined ? input.slippage : 2;
      const swapData = await getSwapTxData(input.to_address, amount, chain, context.walletAddress, fromAddress, slippageLimit);
      
      let routerAddress: string | undefined = undefined;
      let allowanceResult = { hasSufficient: true };
      let approveTxData = null;
      let decimals = 18;
      let approveAmountStr: string | undefined = undefined;

      if (swapData.txData && swapData.txData.to) {
        routerAddress = swapData.txData.to;
        const isNativeFrom = !fromAddress || fromAddress.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
        
        if (isNativeFrom) {
          allowanceResult = { hasSufficient: true };
        } else {
          decimals = await getTokenDecimals(chain, fromAddress);
          allowanceResult = await checkAllowance(chain, context.walletAddress, fromAddress, amount, decimals);
          if (!allowanceResult.hasSufficient) {
            const approveData = await getApproveTxData(chain, fromAddress, amount, decimals);
            approveTxData = approveData.txData;
            try {
              approveAmountStr = toMinimalUnits(amount, decimals);
            } catch {}
          }
        }
      } else if (swapData.error) {
        return { error: swapData.error, blocked: true };
      }

      return {
        quote: quoteResult.quote,
        fromToken: quoteResult.fromToken,
        fromSymbol: quoteResult.fromSymbol,
        fromAmountUsd: quoteResult.fromAmountUsd,
        toSymbol: quoteResult.toSymbol,
        toAddress: input.to_address,
        amount,
        chain,
        slippage: input.slippage,
        riskMode: input.risk_mode,
        scanDecision,
        meta: quoteResult.meta,
        routerAddress,
        needsApproval: !allowanceResult.hasSufficient,
        approveAmountStr,
        approveTxData
      };
    } catch (err: any) {
      return { error: err.message, blocked: true };
    }
  },
});

// 5. market_structure_check
import { checkMarketStructure } from "../market-structure";

registerTool({
  name: "market_structure_check",
  description: "Check market structure, smart money, and derivatives positioning for a specific token.",
  input_schema: {
    type: "object",
    properties: {
      symbols: { type: "array", items: { type: "string" }, description: "Array of token symbols to check (e.g. ['BTC', 'ETH'])" },
      depth: { type: "string", description: "'quick' or 'full'. Defaults to 'quick'." },
    },
    required: ["symbols"],
  },
  execute: async (input: { symbols: string[]; depth?: string }) => {
    console.log(`[market-debug] market_structure_check called: symbols=${input.symbols.join(",")}, depth=${input.depth || "quick"}`);
    const results = await checkMarketStructure(input.symbols);

    // Debug: summarize results without secrets
    for (const r of results) {
      if (r.success) {
        console.log(`[market-debug] ${r.symbol}: success`);
      } else {
        console.log(`[market-debug] ${r.symbol}: failed — ${r.error || "unknown error"}`);
      }
    }

    // Add data confidence metadata
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    let dataConfidence: "high" | "medium" | "low" = "high";
    if (successCount === 0) dataConfidence = "low";
    else if (successCount < totalCount) dataConfidence = "medium";

    return { results, depth: input.depth || "quick", dataConfidence };
  },
});

// 6. get_token_price
registerTool({
  name: "get_token_price",
  description: "Get the real-time fiat (USD) price of one or more tokens.",
  input_schema: {
    type: "object",
    properties: {
      symbols: { type: "array", items: { type: "string" }, description: "Array of token symbols to get prices for (e.g. ['OKB', 'ETH', 'USDC'])" },
    },
    required: ["symbols"],
  },
  execute: async (input: { symbols: string[] }) => {
    try {
      const { runCli } = await import("../cli-runner");
      const chainIndex = "196"; // X Layer

      // Token address map for market price
      const addressMap: Record<string, string> = {
        "OKB":  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "USDC": "0x74b7f16337b8972027f6196a17a631ac6de26d22",
        "USDT": "0x1e4a5963abfd975d8c9021ce480b42188849d41d",
        "WETH": "0x5a77f1443d16ee5761d310e38b62f77f726bc71c",
        "WBTC": "0x8f8526dbfd6e38e3d8307702ca8469bae6c56c15",
      };

      const results: Record<string, number> = {};

      for (const symbol of input.symbols) {
        const upper = symbol.toUpperCase();
        const addr = addressMap[upper] ?? null;

        // Try OKX market price first
        if (addr !== null) {
          try {
            const raw = await runCli([
              "market", "price",
              "--chain", "xlayer",
              "--address", addr,
            ]);
            const obj = raw as Record<string, unknown>;
            const items: unknown[] = Array.isArray(obj.data) ? obj.data : [];
            if (items.length > 0) {
              const info = items[0] as Record<string, unknown>;
              const price = parseFloat(String(info.price ?? info.priceUsd ?? info.tokenPrice ?? "0"));
              if (price > 0) {
                results[upper] = price;
                continue;
              }
            }
          } catch {}
        }

        // Fallback: CoinGecko
        try {
          const cgMap: Record<string, string> = {
            "OKB": "okb", "ETH": "ethereum", "USDC": "usd-coin",
            "USDT": "tether", "WBTC": "wrapped-bitcoin", "SOL": "solana", "BTC": "bitcoin",
          };
          const cgId = cgMap[upper] || upper.toLowerCase();
          const cgRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
          if (cgRes.ok) {
            const cgData = await cgRes.json();
            if (cgData[cgId]?.usd) results[upper] = cgData[cgId].usd;
          }
        } catch {}
      }

      return { prices_usd: results };
    } catch (err) {
      return { error: "Failed to fetch real-time prices." };
    }
  },
});

// 7. estimate_gas — okx-onchain-gateway
registerTool({
  name: "estimate_gas",
  description: "Estimate current gas prices on a chain, or estimate gas limit for a specific transaction. Uses OKX Onchain Gateway.",
  input_schema: {
    type: "object",
    properties: {
      chain: { type: "string", description: "Chain to estimate gas for (e.g. x-layer, ethereum, base)" },
      from: { type: "string", description: "Optional: sender address for gas limit estimation" },
      to: { type: "string", description: "Optional: recipient/contract address for gas limit estimation" },
      data: { type: "string", description: "Optional: calldata hex for gas limit estimation" },
    },
    required: ["chain"],
  },
  execute: async (input: { chain: string; from?: string; to?: string; data?: string }) => {
    try {
      const chainConfig = normalizeChain(input.chain || "x-layer");
      const { runCli } = await import("../cli-runner");

      // If from+to provided, estimate gas limit for specific tx
      if (input.from && input.to) {
        const args = [
          "gateway", "gas-limit",
          "--from", input.from.toLowerCase(),
          "--to", input.to.toLowerCase(),
          "--chain", chainConfig.chainSlug,
        ];
        if (input.data) args.push("--data", input.data);
        const raw = await runCli(args);
        const obj = raw as Record<string, unknown>;
        return { type: "gas_limit", chain: chainConfig.name, data: obj.data ?? obj };
      }

      // Otherwise, get current gas prices
      const raw = await runCli([
        "gateway", "gas",
        "--chain", chainConfig.chainSlug,
      ]);
      const obj = raw as Record<string, unknown>;
      return { type: "gas_price", chain: chainConfig.name, data: obj.data ?? obj };
    } catch (err: any) {
      return { error: err.message };
    }
  },
});

// 8. simulate_transaction — okx-onchain-gateway
registerTool({
  name: "simulate_transaction",
  description: "Simulate (dry-run) a transaction to check if it would succeed or revert, without broadcasting. Uses OKX Onchain Gateway.",
  input_schema: {
    type: "object",
    properties: {
      chain: { type: "string", description: "Chain to simulate on" },
      from: { type: "string", description: "Sender wallet address" },
      to: { type: "string", description: "Target contract address" },
      data: { type: "string", description: "Transaction calldata (hex)" },
      value: { type: "string", description: "Native token value in wei (default: 0)" },
    },
    required: ["chain", "from", "to", "data"],
  },
  execute: async (input: { chain: string; from: string; to: string; data: string; value?: string }) => {
    try {
      const chainConfig = normalizeChain(input.chain || "x-layer");
      const { runCli } = await import("../cli-runner");
      const args = [
        "gateway", "simulate",
        "--from", input.from.toLowerCase(),
        "--to", input.to.toLowerCase(),
        "--data", input.data,
        "--chain", chainConfig.chainSlug,
      ];
      if (input.value) args.push("--amount", input.value);
      const raw = await runCli(args);
      const obj = raw as Record<string, unknown>;
      return { chain: chainConfig.name, simulation: obj.data ?? obj };
    } catch (err: any) {
      return { error: err.message, reverted: true };
    }
  },
});

// 9. get_wallet_status — okx-agentic-wallet
registerTool({
  name: "get_wallet_status",
  description: "INTERNAL/DEBUG ONLY. Check OKX Agentic Wallet CLI status. Do NOT use this to check the user's connected Privy wallet. The user's Privy wallet state is automatically provided in the prompt context.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async () => {
    try {
      const { runCli } = await import("../cli-runner");
      const raw = await runCli(["wallet", "status"]);
      const obj = raw as Record<string, unknown>;
      return { status: obj.data ?? obj };
    } catch (err: any) {
      return { error: err.message };
    }
  },
});

// 10. get_audit_log_info — okx-audit-log
registerTool({
  name: "get_audit_log_info",
  description: "Get the location and format of the OKX onchainos audit log file for troubleshooting. Returns the file path, format, and rotation info.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async () => {
    const isWindows = process.platform === "win32";
    const homeDir = isWindows
      ? process.env.USERPROFILE || "C:\\Users\\<user>"
      : process.env.HOME || "~";
    const onchainosHome = process.env.ONCHAINOS_HOME || `${homeDir}${isWindows ? "\\" : "/"}.onchainos`;
    const logPath = `${onchainosHome}${isWindows ? "\\" : "/"}audit.jsonl`;

    return {
      logPath,
      format: "JSON Lines (one JSON object per line)",
      fields: ["ts (local time with timezone)", "source (cli/mcp)", "command", "ok", "duration_ms", "args (redacted)", "error"],
      rotation: "Max 10,000 lines, auto-keeps device header + most recent 5,000 entries",
      deviceHeader: "First line contains {type:'device', os, arch, version}",
    };
  },
});

export function getToolsForAnthropic() {
  return Array.from(registry.values()).map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema,
  }));
}
