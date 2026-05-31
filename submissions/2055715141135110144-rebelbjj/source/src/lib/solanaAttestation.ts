import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SendOptions,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from "@solana/web3.js";
import { getPhantomProvider } from "@/lib/wallet";
import { TrainingMilestoneDefinition } from "@/lib/trainingLogs";

const DEVNET_ENDPOINT = clusterApiUrl("devnet");
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const MIN_DEVNET_BALANCE_LAMPORTS = 0.002 * LAMPORTS_PER_SOL;
const DEVNET_AIRDROP_LAMPORTS = 0.5 * LAMPORTS_PER_SOL;

export const SOLANA_DEMO_NETWORK_LABEL = "Solana Devnet";

export type SolanaAttestationResult = {
  signature: string;
  explorerUrl: string;
  endpoint: string;
  networkLabel: string;
  memo: string;
};

export type DevnetWalletStatus = {
  lamports: number;
  sol: number;
  needsAirdrop: boolean;
};

type SignedTransactionLike = Transaction & {
  serialize: (config?: { requireAllSignatures?: boolean; verifySignatures?: boolean }) => Uint8Array;
};

const buildMemoPayload = ({
  milestone,
  digest,
  currentValue,
  sessionCount,
  streak,
  verifiedSessionCount,
}: {
  milestone: TrainingMilestoneDefinition;
  digest: string;
  currentValue: number;
  sessionCount: number;
  streak: number;
  verifiedSessionCount: number;
}) => {
  const payload = {
    app: "phantom-mat-pass",
    version: 1,
    milestoneId: milestone.id,
    milestoneKind: milestone.kind,
    metric: milestone.metric,
    target: milestone.target,
    currentValue,
    sessionCount,
    streak,
    verifiedSessionCount,
    digest: digest.slice(0, 32),
    createdAt: Date.now(),
  };

  return JSON.stringify(payload);
};

export const createExplorerUrl = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

const createDevnetConnection = () => new Connection(DEVNET_ENDPOINT, "confirmed");

export const getDevnetWalletStatus = async (walletAddress: string): Promise<DevnetWalletStatus> => {
  const connection = createDevnetConnection();
  const lamports = await connection.getBalance(new PublicKey(walletAddress), "confirmed");
  return {
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
    needsAirdrop: lamports < MIN_DEVNET_BALANCE_LAMPORTS,
  };
};

export const requestDevnetAirdrop = async (walletAddress: string) => {
  const connection = createDevnetConnection();
  const publicKey = new PublicKey(walletAddress);
  const signature = await connection.requestAirdrop(publicKey, DEVNET_AIRDROP_LAMPORTS);
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");

  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed",
  );

  const balance = await connection.getBalance(publicKey, "confirmed");
  return {
    signature,
    explorerUrl: createExplorerUrl(signature),
    lamports: balance,
    sol: balance / LAMPORTS_PER_SOL,
  };
};

export const sendTrainingMemoAttestation = async (
  walletAddress: string,
  milestone: TrainingMilestoneDefinition,
  digest: string,
  currentValue: number,
  sessionCount: number,
  streak: number,
  verifiedSessionCount = 0,
): Promise<SolanaAttestationResult> => {
  const provider = getPhantomProvider();
  if (!provider?.signTransaction) {
    throw new Error("Your Phantom wallet does not support transaction signing in this browser.");
  }

  const connection = createDevnetConnection();
  const payer = new PublicKey(walletAddress);
  const memo = buildMemoPayload({ milestone, digest, currentValue, sessionCount, streak, verifiedSessionCount });
  const sendOptions: SendOptions = {
    preflightCommitment: "confirmed",
    skipPreflight: false,
    maxRetries: 3,
  };

  let signature: TransactionSignature | null = null;
  let attempts = 0;

  while (!signature && attempts < 2) {
    attempts += 1;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const transaction = new Transaction({
      feePayer: payer,
      recentBlockhash: blockhash,
    }).add(
      new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: new TextEncoder().encode(memo),
      }),
    );

    try {
      const signedTransaction = (await provider.signTransaction(transaction)) as SignedTransactionLike;
      const serialized = signedTransaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      signature = await connection.sendRawTransaction(serialized, sendOptions);
      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const expired = message.toLowerCase().includes("block height exceeded") || message.toLowerCase().includes("expired");
      if (!expired || attempts >= 2) {
        throw error;
      }
    }
  }

  if (!signature) {
    throw new Error("Unable to confirm the Devnet memo transaction.");
  }

  return {
    signature,
    explorerUrl: createExplorerUrl(signature),
    endpoint: DEVNET_ENDPOINT,
    networkLabel: SOLANA_DEMO_NETWORK_LABEL,
    memo,
  };
};
