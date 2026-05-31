import process from "node:process";
import { Contract, JsonRpcProvider, Wallet, id, isHexString } from "ethers";

export const XLAYER_TESTNET_CHAIN_ID = 1952;
export const XLAYER_TESTNET_NAME = "X Layer Testnet";
export const XLAYER_TESTNET_RPC_URL = "https://testrpc.xlayer.tech/terigon";
export const XLAYER_TESTNET_EXPLORER_URL = "https://www.okx.com/web3/explorer/xlayer-test";

const SESSION_ANCHOR_ABI = ["function commit(bytes32 sessionHash) external"];
const COMMIT_SELECTOR = id("commit(bytes32)").slice(0, 10).toLowerCase();

interface AnchorProvider {
  getNetwork(): Promise<{ chainId: bigint | number | string }>;
  getTransaction(txHash: string): Promise<{ to?: string | null; data?: string } | null>;
  getTransactionReceipt(txHash: string): Promise<{ status?: number | null; blockNumber?: number } | null>;
}

export type AnchorMode = "testnet-signed" | "external-tx" | "not-configured" | "failed";

export interface AnchorSuccess {
  ok: true;
  mode: "testnet-signed" | "external-tx";
  chain: typeof XLAYER_TESTNET_NAME;
  chainId: typeof XLAYER_TESTNET_CHAIN_ID;
  sessionHash: string;
  sessionHashBytes32: string;
  txHash: string;
  explorerUrl: string;
  contractAddress?: string;
  blockNumber?: number;
}

export interface AnchorFailure {
  ok: false;
  mode: "not-configured" | "failed";
  chain: typeof XLAYER_TESTNET_NAME;
  chainId: typeof XLAYER_TESTNET_CHAIN_ID;
  sessionHash: string;
  sessionHashBytes32?: string;
  contractAddress?: string;
  error: string;
}

export type AnchorResult = AnchorSuccess | AnchorFailure;

export interface AnchorTxVerificationSuccess {
  ok: true;
  chainId: typeof XLAYER_TESTNET_CHAIN_ID;
  txHash: string;
  contractAddress: string;
  sessionHashBytes32: string;
  blockNumber?: number;
}

export interface AnchorTxVerificationFailure {
  ok: false;
  error: string;
}

export type AnchorTxVerificationResult = AnchorTxVerificationSuccess | AnchorTxVerificationFailure;

export async function commitSessionHash(sessionHash: string): Promise<AnchorResult> {
  let sessionHashBytes32: string;
  try {
    sessionHashBytes32 = sessionHashToBytes32(sessionHash);
  } catch (error) {
    return failure("failed", sessionHash, undefined, undefined, sanitizeAnchorError(error));
  }
  const externalTxHash = optionalEnv("DESK_XLAYER_ANCHOR_TX_HASH");
  const configuredChainId = Number(optionalEnv("DESK_XLAYER_CHAIN_ID") ?? XLAYER_TESTNET_CHAIN_ID);
  const rpcUrl = optionalEnv("DESK_XLAYER_RPC_URL") ?? XLAYER_TESTNET_RPC_URL;
  const contractAddress = optionalEnv("DESK_XLAYER_SESSION_ANCHOR_ADDRESS");
  const privateKey = optionalEnv("DESK_XLAYER_ANCHOR_PRIVATE_KEY");

  if (configuredChainId !== XLAYER_TESTNET_CHAIN_ID || process.env.DESK_XLAYER_ALLOW_MAINNET === "1") {
    return failure("failed", sessionHash, sessionHashBytes32, contractAddress, "anchor refused: only X Layer testnet chainId 1952 is allowed");
  }

  if (externalTxHash) {
    if (!isTransactionHash(externalTxHash)) {
      return failure("failed", sessionHash, sessionHashBytes32, contractAddress, "DESK_XLAYER_ANCHOR_TX_HASH must be a 32-byte hex transaction hash");
    }
    return {
      ok: true,
      mode: "external-tx",
      chain: XLAYER_TESTNET_NAME,
      chainId: XLAYER_TESTNET_CHAIN_ID,
      sessionHash,
      sessionHashBytes32,
      txHash: externalTxHash,
      explorerUrl: explorerTxUrl(externalTxHash),
      contractAddress,
    };
  }

  if (!privateKey || !contractAddress) {
    return failure(
      "not-configured",
      sessionHash,
      sessionHashBytes32,
      contractAddress,
      "set DESK_XLAYER_ANCHOR_PRIVATE_KEY and DESK_XLAYER_SESSION_ANCHOR_ADDRESS to submit an X Layer testnet commitment",
    );
  }
  if (!isHexString(contractAddress, 20)) {
    return failure("failed", sessionHash, sessionHashBytes32, contractAddress, "DESK_XLAYER_SESSION_ANCHOR_ADDRESS must be a 20-byte hex address");
  }

  try {
    const provider = new JsonRpcProvider(rpcUrl, XLAYER_TESTNET_CHAIN_ID);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== XLAYER_TESTNET_CHAIN_ID) {
      return failure("failed", sessionHash, sessionHashBytes32, contractAddress, `RPC returned chainId ${network.chainId}; expected 1952`);
    }

    const wallet = new Wallet(privateKey, provider);
    const contract = new Contract(contractAddress, SESSION_ANCHOR_ABI, wallet);
    const tx = await contract.commit(sessionHashBytes32);
    const receipt = await tx.wait(1);
    return {
      ok: true,
      mode: "testnet-signed",
      chain: XLAYER_TESTNET_NAME,
      chainId: XLAYER_TESTNET_CHAIN_ID,
      sessionHash,
      sessionHashBytes32,
      txHash: tx.hash,
      explorerUrl: explorerTxUrl(tx.hash),
      contractAddress,
      blockNumber: receipt?.blockNumber,
    };
  } catch (error) {
    return failure("failed", sessionHash, sessionHashBytes32, contractAddress, sanitizeAnchorError(error));
  }
}

