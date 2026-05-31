import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { OkxDexAdapter } from "../src/okx/dex.js";

const dexSourcePath = path.resolve(process.cwd(), "src/okx/dex.ts");

function clearDexCreds() {
  delete process.env.OKX_DEX_API_KEY;
  delete process.env.OKX_DEX_API_SECRET;
  delete process.env.OKX_DEX_PASSPHRASE;
  delete process.env.OKX_DEX_PROJECT_ID;
}

test("dex adapter source contains no broadcast call sites", () => {
  const src = fs.readFileSync(dexSourcePath, "utf8");
  const forbidden = ["sendRawTransaction", "sendTransaction(", "eth_sendUserOperation", "eth_sendTransaction"];
  for (const needle of forbidden) {
    assert.equal(src.includes(needle), false, `forbidden broadcast call site present: ${needle}`);
  }
  assert.match(src, /broadcast: false/);
});

test("dex adapter degrades to fixture quote when creds missing", async () => {
  const prior = { ...process.env };
  clearDexCreds();
  try {
    const adapter = new OkxDexAdapter({});
    assert.equal(adapter.isLive, false);
    const q = await adapter.quote({
      chainId: 1952,
      fromTokenAddress: "0x0000000000000000000000000000000000000000",
      toTokenAddress: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
      amount: "1000000",
    });
    assert.equal(q.ok, true);
    assert.equal(q.degraded, true);
    assert.equal(q.mode, "degraded-no-creds");
  } finally {
    Object.assign(process.env, prior);
  }
});

test("dex adapter validates slippage cap", async () => {
  const adapter = new OkxDexAdapter({ maxSlippageBps: 100 });
  const r = await adapter.buildSwapCalldata({
    chainId: 1952,
    fromTokenAddress: "0xfrom",
    toTokenAddress: "0xto",
    amount: "1",
    userWalletAddress: "0xuser",
    slippageBps: 5000,
  });
  assert.equal(r.ok, false);
  assert.equal(r.mode, "degraded-config");
});

test("dex adapter returns broadcast:false envelope in degraded mode", async () => {
  const prior = { ...process.env };
  clearDexCreds();
  try {
    const adapter = new OkxDexAdapter({});
    const r = await adapter.buildSwapCalldata({
      chainId: 1952,
      fromTokenAddress: "0xfrom",
      toTokenAddress: "0xto",
      amount: "1",
      userWalletAddress: "0x0000000000000000000000000000000000000001",
      slippageBps: 80,
    });
    assert.equal(r.ok, true);
    assert.equal(r.broadcast, false);
    assert.ok(r.tx && r.tx.data.startsWith("0x"));
  } finally {
    Object.assign(process.env, prior);
  }
});
