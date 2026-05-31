import { test } from "node:test";
import assert from "node:assert/strict";
import { OkxCexAdapter } from "../src/okx/cex.js";

function clearCreds() {
  delete process.env.OKX_API_KEY;
  delete process.env.OKX_SECRET_KEY;
  delete process.env.OKX_API_SECRET;
  delete process.env.OKX_API_PASSPHRASE;
  delete process.env.OKX_PASSPHRASE;
}

test("adapter reports degraded mode when credentials missing", async () => {
  const prior = { ...process.env };
  clearCreds();
  try {
    const adapter = new OkxCexAdapter({});
    assert.equal(adapter.isLive, false);
    const result = await adapter.placeOrder({
      instId: "BTC-USDT",
      side: "buy",
      ordType: "limit",
      px: 70000,
      sz: 0.001,
      clOrdId: "cli_test_1",
      notionalUsd: 70,
    });
    assert.equal(result.ok, true);
    assert.equal(result.degraded, true);
    assert.equal(result.mode, "degraded-no-creds");
    assert.equal(result.state, "submitted");
    assert.match(result.reason ?? "", /PAPER-FALLBACK/);
  } finally {
    Object.assign(process.env, prior);
  }
});

test("guard blocks notional > maxNotionalUsd", () => {
  const adapter = new OkxCexAdapter({ maxNotionalUsd: 200 });
  const g = adapter.guard({
    instId: "BTC-USDT",
    side: "buy",
    ordType: "limit",
    px: 70000,
    sz: 1,
    clOrdId: "cli_test_2",
    notionalUsd: 70000,
  });
  assert.equal(g.ok, false);
});

test("guard blocks instrument outside allowlist", () => {
  const adapter = new OkxCexAdapter({ instrumentAllowlist: ["BTC-USDT"] });
  const g = adapter.guard({
    instId: "RUGCAT-USDT",
    side: "buy",
    ordType: "limit",
    px: 1,
    sz: 1,
    clOrdId: "cli_test_3",
    notionalUsd: 1,
  });
  assert.equal(g.ok, false);
});

test("guard blocks market-style ordType", () => {
  const adapter = new OkxCexAdapter({ instrumentAllowlist: ["BTC-USDT"], maxNotionalUsd: 1000 });
  const g = adapter.guard({
    instId: "BTC-USDT",
    side: "buy",
    ordType: "market" as unknown as "limit",
    px: 1,
    sz: 1,
    clOrdId: "cli_test_4",
    notionalUsd: 1,
  });
  assert.equal(g.ok, false);
});
