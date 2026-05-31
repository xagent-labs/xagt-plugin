// Classify each transaction into IRS tax categories
// Returns enriched TaxEvent with taxType and notes

const STABLECOIN = new Set(['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'FRAX']);

export function classifyTransactions(txs) {
  return txs.map(tx => ({ ...tx, ...classify(tx) }));
}

function classify(tx) {
  switch (tx.type) {
    case 'BUY':
      return { taxType: 'ACQUISITION', taxable: false, note: 'Purchase — establishes cost basis' };

    case 'SELL':
      return { taxType: 'CAPITAL_GAIN', taxable: true, note: 'Disposal — triggers capital gain/loss' };

    case 'CONVERT':
      // Crypto-to-crypto swap = taxable disposal of fromAsset
      if (STABLECOIN.has(tx.asset) && STABLECOIN.has(tx.toAsset)) {
        return { taxType: 'NON_TAXABLE', taxable: false, note: 'Stablecoin-to-stablecoin swap' };
      }
      return { taxType: 'CAPITAL_GAIN', taxable: true, note: 'Crypto-to-crypto swap = taxable disposal' };

    case 'DEPOSIT':
      return { taxType: 'TRANSFER_IN', taxable: false, note: 'Incoming transfer — preserves original cost basis' };

    case 'WITHDRAWAL':
      return { taxType: 'TRANSFER_OUT', taxable: false, note: 'Outgoing transfer — cost basis follows the coin' };

    case 'STAKING_REWARD':
      return { taxType: 'ORDINARY_INCOME', taxable: true, note: 'Staking/lending reward — ordinary income at FMV on receipt' };

    case 'AIRDROP':
      return { taxType: 'ORDINARY_INCOME', taxable: true, note: 'Airdrop — ordinary income at FMV on receipt' };

    default:
      return { taxType: 'UNKNOWN', taxable: false, note: 'Manual review required' };
  }
}
