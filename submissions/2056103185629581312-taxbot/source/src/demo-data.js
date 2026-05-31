// Demo data — realistic sample transactions for hackathon demo
// Used when OKX_API_KEY is not set

export function getDemoTransactions(taxYear = 2025) {
  const y = taxYear;
  return [
    // BTC purchases
    { id: 'demo-1', type: 'BUY', source: 'okx_spot', asset: 'BTC', quoteAsset: 'USDT', quantity: 0.5, price: 42000, fee: 21, feeCcy: 'USDT', timestamp: new Date(`${y}-01-15`).getTime() },
    { id: 'demo-2', type: 'BUY', source: 'okx_spot', asset: 'BTC', quoteAsset: 'USDT', quantity: 0.3, price: 38000, fee: 11.4, feeCcy: 'USDT', timestamp: new Date(`${y}-02-10`).getTime() },
    // ETH purchases
    { id: 'demo-3', type: 'BUY', source: 'okx_spot', asset: 'ETH', quoteAsset: 'USDT', quantity: 5, price: 2200, fee: 11, feeCcy: 'USDT', timestamp: new Date(`${y}-01-20`).getTime() },
    { id: 'demo-4', type: 'BUY', source: 'okx_spot', asset: 'ETH', quoteAsset: 'USDT', quantity: 3, price: 1800, fee: 5.4, feeCcy: 'USDT', timestamp: new Date(`${y}-03-05`).getTime() },
    // SOL purchase
    { id: 'demo-5', type: 'BUY', source: 'okx_spot', asset: 'SOL', quoteAsset: 'USDT', quantity: 50, price: 95, fee: 4.75, feeCcy: 'USDT', timestamp: new Date(`${y}-02-28`).getTime() },
    // BTC sale — triggers capital gain
    { id: 'demo-6', type: 'SELL', source: 'okx_spot', asset: 'BTC', quoteAsset: 'USDT', quantity: 0.5, price: 65000, fee: 32.5, feeCcy: 'USDT', timestamp: new Date(`${y}-03-15`).getTime() },
    // ETH sale
    { id: 'demo-7', type: 'SELL', source: 'okx_spot', asset: 'ETH', quoteAsset: 'USDT', quantity: 4, price: 3200, fee: 12.8, feeCcy: 'USDT', timestamp: new Date(`${y}-06-20`).getTime() },
    // SOL sale at a loss
    { id: 'demo-8', type: 'SELL', source: 'okx_spot', asset: 'SOL', quoteAsset: 'USDT', quantity: 20, price: 75, fee: 1.5, feeCcy: 'USDT', timestamp: new Date(`${y}-08-10`).getTime() },
    // Crypto-to-crypto swap (taxable)
    { id: 'demo-9', type: 'CONVERT', source: 'okx_convert', asset: 'ETH', toAsset: 'BTC', quantity: 2, toQuantity: 0.09, price: 3100, fee: 0, feeCcy: 'ETH', timestamp: new Date(`${y}-09-01`).getTime() },
    // Staking rewards (ordinary income)
    { id: 'demo-10', type: 'STAKING_REWARD', source: 'okx_earn', asset: 'ETH', quantity: 0.05, price: 2800, fee: 0, feeCcy: 'ETH', timestamp: new Date(`${y}-04-01`).getTime() },
    { id: 'demo-11', type: 'STAKING_REWARD', source: 'okx_earn', asset: 'ETH', quantity: 0.05, price: 3000, fee: 0, feeCcy: 'ETH', timestamp: new Date(`${y}-07-01`).getTime() },
    { id: 'demo-12', type: 'STAKING_REWARD', source: 'okx_earn', asset: 'SOL', quantity: 2, price: 90, fee: 0, feeCcy: 'SOL', timestamp: new Date(`${y}-05-15`).getTime() },
    // Transfers (non-taxable)
    { id: 'demo-13', type: 'DEPOSIT', source: 'okx_wallet', asset: 'BTC', quantity: 0.3, fee: 0, feeCcy: 'BTC', timestamp: new Date(`${y}-01-05`).getTime(), txHash: '0xabc123' },
    { id: 'demo-14', type: 'WITHDRAWAL', source: 'okx_wallet', asset: 'SOL', quantity: 30, fee: 0.01, feeCcy: 'SOL', timestamp: new Date(`${y}-10-01`).getTime(), txHash: '0xdef456' },
  ];
}

// Demo 1099-DA discrepancy (what Coinbase would report vs TaxBot's calculation)
export function getDemo1099DA() {
  return {
    broker: 'Coinbase (simulated)',
    reportedGain: 32500,   // Coinbase sees: 0.5 BTC sold @ $65K = $32,500 proceeds, $0 basis
    reportedBasis: 0,
    taxbotGain: 11500,     // TaxBot knows: basis was $42K → actual gain = $23K... wait, $65K - $42K = $23K
    taxbotBasis: 21000,    // 0.5 BTC × $42,000
    discrepancy: 21000,    // $21,000 of phantom gain the IRS would have taxed
    explanation: 'BTC was purchased on OKX at $42,000/BTC. Coinbase only sees the sale, not the purchase. TaxBot recovered the $21,000 cost basis from OKX trade history.',
  };
}
