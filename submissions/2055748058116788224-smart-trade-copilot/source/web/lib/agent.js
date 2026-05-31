// ──────────────────────────────────────────────────────────────────────
//  THE AGENT — autonomous, dynamic tool-calling orchestrator.
//
//  This is NOT a fixed pipeline. The LLM decides, per request:
//    • which OKX skills to invoke and in what order
//    • when it has enough evidence to stop early
//    • to ABORT immediately if security returns a veto (don't waste calls)
//
//  But the agent does NOT get to decide if a token is safe. After it
//  gathers evidence, the deterministic safety core (verdict.js) makes the
//  final ruling, and the agent is instructed it MUST report that ruling
//  verbatim and may not override or soften it. Autonomy in gathering;
//  determinism in judgement. That separation is the entire thesis.
// ──────────────────────────────────────────────────────────────────────

import OpenAI from "openai";
import {
  securityScan,
  tokenReport,
  holderClusters,
  smartMoney,
  memeRisk,
  defiAlternatives,
  walletStatus,
  swapQuote,
  swapExecute,
} from "./okx.js";
import { computeVerdict } from "./verdict.js";
import { DEMO_TOKENS } from "./fixtures.js";

const MODEL = process.env.STC_MODEL || "gpt-4o-mini";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "okx_security_scan",
      description:
        "OKX security skill: honeypot / rug / tax / risk-level scan. ALWAYS call this FIRST. If it returns isHoneypot=true or level=CRITICAL, the token is vetoed — STOP and do not call further tools.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "okx_token_report",
      description:
        "OKX token+market skill: liquidity, market cap, 24h volume, dev rug history, age, tax. Call after security passes.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "okx_holder_clusters",
      description:
        "OKX holder-analytics skill: holder cluster concentration and rug-pull share. Call to assess float-trap risk.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "okx_smart_money",
      description:
        "OKX signals skill: are top traders / smart money accumulating or distributing this token.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "okx_meme_risk",
      description:
        "OKX memepump skill: bundler/sniper concentration. Only relevant for meme/launchpad tokens (new, low-cap, Solana, or user said meme).",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "okx_defi_alternatives",
      description:
        "OKX DeFi skill: find legitimate yield/LP venues for this token as a lower-risk alternative to a spot buy.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "finalize",
      description:
        "Call when you have gathered enough evidence (or security vetoed). This hands off to the deterministic safety core for the FINAL verdict. You do not decide the verdict.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

const SYSTEM = `You are the autonomous evidence-gathering layer of Smart Trade Copilot, a trade-safety agent for OKX onchainOS on X Layer.

Your job: decide which OKX skills to call to answer "should I buy this token?" — dynamically, not from a fixed script.

Hard rules:
1. ALWAYS call okx_security_scan first.
2. If security returns a veto (honeypot or CRITICAL), call finalize IMMEDIATELY — do not waste other calls. This early-abort is required.
3. Otherwise gather the evidence you judge relevant (fundamentals, clusters, smart money; meme only if plausibly a meme/launchpad token; defi if useful). You choose order and which to skip.
4. You DO NOT decide if the token is safe. After finalize, a deterministic safety core computes the verdict. You must present that verdict verbatim and never override, soften, or contradict it.
5. Be concise. Narrate each decision in one short sentence ("Security clean — checking fundamentals next.").

You are autonomous in WHAT to investigate. You are powerless over the final safety ruling. That separation is the point.`;

/**
 * Run the agent. `emit(event)` streams progress to the UI.
 * Returns the deterministic verdict + the evidence + the agent's trace.
 */
