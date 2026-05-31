import test from "node:test";
import assert from "node:assert/strict";
import {
  XLAYER_TESTNET_CHAIN_ID,
  commitCalldata,
  commitSessionHash,
  commitmentEventPayload,
  explorerTxUrl,
  sessionHashToBytes32,
  verifySessionAnchorTx,
} from "../src/anchor/xlayer-anchor.js";

const sessionHash = `sha256:${"a".repeat(64)}`;
const txHash = `0x${"b".repeat(64)}`;
const contractAddress = `0x${"1".repeat(40)}`;

test("converts verifier session hash to bytes32 commitment input", () => {
  assert.equal(sessionHashToBytes32(sessionHash), `0x${"a".repeat(64)}`);
  assert.equal(sessionHashToBytes32(`0x${"c".repeat(64)}`), `0x${"c".repeat(64)}`);
  assert.throws(() => sessionHashToBytes32("sha256:not-hex"), /sessionHash must be/);
});

test("uses externally supplied X Layer testnet tx hash without a signing key", async () => {
  await withAnchorEnv({ DESK_XLAYER_ANCHOR_TX_HASH: txHash }, async () => {
    const result = await commitSessionHash(sessionHash);
    assert.equal(result.ok, true);
    assert.equal(result.chainId, XLAYER_TESTNET_CHAIN_ID);
    assert.equal(result.txHash, txHash);
    assert.equal(result.explorerUrl, explorerTxUrl(txHash));

    const payload = commitmentEventPayload(result);
    assert.equal(payload.status, "submitted");
    assert.equal(payload.txHash, txHash);
    assert.equal(payload.chainId, XLAYER_TESTNET_CHAIN_ID);
  });
});

test("fails closed when anchor config points away from X Layer testnet", async () => {
  await withAnchorEnv({ DESK_XLAYER_CHAIN_ID: "196", DESK_XLAYER_ANCHOR_TX_HASH: txHash }, async () => {
    const result = await commitSessionHash(sessionHash);
    assert.equal(result.ok, false);
    assert.equal(result.mode, "failed");
    assert.match(result.error, /only X Layer testnet/);
  });
});

test("logs non-blocking not-configured state when no signer or tx hash is present", async () => {
  await withAnchorEnv({}, async () => {
    const result = await commitSessionHash(sessionHash);
    assert.equal(result.ok, false);
    assert.equal(result.mode, "not-configured");

    const payload = commitmentEventPayload(result);
    assert.equal(payload.status, "not-configured");
    assert.equal(payload.nonBlocking, true);
    assert.match(String(payload.error), /DESK_XLAYER_ANCHOR_PRIVATE_KEY/);
  });
});

test("returns failure object for malformed session hash", async () => {
  await withAnchorEnv({}, async () => {
    const result = await commitSessionHash("sha256:not-hex");
    assert.equal(result.ok, false);
    assert.equal(result.mode, "failed");
    assert.match(result.error, /sessionHash must be/);
  });
});

test("verifies an X Layer anchor transaction binds the expected contract and session hash", async () => {
  const sessionHashBytes32 = sessionHashToBytes32(sessionHash);
  const result = await verifySessionAnchorTx({
    txHash,
    contractAddress,
    sessionHashBytes32,
    provider: mockProvider({
      to: contractAddress,
      data: commitCalldata(sessionHashBytes32),
      status: 1,
      blockNumber: 12345,
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.blockNumber, 12345);
});

test("rejects an anchor transaction whose calldata does not commit the trace hash", async () => {
  const result = await verifySessionAnchorTx({
    txHash,
    contractAddress,
    sessionHashBytes32: sessionHashToBytes32(sessionHash),
    provider: mockProvider({
      to: contractAddress,
      data: commitCalldata(`0x${"c".repeat(64)}`),
      status: 1,
    }),
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /calldata/);
});

function mockProvider({
  chainId = XLAYER_TESTNET_CHAIN_ID,
  to,
  data,
  status,
  blockNumber = 1,
}: {
  chainId?: number;
  to: string;
  data: string;
  status: number;
  blockNumber?: number;
}) {
  return {
    async getNetwork() {
      return { chainId: BigInt(chainId) };
    },
    async getTransaction() {
      return { to, data };
    },
    async getTransactionReceipt() {
      return { status, blockNumber };
    },
  };
}

async function withAnchorEnv(values: Record<string, string>, run: () => Promise<void>) {
  const keys = [
    "DESK_XLAYER_ANCHOR_TX_HASH",
    "DESK_XLAYER_CHAIN_ID",
    "DESK_XLAYER_RPC_URL",
    "DESK_XLAYER_SESSION_ANCHOR_ADDRESS",
    "DESK_XLAYER_ANCHOR_PRIVATE_KEY",
    "DESK_XLAYER_ALLOW_MAINNET",
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    delete process.env[key];
  }
  Object.assign(process.env, values);
  try {
    await run();
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