export function commitmentEventPayload(result: AnchorResult): Record<string, unknown> {
  const base = {
    status: result.ok ? "submitted" : result.mode === "not-configured" ? "not-configured" : "failed",
    mode: result.mode,
    chain: result.chain,
    chainId: result.chainId,
    sessionHash: result.sessionHash,
    sessionHashBytes32: result.sessionHashBytes32,
    contractAddress: result.contractAddress,
  };
  if (!result.ok) {
    return {
      ...base,
      error: result.error,
      nonBlocking: true,
    };
  }
  return {
    ...base,
    txHash: result.txHash,
    explorerUrl: result.explorerUrl,
    blockNumber: result.blockNumber,
  };
}

export function sessionHashToBytes32(sessionHash: string): string {
  const hex = sessionHash.startsWith("sha256:") ? sessionHash.slice("sha256:".length) : sessionHash.replace(/^0x/, "");
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) {
    throw new Error("sessionHash must be sha256:<64 hex chars> or 0x-prefixed bytes32");
  }
  return `0x${hex.toLowerCase()}`;
}

export function explorerTxUrl(txHash: string): string {
  return `${XLAYER_TESTNET_EXPLORER_URL}/tx/${txHash}`;
}

export function isTransactionHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function commitCalldata(sessionHashBytes32: string): string {
  if (!isHexString(sessionHashBytes32, 32)) {
    throw new Error("sessionHashBytes32 must be a 32-byte hex value");
  }
  return `${COMMIT_SELECTOR}${sessionHashBytes32.slice(2).toLowerCase()}`;
}

export async function verifySessionAnchorTx(input: {
  txHash: string;
  contractAddress: string;
  sessionHashBytes32: string;
  rpcUrl?: string;
  provider?: AnchorProvider;
}): Promise<AnchorTxVerificationResult> {
  const txHash = input.txHash.trim();
  const contractAddress = input.contractAddress.trim();
  const sessionHashBytes32 = input.sessionHashBytes32.trim();

  if (!isTransactionHash(txHash)) {
    return { ok: false, error: "txHash must be a 32-byte hex transaction hash" };
  }
  if (!isHexString(contractAddress, 20)) {
    return { ok: false, error: "contractAddress must be a 20-byte hex address" };
  }
  if (!isHexString(sessionHashBytes32, 32)) {
    return { ok: false, error: "sessionHashBytes32 must be a 32-byte hex value" };
  }

  try {
    const provider = input.provider ?? new JsonRpcProvider(input.rpcUrl ?? optionalEnv("DESK_XLAYER_RPC_URL") ?? XLAYER_TESTNET_RPC_URL, XLAYER_TESTNET_CHAIN_ID);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== XLAYER_TESTNET_CHAIN_ID) {
      return { ok: false, error: `RPC returned chainId ${String(network.chainId)}; expected 1952` };
    }

    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return { ok: false, error: "transaction not found on X Layer testnet" };
    }
    if (!tx.to || tx.to.toLowerCase() !== contractAddress.toLowerCase()) {
      return { ok: false, error: `transaction recipient mismatch: ${tx.to ?? "missing"}` };
    }
    if ((tx.data ?? "").toLowerCase() !== commitCalldata(sessionHashBytes32)) {
      return { ok: false, error: "transaction calldata does not match SessionAnchor.commit(sessionHashBytes32)" };
    }

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return { ok: false, error: "transaction receipt not found on X Layer testnet" };
    }
    if (receipt.status !== 1) {
      return { ok: false, error: `transaction receipt status is ${receipt.status ?? "missing"}` };
    }

    return {
      ok: true,
      chainId: XLAYER_TESTNET_CHAIN_ID,
      txHash,
      contractAddress,
      sessionHashBytes32,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    return { ok: false, error: sanitizeAnchorError(error) };
  }
}

function failure(
  mode: AnchorFailure["mode"],
  sessionHash: string,
  sessionHashBytes32: string | undefined,
  contractAddress: string | undefined,
  error: string,
): AnchorFailure {
  return {
    ok: false,
    mode,
    chain: XLAYER_TESTNET_NAME,
    chainId: XLAYER_TESTNET_CHAIN_ID,
    sessionHash,
    sessionHashBytes32,
    contractAddress,
    error,
  };
}

function optionalEnv(key: string) {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function sanitizeAnchorError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/0x[a-fA-F0-9]{64,}/g, "0x[redacted]")
    .replace(/(private[-_ ]?key|secret|api[-_ ]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}