export async function runAgent({ symbol, prompt, buy, payToken, amount, confirmed }, emit) {
  const sym = (symbol || "").toUpperCase();
  // Resolve the token's real chain. Curated scenarios are mapped in
  // DEMO_TOKENS. A raw 0x address is an EVM token (default Ethereum,
  // where the live demo tokens live). A base58 string that is NOT 0x
  // is a Solana mint — route it to Solana (chainId 501), mirroring the
  // CLI. Without this, Solana mints fell through to X Layer and OKX
  // rejected them (code=-1 Invalid) → bogus demo fallback.
  const raw = String(symbol || "").trim();
  const isRawEvmAddr = /^0x[a-fA-F0-9]{40}$/.test(raw);
  const isSolanaMint = !isRawEvmAddr && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(raw);
  const tok =
    DEMO_TOKENS[sym] ||
    (isRawEvmAddr
      ? { address: raw, chain: "ethereum", chainId: "1" }
      : isSolanaMint
        ? { address: raw, chain: "solana", chainId: "501" }
        : { address: symbol, chain: "xlayer", chainId: "196" });
  const ctx = { symbol: sym, address: tok.address, chain: tok.chain, chainId: tok.chainId };
  // Pay token defaults to the chain's native/liquid token so the quote
  // is valid on that chain (OKB on X Layer, native ETH on Ethereum).
  const defaultPay = tok.chain === "xlayer" ? "okb" : "eth";
  const intent = buy
    ? {
        wantsBuy: true,
        address: tok.address,
        chain: tok.chain,
        payToken: payToken || defaultPay,
        amount: amount || "0.5",
        confirmed: !!confirmed,
      }
    : null;

  const signals = {
    security: null,
    liquidityUsd: null,
    taxPct: null,
    devRugCount: null,
    ageHours: null,
    clusterRugPct: null,
    clusterConcentrated: null,
    bundlerConcentrated: null,
    smartMoney: null,
  };
  const evidence = [];
  const sourceTags = new Set();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // No LLM key configured: fall back to a deterministic sweep so the
    // demo still works, but be honest that the agent layer is inactive.
    emit({ type: "note", text: "OPENAI_API_KEY not set — running deterministic sweep (agent layer inactive)." });
    return deterministicSweep(ctx, signals, evidence, sourceTags, emit, intent);
  }

  const openai = new OpenAI({ apiKey });
  const messages = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `Token: ${sym || symbol} on ${ctx.chain}. User asked: "${prompt || `should I buy ${sym}?`}". Begin.`,
    },
  ];

  const skillFns = {
    okx_security_scan: async () => {
      const r = await securityScan(ctx);
      sourceTags.add(r.source);
      signals.security = { level: r.level, isHoneypot: r.isHoneypot, completed: r.completed };
      evidence.push({ skill: "okx-security", source: r.source, summary: r.completed ? `risk=${r.level}${r.isHoneypot ? " HONEYPOT" : ""}` : "scan did not complete" });
      return r;
    },
    okx_token_report: async () => {
      const r = await tokenReport(ctx);
      sourceTags.add(r.source);
      signals.liquidityUsd = r.liquidityUsd;
      signals.devRugCount = r.devRugCount;
      signals.ageHours = r.ageHours;
      if (r.taxPct != null) signals.taxPct = r.taxPct > 1 ? r.taxPct : r.taxPct * 100;
      evidence.push({ skill: "okx-token/market", source: r.source, summary: `liq=$${human(r.liquidityUsd)} mcap=$${human(r.marketCap)} devRugs=${r.devRugCount ?? "?"}` });
      return r;
    },
    okx_holder_clusters: async () => {
      const r = await holderClusters(ctx);
      sourceTags.add(r.source);
      signals.clusterRugPct = r.clusterRugPct;
      signals.clusterConcentrated = r.clusterConcentrated;
      evidence.push({ skill: "okx-clusters", source: r.source, summary: `rug%=${r.clusterRugPct ?? "?"} concentrated=${r.clusterConcentrated}` });
      return r;
    },
    okx_smart_money: async () => {
      const r = await smartMoney(ctx);
      sourceTags.add(r.source);
      signals.smartMoney = r.smartMoney;
      evidence.push({ skill: "okx-signals", source: r.source, summary: `smartMoney=${r.smartMoney ?? "?"}` });
      return r;
    },
    okx_meme_risk: async () => {
      const r = await memeRisk(ctx);
      sourceTags.add(r.source);
      signals.bundlerConcentrated = r.bundlerConcentrated;
      evidence.push({ skill: "okx-memepump", source: r.source, summary: `bundler%=${r.bundlePct ?? "?"}` });
      return r;
    },
    okx_defi_alternatives: async () => {
      const r = await defiAlternatives(ctx);
      sourceTags.add(r.source);
      evidence.push({ skill: "okx-defi", source: r.source, summary: `${r.venues} yield venue(s)` });
      return r;
    },
  };

  let steps = 0;
  while (steps++ < 10) {
    const res = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0,
    });
    const msg = res.choices[0].message;
    messages.push(msg);

    if (msg.content) emit({ type: "thought", text: msg.content });

    if (!msg.tool_calls?.length) break;

    let finalize = false;
    for (const call of msg.tool_calls) {
      const name = call.function.name;
      if (name === "finalize") {
        finalize = true;
        messages.push({ role: "tool", tool_call_id: call.id, content: "ack" });
        continue;
      }
      emit({ type: "skill_start", skill: name });
      try {
        const out = await skillFns[name]?.();
        emit({
          type: "skill_done",
          skill: name,
          source: out?.source,
          note: out?.note,
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(out).slice(0, 1500),
        });
      } catch (e) {
        emit({ type: "skill_error", skill: name, error: e.message });
        messages.push({ role: "tool", tool_call_id: call.id, content: `error: ${e.message}` });
      }
    }
    if (finalize) break;
  }

  if (!signals.security)
    signals.security = { level: null, isHoneypot: false, completed: false };

  return finish(signals, evidence, sourceTags, emit, intent);
}

