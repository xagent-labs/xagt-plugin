export interface Signals {
  dev_wallet: number;
  smart_money: number;
  holder_concentration: number;
  liquidity_withdrawal: number;
  trade_flow_toxicity: number;
  ts: number;
}

export interface ScorePoint {
  score: number;
  ts: number;
}

export interface RugEvent {
  type:
    | "WARNING"
    | "EXIT"
    | "EXIT_BLOCKED"
    | "EXIT_FAILED"
    | "EXIT_DRY_RUN"
    | "SIMULATE"
    | "SIMULATE_WARN"
    | "SIMULATE_EXIT"
    | "BUY";
  token: string;
  symbol: string;
  score: number;
  ts: number;
  message: string;
  tx_hash: string;
}

export interface TokenStatus {
  address: string;
  chain: string;
  symbol: string;
  name: string;
  rug_score: number;
  signals: Signals;
  score_history: ScorePoint[];
  events: RugEvent[];
  exited: boolean;
  active: boolean;
  exit_threshold: number;
  warn_threshold: number;
  dev_wallet_address: string | null;
  added_at: number;
}

export interface WalletStatus {
  ok: boolean;
  logged_in: boolean;
  email: string;
  account_name: string;
  evm_address: string;
  login_type: string;
  is_new: boolean;
  error?: string;
  session_token?: string;
}

export interface WalletBalance {
  ok: boolean;
  total_usd: string;
  assets: Array<{
    tokenSymbol?: string;
    symbol?: string;
    balance?: string;
    tokenUsdValue?: string;
    usdValue?: string;
    tokenContractAddress?: string;
  }>;
  error?: string;
}

export interface StatusResponse {
  tokens: Record<string, TokenStatus>;
  global_events: RugEvent[];
  wallet?: WalletStatus;
}

export type ScoreLevel = "safe" | "warn" | "danger";

export function scoreLevel(score: number, warnAt = 0.65, exitAt = 0.80): ScoreLevel {
  if (score >= exitAt) return "danger";
  if (score >= warnAt) return "warn";
  return "safe";
}

export const SIGNAL_META: Record<
  keyof Omit<Signals, "ts">,
  { label: string; weight: number; description: string }
> = {
  dev_wallet: {
    label: "Dev wallet",
    weight: 0.30,
    description: "Token deployer or team wallet selling",
  },
  smart_money: {
    label: "Smart money exit",
    weight: 0.25,
    description: "KOL / whale wallets exiting the position",
  },
  holder_concentration: {
    label: "Holder concentration",
    weight: 0.20,
    description: "Top-holder % spike vs baseline",
  },
  liquidity_withdrawal: {
    label: "Liquidity withdrawal",
    weight: 0.15,
    description: "Pool depth drop vs baseline",
  },
  trade_flow_toxicity: {
    label: "Trade flow toxicity",
    weight: 0.10,
    description: "Sustained sell-pressure in recent trades",
  },
};
