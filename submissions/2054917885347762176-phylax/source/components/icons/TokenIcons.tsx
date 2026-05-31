"use client";

/**
 * Inline SVG token & chain icons.
 * Crisp at any size, no PNG dependencies, dark-mode ready.
 */

interface IconProps {
  size?: number;
  className?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOKEN ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

export function OkbIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="16" fill="#000" />
      <rect x="8" y="8" width="7" height="7" rx="1.5" fill="#fff" />
      <rect x="17" y="8" width="7" height="7" rx="1.5" fill="#fff" />
      <rect x="8" y="17" width="7" height="7" rx="1.5" fill="#fff" />
      <rect x="17" y="17" width="7" height="7" rx="1.5" fill="#fff" />
    </svg>
  );
}

export function EthIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path d="M16 4v8.87l7.5 3.35L16 4z" fill="#fff" fillOpacity=".6" />
      <path d="M16 4L8.5 16.22 16 12.87V4z" fill="#fff" />
      <path d="M16 21.97v6.03l7.5-10.4L16 21.97z" fill="#fff" fillOpacity=".6" />
      <path d="M16 28v-6.03L8.5 17.6 16 28z" fill="#fff" />
      <path d="M16 20.57l7.5-4.35L16 12.87v7.7z" fill="#fff" fillOpacity=".2" />
      <path d="M8.5 16.22l7.5 4.35v-7.7l-7.5 3.35z" fill="#fff" fillOpacity=".5" />
    </svg>
  );
}

export function UsdcIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path
        d="M20.2 18.4c0-2.1-1.3-2.8-3.8-3.1-1.8-.3-2.2-.7-2.2-1.5s.6-1.3 1.8-1.3c1.1 0 1.7.4 2 1.3.1.1.2.2.3.2h1.1c.2 0 .3-.2.3-.3-.3-1.2-1.1-2.1-2.5-2.4v-1.5c0-.2-.1-.3-.3-.3h-.8c-.2 0-.3.1-.3.3v1.4c-1.7.3-2.8 1.4-2.8 2.8 0 2 1.2 2.7 3.8 3.1 1.6.3 2.2.8 2.2 1.6s-.8 1.4-1.9 1.4c-1.5 0-2-.6-2.2-1.4 0-.2-.2-.2-.3-.2h-1.1c-.2 0-.3.1-.3.3.3 1.4 1.2 2.3 2.8 2.6v1.5c0 .2.1.3.3.3h.8c.2 0 .3-.1.3-.3v-1.5c1.8-.3 2.8-1.5 2.8-3z"
        fill="#fff"
      />
    </svg>
  );
}

export function UsdtIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.9 17.4v-.1c-.1 0-1.1.1-2 .1-.6 0-1.5 0-2-.1v.1c-3.5-.2-6.1-.8-6.1-1.6s2.6-1.4 6.1-1.6v2.5c.5 0 1.4.1 2 .1.8 0 1.8-.1 1.9-.1v-2.5c3.5.2 6.1.8 6.1 1.6.1.8-2.5 1.4-6 1.6zm0-3.4V11.5h5.4V8.3H8.7v3.2h5.4V14c-4 .2-7 1-7 2s3 1.8 7 2v7.2h3.8V18c4-.2 7-1 7-2 0-.9-3-1.7-7-2z"
        fill="#fff"
      />
    </svg>
  );
}

export function WbtcIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        d="M22.5 14.1c.3-2.1-1.3-3.2-3.4-3.9l.7-2.8-1.7-.4-.7 2.8c-.5-.1-.9-.2-1.4-.3l.7-2.8-1.7-.4-.7 2.8c-.4-.1-.7-.2-1.1-.2l-2.3-.6-.5 1.8s1.3.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.1 4.5c-.1.2-.3.5-.7.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.6c.4.1.8.2 1.2.3l-.7 2.9 1.7.4.7-2.8c.5.1.9.2 1.4.3l-.7 2.8 1.7.4.7-2.9c3 .6 5.3.3 6.2-2.4.8-2.1 0-3.4-1.6-4.2 1.1-.2 2-1 2.2-2.5zm-3.9 5.5c-.5 2.2-4.2 1-5.4.7l1-3.9c1.2.3 5 .9 4.4 3.2zm.6-5.5c-.5 2-3.6.9-4.5.7l.9-3.5c1 .3 4.2.7 3.6 2.8z"
        fill="#fff"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAIN ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

export function XLayerIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="16" fill="#000" />
      <path d="M8 10l4.5 6L8 22h3l3-4 3 4h3l-4.5-6L20 10h-3l-3 4-3-4H8z" fill="#fff" />
      <circle cx="23" cy="11" r="2" fill="#54D62C" />
    </svg>
  );
}

export function BaseIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="16" fill="#0052FF" />
      <path
        d="M16 26c5.523 0 10-4.477 10-10S21.523 6 16 6c-5.22 0-9.5 3.995-9.97 9.1h12.97v1.8H6.03C6.5 22.005 10.78 26 16 26z"
        fill="#fff"
      />
    </svg>
  );
}

export function BscIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
      <path d="M16 6l3.1 3.1-6.1 6.1L9.9 12 16 6zM22 12l3.1 3.1-3.1 3.1-3.1-3.1L22 12zM10 12l3.1 3.1L10 18.2 6.9 15.1 10 12zM16 18.2l3.1 3.1L16 24.4l-3.1-3.1L16 18.2z" fill="#fff" />
    </svg>
  );
}

export function SolanaIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="16" fill="url(#sol-grad)" />
      <path d="M9.5 20.3l1.8-1.8h11.2l-1.2 1.8H9.5zM9.5 11.7l1.8 1.8h11.2l-1.2-1.8H9.5zM9.5 16l1.8-1h11.2l-1.2 1H9.5z" fill="#fff" />
      <defs>
        <linearGradient id="sol-grad" x1="0" y1="32" x2="32" y2="0">
          <stop stopColor="#9945FF" />
          <stop offset="0.5" stopColor="#14F195" />
          <stop offset="1" stopColor="#00C2FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const TOKEN_ICON_MAP: Record<string, React.FC<IconProps>> = {
  OKB: OkbIcon,
  ETH: EthIcon,
  USDC: UsdcIcon,
  USDT: UsdtIcon,
  WBTC: WbtcIcon,
};

const CHAIN_ICON_MAP: Record<string, React.FC<IconProps>> = {
  "x-layer": XLayerIcon,
  "base": BaseIcon,
  "bsc": BscIcon,
  "solana": SolanaIcon,
};

export function TokenIcon({ symbol, size = 20, className }: { symbol: string } & IconProps) {
  const Icon = TOKEN_ICON_MAP[symbol.toUpperCase()];
  if (Icon) return <Icon size={size} className={className} />;
  // Fallback: colored circle with first letter
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="16" fill="oklch(0.5 0.15 260)" />
      <text x="16" y="21" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif">
        {symbol.charAt(0).toUpperCase()}
      </text>
    </svg>
  );
}

export function ChainIcon({ chainId, size = 20, className }: { chainId: string } & IconProps) {
  const Icon = CHAIN_ICON_MAP[chainId.toLowerCase()];
  if (Icon) return <Icon size={size} className={className} />;
  return <XLayerIcon size={size} className={className} />;
}
