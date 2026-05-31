import crypto from "node:crypto";

export interface OkxCexCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

export interface OkxCexConfig {
  baseUrl?: string;
  demo?: boolean;
  credentials?: Partial<OkxCexCredentials>;
  instrumentAllowlist?: string[];
  maxNotionalUsd?: number;
  timeoutMs?: number;
}

export interface PlaceOrderInput {
  instId: string;
  side: "buy" | "sell";
  ordType: "limit" | "post_only";
  px: number;
  sz: number;
  clOrdId: string;
  tdMode?: "cash";
  notionalUsd: number;
}

export type AdapterMode = "live" | "degraded-no-creds" | "degraded-config" | "degraded-error";

export interface PlaceOrderResult {
  ok: boolean;
  mode: AdapterMode;
  ordId?: string;
  clOrdId: string;
  state: "submitted" | "filled" | "canceled" | "failed";
  externalResponse?: unknown;
  degraded: boolean;
  reason?: string;
  simulated: boolean;
}

const DEFAULT_BASE = "https://www.okx.com";
const DEFAULT_TIMEOUT = 6000;

function readCreds(config: OkxCexConfig): OkxCexCredentials | null {
  const apiKey = config.credentials?.apiKey ?? process.env.OKX_API_KEY ?? "";
  const apiSecret =
    config.credentials?.apiSecret ?? process.env.OKX_SECRET_KEY ?? process.env.OKX_API_SECRET ?? "";
  const passphrase =
    config.credentials?.passphrase ?? process.env.OKX_API_PASSPHRASE ?? process.env.OKX_PASSPHRASE ?? "";
  if (!apiKey || !apiSecret || !passphrase) return null;
  return { apiKey, apiSecret, passphrase };
}

function isoTimestamp(): string {
  return new Date().toISOString();
}

function signRequest(secret: string, ts: string, method: string, requestPath: string, body: string): string {
  const prehash = `${ts}${method.toUpperCase()}${requestPath}${body}`;
  return crypto.createHmac("sha256", secret).update(prehash).digest("base64");
}

export class OkxCexAdapter {
  private readonly baseUrl: string;
  private readonly demo: boolean;
  private readonly creds: OkxCexCredentials | null;
  private readonly timeoutMs: number;
  readonly instrumentAllowlist: string[];
  readonly maxNotionalUsd: number;
  readonly degradedReason?: string;

  constructor(config: OkxCexConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.OKX_API_BASE ?? DEFAULT_BASE;
    this.demo = config.demo ?? process.env.OKX_DEMO === "1";
    this.creds = readCreds(config);
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT;
    this.instrumentAllowlist =
      config.instrumentAllowlist ??
      (process.env.INSTRUMENT_ALLOWLIST ?? "BTC-USDT,ETH-USDT,SOL-USDT,USDC-USDT")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    this.maxNotionalUsd = config.maxNotionalUsd ?? Number(process.env.MAX_NOTIONAL_USD ?? 200);
    if (!this.creds) this.degradedReason = "OKX_API_KEY/SECRET/PASSPHRASE missing — running in PAPER-FALLBACK mode";
  }

  get isLive(): boolean {
    return this.creds !== null;
  }

