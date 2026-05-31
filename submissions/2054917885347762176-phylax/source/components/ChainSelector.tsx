"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { ChainBadge } from "./ChainBadge";
import { SUPPORTED_CHAINS, type ChainConfig } from "../lib/chains";

interface Props {
  selected: ChainConfig;
  onChange: (chain: ChainConfig) => void;
}

export function ChainSelector({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 sm:gap-1.5 text-xs font-medium rounded-lg px-1.5 sm:px-2.5 py-1 sm:py-1.5 transition-colors duration-150 whitespace-nowrap"
        style={{ background: "var(--app-card-glass)", border: "1px solid var(--app-card-border)", color: "var(--app-text-primary)" }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--app-hover)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "var(--app-card-glass)"; }}
      >
        <span className="shrink-0 flex items-center gap-1 sm:gap-1.5">
          <ChainBadge 
            chainName={selected.name} 
            chainId={selected.id} 
            size="sm" 
            className="[&>span]:hidden sm:[&>span]:inline-block" 
          />
          <span className="sm:hidden text-[11px] font-semibold">
            {selected.id === "x-layer" ? "X" : selected.name}
          </span>
        </span>
        <ChevronDown className={`w-3 h-3 chevron-rotate ${open ? "is-open" : ""}`} style={{ color: "var(--app-text-tertiary)" }} />
      </button>

      {/* Always-mounted dropdown with CSS transitions */}
      <div
        className={`absolute top-full right-0 mt-1.5 w-40 sm:w-44 rounded-lg py-0.5 z-50 dropdown-panel ${open ? "is-open" : ""}`}
        style={{ background: "var(--card)", border: "1px solid var(--app-card-border)", boxShadow: "var(--shadow-soft)" }}
      >
        {SUPPORTED_CHAINS.map((chain) => (
          <button
            key={chain.id}
            onClick={() => {
              if (chain.enabled) {
                onChange(chain);
                setOpen(false);
              }
            }}
            disabled={!chain.enabled}
            className={`w-full flex items-center justify-between px-2.5 py-1 text-left transition-colors duration-120 ${
              chain.enabled
                ? "cursor-pointer"
                : "opacity-40 cursor-not-allowed"
            }`}
            onMouseEnter={e => { if (chain.enabled) e.currentTarget.style.background = "var(--app-hover)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <ChainBadge chainName={chain.name} chainId={chain.id} size="sm" />
            <div className="flex items-center gap-1.5">
              {!chain.enabled && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ color: "var(--app-text-tertiary)", background: "var(--app-hover)" }}>
                  {chain.disabledReason ?? "Soon"}
                </span>
              )}
              {chain.id === selected.id && chain.enabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
