import { tool, jsonSchema } from 'ai';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

const EVM_RPC: Record<string, { rpc: string; explorer: string; native: string; nativeDecimals: number; chainId: number; name: string }> = {
  ethereum: { rpc: 'https://ethereum.publicnode.com', explorer: 'https://etherscan.io', native: 'ETH', nativeDecimals: 18, chainId: 1, name: 'Ethereum' },
  base: { rpc: 'https://base.publicnode.com', explorer: 'https://basescan.org', native: 'ETH', nativeDecimals: 18, chainId: 8453, name: 'Base' },
  arbitrum: { rpc: 'https://arbitrum-one.publicnode.com', explorer: 'https://arbiscan.io', native: 'ETH', nativeDecimals: 18, chainId: 42161, name: 'Arbitrum One' },
  polygon: { rpc: 'https://polygon-bor.publicnode.com', explorer: 'https://polygonscan.com', native: 'MATIC', nativeDecimals: 18, chainId: 137, name: 'Polygon' },
  bsc: { rpc: 'https://bsc.publicnode.com', explorer: 'https://bscscan.com', native: 'BNB', nativeDecimals: 18, chainId: 56, name: 'BNB Chain' },
};

const asJsonSchema = (properties: Record<string, unknown>, required: string[] = []) =>
  jsonSchema({ type: 'object', additionalProperties: false, properties, required });