  guard(input: PlaceOrderInput): { ok: true } | { ok: false; reason: string } {
    if (this.instrumentAllowlist.length > 0 && !this.instrumentAllowlist.includes(input.instId)) {
      return { ok: false, reason: `instrument not in allowlist: ${input.instId}` };
    }
    if (input.notionalUsd > this.maxNotionalUsd) {
      return { ok: false, reason: `notional ${input.notionalUsd} exceeds cap ${this.maxNotionalUsd}` };
    }
    if (input.ordType !== "limit" && input.ordType !== "post_only") {
      return { ok: false, reason: `ordType must be limit or post_only, got ${input.ordType}` };
    }
    return { ok: true };
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const g = this.guard(input);
    if (!g.ok) {
      return {
        ok: false,
        mode: "degraded-config",
        clOrdId: input.clOrdId,
        state: "failed",
        degraded: true,
        reason: g.reason,
        simulated: this.demo,
      };
    }

    if (!this.creds) {
      // Deterministic degraded mode: simulate a paper fill at the requested price.
      return {
        ok: true,
        mode: "degraded-no-creds",
        clOrdId: input.clOrdId,
        ordId: `paper_${input.clOrdId}`,
        state: "submitted",
        degraded: true,
        reason: this.degradedReason,
        simulated: true,
      };
    }

    const path = "/api/v5/trade/order";
    const body = JSON.stringify({
      instId: input.instId,
      tdMode: input.tdMode ?? "cash",
      side: input.side,
      ordType: input.ordType,
      px: String(input.px),
      sz: String(input.sz),
      clOrdId: input.clOrdId,
    });
    const ts = isoTimestamp();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "OK-ACCESS-KEY": this.creds.apiKey,
      "OK-ACCESS-PASSPHRASE": this.creds.passphrase,
      "OK-ACCESS-TIMESTAMP": ts,
      "OK-ACCESS-SIGN": signRequest(this.creds.apiSecret, ts, "POST", path, body),
    };
    if (this.demo) headers["x-simulated-trading"] = "1";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => null)) as
        | { code?: string; msg?: string; data?: Array<{ ordId?: string; sCode?: string; sMsg?: string }> }
        | null;
      if (!res.ok || !data || data.code !== "0") {
        return {
          ok: false,
          mode: "degraded-error",
          clOrdId: input.clOrdId,
          state: "failed",
          externalResponse: data,
          degraded: true,
          reason: `okx http ${res.status} ${data?.msg ?? ""}`.trim(),
          simulated: this.demo,
        };
      }
      const ordId = data.data?.[0]?.ordId;
      return {
        ok: true,
        mode: "live",
        ordId,
        clOrdId: input.clOrdId,
        state: "submitted",
        externalResponse: data,
        degraded: false,
        simulated: this.demo,
      };
    } catch (err) {
      return {
        ok: false,
        mode: "degraded-error",
        clOrdId: input.clOrdId,
        state: "failed",
        degraded: true,
        reason: `okx call failed: ${(err as Error).message}`,
        simulated: this.demo,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async getOrderStatus(
    instId: string,
    clOrdId: string,
  ): Promise<{ state: "submitted" | "filled" | "canceled" | "failed"; raw?: unknown; degraded: boolean }> {
    if (!this.creds) {
      return { state: "filled", degraded: true };
    }
    const path = `/api/v5/trade/order?instId=${encodeURIComponent(instId)}&clOrdId=${encodeURIComponent(clOrdId)}`;
    const ts = isoTimestamp();
    const headers: Record<string, string> = {
      "OK-ACCESS-KEY": this.creds.apiKey,
      "OK-ACCESS-PASSPHRASE": this.creds.passphrase,
      "OK-ACCESS-TIMESTAMP": ts,
      "OK-ACCESS-SIGN": signRequest(this.creds.apiSecret, ts, "GET", path, ""),
    };
    if (this.demo) headers["x-simulated-trading"] = "1";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, { method: "GET", headers, signal: controller.signal });
      const data = (await res.json().catch(() => null)) as
        | { code?: string; data?: Array<{ state?: string }> }
        | null;
      if (!res.ok || !data || data.code !== "0") {
        return { state: "failed", raw: data, degraded: true };
      }
      const rawState = data.data?.[0]?.state ?? "";
      const mapped =
        rawState === "filled"
          ? "filled"
          : rawState === "canceled"
            ? "canceled"
            : rawState === "live" || rawState === "partially_filled"
              ? "submitted"
              : "failed";
      return { state: mapped, raw: data, degraded: false };
    } catch {
      return { state: "failed", degraded: true };
    } finally {
      clearTimeout(timer);
    }
  }
}
