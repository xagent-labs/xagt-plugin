// The analysis pipeline: runs the OKX onchainos skill suite in order and
// normalizes each response into the flat shape verdict.js expects.
//
// Every stage is independently fault-tolerant: a quota/auth/transport
// failure marks that stage `skipped` (with the reason) instead of
// aborting the run or — critically — inventing data.

import { run, data, OnchainosError } from "./onchainos.js";

// Best-effort numeric extraction across the slightly different field
// names onchainos uses between endpoints. Never throws.
const num = (...vals) => {
  for (const v of vals) {
    const n = typeof v === "string" ? Number(v.replace(/[, ]/g, "")) : v;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return null;
};
const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return undefined;
};

export const STAGES = [
  { id: "resolve", label: "Resolving token", skill: "token search" },
  { id: "security", label: "Security scan (honeypot / rug / tax)", skill: "security token-scan" },
  { id: "fundamentals", label: "Fundamentals & price", skill: "token report" },
  { id: "clusters", label: "Holder cluster risk", skill: "token cluster-overview" },
  { id: "signals", label: "Smart-money signals", skill: "signal list / token top-trader" },
  { id: "meme", label: "Launchpad / meme risk", skill: "memepump" },
  { id: "defi", label: "DeFi yield alternatives", skill: "defi search" },
];

/**
 * @param {{address:string, chain:string, chainId:string, symbol?:string,
 *          isMeme?:boolean, onStage?:Function}} ctx
 */
