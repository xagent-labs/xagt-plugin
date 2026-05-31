"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Eye,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import type { SimulationResult } from "../lib/schemas";
import { addTx } from "../lib/tx-store";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

type ExecutionState =
  | "idle"
  | "approving"
  | "confirming"
  | "building_tx"
  | "awaiting_signature"
  | "submitted"
  | "confirmed"
  | "failed"
  | "rejected"
  | "wrong_chain"
  | "expired";

interface PreSignSimulation {
  ok: boolean;
  reverted: boolean;
  failReason?: string;
  gasUsed?: string;
}

interface Props {
  quote: SimulationResult;
  fromSymbol: string;
  toSymbol?: string;
  approvalId?: string;
  showExecute?: boolean;
  getAccessToken?: () => Promise<string | null>;
  getIdentityToken?: () => Promise<string | null>;
  walletAddress?: string | null;
  targetWalletAddress?: string | null;
  onConnectWallet?: () => void;
  amount?: number;
  tokenAddress?: string;
  scanDecision?: string;
  chainConfig?: import("../lib/chains").ChainConfig;
  needsApproval?: boolean;
  approveTxData?: { to: string; data: string; value: string; chainId?: string; gas?: string; gasLimit?: string; gasPrice?: string; maxFeePerGas?: string; maxPriorityFeePerGas?: string; } | null;
  onConfirmed?: () => void;
  /** Phase 2: real pre-sign simulation result from /api/simulate */
  preSignSimulation?: PreSignSimulation | null;
}

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.ethereum ?? null;
}

const WALLET_ERROR_CODES: Record<number, ExecutionState> = {
  4001: "rejected",
  4100: "rejected",
  4902: "wrong_chain",
};

