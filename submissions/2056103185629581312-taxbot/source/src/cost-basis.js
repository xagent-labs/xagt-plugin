// Cost basis engine: FIFO, LIFO, HIFO lot tracking
// Returns TaxLot[] with gain/loss calculated per disposal

export class CostBasisEngine {
  constructor(method = 'HIFO') {
    this.method = method; // FIFO | LIFO | HIFO
    this.lots = {}; // asset -> [{qty, costPerUnit, acquiredDate, source}]
  }

  // Process transactions in chronological order
  process(txs) {
    const sorted = [...txs].sort((a, b) => a.timestamp - b.timestamp);
    const disposals = [];

    for (const tx of sorted) {
      if (tx.taxType === 'ACQUISITION' || tx.taxType === 'TRANSFER_IN') {
        this._addLot(tx);
      } else if (tx.taxType === 'CAPITAL_GAIN') {
        const disposal = this._disposeLot(tx);
        if (disposal) disposals.push(disposal);
      } else if (tx.taxType === 'ORDINARY_INCOME') {
        // Income events: record as acquisition at FMV (becomes basis if later sold)
        this._addLot({ ...tx, taxType: 'ACQUISITION' });
        disposals.push({
          ...tx,
          proceeds: tx.quantity * (tx.price || 0),
          costBasis: 0,
          gainLoss: tx.quantity * (tx.price || 0),
          isLongTerm: false,
          incomeType: 'ORDINARY',
        });
      }
    }

    return disposals;
  }

  _addLot(tx) {
    if (!this.lots[tx.asset]) this.lots[tx.asset] = [];
    this.lots[tx.asset].push({
      qty: tx.quantity,
      costPerUnit: tx.price || 0,
      acquiredDate: tx.timestamp,
      source: tx.source,
      id: tx.id,
    });
  }

  _disposeLot(tx) {
    const asset = tx.asset;
    if (!this.lots[asset] || this.lots[asset].length === 0) {
      // No basis found — common for coins moved from external wallets
      return {
        ...tx,
        proceeds: tx.quantity * tx.price,
        costBasis: 0,
        gainLoss: tx.quantity * tx.price,
        isLongTerm: false,
        missingBasis: true,
        note: 'Cost basis unknown — likely transferred from external wallet',
      };
    }

    const lots = this.lots[asset];
    this._sortLots(lots);

    let remaining = tx.quantity;
    let totalCost = 0;
    let acquiredDate = lots[0].acquiredDate;
    const usedLots = [];

    while (remaining > 0 && lots.length > 0) {
      const lot = lots[0];
      const used = Math.min(lot.qty, remaining);
      totalCost += used * lot.costPerUnit;
      remaining -= used;
      lot.qty -= used;
      usedLots.push({ ...lot, usedQty: used });
      if (lot.qty <= 1e-10) lots.shift();
    }

    const proceeds = tx.quantity * tx.price;
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const isLongTerm = tx.timestamp - acquiredDate > ONE_YEAR_MS;

    return {
      ...tx,
      proceeds,
      costBasis: totalCost,
      gainLoss: proceeds - totalCost,
      isLongTerm,
      acquiredDate,
      usedLots,
    };
  }

  _sortLots(lots) {
    switch (this.method) {
      case 'FIFO':
        lots.sort((a, b) => a.acquiredDate - b.acquiredDate);
        break;
      case 'LIFO':
        lots.sort((a, b) => b.acquiredDate - a.acquiredDate);
        break;
      case 'HIFO':
        lots.sort((a, b) => b.costPerUnit - a.costPerUnit); // highest cost first = lowest gain
        break;
    }
  }
}

// Run all three methods and return the one with lowest total tax liability
export function findOptimalMethod(txs) {
  const results = {};
  for (const method of ['FIFO', 'LIFO', 'HIFO']) {
    const engine = new CostBasisEngine(method);
    const disposals = engine.process(txs);
    const totalGain = disposals.reduce((sum, d) => sum + (d.gainLoss || 0), 0);
    results[method] = { disposals, totalGain };
  }

  const best = Object.entries(results).sort((a, b) => a[1].totalGain - b[1].totalGain)[0];
  return { method: best[0], ...best[1], allMethods: results };
}
