// Deterministic persona inference. Same heuristics as SKILL.md MODE 1.

const num = (v) => (v == null || v === '' ? 0 : Number(v));

function median(sorted) {
  if (!sorted.length) return 0;
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
}

export function classifyStyle(medianHoldSec) {
  const h = medianHoldSec / 3600;
  if (h < 4) return 'Scalper';
  if (h < 48) return 'Day Trader';
  if (h < 14 * 24) return 'Swing Trader';
  if (h < 60 * 24) return 'Position Trader';
  return 'HODL Investor';
}

export function classifySizing(sizes) {
  if (sizes.length < 5) return { label: 'Insufficient Data', medianSize: 0, iqrLow: 0, iqrHigh: 0 };
  const sorted = [...sizes].sort((a, b) => a - b);
  const med = median(sorted);
  const iqrLow = quantile(sorted, 0.25);
  const iqrHigh = quantile(sorted, 0.75);
  const stdRatio = med > 0 ? (iqrHigh - iqrLow) / med : 0;
  let label;
  if (stdRatio < 0.3) label = 'Flat Sizing';
  else if (stdRatio > 1.0) label = 'Highly Variable Sizing';
  else label = 'Variable Sizing';
  return { label, medianSize: med, iqrLow, iqrHigh, stdRatio };
}

// Persona score per SKILL.md (calibrated):
//   PF=1, WR=50% -> 2 ; PF=2.5, WR=60% -> ~5.4 ; PF=4, WR=70% -> ~8.8
export function personaScore(profitFactor, winRate) {
  const raw = profitFactor * 2 + (winRate - 0.5) * 4;
  return Math.max(0, Math.min(10, raw));
}

