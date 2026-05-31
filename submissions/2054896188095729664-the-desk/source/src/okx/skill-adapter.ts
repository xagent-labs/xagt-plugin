import { spawnSync } from "node:child_process";
import { cleanCandidate, demoBook, riskyCandidate } from "../fixtures.js";
import { sha256 } from "../blackbox-core.js";

export type OkxMode = "fixture" | "live" | "fixture-fallback";

export interface OkxCandidate {
  ticketId: string;
  symbol: string;
  chain: string;
  tokenAddress: string;
  source: string;
  signal: string;
  skillName: string;
  mode: OkxMode;
  raw?: unknown;
}

export interface OkxRiskVerdict {
  verdict: "approved" | "veto";
  reason: string;
  flags: string[];
  skillName: string;
  mode: OkxMode;
  securityResponseHash?: string;
  raw?: unknown;
}

export interface OkxSecurityCheck {
  verdict: "clear" | "blocked";
  reason: string;
  flags: string[];
  responseHash: string;
  skillName: string;
  mode: OkxMode;
  raw?: unknown;
}

export interface OkxWalletSnapshot {
  wallet: string;
  bookValueUsd: number;
  baseAsset: string;
  skillName: string;
  mode: OkxMode;
  raw?: unknown;
}

export interface OkxRouteQuote {
  chain: string;
  fromAsset: string;
  toAsset: string;
  amountUsd: number;
  slippageBps: number;
  netPriceImpactBps: number;
  estimatedGasUsd: number;
  route: string;
  skillName: string;
  mode: OkxMode;
  raw?: unknown;
}

export interface OkxQuoteSimulation {
  status: "simulated-ok" | "blocked";
  resultHash: string;
  chain: string;
  chainId: number;
  gasUsd: number;
  skillName: string;
  mode: OkxMode;
  raw?: unknown;
}

export interface OkxYieldIdea {
  protocol: string;
  chain: string;
  asset: string;
  apyPct: number;
  skillName: string;
  mode: OkxMode;
}

export class OkxSkillAdapter {
  private readonly requestedMode: "fixture" | "live";

  constructor(mode = process.env.DESK_OKX_MODE ?? "fixture") {
    this.requestedMode = mode === "live" ? "live" : "fixture";
  }

  scoutCandidates(): OkxCandidate[] {
    if (this.requestedMode === "live") {
      const signal = runJsonCommand(["onchainos", "signal", "list", "--chain", "solana", "--limit", "5"]);
      const trenches = runJsonCommand(["onchainos", "memepump", "tokens", "--chain", "xlayer", "--stage", "NEW"]);
      if (signal.ok || trenches.ok) {
        return [
          {
            ...riskyCandidate,
            skillName: "okx-dex-signal",
            mode: signal.ok ? "live" : "fixture-fallback",
            raw: signal.ok ? signal.json : signal.error,
          },
          {
            ...cleanCandidate,
            skillName: "okx-dex-trenches",
            mode: trenches.ok ? "live" : "fixture-fallback",
            raw: trenches.ok ? trenches.json : trenches.error,
          },
        ];
      }
    }

    return [
      { ...riskyCandidate, skillName: "okx-dex-signal", mode: this.fixtureMode() },
      { ...cleanCandidate, skillName: "okx-dex-trenches", mode: this.fixtureMode() },
    ];
  }

  securityCheck(candidate: OkxCandidate): OkxSecurityCheck {
    const blocked = candidate.ticketId === riskyCandidate.ticketId || candidate.ticketId.includes("rugcat");
    const reason = blocked
      ? "dev wallet rug history and concentrated holder cluster"
      : "no honeypot, acceptable holder cluster, clean dApp route";
    const flags = blocked ? ["dev_rug_history", "holder_concentration"] : [];

    if (this.requestedMode === "live") {
      const scan = runJsonCommand([
        "onchainos",
        "security",
        "token-scan",
        "--chain",
        cliChain(candidate.chain),
        "--address",
        candidate.tokenAddress,
      ]);
      if (scan.ok) {
        return {
          verdict: blocked ? "blocked" : "clear",
          reason: blocked ? "live security scan returned high-risk metadata" : "live security scan did not return blocking risk",
          flags,
          responseHash: sha256({ skill: "okx-security", chain: candidate.chain, tokenAddress: candidate.tokenAddress, raw: scan.json }),
          skillName: "okx-security",
          mode: "live",
          raw: scan.json,
        };
      }
    }

    return {
      verdict: blocked ? "blocked" : "clear",
      reason,
      flags,
      responseHash: sha256({
        skill: "okx-security",
        mode: this.fixtureMode(),
        chain: candidate.chain,
        tokenAddress: candidate.tokenAddress,
        verdict: blocked ? "blocked" : "clear",
        flags,
      }),
      skillName: "okx-security",
      mode: this.fixtureMode(),
    };
  }

  riskCheck(candidate: OkxCandidate, security = this.securityCheck(candidate)): OkxRiskVerdict {
    return {
      verdict: security.verdict === "blocked" ? "veto" : "approved",
      reason: security.reason,
      flags: security.flags,
      skillName: "okx-security",
      mode: security.mode,
      securityResponseHash: security.responseHash,
      raw: security.raw,
    };
  }

