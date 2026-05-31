"use client";
 
 import Image from "next/image";
import { getChainById } from "../lib/chains";

/**
 * ChainBadge — Reusable chain identity badge with inline SVG logo.
 * Light-theme, matches PhylaX landing page design language.
 */

interface Props {
  chainName: string;
  chainId?: string;
  size?: "sm" | "md";
  className?: string;
}

function ChainLogo({ chainId, size }: { chainId: string; size: number }) {
  const chain = getChainById(chainId);
  const src = chain.iconLabel;
  return (
    <div 
      className="shrink-0 rounded-md overflow-hidden bg-muted border border-border/20"
      style={{ width: size, height: size }}
    >
      <Image 
        src={src} 
        alt={chainId} 
        width={size}
        height={size}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function ChainBadge({ chainName, chainId = "x-layer", size = "sm", className = "" }: Props) {
  const iconSize = size === "sm" ? 16 : 20;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <ChainLogo chainId={chainId} size={iconSize} />
      <span className={`font-semibold text-foreground ${size === "sm" ? "text-[11px]" : "text-xs"}`}>
        {chainName}
      </span>
    </span>
  );
}
