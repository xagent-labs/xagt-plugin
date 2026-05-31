import { NextRequest, NextResponse } from "next/server";
import { normalizeChain } from "../../../lib/chains";

/**
 * GET /api/portfolio?address=0x...&chain=X+Layer
 * 
 * Fetches real wallet balances from OKX Onchain OS via onchainos CLI.
 * Returns: { tokens: TokenBalance[], totalUsd: string }
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const chainParam = req.nextUrl.searchParams.get("chain") || "X Layer";

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    const chain = normalizeChain(chainParam);

    // Server-side X Layer enforcement — portfolio is only available on X Layer
    if (chain.id !== "x-layer") {
      return NextResponse.json(
        { error: "Portfolio data is currently available on X Layer only." },
        { status: 403 }
      );
    }
    const { runCli } = await import("../../../lib/cli-runner");
    const { createPublicClient, http, formatUnits } = await import("viem");

    // ── 1. Native OKB balance via RPC ─────────────────────────────────────
    let nativeBalance = 0;
    try {
      const client = createPublicClient({ transport: http("https://rpc.xlayer.tech") });
      const raw = await client.getBalance({ address: address as `0x${string}` });
      nativeBalance = Number(formatUnits(raw, 18));
    } catch {
      // RPC failure — continue with 0
    }

    // ── 2. OKB price ─────────────────────────────────────────────────────
    let okbPrice = chain.nativeFallbackPrice;
    try {
      const priceRaw = await runCli([
        "market", "price-info",
        "--tokens", `${chain.chainIndex}:`,
      ]);
      const obj = priceRaw as Record<string, unknown>;
      const items: unknown[] = Array.isArray(obj.data) ? obj.data : [];
      if (items.length > 0) {
        const info = items[0] as Record<string, unknown>;
        const p = parseFloat(String(info.price ?? info.priceUsd ?? info.tokenPrice ?? "0"));
        if (p > 0) okbPrice = p;
      }
    } catch {}

    if (okbPrice <= 0) {
      // Fallback: CoinGecko
      try {
        const cgRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=okb&vs_currencies=usd", {
          signal: AbortSignal.timeout(5000),
        });
        if (cgRes.ok) {
          const cgData = await cgRes.json();
          if (cgData?.okb?.usd) okbPrice = cgData.okb.usd;
        }
      } catch {}
    }

    // ── 3. ERC20 token balances via onchainos ─────────────────────────────
    const erc20Tokens = [
      { symbol: "USDC", name: "USD Coin", address: "0x74b7f16337b8972027f6196a17a631ac6de26d22", price: 1 },
      { symbol: "USDT", name: "Tether", address: "0x1e4a5963abfd975d8c9021ce480b42188849d41d", price: 1 },
    ];

    interface TokenResult {
      symbol: string;
      name: string;
      balance: string;
      usdValue: string;
      price: number;
      change24h: number;
      contractAddress: string;
      logoUrl: string;
    }

    const tokens: TokenResult[] = [];

    // Add native token
    const okbUsd = nativeBalance * okbPrice;
    tokens.push({
      symbol: "OKB",
      name: "OKB Token",
      balance: nativeBalance.toFixed(4),
      usdValue: okbUsd.toFixed(2),
      price: okbPrice,
      change24h: 0,
      contractAddress: "native",
      logoUrl: "",
    });

    // Fetch ERC20 balances
    for (const token of erc20Tokens) {
      try {
        const tokenArg = `${chain.chainIndex}:${token.address}`;
        const raw = await runCli([
          "portfolio", "token-balances",
          "--address", address.toLowerCase(),
          "--tokens", tokenArg,
        ]);
        const obj = raw as Record<string, unknown>;
        const items: unknown[] = Array.isArray(obj.data) ? obj.data : [];
        let balance = 0;
        if (items.length > 0) {
          const item = items[0] as Record<string, unknown>;
          const assets = Array.isArray(item.tokenAssets) ? item.tokenAssets : [item];
          if (assets.length > 0) {
            const asset = assets[0] as Record<string, unknown>;
            balance = parseFloat(String(asset.balance ?? asset.amount ?? "0"));
          }
        }
        const usd = balance * token.price;
        tokens.push({
          symbol: token.symbol,
          name: token.name,
          balance: balance.toFixed(token.price === 1 ? 2 : 4),
          usdValue: usd.toFixed(2),
          price: token.price,
          change24h: 0,
          contractAddress: token.address,
          logoUrl: "",
        });
      } catch {
        tokens.push({
          symbol: token.symbol,
          name: token.name,
          balance: "0.00",
          usdValue: "0.00",
          price: token.price,
          change24h: 0,
          contractAddress: token.address,
          logoUrl: "",
        });
      }
    }

    // ── 4. Try onchainos portfolio all-balances for additional tokens ──────
    try {
      const allRaw = await runCli([
        "portfolio", "all-balances",
        "--address", address.toLowerCase(),
        "--chains", chain.chainSlug,
      ]);
      const obj = allRaw as Record<string, unknown>;
      const items: unknown[] = Array.isArray(obj.data) ? obj.data : [];
      
      const knownAddresses = new Set([
        "native",
        ...erc20Tokens.map(t => t.address.toLowerCase()),
      ]);

      for (const item of items) {
        const itemObj = item as Record<string, unknown>;
        const assets = Array.isArray(itemObj.tokenAssets) ? itemObj.tokenAssets : [itemObj];
        for (const asset of assets) {
          const t = asset as Record<string, unknown>;
          const addr = String(t.tokenContractAddress ?? "").toLowerCase();
          if (addr && !knownAddresses.has(addr)) {
            const bal = parseFloat(String(t.balance ?? "0"));
            const price = parseFloat(String(t.tokenPrice ?? "0"));
            const usd = bal * price;
            if (usd >= 0.01) {
              tokens.push({
                symbol: String(t.symbol ?? t.tokenSymbol ?? "???"),
                name: String(t.tokenName ?? t.symbol ?? "Unknown"),
                balance: bal > 1000 ? bal.toFixed(0) : bal.toFixed(4),
                usdValue: usd.toFixed(2),
                price: price,
                change24h: 0,
                contractAddress: addr,
                logoUrl: String(t.tokenLogoUrl ?? ""),
              });
            }
          }
        }
      }
    } catch {
      // all-balances failed — we still have the core tokens
    }

    // Sort by USD value descending
    tokens.sort((a, b) => parseFloat(b.usdValue) - parseFloat(a.usdValue));

    // Calculate total
    const totalUsd = tokens.reduce((sum, t) => sum + parseFloat(t.usdValue), 0).toFixed(2);

    return NextResponse.json({
      tokens,
      totalUsd,
      chain: chain.name,
      address,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
