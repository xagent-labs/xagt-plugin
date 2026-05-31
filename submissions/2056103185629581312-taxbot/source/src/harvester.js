// Tax-loss harvesting scanner
// Scans current portfolio positions for unrealized losses

export async function scanHarvestingOpportunities(client, disposals) {
  // Get current balances
  let balances = [];
  try {
    balances = await client.get('/api/v5/account/balance');
  } catch {
    return [];
  }

  const opportunities = [];
  const details = balances[0]?.details || [];

  for (const holding of details) {
    const asset = holding.ccy;
    const qty = parseFloat(holding.availBal || 0);
    if (qty <= 0) continue;

    // Get current price
    let currentPrice = 0;
    try {
      const ticker = await client.get('/api/v5/market/ticker', { instId: `${asset}-USDT` });
      currentPrice = parseFloat(ticker[0]?.last || 0);
    } catch {
      continue;
    }

    // Find average cost basis from disposals context (approximate from remaining lots)
    const avgCost = parseFloat(holding.avgPx || 0);
    if (avgCost <= 0 || currentPrice <= 0) continue;

    const unrealizedPnl = (currentPrice - avgCost) * qty;

    if (unrealizedPnl < -100) { // Only flag losses > $100
      opportunities.push({
        asset,
        qty,
        avgCost,
        currentPrice,
        unrealizedLoss: Math.abs(unrealizedPnl),
        potentialTaxSaving: Math.abs(unrealizedPnl) * 0.3, // ~30% marginal rate estimate
        action: `Sell ${qty.toFixed(4)} ${asset} → realize $${Math.abs(unrealizedPnl).toFixed(2)} loss → save ~$${(Math.abs(unrealizedPnl) * 0.3).toFixed(2)} in taxes`,
        note: 'No wash-sale rule for crypto (as of 2025). Can rebuy immediately.',
      });
    }
  }

  return opportunities.sort((a, b) => b.unrealizedLoss - a.unrealizedLoss);
}
