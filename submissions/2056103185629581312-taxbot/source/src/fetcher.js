// Fetch all tax-relevant transactions from OKX API
// Returns normalized TaxEvent[] array

export async function fetchAllTransactions(client, taxYear) {
  const start = new Date(`${taxYear}-01-01T00:00:00Z`).getTime();
  const end = new Date(`${taxYear}-12-31T23:59:59Z`).getTime();

  const [spotOrders, bills, convertHistory, earnOrders] = await Promise.all([
    fetchSpotOrders(client, start, end),
    fetchAssetBills(client, start, end),
    fetchConvertHistory(client, start, end),
    fetchEarnOrders(client, start, end),
  ]);

  return [...spotOrders, ...bills, ...convertHistory, ...earnOrders];
}

async function fetchSpotOrders(client, start, end) {
  const raw = await client.getAll('/api/v5/trade/orders-history-archive', {
    instType: 'SPOT',
    state: 'filled',
  });

  return raw
    .filter(o => {
      const ts = parseInt(o.fillTime || o.uTime);
      return ts >= start && ts <= end;
    })
    .map(o => ({
      id: o.ordId,
      type: o.side === 'sell' ? 'SELL' : 'BUY',
      source: 'okx_spot',
      asset: o.instId.split('-')[0],
      quoteAsset: o.instId.split('-')[1],
      quantity: parseFloat(o.fillSz || o.sz),
      price: parseFloat(o.fillPx || o.avgPx || o.px),
      fee: parseFloat(o.fee || 0),
      feeCcy: o.feeCcy || o.instId.split('-')[1],
      timestamp: parseInt(o.fillTime || o.uTime),
      raw: o,
    }));
}

async function fetchAssetBills(client, start, end) {
  // type 2 = deposit, 6 = withdrawal
  const deposits = await client.getAll('/api/v5/asset/deposit-history', {});
  const withdrawals = await client.getAll('/api/v5/asset/withdrawal-history', {});

  const normalize = (arr, type) =>
    arr
      .filter(r => {
        const ts = parseInt(r.ts);
        return ts >= start && ts <= end && r.state === '2'; // completed
      })
      .map(r => ({
        id: r.wdId || r.depId,
        type,
        source: 'okx_wallet',
        asset: r.ccy,
        quantity: parseFloat(r.amt),
        fee: parseFloat(r.fee || 0),
        feeCcy: r.ccy,
        timestamp: parseInt(r.ts),
        toAddress: r.to || r.toAddr,
        txHash: r.txId,
        raw: r,
      }));

  return [...normalize(deposits, 'DEPOSIT'), ...normalize(withdrawals, 'WITHDRAWAL')];
}

async function fetchConvertHistory(client, start, end) {
  const raw = await client.getAll('/api/v5/asset/convert/history', {});

  return raw
    .filter(r => {
      const ts = parseInt(r.ts);
      return ts >= start && ts <= end && r.state === 'fullyFilled';
    })
    .map(r => ({
      id: r.convTrade,
      type: 'CONVERT',
      source: 'okx_convert',
      asset: r.fromCcy,
      toAsset: r.toCcy,
      quantity: parseFloat(r.fromAmt),
      toQuantity: parseFloat(r.toAmt),
      price: parseFloat(r.fillPx || 0),
      fee: 0,
      feeCcy: r.fromCcy,
      timestamp: parseInt(r.ts),
      raw: r,
    }));
}

async function fetchEarnOrders(client, start, end) {
  const raw = await client.getAll('/api/v5/finance/savings/lending-history', {});

  return raw
    .filter(r => {
      const ts = parseInt(r.ts);
      return ts >= start && ts <= end;
    })
    .map(r => ({
      id: r.lendingId || r.ts,
      type: 'STAKING_REWARD',
      source: 'okx_earn',
      asset: r.ccy,
      quantity: parseFloat(r.earnings || r.amt || 0),
      price: 0, // will be filled by price lookup
      fee: 0,
      feeCcy: r.ccy,
      timestamp: parseInt(r.ts),
      raw: r,
    }));
}