export function shortAddress(addr) {
  if (!addr) return '';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatHold(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'unknown';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.round((seconds % 86400) / 3600);
  return `${d}d ${h}h`;
}

export function formatUsd(v, places = 2) {
  const n = num(v);
  if (!Number.isFinite(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1000) return `${n < 0 ? '-' : ''}$${Math.round(abs).toLocaleString('en-US')}`;
  return `${n < 0 ? '-' : ''}$${abs.toFixed(places)}`;
}

export function formatPct(v, places = 2) {
  const n = num(v);
  return `${n >= 0 ? '+' : ''}${n.toFixed(places)}%`;
}

export function formatTimestamp(secondsOrMs) {
  if (!secondsOrMs) return '—';
  const n = Number(secondsOrMs);
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

// Returns enriched persona data from the API responses.
export function inferPersona({ overview30d, recentPnl }) {
  const pnlList = recentPnl?.pnlList ?? [];
  const closedTrades = pnlList.length;

  const holdSecs = pnlList
    .map((p) => {
      const start = num(p.tokenPositionDuration?.holdingTimestamp);
      const end = num(p.tokenPositionDuration?.sellOffTimestamp);
      return end > start ? end - start : 0;
    })
    .filter((s) => s > 0);
  const sortedHolds = [...holdSecs].sort((a, b) => a - b);
  const medianHoldSec = median(sortedHolds);
  const style = classifyStyle(medianHoldSec);

  const sizes = pnlList.map((p) => num(p.buyTxVolume)).filter((s) => s > 0);
  const sizing = classifySizing(sizes);

  const wins = pnlList.filter((p) => num(p.realizedPnlUsd) > 0);
  const losses = pnlList.filter((p) => num(p.realizedPnlUsd) < 0);
  const grossWin = wins.reduce((s, p) => s + num(p.realizedPnlUsd), 0);
  const grossLoss = losses.reduce((s, p) => s + num(p.realizedPnlUsd), 0); // negative
  const profitFactor = grossLoss < 0 ? grossWin / Math.abs(grossLoss) : (grossWin > 0 ? Infinity : 0);
  const winRate = closedTrades > 0 ? wins.length / closedTrades : 0;
  const expectancy = closedTrades > 0 ? (grossWin + grossLoss) / closedTrades : 0;
  const score = personaScore(Number.isFinite(profitFactor) ? profitFactor : 10, winRate);

  const overviewWinRatePct = num(overview30d?.winRate);
  const overviewRealizedPnl = num(overview30d?.realizedPnlUsd);
  const overviewBuyCount = num(overview30d?.buyTxCount);
  const overviewSellCount = num(overview30d?.sellTxCount);
  const overviewAvgBuyUsd = num(overview30d?.avgBuyValueUsd);

  // Market-cap tilt from buysByMarketCap.
  const mcBuckets = overview30d?.buysByMarketCap ?? [];
  const mcLabel = (range) => ({ 1: 'sub-$100k', 2: '$100k-$1M', 3: '$1M-$10M', 4: '$10M-$100M', 5: '$100M+' })[String(range)] ?? `range ${range}`;
  const mcTilt = mcBuckets
    .filter((b) => num(b.buyCount) > 0)
    .map((b) => ({ range: b.marketCapRange, count: num(b.buyCount), label: mcLabel(b.marketCapRange) }))
    .sort((a, b) => b.count - a.count);

  // Behavioral tells (simplified set — full set in SKILL.md).
  const tells = [];
  const fastWinningExits = wins.filter((p) => {
    const start = num(p.tokenPositionDuration?.holdingTimestamp);
    const end = num(p.tokenPositionDuration?.sellOffTimestamp);
    return end - start > 0 && end - start < 600 && num(p.realizedPnlPercent) > 20;
  });
  if (fastWinningExits.length >= 1) {
    const sample = fastWinningExits[0];
    const holdS = num(sample.tokenPositionDuration.sellOffTimestamp) - num(sample.tokenPositionDuration.holdingTimestamp);
    tells.push({
      name: 'Top-Catcher',
      evidence: `${fastWinningExits.length} wins exited within 10 minutes for +20% or more (e.g. ${sample.tokenSymbol} held ${formatHold(holdS)} for ${formatPct(sample.realizedPnlPercent)})`,
    });
  }
  const sameTokenRebuys = pnlList.filter((p) => num(p.buyTxCount) >= 2);
  if (sameTokenRebuys.length >= Math.max(3, pnlList.length * 0.1)) {
    tells.push({
      name: 'Tactical Re-entry',
      evidence: `${sameTokenRebuys.length} of ${pnlList.length} closed positions show 2 or more buys on the same ticker`,
    });
  }
  const deepLosses = losses.filter((p) => num(p.realizedPnlPercent) <= -50);
  if (deepLosses.length >= Math.max(3, losses.length * 0.15)) {
    tells.push({
      name: 'Capitulator',
      evidence: `${deepLosses.length} of ${losses.length} losing closes settled at -50% or worse`,
    });
  }

  // Top winner from overview (already curated).
  const topWinner = overview30d?.topPnlTokenList?.[0];

  return {
    closedTrades,
    medianHoldSec,
    style,
    sizing,
    sectorTiltLine: 'Solana memes (heavy pump.fun rotation)', // sector classification deferred to token-info enrichment
    mcTilt,
    overview: {
      winRatePct: overviewWinRatePct,
      realizedPnl: overviewRealizedPnl,
      buyCount: overviewBuyCount,
      sellCount: overviewSellCount,
      avgBuyUsd: overviewAvgBuyUsd,
    },
    edge: {
      winRate,
      grossWin,
      grossLoss,
      profitFactor,
      expectancy,
      score,
    },
    topWinner,
    tells,
  };
}

// Pick top-N best and worst by realisedPnlUsd. Returns enriched objects.
export function selectHighlights(recentPnl, n = 3) {
  const list = recentPnl?.pnlList ?? [];
  const enrich = (p) => {
    const start = num(p.tokenPositionDuration?.holdingTimestamp);
    const end = num(p.tokenPositionDuration?.sellOffTimestamp);
    return {
      symbol: p.tokenSymbol,
      tokenContractAddress: p.tokenContractAddress,
      buyAvgPrice: num(p.buyAvgPrice),
      sellAvgPrice: num(p.sellAvgPrice),
      buyTxVolume: num(p.buyTxVolume),
      sellTxVolume: num(p.sellTxVolume),
      buyTxCount: num(p.buyTxCount),
      sellTxCount: num(p.sellTxCount),
      realizedPnlUsd: num(p.realizedPnlUsd),
      realizedPnlPercent: num(p.realizedPnlPercent),
      holdSec: end > start ? end - start : 0,
      entryTs: start,
      exitTs: end,
    };
  };
  const sorted = list.map(enrich).sort((a, b) => b.realizedPnlUsd - a.realizedPnlUsd);
  return { best: sorted.slice(0, n), worst: sorted.slice(-n).reverse() };
}
