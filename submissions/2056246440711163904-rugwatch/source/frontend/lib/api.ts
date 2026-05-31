import type { StatusResponse, TokenStatus, WalletBalance, WalletStatus } from "./types";

const BASE = "/api";

// ── Session token management ───────────────────────────────────────────────

const SESSION_KEY = "rugwatch_session";

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEY);
}

export function setSessionToken(token: string): void {
  sessionStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Public endpoints (no auth) ─────────────────────────────────────────────

export async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch(`${BASE}/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function fetchWalletStatus(): Promise<WalletStatus & { session_token?: string }> {
  const res = await fetch(`${BASE}/wallet/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  // Auto-restore session if backend issued one (e.g. wallet already logged in on CLI)
  if (data.session_token && !getSessionToken()) {
    setSessionToken(data.session_token);
  }
  return data;
}

export async function walletLogin(email: string): Promise<{ ok: boolean; email: string; message?: string }> {
  const res = await fetch(`${BASE}/wallet/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, locale: "en-US" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? data.error ?? "login failed");
  return data;
}

export async function walletVerify(code: string): Promise<WalletStatus & { balance?: WalletBalance; session_token?: string }> {
  const res = await fetch(`${BASE}/wallet/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? data.error ?? "verification failed");
  // Store session token from backend
  if (data.session_token) {
    setSessionToken(data.session_token);
  }
  return data;
}

// ── Authenticated endpoints ────────────────────────────────────────────────

export async function walletLogout(): Promise<void> {
  const res = await fetch(`${BASE}/wallet/logout`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  clearSessionToken();
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "logout failed");
  }
}

export async function fetchWalletBalance(chain?: string): Promise<WalletBalance> {
  const q = chain ? `?chain=${encodeURIComponent(chain)}` : "";
  const res = await fetch(`${BASE}/wallet/balance${q}`, {
    cache: "no-store",
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? `status ${res.status}`);
  }
  return res.json();
}

export async function walletBuy(params: {
  token_address: string;
  chain?: string;
  amount_usdc?: string;
}): Promise<{ ok: boolean; swap_tx_hash: string; error?: string }> {
  const res = await fetch(`${BASE}/wallet/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? data.error ?? "buy failed");
  return data;
}

export async function addToken(params: {
  address: string;
  chain?: string;
  wallet_address?: string;
  exit_threshold?: number;
  warn_threshold?: number;
}): Promise<TokenStatus> {
  const res = await fetch(`${BASE}/watch`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `status ${res.status}`);
  }
  return res.json();
}

export async function removeToken(address: string): Promise<void> {
  const res = await fetch(`${BASE}/watch/${address}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
}

export async function simulateRug(params: {
  address: string;
  dev_wallet?: number;
  smart_money?: number;
  holder_concentration?: number;
  liquidity_withdrawal?: number;
  trade_flow_toxicity?: number;
  trigger_exit?: boolean;
}): Promise<{ rug_score: number; event: string }> {
  const res = await fetch(`${BASE}/simulate-rug`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}