export function QuoteCard({
  quote,
  fromSymbol,
  toSymbol,
  approvalId,
  showExecute = false,
  getAccessToken,
  getIdentityToken,
  walletAddress,
  targetWalletAddress,
  onConnectWallet,
  amount,
  tokenAddress,
  scanDecision,
  chainConfig,
  needsApproval,
  approveTxData,
  onConfirmed,
  preSignSimulation,
}: Props) {
  const slippageOk = quote.slippage < 3;
  const [execState, setExecState] = useState<ExecutionState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [currentNeedsApproval, setCurrentNeedsApproval] = useState(!!needsApproval);

  // Expiry + countdown timer (2 minutes)
  const EXPIRY_MS = 2 * 60 * 1000;
  const [isExpired, setIsExpired] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(EXPIRY_MS / 1000));
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const startTime = Date.now();
    const expireTimer = setTimeout(() => {
      setIsExpired(true);
      setExecState("expired");
      if (countdownRef.current) clearInterval(countdownRef.current);
    }, EXPIRY_MS);

    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.floor((EXPIRY_MS - elapsed) / 1000));
      setSecondsLeft(remaining);
    }, 1000);

    return () => {
      clearTimeout(expireTimer);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const walletMismatch = targetWalletAddress && walletAddress && targetWalletAddress.toLowerCase() !== walletAddress.toLowerCase();
  const isHighRisk = scanDecision && scanDecision !== "safe";
  const liveMode = process.env.NEXT_PUBLIC_ENABLE_LIVE_EXECUTION === "true";

  // Switch wallet to X Layer before any signing attempt.
  // Tries wallet_switchEthereumChain first; if chain is unknown (4902),
  // adds it via wallet_addEthereumChain then retries.
  const ensureXLayer = async (provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }): Promise<void> => {
    const X_LAYER_CHAIN_ID = "0xc4"; // 196 in hex
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: X_LAYER_CHAIN_ID }],
      });
    } catch (switchErr: unknown) {
      const code = (switchErr as { code?: number })?.code;
      if (code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: X_LAYER_CHAIN_ID,
            chainName: "X Layer Mainnet",
            nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
            rpcUrls: ["https://rpc.xlayer.tech"],
            blockExplorerUrls: ["https://www.oklink.com/xlayer"],
          }],
        });
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: X_LAYER_CHAIN_ID }],
        });
      } else {
        throw switchErr;
      }
    }
  };

  const handleExecute = useCallback(async () => {
    if (!approvalId || !walletAddress || isExpired || isHighRisk || walletMismatch) return;
    
    if (currentNeedsApproval && approveTxData) {
      setExecState("approving");
      setExecError(null);
      const provider = getEthereumProvider();
      if (!provider) {
        setExecState("failed");
        setExecError("No wallet provider found.");
        return;
      }
      try {
        await ensureXLayer(provider);
        const txParams: Record<string, string> = { from: walletAddress, to: approveTxData.to, data: approveTxData.data };
        if (approveTxData.value) txParams.value = approveTxData.value;
        // Forward gas parameters for approval tx so the wallet doesn't need to re-estimate
        if (approveTxData.gas) txParams.gas = approveTxData.gas;
        if (approveTxData.gasLimit) txParams.gasLimit = approveTxData.gasLimit;
        if (approveTxData.gasPrice) txParams.gasPrice = approveTxData.gasPrice;
        if (approveTxData.maxFeePerGas) txParams.maxFeePerGas = approveTxData.maxFeePerGas;
        if (approveTxData.maxPriorityFeePerGas) txParams.maxPriorityFeePerGas = approveTxData.maxPriorityFeePerGas;
        console.log("[approve-debug] txParams to wallet:", JSON.stringify(txParams, null, 2));
        const hash = await provider.request({ method: "eth_sendTransaction", params: [txParams] }) as string;
        setApprovalTxHash(hash);
        setCurrentNeedsApproval(false);
        setExecState("idle");
        return;
      } catch (err: unknown) {
        setExecState("failed");
        setExecError((err as { message?: string })?.message || "User rejected approval.");
        return;
      }
    }

    setExecState("confirming");
    setExecError(null);

    try {
      let authToken = "client-token";
      let identityToken: string | null = null;
      if (getAccessToken) { try { const t = await getAccessToken(); if (t) authToken = t; } catch { /* */ } }
      if (getIdentityToken) { try { identityToken = await getIdentityToken(); } catch { /* */ } }

      setExecState("building_tx");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
        "x-wallet-address": walletAddress,
      };
      if (identityToken) headers["x-privy-identity-token"] = identityToken;

      const execRes = await fetch("/api/execute", {
        method: "POST",
        headers,
        body: JSON.stringify({
          approvalId,
          riskAcknowledged,
          approvalTxHash,
        }),
      });

      const execData = await execRes.json() as {
        executionId?: string;
        unsignedTx?: { to: string; data: string; value: string; chainId?: string; gas?: string; gasLimit?: string; gasPrice?: string; maxFeePerGas?: string; maxPriorityFeePerGas?: string; };
        error?: string; message?: string; result?: { status: string };
      };

      if (execData.result?.status === "execution_disabled") {
        setExecState("idle");
        setExecError(execData.message ?? "Live execution is disabled.");
        return;
      }

      if (!execRes.ok || !execData.unsignedTx) {
        setExecState("failed");
        setExecError(execData.error ?? "Failed to build transaction.");
        return;
      }

      setExecState("awaiting_signature");
      const provider = getEthereumProvider();
      if (!provider) {
        setExecState("failed");
        setExecError("No wallet provider found. Please install MetaMask or use Privy embedded wallet.");
        return;
      }

      try {
        await ensureXLayer(provider);
      } catch {
        setExecState("failed");
        setExecError("Please switch your wallet to X Layer to continue.");
        return;
      }

      const tx = execData.unsignedTx;
      const txParams: Record<string, string> = { from: walletAddress, to: tx.to, data: tx.data, value: tx.value };
      // Forward gas parameters from server-built tx so the wallet doesn't need to re-estimate
      if (tx.gas) txParams.gas = tx.gas;
      if (tx.gasLimit) txParams.gasLimit = tx.gasLimit;
      if (tx.gasPrice) txParams.gasPrice = tx.gasPrice;
      if (tx.maxFeePerGas) txParams.maxFeePerGas = tx.maxFeePerGas;
      if (tx.maxPriorityFeePerGas) txParams.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;

      console.log("[swap-debug] unsignedTx from server:", JSON.stringify(tx, null, 2));
      console.log("[swap-debug] txParams to wallet:", JSON.stringify(txParams, null, 2));

      let hash: string;
      try {
        hash = (await provider.request({ method: "eth_sendTransaction", params: [txParams] })) as string;
      } catch (walletError: unknown) {
        const code = (walletError as { code?: number })?.code;
        if (code && WALLET_ERROR_CODES[code]) {
          setExecState(WALLET_ERROR_CODES[code]);
          setExecError(code === 4001 ? "Transaction rejected by wallet." : code === 4902 ? "Please switch to the correct chain." : "Wallet authorization failed.");
        } else {
          setExecState("failed");
          setExecError(`Wallet error: ${walletError instanceof Error ? walletError.message : String(walletError)}`);
        }
        return;
      }

      setTxHash(hash);
      setExecState("submitted");

      try {
        const confirmRes = await fetch("/api/confirm", { method: "POST", headers, body: JSON.stringify({ executionId: execData.executionId, txHash: hash, chainId: tx.chainId }) });
        const confirmData = await confirmRes.json() as { status?: string; explorerUrl?: string };
        if (confirmData.explorerUrl) setExplorerUrl(confirmData.explorerUrl);
        if (confirmData.status === "confirmed") {
          setExecState("confirmed");
          const confirmedAt = new Date().toISOString();
          const txRecord = {
            id: hash,
            fromSymbol: fromSymbol ?? "?",
            toSymbol: toSymbol ?? "?",
            amountUsd: amount ?? 0,
            expectedOutputUsd: quote.expectedOutputUsd,
            gasFeeUsd: quote.gasFeeUsd,
            txHash: hash,
            explorerUrl: confirmData.explorerUrl ?? null,
            chain: chainConfig?.name ?? "X Layer",
            confirmedAt,
          };
          addTx(txRecord);
          // Persist to DB — fire and forget, non-blocking
          fetch("/api/tx-history", {
            method: "POST",
            headers,
            body: JSON.stringify(txRecord),
          }).catch(() => {/* non-fatal */});
          onConfirmed?.();
        }
        else if (confirmData.status === "reverted" || confirmData.status === "failed") { setExecState("failed"); setExecError("Transaction reverted on-chain."); }
      } catch { /* tx submitted, user checks explorer */ }
    } catch (err) {
      setExecState("failed");
      setExecError(`Execution error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [approvalId, walletAddress, getAccessToken, getIdentityToken, quote, riskAcknowledged, isExpired, isHighRisk, walletMismatch, currentNeedsApproval, approveTxData, approvalTxHash]);

  return (
    <Card className="overflow-hidden">
      {/* ── SUCCESS STATE: replace entire card ── */}
      {execState === "confirmed" && (
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-[var(--app-success)]">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-bold">Transaction confirmed</span>
          </div>
          <div className="rounded-xl px-4 py-3 text-xs space-y-1 bg-[var(--app-success)]/10 border border-[var(--app-success)]/20 text-[var(--app-success)]">
            <p><span className="font-semibold">{fromSymbol} → {toSymbol ?? "Target"}</span></p>
            <p>Output: ~${quote.expectedOutputUsd.toFixed(2)}</p>
            <p className="font-mono text-[10px] break-all">{txHash}</p>
          </div>
          <div className="flex gap-2">
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors bg-[var(--app-success)]/10 text-[var(--app-success)] border border-[var(--app-success)]/20 hover:bg-[var(--app-success)]/20"
              >
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Check History in Portfolio for details.</p>
        </CardContent>
      )}

      {/* ── NORMAL CARD STATE ── */}
      {execState !== "confirmed" && (
        <>
          {/* Header with countdown */}
          <CardHeader className="bg-muted/30 px-6 py-4 flex flex-row items-center justify-between space-y-0 border-b">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm uppercase tracking-widest text-foreground">Trade Preview</CardTitle>
            </div>
            {/* Countdown timer */}
            {!isExpired && execState === "idle" && (
              <Badge variant={secondsLeft < 30 ? "destructive" : "secondary"} className="tabular-nums">
                <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 ${secondsLeft < 30 ? "bg-white animate-pulse" : "bg-muted-foreground/40"}`} />
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive">
                <XCircle className="w-3 h-3 mr-1" /> Expired
              </Badge>
            )}
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* Route */}
            <div className="flex items-center gap-3">
              <span className="font-bold text-foreground text-sm">{fromSymbol}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="font-bold text-foreground text-sm">{toSymbol ?? "Target"}</span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-muted-foreground">Expected Output</p>
                <p className="text-sm font-bold text-foreground">${quote.expectedOutputUsd.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-muted-foreground">Slippage</p>
                <p className={`text-sm font-bold ${slippageOk ? "text-[var(--app-success)]" : "text-destructive"}`}>{quote.slippage.toFixed(2)}%</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-muted-foreground">Gas Fee</p>
                <p className="text-sm font-bold text-foreground">${quote.gasFeeUsd.toFixed(4)}</p>
              </div>
            </div>

            {/* Route info */}
            <div className="text-[10px] rounded-lg px-3 py-2 font-mono break-all text-muted-foreground bg-muted/30">
              <p>Amount: {amount ? `$${amount}` : "Unknown"} {fromSymbol}</p>
              <p>Token: {tokenAddress || "Unknown"}</p>
              <p>Router: {quote.route}</p>
            </div>

            {/* Chain & Security info */}
            <div className="space-y-2 text-xs">
              {chainConfig ? (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/30 border border-border text-muted-foreground">
                  <span className="font-semibold">{chainConfig.name}</span>
                  <span>(ID: {chainConfig.id})</span>
                </div>
              ) : null}

              {scanDecision === "safe" ? (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-[var(--app-success)]/10 border border-[var(--app-success)]/20 text-[var(--app-success)]">
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  LOW risk by current scan
                </div>
              ) : scanDecision ? (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 font-semibold bg-destructive/10 border border-destructive/20 text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  BLOCKED: {scanDecision === "high_risk" ? "MEDIUM/HIGH risk detected" : "Unknown risk state"}
                </div>
              ) : null}

              {/* Phase 2: Pre-sign simulation badge */}
              {preSignSimulation != null && (
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                    preSignSimulation.ok
                      ? "bg-[var(--app-success)]/10 border-[var(--app-success)]/20 text-[var(--app-success)]"
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  }`}
                >
                  {preSignSimulation.ok ? (
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span className="font-semibold">
                    Simulation: {preSignSimulation.ok ? "Passed" : "Blocked"}
                  </span>
                  {preSignSimulation.gasUsed && (
                    <span className="ml-auto font-mono text-[10px] opacity-70">
                      gas: {preSignSimulation.gasUsed}
                    </span>
                  )}
                </div>
              )}

              {walletAddress && targetWalletAddress && (
                <div className={`flex items-center gap-2 border rounded-lg px-3 py-2 ${walletMismatch ? "font-semibold bg-destructive/10 border-destructive/20 text-destructive" : "text-muted-foreground bg-muted/30 border-border"}`}>
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Verified Wallet: {targetWalletAddress.slice(0,6)}...{targetWalletAddress.slice(-4)}</span>
                  {walletMismatch && <span className="ml-auto">Mismatch! Connect correct wallet.</span>}
                </div>
              )}
            </div>

            {/* Slippage warning */}
            {!slippageOk && (
              <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-warning/10 border border-warning/20 text-warning">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                High slippage detected. Review carefully before confirming.
              </div>
            )}

            {isExpired && (
              <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-destructive/10 border border-destructive/20 text-destructive">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Quote expired, request a new quote.
              </div>
            )}

            {/* ── Execution Section ── */}
            <AnimatePresence mode="wait">
              {showExecute && approvalId && execState === "idle" && (
                <motion.div key="confirm-button" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-4 pt-4 border-t border-border">
                  {walletAddress ? (
                    <>
                      <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2.5 bg-primary/10 border border-primary/20">
                        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-primary mt-0.5" />
                        <div>
                          <p className="font-semibold mb-0.5 text-primary">User-Signed Execution (Trade Hard Cap Applies)</p>
                          <p className="text-primary/80">Your wallet will ask you to review and sign. PhylaX never signs for you.</p>
                        </div>
                      </div>
                      
                      {liveMode ? (
                        <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer bg-muted/30 p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                          <input 
                            type="checkbox" 
                            className="mt-0.5 rounded border-input text-primary focus:ring-primary"
                            checked={riskAcknowledged}
                            onChange={(e) => setRiskAcknowledged(e.target.checked)}
                          />
                          <span>
                            I acknowledge the risks of on-chain trading and accept that PhylaX is not responsible for any losses.
                          </span>
                        </label>
                      ) : null}

                      <div className="flex flex-col gap-2">
                        <Button
                          id="confirm-execute-btn"
                          onClick={handleExecute}
                          disabled={(liveMode && !riskAcknowledged) || isExpired || isHighRisk || !!walletMismatch || execState !== "idle"}
                          className={`w-full ${
                            (!liveMode || riskAcknowledged) && !isExpired && !isHighRisk && !walletMismatch && execState === "idle"
                              ? "" 
                              : "bg-muted text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          {currentNeedsApproval ? "Approve USDC spending" : "Sign swap in wallet"}
                        </Button>
                        
                        {walletMismatch && (
                          <Button
                            variant="destructive"
                            onClick={onConnectWallet}
                            className="w-full"
                          >
                            Switch to {targetWalletAddress?.slice(0,6)}...
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2.5 text-warning bg-warning/10 border border-warning/20">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <p>Wallet connection required to sign and submit this transaction.</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={onConnectWallet}
                        className="w-full"
                      >
                        Connect Wallet to Sign
                      </Button>
                    </>
                  )}
                </motion.div>
              )}

              {!showExecute && execState === "idle" && (
                <motion.div key="exec-disabled" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2.5">
                    <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                    Live execution disabled on {chainConfig?.name || "this chain"}
                  </div>
                </motion.div>
              )}

              {(execState === "confirming" || execState === "building_tx" || execState === "approving") && (
                <motion.div key="building" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-primary font-medium pt-4 border-t border-border">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {execState === "approving" ? "Awaiting approval signature…" : execState === "confirming" ? "Preparing transaction…" : "Building transaction data…"}
                </motion.div>
              )}

              {execState === "awaiting_signature" && (
                <motion.div key="signing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3 pt-4 border-t border-border">
                  {/* Prominent signature prompt */}
                  <div className="flex items-center gap-3 px-4 py-4 rounded-xl border bg-warning/10 border-warning/30 animate-pulse">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-warning/20">
                      <Loader2 className="w-5 h-5 animate-spin text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-warning">
                        Check your wallet
                      </p>
                      <p className="text-xs text-warning/80">
                        Signature required to proceed
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExecState("idle")}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 w-fit"
                  >
                    Cancel and return
                  </button>
                </motion.div>
              )}

              {execState === "submitted" && (
                <motion.div key="submitted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Transaction submitted…
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {explorerUrl && (
                      <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 flex-1">
                        View on Explorer <ExternalLink className="w-3 h-3 ml-2" />
                      </a>
                    )}
                    <Button 
                      variant="secondary"
                      onClick={() => setExecState("idle")}
                      className="flex-1"
                    >
                      Check status
                    </Button>
                  </div>
                </motion.div>
              )}

              {(execState === "failed" || execState === "rejected" || execState === "wrong_chain" || execState === "expired") && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <XCircle className="w-4 h-4" />
                    {execState === "rejected" ? "Rejected by wallet" : execState === "wrong_chain" ? "Switch to X Layer" : execState === "expired" ? "Quote expired" : "Execution failed"}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => {
                        setExecState("idle");
                        setIsExpired(false);
                      }}
                      className="w-full"
                    >
                      Refresh quote
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => setExecState("idle")}
                        className="flex-1"
                      >
                        Scan another token
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setExecState("idle")}
                        className="flex-1"
                      >
                        New trade
                      </Button>
                    </div>
                  </div>

                  {execError && (
                    <div className="mt-2">
                      <button onClick={() => setShowErrorDetail((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {showErrorDetail ? "▾ Hide error detail" : "▸ Show error detail"}
                      </button>
                      {showErrorDetail && <p className="text-xs mt-1 font-mono break-all p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive">{execError}</p>}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </>
      )}
    </Card>
  );
}
