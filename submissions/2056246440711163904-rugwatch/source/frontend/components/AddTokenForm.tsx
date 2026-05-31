"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { addToken } from "@/lib/api";

interface Props {
  onAdded: () => void;
  walletConnected: boolean;
  walletAddress?: string;
}

export default function AddTokenForm({ onAdded, walletConnected, walletAddress }: Props) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("xlayer");
  const [exitAt, setExitAt] = useState("0.80");
  const [warnAt, setWarnAt] = useState("0.65");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walletConnected) {
      setError("Connect OKX Agentic Wallet first");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await addToken({
        address,
        chain,
        wallet_address: walletAddress,
        exit_threshold: parseFloat(exitAt),
        warn_threshold: parseFloat(warnAt),
      });
      setAddress("");
      setOpen(false);
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "failed to add token");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => walletConnected && setOpen(true)}
        disabled={!walletConnected}
        aria-label="Add new token"
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-[3px] text-sm font-medium text-neutral-500 hover:bg-white/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={20} weight="regular" className="text-neutral-400" />
        add token
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
      <p className="label-col">Add token</p>

      {!walletConnected && (
        <p className="text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-[3px]">
          Connect wallet in the bar above first
        </p>
      )}

      {walletConnected && walletAddress && (
        <p className="text-xs text-neutral-400">
          Exit wallet {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-neutral-500">Token address</span>
        <input
          required
          className="input"
          placeholder="0x…"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-neutral-500">Chain</span>
        <select className="input" value={chain} onChange={(e) => setChain(e.target.value)}>
          <option value="xlayer">X Layer</option>
          <option value="ethereum">Ethereum</option>
          <option value="solana">Solana</option>
          <option value="bsc">BSC</option>
          <option value="base">Base</option>
          <option value="arbitrum">Arbitrum</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-500">Warn at</span>
          <input type="number" min={0} max={1} step={0.05} className="input" value={warnAt} onChange={(e) => setWarnAt(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-500">Exit at</span>
          <input type="number" min={0} max={1} step={0.05} className="input" value={exitAt} onChange={(e) => setExitAt(e.target.value)} />
        </label>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={loading || !walletConnected} className="btn-primary flex-1">
          {loading ? "…" : "watch"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(""); }} className="btn-ghost">
          cancel
        </button>
      </div>
    </form>
  );
}