// Fallback when no LLM key — honest deterministic sweep (still works).
async function deterministicSweep(ctx, signals, evidence, sourceTags, emit, intent) {
  const seq = [
    ["okx-security", securityScan],
    ["okx-token/market", tokenReport],
    ["okx-clusters", holderClusters],
    ["okx-signals", smartMoney],
  ];
  for (const [label, fn] of seq) {
    emit({ type: "skill_start", skill: label });
    try {
      const r = await fn(ctx);
      sourceTags.add(r.source);
      if (label === "okx-security") {
        signals.security = { level: r.level, isHoneypot: r.isHoneypot, completed: r.completed };
        if (r.isHoneypot || r.level === "CRITICAL") {
          evidence.push({ skill: label, source: r.source, summary: "VETO" });
          emit({ type: "skill_done", skill: label, source: r.source });
          break;
        }
      }
      if (label === "okx-token/market") {
        signals.liquidityUsd = r.liquidityUsd;
        signals.devRugCount = r.devRugCount;
        signals.ageHours = r.ageHours;
      }
      if (label === "okx-clusters") {
        signals.clusterRugPct = r.clusterRugPct;
        signals.clusterConcentrated = r.clusterConcentrated;
      }
      if (label === "okx-signals") signals.smartMoney = r.smartMoney;
      evidence.push({ skill: label, source: r.source, summary: "ok" });
      emit({ type: "skill_done", skill: label, source: r.source });
    } catch (e) {
      emit({ type: "skill_error", skill: label, error: e.message });
    }
  }
  if (!signals.security) signals.security = { level: null, isHoneypot: false, completed: false };
  return finish(signals, evidence, sourceTags, emit, intent);
}

