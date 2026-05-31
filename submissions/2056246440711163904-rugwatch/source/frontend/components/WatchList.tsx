"use client";

import { Trash } from "@phosphor-icons/react";
import { scoreLevel, type TokenStatus } from "@/lib/types";

interface Props {
  tokens: TokenStatus[];
  selectedAddress: string | null;
  onSelect: (address: string) => void;
  onRemove: (address: string) => void;
}

function scoreBadgeClass(level: "safe" | "warn" | "danger") {
  if (level === "danger") return "status-danger";
  if (level === "warn") return "status-warn";
  return "status-safe";
}

export default function WatchList({ tokens, selectedAddress, onSelect, onRemove }: Props) {
  if (tokens.length === 0) {
    return <p className="text-sm text-neutral-400 px-2 py-3">No tokens watched</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {tokens.map((t) => {
        const level = scoreLevel(t.rug_score, t.warn_threshold, t.exit_threshold);
        const selected = t.address === selectedAddress;

        return (
          <button
            key={t.address}
            type="button"
            onClick={() => onSelect(t.address)}
            className={`w-full text-left rounded-[3px] px-2.5 py-2 flex items-center justify-between gap-2 transition-colors ${
              selected ? "bg-white shadow-card" : "hover:bg-white/60"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-800 truncate">{t.symbol}</span>
                <span className="text-xs text-neutral-400">{t.chain}</span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 truncate">
                {t.address.slice(0, 6)}…{t.address.slice(-4)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-[3px] ${scoreBadgeClass(level)}`}>
                {t.rug_score.toFixed(2)}
              </span>
              {t.exited && <span className="text-xs text-neutral-300">exited</span>}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(t.address);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded"
                aria-label="Remove"
              >
                <Trash size={16} weight="regular" />
              </button>
            </div>
          </button>
        );
      })}
    </div>
  );
}
