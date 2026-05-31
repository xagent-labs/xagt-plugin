// OKX DEX aggregator adapter — quote + swap calldata builder.
// REVIEW-ONLY: this module returns wallet-ready tx envelopes; a CI grep
// guard in tests/dex-adapter.test.ts asserts no broadcast call sites appear
// in this file. To submit a swap, an external wallet must sign and submit.

import crypto from "node:crypto";

export interface OkxDexConfig {
  baseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  projectId?: string;
  timeoutMs?: number;
  maxNotionalUsd?: number;
  maxSlippageBps?: number;
}

export interface QuoteInput {
  chainId: number | string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippageBps?: number;
}

export interface SwapInput extends QuoteInput {
  userWalletAddress: string;
  slippageBps: number;
}

export type DexMode = "live" | "degraded-no-creds" | "degraded-config" | "degraded-error";

export interface QuoteResult {
  ok: boolean;
  mode: DexMode;
  degraded: boolean;
  reason?: string;
  route?: unknown;
  estimatedToAmount?: string;
  estimatedGas?: string;
  priceImpactBps?: number;
  raw?: unknown;
}

export interface CalldataResult {
  ok: boolean;
  mode: DexMode;
  degraded: boolean;
  reason?: string;
  /** Wallet-ready transaction envelope. NEVER broadcast. */
  tx?: { to: string; data: string; value: string; gas?: string; chainId: number | string };
  /** Always false; this adapter is review-only. */
  broadcast: false;
  raw?: unknown;
}

const DEFAULT_BASE = "https://www.okx.com";
const DEFAULT_TIMEOUT = 6000;

function readCreds(config: OkxDexConfig): { apiKey: string; apiSecret: string; passphrase: string; projectId: string } | null {
  const apiKey = config.apiKey ?? process.env.OKX_DEX_API_KEY ?? "";
  const apiSecret = config.apiSecret ?? process.env.OKX_DEX_API_SECRET ?? "";
  const passphrase = config.passphrase ?? process.env.OKX_DEX_PASSPHRASE ?? "";
  const projectId = config.projectId ?? process.env.OKX_DEX_PROJECT_ID ?? "";
  if (!apiKey || !apiSecret || !passphrase || !projectId) return null;
  return { apiKey, apiSecret, passphrase, projectId };
}