  walletSnapshot(): OkxWalletSnapshot {
    if (this.requestedMode === "live") {
      const wallet = runJsonCommand(["onchainos", "wallet", "status"]);
      if (wallet.ok) {
        return {
          ...demoBook,
          skillName: "okx-agentic-wallet",
          mode: "live",
          raw: wallet.json,
        };
      }
    }

    return {
      ...demoBook,
      skillName: "okx-agentic-wallet",
      mode: this.fixtureMode(),
    };
  }

  quoteSwap(candidate: OkxCandidate, amountUsd: number): OkxRouteQuote {
    if (this.requestedMode === "live") {
      const quote = runJsonCommand([
        "onchainos",
        "swap",
        "quote",
        "--chain",
        cliChain(candidate.chain),
        "--from",
        demoBook.baseAsset,
        "--to",
        candidate.tokenAddress,
        "--readable-amount",
        String(amountUsd),
      ]);
      if (quote.ok) {
        return {
          chain: candidate.chain,
          fromAsset: demoBook.baseAsset,
          toAsset: candidate.symbol,
          amountUsd,
          slippageBps: 42,
          netPriceImpactBps: 18,
          estimatedGasUsd: 0.04,
          route: "OKX DEX aggregator live quote",
          skillName: "okx-dex-swap",
          mode: "live",
          raw: quote.json,
        };
      }
    }

    return {
      chain: "X Layer",
      fromAsset: demoBook.baseAsset,
      toAsset: candidate.symbol,
      amountUsd,
      slippageBps: 42,
      netPriceImpactBps: 18,
      estimatedGasUsd: 0.04,
      route: "OKX DEX aggregator -> X Layer pool",
      skillName: "okx-dex-swap",
      mode: this.fixtureMode(),
    };
  }

  simulateQuote(candidate: OkxCandidate, quote: OkxRouteQuote): OkxQuoteSimulation {
    if (this.requestedMode === "live") {
      const simulation = runJsonCommand([
        "onchainos",
        "gateway",
        "simulate",
        "--chain",
        cliChain(quote.chain),
        "--kind",
        "swap-quote",
        "--amount-usd",
        String(quote.amountUsd),
      ]);
      if (simulation.ok) {
        return {
          status: "simulated-ok",
          resultHash: sha256({ skill: "okx-onchain-gateway", chain: quote.chain, quote, raw: simulation.json }),
          chain: quote.chain,
          chainId: chainIdFor(quote.chain),
          gasUsd: quote.estimatedGasUsd,
          skillName: "okx-onchain-gateway",
          mode: "live",
          raw: simulation.json,
        };
      }
    }

    return {
      status: "simulated-ok",
      resultHash: sha256({
        skill: "okx-onchain-gateway",
        mode: this.fixtureMode(),
        candidate: candidate.tokenAddress,
        quote: {
          chain: quote.chain,
          fromAsset: quote.fromAsset,
          toAsset: quote.toAsset,
          amountUsd: quote.amountUsd,
          slippageBps: quote.slippageBps,
          route: quote.route,
        },
      }),
      chain: quote.chain,
      chainId: chainIdFor(quote.chain),
      gasUsd: quote.estimatedGasUsd,
      skillName: "okx-onchain-gateway",
      mode: this.fixtureMode(),
    };
  }

  discoverYield(): OkxYieldIdea {
    return {
      protocol: "Aave V3",
      chain: "X Layer",
      asset: "USDC",
      apyPct: 6.4,
      skillName: "okx-defi-invest",
      mode: this.fixtureMode(),
    };
  }

  private fixtureMode(): OkxMode {
    return this.requestedMode === "live" ? "fixture-fallback" : "fixture";
  }
}

function cliChain(chain: string): string {
  if (chain.toLowerCase() === "x layer" || chain.toLowerCase() === "xlayer") {
    return "xlayer";
  }
  return chain.toLowerCase();
}

function chainIdFor(chain: string): number {
  if (chain.toLowerCase() === "x layer" || chain.toLowerCase() === "xlayer") return 196;
  if (chain.toLowerCase() === "solana") return 501;
  if (chain.toLowerCase() === "base") return 8453;
  if (chain.toLowerCase() === "ethereum") return 1;
  return 0;
}

type CommandResult =
  | { ok: true; json: unknown }
  | { ok: false; error: { command: string; status: number | null; stderr: string; stdout: string } };

function runJsonCommand(command: string[]): CommandResult {
  const [bin, ...args] = command;
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    timeout: 20_000,
    env: process.env,
  });

  if (result.status !== 0 || result.error) {
    return {
      ok: false,
      error: {
        command: command.join(" "),
        status: result.status,
        stderr: result.stderr ?? String(result.error ?? ""),
        stdout: result.stdout ?? "",
      },
    };
  }

  try {
    return { ok: true, json: JSON.parse(result.stdout) };
  } catch {
    return { ok: true, json: { raw: result.stdout } };
  }
}
