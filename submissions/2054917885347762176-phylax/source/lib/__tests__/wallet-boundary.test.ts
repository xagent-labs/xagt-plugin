import { SignJWT, generateKeyPair, exportJWK } from "jose";

// Setup environment before any imports
process.env.NEXT_PUBLIC_PRIVY_APP_ID = "mock_app_id";
process.env.PRIVY_APP_SECRET = "mock_app_secret";
process.env.ANTHROPIC_API_KEY = "mock_anthropic_key";

async function runTests() {
  console.log("\n🛡️ Wallet Boundary Tests (Phase 2)\n");

  const { Anthropic } = await import("@anthropic-ai/sdk");

  const { __setAnthropicForTesting } = await import("../anthropic");

  let anthropicCallCount = 0;
  (global as any).__mockChatWithFallback = async () => {
    anthropicCallCount++;
    if (anthropicCallCount === 2) {
      anthropicCallCount = 0; // reset
      return {
        usedProvider: "anthropic",
        response: {
          stopReason: "end_turn",
          textContent: "Here is your quote.",
          toolCalls: [],
          rawContent: []
        }
      };
    }
    return {
      usedProvider: "anthropic",
      response: {
        stopReason: "tool_use",
        textContent: "I will quote that for you.",
        toolCalls: [
          {
            id: "tool_123",
            name: "get_swap_quote",
            input: { chain: "x-layer", symbol: "USDC", amountUsd: 10 }
          }
        ],
        rawContent: []
      }
    };
  };

  const { __setPrivyClientForTesting, verifySession, verifyWalletSession } = await import("../privy-auth");
  const { runAgentLoop } = await import("../anthropic");
  const { registry } = await import("../tools/registry");

  // Create a mock PrivyClient
  const mockPrivyClient = {
    utils: () => ({
      auth: () => ({
        verifyAccessToken: async (token: string) => {
          if (token === "valid_access") return { user_id: "user123", session_id: "sess123" };
          throw new Error("Invalid access token");
        },
        verifyIdentityToken: async (token: string) => {
          if (token === "valid_identity") {
            return {
              linked_accounts: [
                { type: "wallet", address: "0xVerifiedWallet" },
                { type: "wallet", address: "0xAnotherWallet" }
              ]
            };
          }
          throw new Error("Invalid identity token");
        }
      })
    }),
    users: () => ({
      getByWalletAddress: async ({ address }: { address: string }) => {
        if (address.toLowerCase() === "0xserververifiedwallet".toLowerCase()) {
          return {
            id: "user123", // matches verified access token
            linked_accounts: [{ type: "wallet", address: "0xServerVerifiedWallet" }]
          };
        }
        if (address.toLowerCase() === "0xotheruserwallet".toLowerCase()) {
          return {
            id: "user999", // mismatch
            linked_accounts: [{ type: "wallet", address: "0xOtherUserWallet" }]
          };
        }
        throw new Error("404 user not found");
      }
    })
  };

  // Inject the mock
  __setPrivyClientForTesting(mockPrivyClient);

  const quoteTool = registry.get("get_swap_quote");
  if (quoteTool) {
    quoteTool.execute = async () => ({
      quote: "mock_quote",
      fromSymbol: "ETH",
      toAddress: "0xUSDC",
      amount: "10",
      scanDecision: "safe",
      blocked: false
    });
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string) {
    if (condition) {
      console.log(`  ✅ ${label}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${label}`);
      failed++;
    }
  }

  function createRequest(headers: Record<string, string>) {
    return new Request("http://localhost/api", {
      method: "POST",
      headers: new Headers(headers),
    });
  }

  // ── 1. verifySession ──
  console.log("── verifySession ──");
  const req1 = createRequest({
    "authorization": "Bearer valid_access",
    "x-wallet-address": "0xSpoofedWallet"
  });
  const res1 = await verifySession(req1);
  
  assert(res1.authenticated === true, "verifySession accepts valid access token");
  // @ts-ignore
  assert(res1.session?.walletAddress === undefined, "verifySession DOES NOT expose x-wallet-address as session.walletAddress");
  assert(res1.session?.unverifiedClientWalletAddress === "0xspoofedwallet", "verifySession safely exposes it as unverifiedClientWalletAddress");

  // ── 2. verifyWalletSession ──
  console.log("\n── verifyWalletSession ──");
  
  const req2 = createRequest({
    "authorization": "Bearer valid_access",
    "x-privy-identity-token": "valid_identity",
    "x-wallet-address": "0xSpoofedWallet"
  });
  const res2 = await verifyWalletSession(req2);
  assert(res2.authenticated === false, "Spoofed/unlinked wallet is rejected");
  assert(res2.statusCode === 403, "Spoofed wallet returns 403 status code");
  assert(res2.error?.includes("not linked to your Privy account") || false, "Spoofed wallet error message is clear");

  const req3 = createRequest({
    "authorization": "Bearer valid_access",
    "x-privy-identity-token": "valid_identity",
    "x-wallet-address": "0xVerifiedWallet"
  });
  const res3 = await verifyWalletSession(req3);
  assert(res3.authenticated === true, "Linked wallet via identity token is accepted");
  assert((res3.session as any)?.walletAddress === "0xverifiedwallet", "Verified wallet address is exposed correctly");
  assert((res3.session as any)?.authMethod === "identity_token", "Auth method correctly flagged as identity_token");

  const req4 = createRequest({
    "authorization": "Bearer valid_access",
    "x-wallet-address": "0xServerVerifiedWallet"
  });
  const res4 = await verifyWalletSession(req4);
  assert(res4.authenticated === true, "Linked wallet via server lookup is accepted");
  assert((res4.session as any)?.walletAddress === "0xserververifiedwallet", "Server verified wallet address is exposed");
  assert((res4.session as any)?.authMethod === "server_lookup", "Auth method correctly flagged as server_lookup");

  const req5 = createRequest({
    "authorization": "Bearer valid_access",
  });
  const res5 = await verifyWalletSession(req5);
  assert(res5.authenticated === false, "Missing x-wallet-address is rejected");
  assert(res5.statusCode === 401, "Missing wallet returns 401");

  // ── 3. Agent/approval flow ──
  console.log("\n── Agent Approval Protection ──");
  
  const agentRes1 = await runAgentLoop("Buy 10 USDC", "x-layer", [], "conv123", undefined, "");
  assert(agentRes1.action === "ask_clarification", "Agent gracefully refuses quote when wallet is missing");
  assert(agentRes1.chatState === "WALLET_REQUIRED", "Chat state is WALLET_REQUIRED");
  assert(agentRes1.agentMessage.includes("verified wallet is required"), "Agent message prompts for verified wallet");
  assert(!agentRes1.pipelineData, "Pipeline data is null (no approval created)");

  anthropicCallCount = 0; // reset for next agent run
  const agentRes2 = await runAgentLoop("Buy 10 USDC", "x-layer", [], "conv123", undefined, "0xVerifiedWallet");
  assert(agentRes2.action === "run_quote", "Agent proceeds with quote when wallet is verified");
  assert(agentRes2.chatState === "WAITING_FOR_CONFIRMATION", "Chat state is WAITING_FOR_CONFIRMATION");
  assert(!!agentRes2.pipelineData && (agentRes2.pipelineData as any).type === "quote", "Approval and quote pipeline created");

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
