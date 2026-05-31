import test from "node:test";
import assert from "node:assert/strict";
import { OkxSkillAdapter } from "../src/okx/skill-adapter.js";

test("OKX adapter exposes fixture-backed skills for the desk path", () => {
  const adapter = new OkxSkillAdapter("fixture");
  const [risky, clean] = adapter.scoutCandidates();

  assert.equal(risky?.skillName, "okx-dex-signal");
  assert.equal(clean?.skillName, "okx-dex-trenches");

  const riskySecurity = adapter.securityCheck(risky!);
  const cleanSecurity = adapter.securityCheck(clean!);
  const riskyRisk = adapter.riskCheck(risky!, riskySecurity);
  const cleanRisk = adapter.riskCheck(clean!, cleanSecurity);
  const wallet = adapter.walletSnapshot();
  const quote = adapter.quoteSwap(clean!, 50);
  const simulation = adapter.simulateQuote(clean!, quote);
  const yieldIdea = adapter.discoverYield();

  assert.equal(riskySecurity.skillName, "okx-security");
  assert.equal(riskySecurity.verdict, "blocked");
  assert.match(riskySecurity.responseHash, /^sha256:/);
  assert.equal(cleanSecurity.verdict, "clear");
  assert.equal(riskyRisk.skillName, "okx-security");
  assert.equal(riskyRisk.verdict, "veto");
  assert.equal(cleanRisk.verdict, "approved");
  assert.equal(wallet.skillName, "okx-agentic-wallet");
  assert.equal(quote.skillName, "okx-dex-swap");
  assert.equal(simulation.skillName, "okx-onchain-gateway");
  assert.match(simulation.resultHash, /^sha256:/);
  assert.equal(yieldIdea.skillName, "okx-defi-invest");
});
