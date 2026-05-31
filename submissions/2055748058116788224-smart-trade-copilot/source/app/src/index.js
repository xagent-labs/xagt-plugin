#!/usr/bin/env node
// Smart Trade Copilot — entrypoint.
//
//   smart-trade-copilot analyze <token> --chain <chain> [--buy <amount> --pay <token>]
//   smart-trade-copilot analyze PEPE --chain ethereum
//   smart-trade-copilot analyze 0xabc... --chain base --buy 0.05 --pay eth
//   smart-trade-copilot --demo analyze BONK --chain solana   (offline sample data)

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { run, data, version, binaryPath, OnchainosError } from "./onchainos.js";
import { runPipeline, STAGES } from "./pipeline.js";
import { computeVerdict } from "./verdict.js";
import { walletStatus, getQuote, executeSwap, shouldEnableMev } from "./swap.js";
import * as ui from "./ui.js";
import { DEMO_RESULT } from "./demo-data.js";

const CHAINS = {
  ethereum: { id: "1", aliases: ["eth"] },
  solana: { id: "501", aliases: ["sol"] },
  base: { id: "8453", aliases: [] },
  bsc: { id: "56", aliases: ["bnb"] },
  polygon: { id: "137", aliases: ["matic", "pol"] },
  arbitrum: { id: "42161", aliases: ["arb"] },
  optimism: { id: "10", aliases: ["op"] },
  avalanche: { id: "43114", aliases: ["avax"] },
  xlayer: { id: "196", aliases: [] },
};
function resolveChain(input) {
  if (!input) return null;
  const k = input.toLowerCase();
  if (CHAINS[k]) return { name: k, id: CHAINS[k].id };
  for (const [name, v] of Object.entries(CHAINS)) {
    if (v.aliases.includes(k)) return { name, id: v.id };
  }
  return null;
}

function parseArgs(argv) {
  const a = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) {
      const key = t.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        a.flags[key] = next;
        i++;
      } else {
        a.flags[key] = true;
      }
    } else {
      a._.push(t);
    }
  }
  return a;
}

async function ask(q) {
  const rl = createInterface({ input: stdin, output: stdout });
  const ans = (await rl.question("   " + q + " ")).trim();
  rl.close();
  return ans;
}

