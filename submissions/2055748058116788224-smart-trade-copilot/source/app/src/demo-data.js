// Offline sample used by `--demo`. Realistic, clearly-labeled sample data so
// the product is fully demoable even when the shared API key is throttled.
// This is NEVER used in a live run — only when --demo is passed explicitly.

export const DEMO_RESULT = {
  token: { address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", chain: "solana", symbol: "BONK" },
  stages: {
    security: { ok: true },
    fundamentals: { ok: true },
    clusters: { ok: true },
    signals: { ok: true },
    meme: { ok: true },
    defi: { ok: false, skipped: "no yield venue indexed for this symbol" },
  },
  signals: {
    security: { level: "MEDIUM", isHoneypot: false, completed: true },
    liquidityUsd: 5_400_000,
    taxPct: 0,
    devRugCount: 0,
    ageHours: 24 * 380,
    clusterRugPct: 4,
    clusterConcentrated: false,
    bundlerConcentrated: false,
    smartMoney: "accumulating",
  },
  notes: [
    "Market cap ~$1.20B",
    "24h volume ~$95.0M",
    "Sample data — run without --demo (with a personal OKX key) for live results.",
  ],
};
