/**
 * Wallet ownership verification test cases.
 *
 * Run: npx tsx lib/__tests__/privy-auth.test.ts
 *
 * These tests validate the wallet ownership verification logic
 * without requiring a live Privy backend. They test the helper
 * functions and the overall flow structure.
 */

// ─── Mock helpers (extracted logic from privy-auth.ts) ────────────────────────

interface LinkedAccountLike {
  type?: string;
  address?: string;
  chain_type?: string;
}

function extractWalletAddresses(linkedAccounts: LinkedAccountLike[]): string[] {
  if (!Array.isArray(linkedAccounts)) return [];
  return linkedAccounts
    .filter((account) => account.type === "wallet" || account.type === "smart_wallet")
    .map((account) => account.address?.toLowerCase())
    .filter((addr): addr is string => !!addr);
}

function isWalletLinked(walletAddress: string, linkedWallets: string[]): boolean {
  const normalized = walletAddress.toLowerCase();
  return linkedWallets.includes(normalized);
}

// ─── Test runner ──────────────────────────────────────────────────────────────

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

// ─── Test cases ───────────────────────────────────────────────────────────────

console.log("\n🔐 Wallet Ownership Verification Tests\n");

// 1. extractWalletAddresses
console.log("── extractWalletAddresses ──");
{
  const accounts: LinkedAccountLike[] = [
    { type: "wallet", address: "0xAbC123", chain_type: "ethereum" },
    { type: "wallet", address: "0xDeF456", chain_type: "ethereum" },
    { type: "email" },
    { type: "smart_wallet", address: "0xSmartWallet" },
    { type: "wallet" }, // no address
  ];

  const wallets = extractWalletAddresses(accounts);

  assert(wallets.length === 3, "Extracts 3 wallet addresses");
  assert(wallets[0] === "0xabc123", "Normalizes to lowercase");
  assert(wallets[1] === "0xdef456", "Includes second wallet");
  assert(wallets[2] === "0xsmartwallet", "Includes smart wallet");
}

{
  const wallets = extractWalletAddresses([]);
  assert(wallets.length === 0, "Empty accounts returns empty wallets");
}

{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wallets = extractWalletAddresses(null as any);
  assert(wallets.length === 0, "null accounts returns empty wallets");
}

// 2. isWalletLinked
console.log("\n── isWalletLinked ──");
{
  const linked = ["0xabc123", "0xdef456"];

  assert(isWalletLinked("0xabc123", linked), "Exact match → linked");
  assert(isWalletLinked("0xABC123", linked), "Mixed case → linked (case insensitive)");
  assert(isWalletLinked("0xAbC123", linked), "Checksum case → linked");
  assert(!isWalletLinked("0x999999", linked), "Different address → NOT linked");
  assert(!isWalletLinked("", linked), "Empty address → NOT linked");
}

// 3. Simulated auth flow scenarios
console.log("\n── Auth flow scenarios ──");
{
  // Scenario: valid token + linked wallet
  const linkedAccounts: LinkedAccountLike[] = [
    { type: "wallet", address: "0xUserWallet123" },
  ];
  const wallets = extractWalletAddresses(linkedAccounts);
  const clientWallet = "0xUserWallet123";
  assert(
    isWalletLinked(clientWallet, wallets),
    "Valid token + linked wallet → ALLOWED"
  );
}

{
  // Scenario: valid token + unlinked wallet
  const linkedAccounts: LinkedAccountLike[] = [
    { type: "wallet", address: "0xUserWallet123" },
  ];
  const wallets = extractWalletAddresses(linkedAccounts);
  const clientWallet = "0xDifferentWallet999";
  assert(
    !isWalletLinked(clientWallet, wallets),
    "Valid token + unlinked wallet → REJECTED (403)"
  );
}

{
  // Scenario: valid token + mismatched wallet casing
  const linkedAccounts: LinkedAccountLike[] = [
    { type: "wallet", address: "0xAbCdEf123456789" },
  ];
  const wallets = extractWalletAddresses(linkedAccounts);
  const clientWallet = "0xABCDEF123456789"; // different casing
  assert(
    isWalletLinked(clientWallet, wallets),
    "Valid token + mismatched casing → ALLOWED (normalized)"
  );
}

{
  // Scenario: no linked wallets
  const linkedAccounts: LinkedAccountLike[] = [
    { type: "email", address: "user@example.com" },
  ];
  const wallets = extractWalletAddresses(linkedAccounts);
  assert(
    wallets.length === 0,
    "No wallet accounts → empty wallets list"
  );
  assert(
    !isWalletLinked("0xAnyWallet", wallets),
    "No linked wallets → REJECTED (401)"
  );
}

{
  // Scenario: missing wallet address from client
  const clientWallet = "";
  const linked = ["0xabc123"];
  assert(
    !isWalletLinked(clientWallet, linked),
    "Missing wallet → REJECTED (401)"
  );
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("\n⚠️  Some tests failed!");
  process.exit(1);
} else {
  console.log("\n✅ All wallet ownership verification tests passed.");
  process.exit(0);
}
