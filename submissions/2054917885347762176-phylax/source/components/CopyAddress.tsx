"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  address: string;
  className?: string;
  variant?: "mono" | "default";
}

export function CopyAddress({ address, className = "", variant = "mono" }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className={variant === "mono" ? "font-mono" : ""}>{shortAddress}</span>
      <button
        onClick={handleCopy}
        className="p-1 rounded-md hover:bg-muted/50 transition-colors relative group"
        title="Copy address"
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-500" />
        ) : (
          <Copy className="w-3 h-3 text-muted-foreground/40 group-hover:text-electric transition-colors" />
        )}
        
        {/* Tooltip-style feedback */}
        {copied && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-foreground text-white text-[9px] rounded shadow-soft whitespace-nowrap animate-in fade-in slide-in-from-bottom-1">
            Address copied
          </span>
        )}
      </button>
    </div>
  );
}
