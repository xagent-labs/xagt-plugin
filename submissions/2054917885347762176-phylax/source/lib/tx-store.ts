/**
 * tx-store.ts
 * In-memory transaction store.
 * QuoteCard pushes confirmed trades here.
 * PortfolioPanel subscribes and renders them.
 * State resets on page refresh — consistent with the rest of the app's in-memory design.
 */

export interface TxRecord {
  id: string;
  fromSymbol: string;
  toSymbol: string;
  amountUsd: number;
  expectedOutputUsd: number;
  gasFeeUsd: number;
  txHash: string;
  explorerUrl: string | null;
  chain: string;
  confirmedAt: string; // ISO timestamp
}

type Listener = (txs: TxRecord[]) => void;

const transactions: TxRecord[] = [];
const listeners = new Set<Listener>();

export function addTx(tx: TxRecord): void {
  transactions.unshift(tx); // newest first
  listeners.forEach((fn) => fn([...transactions]));
}

export function getTxs(): TxRecord[] {
  return [...transactions];
}

export function subscribeTxs(fn: Listener): () => void {
  listeners.add(fn);
  fn([...transactions]); // emit current state immediately on subscribe
  return () => listeners.delete(fn);
}
