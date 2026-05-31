// Confirmation-gated swap execution.
//
// Hard rules (non-negotiable, mirror references/execution-safety.md):
//  - Always quote immediately before executing.
//  - Never execute without an explicit interactive "yes".
//  - Report as "broadcast — pending", never "successful".
//  - Honeypot-on-buy or AVOID verdict blocks execution outright.

import { run, data, OnchainosError } from "./onchainos.js";

export async function walletStatus() {
  try {
    const r = data(await run(["wallet", "status"]));
    return {
      loggedIn: !!r?.loggedIn,
      accountCount: r?.accountCount ?? 0,
      address: r?.currentAddress || r?.currentAccountName || null,
      email: r?.email || null,
    };
  } catch (e) {
    return { loggedIn: false, accountCount: 0, address: null, error: e.message };
  }
}

export async function getQuote({ from, to, amount, chain }) {
  const r = data(
    await run([
      "swap",
      "quote",
      "--from",
      from,
      "--to",
      to,
      "--readable-amount",
      String(amount),
      "--chain",
      chain,
    ]),
  );
  return {
    raw: r,
    toAmount: r?.toTokenAmount ?? r?.toAmount ?? r?.outputAmount ?? null,
    priceImpactPct: numish(r?.priceImpact ?? r?.priceImpactPct),
    isHoneypot:
      r?.isHoneyPot === true || String(r?.isHoneyPot) === "true",
    taxPct: numish(r?.taxRate ?? r?.buyTax),
    route: r?.route ?? r?.routerResult ?? null,
  };
}

/**
 * Execute the swap. Caller MUST have obtained an explicit user "yes"
 * AFTER showing the quote. This function re-checks the hard blocks.
 */
export async function executeSwap({
  from,
  to,
  amount,
  chain,
  wallet,
  slippage,
  gasLevel,
  mevProtection,
  verdict,
  quote,
}) {
  if (verdict === "AVOID") {
    throw new OnchainosError(
      "Execution blocked: verdict is AVOID. An explicit informed override is required upstream.",
      { kind: "cli" },
    );
  }
  if (quote?.isHoneypot) {
    throw new OnchainosError(
      "Execution blocked: quote flags this token as a honeypot on the buy side.",
      { kind: "cli" },
    );
  }

  const args = [
    "swap",
    "execute",
    "--from",
    from,
    "--to",
    to,
    "--readable-amount",
    String(amount),
    "--chain",
    chain,
    "--wallet",
    wallet,
  ];
  if (slippage != null) args.push("--slippage", String(slippage));
  if (gasLevel) args.push("--gas-level", gasLevel);
  if (mevProtection) args.push("--mev-protection");

  const r = data(await run(args, { timeoutMs: 90_000 }));
  return {
    raw: r,
    swapTxHash: r?.swapTxHash ?? r?.txHash ?? null,
    approveTxHash: r?.approveTxHash ?? null,
    fromAmount: r?.fromAmount ?? null,
    toAmount: r?.toAmount ?? null,
  };
}

// MEV auto-enable rule (chain thresholds from the OKX swap skill).
const MEV_THRESHOLD = { ethereum: 2000, solana: 1000, bsc: 200, base: 200 };
export function shouldEnableMev({ chain, notionalUsd, potentialLossUsd }) {
  if (potentialLossUsd != null && potentialLossUsd >= 50) return true;
  const t = MEV_THRESHOLD[chain?.toLowerCase()];
  if (t == null) return false;
  if (notionalUsd == null) return true; // unknown price → protect by default
  return notionalUsd >= t;
}

function numish(v) {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v.replace(/[%, ]/g, "")) : v;
  return Number.isFinite(n) ? n : null;
}
