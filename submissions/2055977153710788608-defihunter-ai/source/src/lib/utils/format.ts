/** 安全数值展示，避免 UI 出现 NaN / undefined */
export function safeNum(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatUsd(value: unknown, digits = 2): string {
  const n = safeNum(value);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(digits)}`;
}

export function formatPct(value: unknown, digits = 2): string {
  const n = safeNum(value);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function formatApy(value: unknown): string {
  return `${safeNum(value).toFixed(2)}%`;
}