function looksLikeAddress(s) {
  return /^0x[a-fA-F0-9]{40}$/.test(s) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

async function loadDotEnv() {
  const p = join(process.cwd(), ".env");
  if (!existsSync(p)) return;
  try {
    const txt = await readFile(p, "utf8");
    for (const ln of txt.split(/\r?\n/)) {
      const m = ln.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
}

function helpText() {
  return `
  Smart Trade Copilot — AI buy/avoid copilot powered by OKX onchainOS

  USAGE
    smart-trade-copilot analyze <token> --chain <chain> [options]

  ARGUMENTS
    <token>            Symbol (PEPE) or contract address (0x… / Solana base58)

  OPTIONS
    --chain <name>     ethereum | solana | base | bsc | polygon | arbitrum | …
    --buy <amount>     Amount to buy (enables the gated execution flow)
    --pay <token>      Token to pay with (e.g. eth, usdc) — required with --buy
    --slippage <pct>   Override auto-slippage (only if you mean it)
    --meme             Treat as a launchpad/meme token (adds bundler scan)
    --demo             Run with offline sample data (no API key needed)
    --help             Show this help

  EXAMPLES
    smart-trade-copilot analyze PEPE --chain ethereum
    smart-trade-copilot analyze 0xabc… --chain base --buy 0.05 --pay eth
    smart-trade-copilot --demo analyze BONK --chain solana
`;
}

async function main() {
  await loadDotEnv();
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];

  // Explicit help (--help / `help`) is success; bare invocation with no
  // args at all is a usage error.
  if (args.flags.help || cmd === "help") {
    console.log(helpText());
    process.exit(0);
  }
  if (!cmd) {
    console.log(helpText());
    process.exit(1);
  }

  ui.banner();

  // ── DEMO MODE: deterministic sample run, no network ──────────────
  if (args.flags.demo) {
    ui.info(chalk("Running in --demo mode (offline sample data)\n"));
    for (const st of STAGES.filter((s) => s.id !== "resolve")) {
      const s = DEMO_RESULT.stages[st.id];
      ui.stageLine(st.label, s?.ok ? "ok" : "skip", s?.skipped);
      await sleep(140);
    }
    const verdict = computeVerdict(DEMO_RESULT.signals);
    ui.verdictCard(verdict, DEMO_RESULT.token, DEMO_RESULT.notes);
    ui.skillsUsedFooter(DEMO_RESULT.stages);
    console.log();
    return;
  }

  if (cmd !== "analyze") {
    ui.err(`Unknown command "${cmd}". Try: analyze, help`);
    process.exit(1);
  }

  // ── Preflight: engine present? ───────────────────────────────────
  const ver = await version();
  if (ver === "unknown") {
    ui.err(`onchainos not found (looked at: ${binaryPath}).`);
    ui.info("Install: https://github.com/okx/onchainos-skills  — or pass --demo");
    process.exit(1);
  }
  ui.info(`onchainos engine ${ver} @ ${binaryPath}`);

  const tokenArg = args._[1];
  if (!tokenArg) {
    ui.err("No token given. e.g. analyze PEPE --chain ethereum");
    process.exit(1);
  }
  const chain = resolveChain(args.flags.chain);
  if (!chain) {
    ui.err(`Missing/unknown --chain. One of: ${Object.keys(CHAINS).join(", ")}`);
    process.exit(1);
  }

  // ── Stage 0: resolve token ───────────────────────────────────────
  let address = tokenArg;
  let symbol = null;
  if (looksLikeAddress(tokenArg)) {
    address = tokenArg.startsWith("0x") ? tokenArg.toLowerCase() : tokenArg;
    ui.stageLine(`Token: ${address.slice(0, 12)}… on ${chain.name}`, "ok");
  } else {
    symbol = tokenArg.toUpperCase();
    try {
      const r = data(
        await run([
          "token",
          "search",
          "--query",
          tokenArg,
          "--chains",
          chain.name,
        ]),
      );
      const list = Array.isArray(r) ? r : (r?.list ?? r?.result ?? []);
      if (!list?.length) throw new OnchainosError("no results", { kind: "cli" });
      const top = list[0];
      address = (top.address || top.tokenContractAddress || "").toLowerCase();
      symbol = top.symbol || symbol;
      ui.stageLine(
        `Resolved ${symbol} → ${address.slice(0, 12)}… on ${chain.name}`,
        "ok",
      );
      if (list.length > 1) {
        ui.warn(
          `${list.length} matches for "${tokenArg}" — using top result. Pass the contract address to be exact.`,
        );
      }
    } catch (e) {
      ui.stageLine(`Token search for "${tokenArg}"`, "skip", e.message);
      ui.err(
        "Could not resolve the token (API key may be throttled). Pass a contract address, or use --demo.",
      );
      process.exit(1);
    }
  }

  // ── Run the pipeline ─────────────────────────────────────────────
  console.log();
  const labels = Object.fromEntries(STAGES.map((s) => [s.id, s.label]));
  const result = await runPipeline({
    address,
    chain: chain.name,
    chainId: chain.id,
    symbol,
    isMeme: !!args.flags.meme || chain.name === "solana",
    onStage: (id, state, detail) => {
      if (state === "ok") ui.stageLine(labels[id] || id, "ok");
      else if (state === "skip") ui.stageLine(labels[id] || id, "skip", detail);
    },
  });

  const verdict = computeVerdict(result.signals);
  ui.verdictCard(verdict, result.token, result.notes);
  ui.skillsUsedFooter(result.stages);

  // ── Gated execution ──────────────────────────────────────────────
  if (args.flags.buy) {
    console.log();
    if (verdict.verdict === "AVOID") {
      ui.err(
        "Verdict is AVOID — execution is blocked. Re-run without issues, or override deliberately.",
      );
      process.exit(2);
    }
    const payToken = args.flags.pay;
    if (!payToken) {
      ui.err("--buy requires --pay <token> (e.g. --pay eth)");
      process.exit(1);
    }

    const w = await walletStatus();
    if (!w.loggedIn) {
      ui.warn(
        "Wallet not logged in. Run `onchainos wallet login` first, then re-run with --buy.",
      );
      process.exit(1);
    }
    ui.info(`Wallet: ${w.address || "(active account)"}  ·  accounts: ${w.accountCount}`);

    ui.info(`Quoting ${args.flags.buy} ${payToken} → ${symbol || address.slice(0, 8)}…`);
    let quote;
    try {
      quote = await getQuote({
        from: payToken,
        to: address,
        amount: args.flags.buy,
        chain: chain.name,
      });
    } catch (e) {
      ui.err(`Quote failed: ${e.message}`);
      process.exit(1);
    }
    ui.ok(
      `Quote: ~${quote.toAmount ?? "?"} out · price impact ${quote.priceImpactPct ?? "?"}%` +
        (quote.isHoneypot ? "  " + "⚠ HONEYPOT FLAGGED" : ""),
    );
    if (quote.isHoneypot) {
      ui.err("Quote flags a honeypot on buy — execution blocked.");
      process.exit(2);
    }

    const confirm = await ask(
      `Execute this buy from ${w.address || "your wallet"}? Type "yes" to broadcast:`,
    );
    if (confirm.toLowerCase() !== "yes") {
      ui.info("Cancelled. No transaction sent.");
      process.exit(0);
    }

    const mev = shouldEnableMev({ chain: chain.name, notionalUsd: null });
    try {
      const res = await executeSwap({
        from: payToken,
        to: address,
        amount: args.flags.buy,
        chain: chain.name,
        wallet: w.address,
        slippage: args.flags.slippage ?? null,
        gasLevel: "average",
        mevProtection: mev,
        verdict: verdict.verdict,
        quote,
      });
      ui.ok(
        `Swap BROADCAST — final on-chain result pending. txHash: ${res.swapTxHash || "(see explorer)"}`,
      );
      ui.info("Verify final status on the chain explorer before treating it as settled.");
    } catch (e) {
      ui.err(`Execution error: ${e.message}`);
      process.exit(1);
    }
  }
  console.log();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function chalk(s) {
  return s;
} // tiny shim so ui.info(chalk(...)) reads naturally

main().catch((e) => {
  ui.err(e?.message || String(e));
  process.exit(1);
});