async function finish(signals, evidence, sourceTags, emit, intent) {
  const verdict = computeVerdict(signals); // ← deterministic, non-overridable
  emit({
    type: "verdict",
    verdict,
    evidence,
    dataSource: sourceTags.has("live")
      ? sourceTags.has("demo")
        ? "mixed (live + demo fallback)"
        : "live OKX onchainOS"
      : "demo fixtures",
  });

  // ── The agent that ACTS — strictly gated by the deterministic core ──
  // Execution is only ever REACHABLE when the safety core does not block.
  // The agent cannot route around this; AVOID = no execution path exists.
  if (intent?.wantsBuy) {
    if (verdict.verdict === "AVOID") {
      emit({
        type: "execution_blocked",
        reason:
          `Safety core returned ${verdict.verdict} — execution is unreachable. ` +
          `The agent is structurally unable to swap a vetoed token.`,
      });
    } else {
      const chainLabel =
        intent.chain === "xlayer"
          ? "X Layer"
          : intent.chain.charAt(0).toUpperCase() + intent.chain.slice(1);
      emit({
        type: "execution_offered",
        verdict: verdict.verdict,
        chain: intent.chain,
        payToken: (intent.payToken || "").toUpperCase(),
      });
      const w = await walletStatus();
      if (w.demo || !w.loggedIn) {
        emit({
          type: "execution_unavailable",
          reason: w.demo
            ? "Public demo host has no logged-in OKX Agentic Wallet. The gate is shown; a real broadcast requires running locally with `onchainos wallet login`."
            : `No OKX Agentic Wallet logged in. Run \`onchainos wallet login\` to enable real ${chainLabel} execution.`,
        });
      } else {
        try {
          const q = await swapQuote({
            from: intent.payToken,
            to: intent.address,
            amount: intent.amount,
            chain: intent.chain,
          });
          emit({
            type: "swap_quote",
            toAmount: q.toAmount,
            priceImpactPct: q.priceImpactPct,
            isHoneypot: q.isHoneypot,
          });
          // Real broadcast only after the API route relays an explicit
          // user "yes" (intent.confirmed). Never auto-broadcast.
          if (q.isHoneypot) {
            emit({ type: "execution_blocked", reason: "Quote flags a honeypot on buy — blocked." });
          } else if (intent.confirmed) {
            const ex = await swapExecute({
              from: intent.payToken,
              to: intent.address,
              amount: intent.amount,
              chain: intent.chain,
              wallet: w.address,
            });
            emit({
              type: "swap_broadcast",
              txHash: ex.swapTxHash,
              note: `Broadcast on ${chainLabel} — final on-chain status pending. Verify on the ${chainLabel} explorer.`,
            });
          } else {
            emit({
              type: "awaiting_confirmation",
              text: `Verdict ${verdict.verdict}. Quoted on ${chainLabel}. Awaiting explicit user confirmation before broadcasting — the agent will not auto-execute.`,
            });
          }
        } catch (e) {
          emit({ type: "execution_error", error: humanizeExecError(e.message, chainLabel) });
        }
      }
    }
  }

  return { verdict, evidence };
}

function human(n) {
  if (n == null) return "?";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(Math.round(n));
}

// Translate raw onchainos/node errors into clear, HONEST messages.
// We never hide that it failed or why — we just make the real on-chain
// outcome readable instead of dumping a JSON-RPC stack trace.
function humanizeExecError(msg, chainLabel = "the chain") {
  const m = String(msg || "");
  if (/insufficient funds for gas|have 0 want|insufficient balance/i.test(m)) {
    return `Reached ${chainLabel} and the transaction was simulated — the chain rejected it because this wallet holds no funds for the trade + gas. No funds moved. (Fund the OKX Agentic Wallet to broadcast for real.)`;
  }
  if (/not supported on|Token not found|verify the contract address/i.test(m)) {
    return `${chainLabel} rejected the token/pair (not tradable on this chain). No funds moved.`;
  }
  if (/honeypot|81362/i.test(m)) {
    return `Broadcast halted: the chain/risk layer flagged a potential honeypot. No funds moved.`;
  }
  if (/slippage|price impact|82000|51006/i.test(m)) {
    return `Swap could not complete (liquidity / slippage / price moved). No funds moved.`;
  }
  if (/timeout|ECONN|network/i.test(m)) {
    return `Network/timeout reaching ${chainLabel}. No funds moved — safe to retry.`;
  }
  // Unknown: keep it honest but trim the raw RPC noise.
  const short = m.replace(/\s+/g, " ").slice(0, 140);
  return `Execution did not complete: ${short}${m.length > 140 ? "…" : ""} (No funds moved.)`;
}