async function rpc(url: string, method: string, params: unknown[], timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { result?: unknown; error?: { code: number; message: string } };
    if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`);
    return json.result;
  } finally {
    clearTimeout(t);
  }
}

const hexToBigInt = (hex: string): bigint => BigInt(hex);
const hexToNumber = (hex: string): number => Number(BigInt(hex));
const formatUnits = (value: bigint, decimals: number): number => {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const frac = value % divisor;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 6);
  return Number(`${whole}.${fracStr}`);
};

const lamportsToSol = (lamports: number): number => lamports / 1e9;

const truncate = <T>(arr: T[], n: number): T[] => arr.slice(0, n);

const isEvmAddress = (s: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(s);
const isSolanaAddress = (s: string): boolean => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s) && !s.startsWith('0x');

export const chainTools = {
  detect_address: tool({
    description:
      'Detect what kind of address/hash a string is: EVM address (0x... 40 hex), Solana address (32-44 base58), EVM tx hash (0x... 64 hex), Solana signature (87-88 base58). Always call this FIRST when user gives any unfamiliar long string before deciding which other tool to use.',
    inputSchema: asJsonSchema({ value: { type: 'string', description: 'The address or hash to identify' } }, ['value']),
    execute: async (input) => {
      const { value } = input as { value: string };
      const v = value.trim();
      if (/^0x[a-fA-F0-9]{64}$/.test(v)) return { kind: 'evm_tx_hash', value: v, hint: 'Use evm_tx_decode (pick chain by context)' };
      if (/^0x[a-fA-F0-9]{40}$/.test(v)) return { kind: 'evm_address', value: v, hint: 'Use evm_wallet_overview (pick chain by context, or try ethereum first)' };
      if (/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(v)) return { kind: 'solana_signature', value: v, hint: 'Use sol_tx_decode' };
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v)) return { kind: 'solana_address', value: v, hint: 'Use sol_wallet_overview' };
      return { kind: 'unknown', value: v, hint: 'Not an address or tx hash. Treat as plain question.' };
    },
  }),

  sol_wallet_overview: tool({
    description:
      'Get a Solana wallet overview: native SOL balance + top SPL token holdings (with mint, amount, decimals). Use when user gives a Solana address and asks about portfolio / holdings / "what is in this wallet".',
    inputSchema: asJsonSchema(
      { address: { type: 'string', description: 'Solana wallet address (base58, 32-44 chars)' } },
      ['address']
    ),
    execute: async (input) => {
      const { address } = input as { address: string };
      if (!isSolanaAddress(address)) return { error: 'Not a valid Solana address.' };
      try {
        const [balRes, tokenRes] = await Promise.all([
          rpc(SOLANA_RPC, 'getBalance', [address]) as Promise<{ value: number; context: { slot: number } }>,
          rpc(SOLANA_RPC, 'getTokenAccountsByOwner', [
            address,
            { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
            { encoding: 'jsonParsed' },
          ]) as Promise<{ value: Array<{ account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number | null; decimals: number; uiAmountString: string } } } } } }> }>,
        ]);
        const sol = lamportsToSol(balRes.value);
        const tokens = (tokenRes.value || [])
          .map((t) => t.account.data.parsed.info)
          .filter((t) => t.tokenAmount.uiAmount && t.tokenAmount.uiAmount > 0)
          .map((t) => ({
            mint: t.mint,
            amount: t.tokenAmount.uiAmount,
            decimals: t.tokenAmount.decimals,
          }))
          .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
        return {
          source: 'Solana mainnet-beta RPC',
          address,
          native: { symbol: 'SOL', amount: sol },
          spl_token_count: tokens.length,
          top_spl_tokens: truncate(tokens, 15),
          explorer_url: `https://solscan.io/account/${address}`,
        };
      } catch (e) {
        return { error: String(e) };
      }
    },
  }),

  sol_recent_txs: tool({
    description:
      'Get the most recent transaction signatures for a Solana address (latest activity). Returns signature, slot, blockTime, err status. Combine with sol_tx_decode to inspect specific ones.',
    inputSchema: asJsonSchema(
      {
        address: { type: 'string', description: 'Solana wallet address' },
        limit: { type: 'number', minimum: 1, maximum: 25, description: 'Number of signatures' },
      },
      ['address']
    ),
    execute: async (input) => {
      const { address, limit = 10 } = input as { address: string; limit?: number };
      if (!isSolanaAddress(address)) return { error: 'Not a valid Solana address.' };
      try {
        const sigs = (await rpc(SOLANA_RPC, 'getSignaturesForAddress', [address, { limit }])) as Array<{
          signature: string;
          slot: number;
          blockTime: number | null;
          err: unknown;
          memo: string | null;
        }>;
        const rows = sigs.map((s) => ({
          signature: s.signature,
          slot: s.slot,
          ts_unix: s.blockTime,
          ts_iso: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
          success: s.err === null,
          memo: s.memo,
        }));
        return {
          source: 'Solana mainnet-beta RPC',
          address,
          count: rows.length,
          recent: rows,
          explorer_url: `https://solscan.io/account/${address}#transactions`,
        };
      } catch (e) {
        return { error: String(e) };
      }
    },
  }),

  sol_tx_decode: tool({
    description:
      'Decode a single Solana transaction signature into a human-readable summary: signers, instructions, programs invoked, fee, success/fail, token transfers. Use when user gives a Solana signature (87-88 base58 chars) and asks "what is this tx".',
    inputSchema: asJsonSchema(
      { signature: { type: 'string', description: 'Solana transaction signature' } },
      ['signature']
    ),
    execute: async (input) => {
      const { signature } = input as { signature: string };
      try {
        const tx = (await rpc(SOLANA_RPC, 'getTransaction', [
          signature,
          { maxSupportedTransactionVersion: 0, encoding: 'jsonParsed' },
        ])) as {
          slot: number;
          blockTime: number | null;
          meta: { err: unknown; fee: number; preBalances: number[]; postBalances: number[]; preTokenBalances?: Array<{ owner: string; mint: string; uiTokenAmount: { uiAmount: number | null; decimals: number } }>; postTokenBalances?: Array<{ owner: string; mint: string; uiTokenAmount: { uiAmount: number | null; decimals: number } }> } | null;
          transaction: { message: { accountKeys: Array<{ pubkey: string; signer: boolean; writable: boolean }>; instructions: Array<{ programId: string; parsed?: unknown; program?: string; accounts?: string[] }> } };
        } | null;

        if (!tx) return { error: 'Transaction not found (may be too old — Solana RPC only retains recent slots).', signature };
        const fee = (tx.meta?.fee ?? 0) / 1e9;
        const signers = tx.transaction.message.accountKeys.filter((k) => k.signer).map((k) => k.pubkey);
        const programs = Array.from(
          new Set(
            tx.transaction.message.instructions
              .map((ix) => (ix as { program?: string }).program || (ix as { programId?: string }).programId)
              .filter(Boolean) as string[]
          )
        );

        // Compute SPL token balance deltas per (owner,mint)
        const pre = tx.meta?.preTokenBalances || [];
        const post = tx.meta?.postTokenBalances || [];
        const key = (b: { owner: string; mint: string }) => `${b.owner}::${b.mint}`;
        const preMap = new Map(pre.map((b) => [key(b), b.uiTokenAmount.uiAmount ?? 0]));
        const postMap = new Map(post.map((b) => [key(b), b.uiTokenAmount.uiAmount ?? 0]));
        const allKeys = new Set([...preMap.keys(), ...postMap.keys()]);
        const tokenDeltas: Array<{ owner: string; mint: string; delta: number }> = [];
        for (const k of allKeys) {
          const delta = (postMap.get(k) ?? 0) - (preMap.get(k) ?? 0);
          if (delta !== 0) {
            const [owner, mint] = k.split('::');
            tokenDeltas.push({ owner, mint, delta });
          }
        }

        // Compute SOL balance deltas per signer
        const solDeltas: Array<{ account: string; delta_sol: number }> = [];
        const keys = tx.transaction.message.accountKeys;
        const preB = tx.meta?.preBalances || [];
        const postB = tx.meta?.postBalances || [];
        for (let i = 0; i < keys.length; i++) {
          const d = ((postB[i] ?? 0) - (preB[i] ?? 0)) / 1e9;
          if (Math.abs(d) > 0.000001) solDeltas.push({ account: keys[i].pubkey, delta_sol: Number(d.toFixed(6)) });
        }

        return {
          source: 'Solana mainnet-beta RPC',
          signature,
          slot: tx.slot,
          ts_iso: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
          success: tx.meta?.err === null,
          fee_sol: fee,
          signers,
          programs_invoked: programs,
          sol_balance_changes: solDeltas,
          spl_token_changes: tokenDeltas,
          explorer_url: `https://solscan.io/tx/${signature}`,
        };
      } catch (e) {
        return { error: String(e) };
      }
    },
  }),

  evm_wallet_overview: tool({
    description:
      'Get an EVM wallet overview on a chosen chain: native balance + transaction count (nonce). Supports ethereum, base, arbitrum, polygon, bsc. Note: ERC20 token holdings are NOT included — point user to the explorer link for full portfolio if asked.',
    inputSchema: asJsonSchema(
      {
        address: { type: 'string', description: 'EVM address (0x... 40 hex)' },
        chain: {
          type: 'string',
          enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc'],
          description: 'Which chain to check. Default ethereum.',
        },
      },
      ['address']
    ),
    execute: async (input) => {
      const { address, chain = 'ethereum' } = input as { address: string; chain?: keyof typeof EVM_RPC };
      if (!isEvmAddress(address)) return { error: 'Not a valid EVM address.' };
      const conf = EVM_RPC[chain];
      if (!conf) return { error: `Unknown chain ${chain}.` };
      try {
        const [balHex, txCountHex] = await Promise.all([
          rpc(conf.rpc, 'eth_getBalance', [address, 'latest']) as Promise<string>,
          rpc(conf.rpc, 'eth_getTransactionCount', [address, 'latest']) as Promise<string>,
        ]);
        const balance = formatUnits(hexToBigInt(balHex), conf.nativeDecimals);
        const txCount = hexToNumber(txCountHex);
        return {
          source: `${conf.name} via PublicNode RPC`,
          address,
          chain: conf.name,
          native: { symbol: conf.native, amount: balance },
          transaction_count: txCount,
          note: 'ERC20 holdings not included in this tool — link the user to the explorer for the full token portfolio.',
          explorer_url: `${conf.explorer}/address/${address}`,
        };
      } catch (e) {
        return { error: String(e) };
      }
    },
  }),

  evm_wallet_multi_chain: tool({
    description:
      'Get an EVM wallet native balance across multiple chains at once (ethereum + base + arbitrum + polygon + bsc). Use when user asks about an EVM address without specifying a chain — gives a multi-chain snapshot.',
    inputSchema: asJsonSchema(
      { address: { type: 'string', description: 'EVM address (0x... 40 hex)' } },
      ['address']
    ),
    execute: async (input) => {
      const { address } = input as { address: string };
      if (!isEvmAddress(address)) return { error: 'Not a valid EVM address.' };
      const results: Record<string, unknown> = {};
      await Promise.all(
        Object.entries(EVM_RPC).map(async ([key, conf]) => {
          try {
            const balHex = (await rpc(conf.rpc, 'eth_getBalance', [address, 'latest'], 8000)) as string;
            const balance = formatUnits(hexToBigInt(balHex), conf.nativeDecimals);
            results[key] = { chain: conf.name, native: conf.native, amount: balance, explorer_url: `${conf.explorer}/address/${address}` };
          } catch (e) {
            results[key] = { chain: conf.name, error: String(e) };
          }
        })
      );
      return { source: 'PublicNode RPCs (5 chains, parallel)', address, by_chain: results };
    },
  }),

  evm_tx_decode: tool({
    description:
      'Decode an EVM transaction by hash: from, to, value, gas used, status, block, contract called. Supports ethereum, base, arbitrum, polygon, bsc. Use when user gives a 0x-prefixed 64-char hash.',
    inputSchema: asJsonSchema(
      {
        txHash: { type: 'string', description: 'EVM transaction hash (0x... 64 hex)' },
        chain: {
          type: 'string',
          enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc'],
          description: 'Which chain. Default ethereum.',
        },
      },
      ['txHash']
    ),
    execute: async (input) => {
      const { txHash, chain = 'ethereum' } = input as { txHash: string; chain?: keyof typeof EVM_RPC };
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) return { error: 'Not a valid EVM tx hash.' };
      const conf = EVM_RPC[chain];
      if (!conf) return { error: `Unknown chain ${chain}.` };
      try {
        const [tx, receipt] = await Promise.all([
          rpc(conf.rpc, 'eth_getTransactionByHash', [txHash]) as Promise<{
            blockNumber: string | null;
            from: string;
            to: string | null;
            value: string;
            gasPrice: string;
            gas: string;
            input: string;
            nonce: string;
          } | null>,
          rpc(conf.rpc, 'eth_getTransactionReceipt', [txHash]) as Promise<{
            blockNumber: string;
            gasUsed: string;
            status: string;
            contractAddress: string | null;
            logs: Array<{ address: string; topics: string[] }>;
          } | null>,
        ]);

        if (!tx) return { error: `Transaction ${txHash} not found on ${conf.name}. Try another chain.` };

        const valueWei = hexToBigInt(tx.value);
        const value = formatUnits(valueWei, conf.nativeDecimals);
        const gasPriceWei = hexToBigInt(tx.gasPrice);
        const gasUsed = receipt ? hexToBigInt(receipt.gasUsed) : 0n;
        const feeWei = gasPriceWei * gasUsed;
        const fee = formatUnits(feeWei, conf.nativeDecimals);

        // Detect ERC20 Transfer (topic[0] = keccak256("Transfer(address,address,uint256)"))
        const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
        const erc20Transfers = (receipt?.logs || [])
          .filter((l) => l.topics?.[0] === TRANSFER_TOPIC && l.topics.length >= 3)
          .slice(0, 10)
          .map((l) => ({
            token_contract: l.address,
            from: '0x' + l.topics[1].slice(-40),
            to: '0x' + l.topics[2].slice(-40),
          }));

        return {
          source: `${conf.name} via PublicNode RPC`,
          txHash,
          chain: conf.name,
          status: receipt?.status === '0x1' ? 'success' : receipt?.status === '0x0' ? 'failed' : 'pending',
          block_number: tx.blockNumber ? hexToNumber(tx.blockNumber) : null,
          from: tx.from,
          to: tx.to,
          contract_created: receipt?.contractAddress || null,
          native_value: { symbol: conf.native, amount: value },
          fee: { symbol: conf.native, amount: fee },
          gas_used: gasUsed.toString(),
          erc20_transfer_count: erc20Transfers.length,
          erc20_transfers_preview: erc20Transfers,
          input_data_length: tx.input.length / 2 - 1,
          is_contract_call: tx.input !== '0x',
          explorer_url: `${conf.explorer}/tx/${txHash}`,
        };
      } catch (e) {
        return { error: String(e) };
      }
    },
  }),
};
