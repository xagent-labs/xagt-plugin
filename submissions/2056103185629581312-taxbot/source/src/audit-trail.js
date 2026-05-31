// X Layer audit trail — writes SHA-256 hash of tax ledger to X Layer
// Chain ID: 196 | RPC: https://xlayerrpc.okx.com | Gas token: OKB

import { ethers } from 'ethers';
import crypto from 'crypto';

const XLAYER_RPC = 'https://xlayerrpc.okx.com';
const CHAIN_ID = 196;

// Minimal storage contract ABI — stores hash in tx calldata (no contract needed)
// We use a simple ETH transfer with calldata to store the hash on-chain cheaply

export function hashLedger(disposals) {
  const ledgerStr = JSON.stringify(
    disposals.map(d => ({
      id: d.id,
      asset: d.asset,
      qty: d.quantity,
      proceeds: d.proceeds,
      basis: d.costBasis,
      gain: d.gainLoss,
      ts: d.timestamp,
    }))
  );
  return '0x' + crypto.createHash('sha256').update(ledgerStr).digest('hex');
}

export async function publishAuditTrail(disposals, privateKey) {
  if (!privateKey) {
    return { skipped: true, reason: 'No XLAYER_PRIVATE_KEY set — audit trail skipped' };
  }

  const provider = new ethers.JsonRpcProvider(XLAYER_RPC, { chainId: CHAIN_ID, name: 'xlayer' });
  const wallet = new ethers.Wallet(privateKey, provider);
  const hash = hashLedger(disposals);

  // Send 0 OKB to self with hash as calldata — cheapest on-chain storage
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0n,
    data: hash, // 32-byte hash stored as calldata
    gasLimit: 21_200n,
  });

  await tx.wait();

  return {
    txHash: tx.hash,
    ledgerHash: hash,
    explorerUrl: `https://www.okx.com/explorer/xlayer/tx/${tx.hash}`,
    chain: 'X Layer (Chain ID 196)',
  };
}