function sign(secret: string, ts: string, method: string, requestPath: string, body: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${ts}${method.toUpperCase()}${requestPath}${body}`)
    .digest("base64");
}

function fixtureCalldata(input: SwapInput): CalldataResult["tx"] {
  // Deterministic, harmless calldata for review/visualization only.
  const data = `0x${crypto
    .createHash("sha256")
    .update(`${input.chainId}|${input.fromTokenAddress}|${input.toTokenAddress}|${input.amount}|${input.userWalletAddress}`)
    .digest("hex")}`;
  return {
    to: input.userWalletAddress,
    data,
    value: "0",
    gas: "210000",
    chainId: input.chainId,
  };
}

export class OkxDexAdapter {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  readonly maxNotionalUsd: number;
  readonly maxSlippageBps: number;
  private readonly creds: ReturnType<typeof readCreds>;
  readonly degradedReason?: string;

  constructor(config: OkxDexConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.OKX_DEX_API_BASE ?? DEFAULT_BASE;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT;
    this.maxNotionalUsd = config.maxNotionalUsd ?? Number(process.env.MAX_NOTIONAL_USD ?? 200);
    this.maxSlippageBps = config.maxSlippageBps ?? 100;
    this.creds = readCreds(config);
    if (!this.creds) {
      this.degradedReason = "OKX_DEX_API_KEY/SECRET/PASSPHRASE/PROJECT_ID missing — running in fixture quote/calldata mode";
    }
  }

  get isLive(): boolean {
    return this.creds !== null;
  }

  validateSlippage(slippageBps: number): { ok: true } | { ok: false; reason: string } {
    if (!Number.isFinite(slippageBps) || slippageBps <= 0) return { ok: false, reason: "slippageBps must be positive" };
    if (slippageBps > this.maxSlippageBps) {
      return { ok: false, reason: `slippageBps ${slippageBps} exceeds cap ${this.maxSlippageBps}` };
    }
    return { ok: true };
  }

  async quote(input: QuoteInput): Promise<QuoteResult> {
    if (!this.creds) {
      return {
        ok: true,
        mode: "degraded-no-creds",
        degraded: true,
        reason: this.degradedReason,
        estimatedToAmount: input.amount,
        estimatedGas: "210000",
        priceImpactBps: 0,
      };
    }
    const slippage = input.slippageBps ?? 100;
    const params = new URLSearchParams({
      chainId: String(input.chainId),
      fromTokenAddress: input.fromTokenAddress,
      toTokenAddress: input.toTokenAddress,
      amount: input.amount,
      slippage: String(slippage / 10000),
    });
    return this.signedGet<QuoteResult>("/api/v5/dex/aggregator/quote", params, (data) => ({
      ok: true,
      mode: "live",
      degraded: false,
      estimatedToAmount: extractFirstString(data, ["data", 0, "toTokenAmount"]),
      estimatedGas: extractFirstString(data, ["data", 0, "estimateGasFee"]),
      priceImpactBps: numericFromString(extractFirstString(data, ["data", 0, "priceImpactPercentage"])) * 100,
      route: extractFirstString(data, ["data", 0, "dexRouterList"]),
      raw: data,
    }));
  }

  async buildSwapCalldata(input: SwapInput): Promise<CalldataResult> {
    const v = this.validateSlippage(input.slippageBps);
    if (!v.ok) {
      return { ok: false, mode: "degraded-config", degraded: true, reason: v.reason, broadcast: false };
    }
    if (!this.creds) {
      return {
        ok: true,
        mode: "degraded-no-creds",
        degraded: true,
        reason: this.degradedReason,
        tx: fixtureCalldata(input),
        broadcast: false,
      };
    }
    const params = new URLSearchParams({
      chainId: String(input.chainId),
      fromTokenAddress: input.fromTokenAddress,
      toTokenAddress: input.toTokenAddress,
      amount: input.amount,
      slippage: String(input.slippageBps / 10000),
      userWalletAddress: input.userWalletAddress,
    });
    return this.signedGet<CalldataResult>("/api/v5/dex/aggregator/swap", params, (data) => {
      const txData = (data as { data?: Array<{ tx?: { to?: string; data?: string; value?: string; gas?: string } }> })
        .data?.[0]?.tx;
      if (!txData?.to || !txData?.data) {
        return {
          ok: false,
          mode: "degraded-error",
          degraded: true,
          reason: "okx /swap returned no tx envelope",
          broadcast: false,
          raw: data,
        };
      }
      return {
        ok: true,
        mode: "live",
        degraded: false,
        tx: {
          to: txData.to,
          data: txData.data,
          value: txData.value ?? "0",
          gas: txData.gas,
          chainId: input.chainId,
        },
        broadcast: false,
        raw: data,
      };
    });
  }

  private async signedGet<T>(
    requestPath: string,
    params: URLSearchParams,
    mapper: (data: unknown) => T,
  ): Promise<T> {
    if (!this.creds) throw new Error("signedGet requires creds — should be guarded by isLive check");
    const fullPath = `${requestPath}?${params.toString()}`;
    const ts = new Date().toISOString();
    const headers: Record<string, string> = {
      "OK-ACCESS-PROJECT": this.creds.projectId,
      "OK-ACCESS-KEY": this.creds.apiKey,
      "OK-ACCESS-PASSPHRASE": this.creds.passphrase,
      "OK-ACCESS-TIMESTAMP": ts,
      "OK-ACCESS-SIGN": sign(this.creds.apiSecret, ts, "GET", fullPath, ""),
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${fullPath}`, { headers, signal: controller.signal });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          ok: false,
          mode: "degraded-error",
          degraded: true,
          reason: `okx http ${res.status}`,
          broadcast: false,
          raw: data,
        } as unknown as T;
      }
      return mapper(data);
    } catch (err) {
      return {
        ok: false,
        mode: "degraded-error",
        degraded: true,
        reason: `okx dex call failed: ${(err as Error).message}`,
        broadcast: false,
      } as unknown as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

function extractFirstString(obj: unknown, pathKeys: Array<string | number>): string | undefined {
  let cur: unknown = obj;
  for (const k of pathKeys) {
    if (cur && typeof cur === "object") {
      cur = (cur as Record<string | number, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

function numericFromString(s: string | undefined): number {
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
