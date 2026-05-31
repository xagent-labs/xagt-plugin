"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ExternalLink, Wallet, ChevronRight, AlertCircle, Loader2, ArrowRightLeft, Plus, TrendingUp, ArrowUpRight, Clock, Copy, Check, ChevronDown } from "lucide-react";
import { TokenIcon } from "./icons/TokenIcons";

interface TxRecord {
  id: string;
  fromSymbol: string;
  toSymbol: string;
  amountUsd: number;
  expectedOutputUsd: number;
  gasFeeUsd: number;
  txHash: string;
  explorerUrl: string | null;
  chain: string;
  confirmedAt: string;
}

interface Props {
  isAuthenticated: boolean;
  hasWallet: boolean;
  walletAddress?: string | null;
  chainName: string;
  executionMode: string;
  onConnectWallet: () => void;
  onSignIn: () => void;
  getAccessToken?: () => Promise<string | null>;
}

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  usdValue: string;
  price: number;
  change24h: number;
  contractAddress: string;
  logoUrl: string;
}

export function PortfolioPanel({
  isAuthenticated,
  hasWallet,
  walletAddress,
  chainName,
  executionMode,
  onConnectWallet,
  onSignIn,
  getAccessToken,
}: Props) {
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalUsd, setTotalUsd] = useState("0.00");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [persistedTxs, setPersistedTxs] = useState<TxRecord[]>([]);
  const [chartRange, setChartRange] = useState<string>("7D");
  const [copied, setCopied] = useState(false);
  const [currency, setCurrency] = useState<string>("USD");
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const currencyRates: Record<string, { symbol: string; rate: number }> = {
    USD: { symbol: "$", rate: 1 },
    EUR: { symbol: "€", rate: 0.92 },
    GBP: { symbol: "£", rate: 0.79 },
    IDR: { symbol: "Rp", rate: 16450 },
    JPY: { symbol: "¥", rate: 155.2 },
  };
  const cur = currencyRates[currency] ?? currencyRates.USD;

  const fmtCur = (usd: number) => {
    const val = usd * cur.rate;
    if (currency === "IDR") return `${cur.symbol}${val >= 1_000_000 ? (val / 1_000_000).toFixed(1) + "M" : val >= 1_000 ? (val / 1_000).toFixed(0) + "K" : val.toFixed(0)}`;
    if (currency === "JPY") return `${cur.symbol}${val >= 1_000_000 ? (val / 1_000_000).toFixed(1) + "M" : val >= 1_000 ? (val / 1_000).toFixed(0) + "K" : val.toFixed(0)}`;
    return `${cur.symbol}${val.toFixed(2)}`;
  };

  const handleCopyAddress = useCallback(() => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [walletAddress]);

  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (getAccessToken) {
        const token = await getAccessToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(
        `/api/portfolio?address=${encodeURIComponent(walletAddress)}&chain=${encodeURIComponent(chainName)}`,
        { headers }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch portfolio (${res.status})`);
      }
      const data = await res.json();
      setTokens(data.tokens ?? []);
      setTotalUsd(data.totalUsd ?? "0.00");
      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
      // Keep existing tokens on error
    } finally {
      setLoading(false);
    }
  }, [walletAddress, chainName, getAccessToken]);

  useEffect(() => {
    if (!isAuthenticated || !hasWallet || !walletAddress) return;
    const timer = setTimeout(() => {
      fetchBalances();
    }, 0);
    return () => clearTimeout(timer);
  }, [isAuthenticated, hasWallet, walletAddress, fetchBalances]);

  // Fetch persisted tx history for cross-session persistence
  useEffect(() => {
    if (!walletAddress) return;
    const timer = setTimeout(() => {
      fetch(`/api/tx-history?wallet=${walletAddress}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data.txs)) {
            setPersistedTxs(data.txs as TxRecord[]);
          }
        })
        .catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [walletAddress]);

  /* ═══ UNAUTHENTICATED STATE ═══ */
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "oklch(0.62 0.19 260 / 0.1)", border: "1px solid oklch(0.62 0.19 260 / 0.15)" }}
          >
            <Wallet className="w-5 h-5" style={{ color: "oklch(0.7 0.19 260)" }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--app-text-primary)" }}>Portfolio</h2>
          <p className="text-sm mb-6" style={{ color: "var(--app-text-secondary)" }}>
            Connect your wallet to view your on-chain assets and token balances.
          </p>
          <button type="button" onClick={onSignIn} className="btn-capsule-white text-sm px-6 py-2.5">
            <Wallet className="w-4 h-4" />
            Sign in
          </button>
        </div>
      </div>
    );
  }

  /* ═══ NO WALLET ═══ */
  if (!hasWallet) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--app-text-primary)" }}>Wallet Required</h2>
          <p className="text-sm mb-6" style={{ color: "var(--app-text-secondary)" }}>Connect a wallet to see your portfolio on {chainName}.</p>
          <button type="button" onClick={onConnectWallet} className="btn-capsule-white text-sm px-6 py-2.5">
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  const formatChange = (pct: number) => {
    if (pct === 0) return { text: "0.00%", color: "var(--app-text-tertiary)" };
    if (pct > 0) return { text: `+${pct.toFixed(2)}%`, color: "var(--app-success)" };
    return { text: `${pct.toFixed(2)}%`, color: "var(--app-danger)" };
  };

  const totalNum = parseFloat(totalUsd);
  const totalConverted = totalNum * cur.rate;
  const formattedTotal = totalConverted >= 1_000_000
    ? `${cur.symbol}${(totalConverted / 1_000_000).toFixed(2)}M`
    : totalConverted >= 1_000
      ? `${cur.symbol}${(totalConverted / 1_000).toFixed(1)}K`
      : `${cur.symbol}${totalConverted.toFixed(2)}`;

  return (
    <div className="flex-1 overflow-y-auto scroll-contain">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">Portfolio</h1>
            <p className="text-[13px] sm:text-sm mt-1 text-muted-foreground">
              {chainName} · {executionMode}
              {lastFetched && (
                <span className="text-muted-foreground/70"> · Updated {lastFetched.toLocaleTimeString()}</span>
              )}
            </p>
          </div>
          <button
            onClick={fetchBalances}
            disabled={loading}
            className="p-2.5 sm:p-3 rounded-xl transition-all duration-200 border border-border bg-card hover:bg-muted"
            title="Refresh balances"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Total Value Card */}
        <div className="rounded-2xl p-5 sm:p-6 lg:p-8 mb-6 sm:mb-8 relative overflow-hidden bg-muted/30 border border-border">
          <p className="text-[10px] sm:text-[11px] lg:text-xs font-semibold uppercase tracking-[0.15em] mb-2 text-primary">
            Total Value
          </p>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight relative z-10 tabular-nums text-foreground">
            {loading && tokens.length === 0 ? (
              <span className="inline-flex items-center gap-3">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary" />
                <span className="text-lg sm:text-xl text-muted-foreground">Loading…</span>
              </span>
            ) : formattedTotal}
          </p>
          <button
            type="button"
            onClick={handleCopyAddress}
            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-mono relative z-10 transition-all duration-200 hover:scale-[1.02] cursor-pointer group bg-muted border border-border text-muted-foreground"
            title="Click to copy address"
          >
            {walletAddress?.slice(0, 6)}…{walletAddress?.slice(-4)}
            {copied ? (
              <Check className="w-3 h-3 text-[var(--app-success)]" />
            ) : (
              <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        </div>

        {/* Portfolio Chart Section */}
        <div className="rounded-2xl mb-6 sm:mb-8 overflow-hidden bg-card border border-border">
          <div className="px-4 sm:px-5 py-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Performance</span>
            </div>
            <div className="flex gap-1 p-0.5 rounded-lg bg-muted">
              {["1D", "7D", "1M", "3M", "1Y"].map(r => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all duration-150 ${
                    chartRange === r ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground border border-transparent"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 sm:px-5 py-6 sm:py-8 flex flex-col items-center justify-center min-h-[140px] text-muted-foreground">
            {/* Empty State */}
            <p className="text-[11px] mt-3 font-medium">Chart data belum tersedia.</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={fetchBalances} className="text-xs font-semibold underline">Retry</button>
          </div>
        )}

        {/* Token List Header */}
        {tokens.length > 0 && (
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Assets ({tokens.length})
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCurrencyOpen(!currencyOpen)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] transition-all duration-150 text-primary bg-primary/10 border border-primary/20"
              >
                {currency}
                <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${currencyOpen ? "rotate-180" : ""}`} />
              </button>
              {currencyOpen && (
                <div className="absolute right-0 top-full mt-1 rounded-lg py-1 z-50 min-w-[80px] shadow-lg bg-card border border-border">
                  {Object.keys(currencyRates).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setCurrency(c); setCurrencyOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-[11px] font-bold transition-colors hover:bg-muted ${
                        c === currency ? "text-primary bg-primary/10" : "text-muted-foreground"
                      }`}
                    >
                      {currencyRates[c].symbol} {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Token List */}
        <div className="space-y-1.5 stagger-children">
          {tokens.map((token) => {
            const change = formatChange(token.change24h);
            const isExpanded = expanded === token.symbol;

            return (
              <div key={`${token.symbol}-${token.contractAddress}`}>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : token.symbol)}
                  className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl transition-all duration-200 text-left bg-card border border-border hover:bg-muted"
                >
                  {/* Token icon */}
                  <div className="shrink-0">
                    <TokenIcon symbol={token.symbol} size={40} />
                  </div>

                  {/* Token info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-bold text-foreground">{token.symbol}</span>
                      <span className="text-[10px] sm:text-xs hidden sm:inline text-muted-foreground">{token.name}</span>
                    </div>
                    <span className="text-xs sm:text-sm block mt-0.5 font-mono text-muted-foreground">
                      {token.balance}
                    </span>
                  </div>

                  {/* Value & change */}
                  <div className="text-right shrink-0">
                    <p className="text-sm sm:text-base font-bold text-foreground">{fmtCur(parseFloat(token.usdValue))}</p>
                    <p className="text-[10px] sm:text-xs font-semibold" style={{ color: change.color }}>{change.text}</p>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 text-muted-foreground ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="ml-14 sm:ml-16 mr-4 mb-2 px-4 sm:px-5 py-3 sm:py-4 rounded-xl view-enter bg-muted/30 border border-border">
                    <div className="space-y-2.5 text-xs sm:text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Chain</span>
                        <span className="font-medium text-foreground">{chainName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Holdings</span>
                        <span className="font-mono font-medium text-foreground">{token.balance} {token.symbol}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Unit Price</span>
                        <span className="font-medium text-foreground">${token.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{currency} Value</span>
                        <span className="font-bold text-foreground">{fmtCur(parseFloat(token.usdValue))}</span>
                      </div>
                      {token.contractAddress && token.contractAddress !== "native" && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Contract</span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {token.contractAddress.slice(0, 6)}…{token.contractAddress.slice(-4)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <a
                        href={`https://www.okx.com/web3/explorer/xlayer/address/${walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-opacity hover:opacity-80 text-primary"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View on Explorer
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Loading skeleton */}
        {loading && tokens.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 sm:h-20 rounded-xl animate-pulse bg-card" />
            ))}
          </div>
        )}

        {tokens.length === 0 && !loading && !error && (
          <div className="text-center py-12 sm:py-16">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-primary/10 border border-primary/20">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <p className="text-base font-bold mb-1 text-foreground">Data belum tersedia.</p>
            <p className="text-sm mb-6 text-muted-foreground">Deposit tokens to {chainName} to see your portfolio</p>
            <a
              href="https://www.okx.com/web3/bridge"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-[1.02] bg-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4" />
              Bridge tokens to X Layer
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* ═══ Transaction History ═══ */}
        <div className="mt-8 sm:mt-10">
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                PhylaX Trades {persistedTxs.length > 0 ? `(${persistedTxs.length})` : ""}
              </span>
            </div>
          </div>
          {persistedTxs.length > 0 ? (
            <div className="space-y-1.5">
              {persistedTxs.slice(0, 10).map((tx) => (
                <div
                  key={tx.txHash ?? tx.id}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-card border border-border"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20">
                    <ArrowRightLeft className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-foreground">
                      {tx.fromSymbol} → {tx.toSymbol}
                    </span>
                    <span className="text-[10px] sm:text-xs block mt-0.5 text-muted-foreground">
                      {tx.confirmedAt ? new Date(tx.confirmedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      ${(tx.amountUsd ?? 0).toFixed(2)}
                    </p>
                  </div>
                  {(tx.explorerUrl || tx.txHash) && (
                    <a
                      href={tx.explorerUrl || `https://www.okx.com/web3/explorer/xlayer/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1 rounded-lg transition-opacity hover:opacity-70 text-primary"
                      title="View on explorer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl px-5 py-8 text-center bg-card border border-border">
              <ArrowRightLeft className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Data belum tersedia.</p>
              <p className="text-xs mt-1 text-muted-foreground">Swaps executed via PhylaX Agent will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
