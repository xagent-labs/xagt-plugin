"use client";

import { useState } from "react";
import { ArrowCircleDown } from "@phosphor-icons/react";
import { walletBuy } from "@/lib/api";

interface Props {
  tokenAddress: string;
  chain: string;
  symbol: string;
  walletConnected: boolean;
  onBought: () => void;
}

export default function BuyPosition({ tokenAddress, chain, symbol, walletConnected, onBought }: Props) {
  const [amount, setAmount] = useState("10");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  if (!walletConnected) return null;

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setTxHash("");
    setLoading(true);
    try {
      const res = await walletBuy({ token_address: tokenAddress, chain, amount_usdc: amount });
      setTxHash(res.swap_tx_hash || "broadcast pending");
      onBought();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "buy failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} aria-label={`Buy ${symbol} with USDC`} className="btn-ghost w-fit px-4 py-2 h-auto">
        <ArrowCircleDown size={18} weight="regular" className="text-emerald-500" />
        buy {symbol} with USDC
      </button>
    );
  }

  return (
    <form onSubmit={handleBuy} className="card flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2">
        <span className="text-xs font-medium text-neutral-500">USDC</span>
        <input
          type="number"
          min={1}
          className="input w-20"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "swapping…" : `buy ${symbol}`}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
        cancel
      </button>
      {error && <p className="text-sm text-red-500 w-full">{error}</p>}
      {txHash && <p className="text-xs text-emerald-600 w-full truncate">tx {txHash}</p>}
    </form>
  );
}
