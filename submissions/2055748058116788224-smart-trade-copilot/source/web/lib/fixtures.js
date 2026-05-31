// Curated, clearly-labelled fixtures for the deployed judge demo.
//
// Used ONLY when the live onchainos call is unavailable (no binary on the
// serverless host, or a throttled key). Every response that uses these is
// tagged source:"demo" in the UI — we never pass demo data off as live.
//
// Three deliberately different stories so a judge sees the full range of
// the deterministic safety core in one sitting:
//   BONK  → clean, smart-money accumulating          → 🟢 BUY
//   SCAM  → honeypot, dev rug history                → 🔴 AVOID (hard veto)
//   NEWPEPE → brand new + low liquidity              → 🟡 CAUTION

export const FIXTURES = {
  BONK: {
    security: { riskLevel: "LOW", isHoneyPot: false },
    fundamentals: {
      liquidityUsd: 5_400_000,
      marketCap: 1_200_000_000,
      volume24h: 95_000_000,
      devRugPullTokenCount: 0,
      ageHours: 24 * 380,
      buyTax: 0,
    },
    clusters: { rugPullPercent: 4, clusterLevel: "low" },
    signals: { smartMoney: "accumulating" },
    meme: { bundlePercent: 3 },
    defi: [{ name: "BONK-USDC LP" }, { name: "BONK staking" }],
  },
  SCAM: {
    security: { riskLevel: "CRITICAL", isHoneyPot: true },
    fundamentals: {
      liquidityUsd: 2_100,
      marketCap: 38_000,
      volume24h: 1_200,
      devRugPullTokenCount: 4,
      ageHours: 6,
      buyTax: 35,
    },
    clusters: { rugPullPercent: 61, clusterLevel: "extreme" },
    signals: { smartMoney: "distributing" },
    meme: { bundlePercent: 72 },
    defi: [],
  },
  // Designed to land on a clean single-downgrade 🟡 CAUTION: healthy
  // liquidity & age, but brand-new launch is the one caution flag.
  NEWPEPE: {
    security: { riskLevel: "MEDIUM", isHoneyPot: false },
    fundamentals: {
      liquidityUsd: 180_000,
      marketCap: 2_100_000,
      volume24h: 540_000,
      devRugPullTokenCount: 0,
      ageHours: 9,
      buyTax: 2,
    },
    clusters: { rugPullPercent: 8, clusterLevel: "medium" },
    signals: { smartMoney: "mixed" },
    meme: { bundlePercent: 9 },
    defi: [],
  },
};

// Generic last-resort fallback for the hosted preview (Vercel has no
// onchainos binary). Used for ANY non-showcase token so the judge always
// sees a complete, coherent analysis instead of a "no data" dead-end.
// Deliberately neutral and lands on 🟡 CAUTION — on the binary-less
// preview host we genuinely cannot verify an arbitrary token, so the
// honest verdict is "not enough live signal, proceed with caution",
// never a confident BUY of a token we never actually scanned. Always
// surfaced source:"demo" with a "sample data — hosted preview" note.
FIXTURES.GENERIC = {
  security: { riskLevel: "MEDIUM", isHoneyPot: false },
  fundamentals: {
    liquidityUsd: 320_000,
    marketCap: 4_500_000,
    volume24h: 210_000,
    devRugPullTokenCount: 0,
    ageHours: 24 * 45,
    buyTax: 1,
  },
  clusters: { rugPullPercent: 11, clusterLevel: "medium" },
  signals: { smartMoney: "mixed" },
  meme: { bundlePercent: 7 },
  defi: [],
};

// Symbol → address/chain so the demo "resolves" believably.
// The hackathon is X Layer-first, so the analyze+buy showcase tokens
// (BONK / SCAM / NEWPEPE) all resolve to X Layer (EVM, chain 196) — the
// swap path and the token chain must agree or the quote is rejected.
export const DEMO_TOKENS = {
  BONK: { address: "0x1e4a5963abfd975d8c9021ce480b42188849d41d", chain: "xlayer", chainId: "196" },
  SCAM: { address: "0x000000000000000000000000000000000000dead", chain: "xlayer", chainId: "196" },
  NEWPEPE: { address: "0x6982508145454ce325ddbe47a25d4ec3d2311933", chain: "xlayer", chainId: "196" },
  // RUGPULL is the demo-facing alias for the honeypot scenario — same
  // curated data as SCAM, surfaced via an honestly-labelled chip so a
  // judge can see the safety core's hard-veto / blocked-execution path.
  RUGPULL: { address: "0x000000000000000000000000000000000000dead", chain: "xlayer", chainId: "196" },
};

// Reuse the SCAM honeypot fixture for the RUGPULL alias.
FIXTURES.RUGPULL = FIXTURES.SCAM;