export async function runPipeline(ctx) {
  const out = {
    token: { address: ctx.address, chain: ctx.chain, symbol: ctx.symbol || null },
    stages: {}, // id -> { ok:bool, skipped?:string, raw? }
    signals: {
      security: null,
      liquidityUsd: null,
      taxPct: null,
      devRugCount: null,
      ageHours: null,
      clusterRugPct: null,
      clusterConcentrated: null,
      bundlerConcentrated: null,
      smartMoney: null,
    },
    notes: [],
  };

  const stage = async (id, fn) => {
    ctx.onStage?.(id, "start");
    try {
      await fn();
      out.stages[id] = { ok: true };
      ctx.onStage?.(id, "ok");
    } catch (e) {
      const reason =
        e instanceof OnchainosError
          ? `${e.kind}: ${e.message}`
          : e.message || String(e);
      out.stages[id] = { ok: false, skipped: reason };
      ctx.onStage?.(id, "skip", reason);
    }
  };

  // ── Stage 1: security (most important) ───────────────────────────
  await stage("security", async () => {
    const r = data(
      await run([
        "security",
        "token-scan",
        "--tokens",
        `${ctx.chainId}:${ctx.address}`,
        "--chain",
        ctx.chain,
      ]),
    );
    const item = Array.isArray(r) ? r[0] : (r?.result?.[0] ?? r?.[0] ?? r);
    const level =
      pick(item, "riskLevel", "risk_level", "risklevel") ?? null;
    const honey =
      pick(item, "isHoneyPot", "isHoneypot", "honeypot") === true ||
      String(pick(item, "isHoneyPot", "honeypot")) === "true";
    out.signals.security = {
      level: level ? String(level).toUpperCase() : null,
      isHoneypot: honey,
      completed: true,
    };
    const tax = num(pick(item, "buyTax", "taxRate", "sellTax"));
    if (tax != null) out.signals.taxPct = tax > 1 ? tax : tax * 100;
  });
  if (!out.signals.security) {
    out.signals.security = { level: null, isHoneypot: false, completed: false };
  }

  // ── Stage 2: fundamentals (token report composite) ───────────────
  await stage("fundamentals", async () => {
    const r = data(
      await run(["token", "report", "--address", ctx.address, "--chain", ctx.chain]),
    );
    const flat = JSON.stringify(r);
    out.signals.liquidityUsd ??= num(
      deepFind(r, ["liquidity", "liquidityUsd", "liquidity_usd"]),
    );
    const mc = num(deepFind(r, ["marketCap", "market_cap", "mcap", "fdv"]));
    if (mc != null) out.notes.push(`Market cap ~$${human(mc)}`);
    const vol = num(deepFind(r, ["volume24h", "vol24h", "volume_24h"]));
    if (vol != null) out.notes.push(`24h volume ~$${human(vol)}`);
    out.signals.devRugCount ??= num(
      deepFind(r, ["devRugPullTokenCount", "rugPullTokenCount", "devRugCount"]),
    );
    const createdMs = num(deepFind(r, ["createdAt", "created_at", "deployTime", "firstTradeTime"]));
    if (createdMs != null) {
      const ms = createdMs > 1e12 ? createdMs : createdMs * 1000;
      out.signals.ageHours = (Date.now() - ms) / 3.6e6;
    }
    if (out.signals.taxPct == null) {
      const t = num(deepFind(r, ["buyTax", "taxRate"]));
      if (t != null) out.signals.taxPct = t > 1 ? t : t * 100;
    }
    if (/honeyp/i.test(flat) && /true/i.test(flat) && out.signals.security) {
      // belt-and-suspenders: report flagged honeypot too
      if (/"isHoneyPot"\s*:\s*true/i.test(flat)) out.signals.security.isHoneypot = true;
    }
  });

  // ── Stage 3: holder clusters ─────────────────────────────────────
  await stage("clusters", async () => {
    const r = data(
      await run([
        "token",
        "cluster-overview",
        "--address",
        ctx.address,
        "--chain",
        ctx.chain,
      ]),
    );
    out.signals.clusterRugPct = num(
      deepFind(r, ["rugPullPercent", "rugPullPct", "rug_pull_percent", "rugPct"]),
    );
    const lvl = deepFind(r, ["clusterLevel", "cluster_level", "concentrationLevel"]);
    out.signals.clusterConcentrated =
      lvl != null && /high|severe|extreme/i.test(String(lvl));
  });

  // ── Stage 4: smart-money signals ─────────────────────────────────
  await stage("signals", async () => {
    const tt = data(
      await run([
        "token",
        "top-trader",
        "--address",
        ctx.address,
        "--chain",
        ctx.chain,
      ]),
    );
    const traders = Array.isArray(tt) ? tt : (tt?.list ?? tt?.result ?? []);
    if (Array.isArray(traders) && traders.length) {
      let sells = 0;
      let buys = 0;
      for (const t of traders.slice(0, 20)) {
        const net = num(pick(t, "netPnl", "realizedPnl", "pnl", "netAmount"));
        if (net == null) continue;
        if (net < 0) sells++;
        else buys++;
      }
      out.signals.smartMoney =
        sells > buys * 1.5
          ? "distributing"
          : buys > sells * 1.5
            ? "accumulating"
            : "mixed";
    }
  });

  // ── Stage 5: launchpad / meme (only when plausibly a meme) ───────
  if (ctx.isMeme) {
    await stage("meme", async () => {
      const r = data(
        await run([
          "memepump",
          "token-bundle-info",
          "--address",
          ctx.address,
          "--chain",
          ctx.chain,
        ]),
      );
      const bundlePct = num(
        deepFind(r, ["bundlePercent", "bundlerPct", "sniperPercent", "bundle_percent"]),
      );
      out.signals.bundlerConcentrated = bundlePct != null && bundlePct >= 15;
    });
  } else {
    out.stages.meme = { ok: false, skipped: "not a meme/launchpad token" };
  }

  // ── Stage 6: DeFi alternatives (additive, never a downgrade) ─────
  await stage("defi", async () => {
    if (!ctx.symbol) throw new OnchainosError("no symbol to search DeFi", { kind: "cli" });
    // onchainos `defi search` keys results by --token (a comma-separated
    // token keyword), NOT --query. Using --query exits 2 with
    // "unexpected argument". Verified against onchainos 3.3.3.
    const r = data(
      await run(["defi", "search", "--token", ctx.symbol, "--chain", ctx.chain]),
    );
    const list = Array.isArray(r) ? r : (r?.list ?? r?.result ?? []);
    if (Array.isArray(list) && list.length) {
      out.notes.push(
        `DeFi alternative: ${list.length} yield venue(s) found for ${ctx.symbol} — consider LP/earn instead of a spot buy.`,
      );
    }
  });

  return out;
}

// Recursively find the first value whose key matches one of `keys`.
function deepFind(obj, keys, depth = 0) {
  if (obj == null || depth > 6) return undefined;
  if (Array.isArray(obj)) {
    for (const el of obj) {
      const v = deepFind(el, keys, depth + 1);
      if (v !== undefined) return v;
    }
    return undefined;
  }
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      if (keys.includes(k) && obj[k] != null && typeof obj[k] !== "object") {
        return obj[k];
      }
    }
    for (const k of Object.keys(obj)) {
      const v = deepFind(obj[k], keys, depth + 1);
      if (v !== undefined) return v;
    }
  }
  return undefined;
}

function human(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(Math.round(n));
}
