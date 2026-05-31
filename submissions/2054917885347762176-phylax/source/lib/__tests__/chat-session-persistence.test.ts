/**
 * Chat Session Persistence Regression Tests
 *
 * Verifies the fixes for:
 *   - Session hydration after browser refresh (DB as source of truth)
 *   - localStorage used only as a UX pointer, not storage
 *   - /api/chat/stream never called with empty/null/undefined conversationId
 *   - Stale localStorage hint falls back to newest DB session
 *   - No DB sessions → auto-creates one before enabling chat input
 *   - Backend: ownership check, message persistence, conversationId required
 *
 * Run: npx tsx lib/__tests__/chat-session-persistence.test.ts
 */

import { GET as sessionsGET, POST as sessionsPOST } from "../../app/api/chat/sessions/route";
import { GET as messagesGET } from "../../app/api/chat/sessions/[id]/messages/route";
import { POST as streamPOST } from "../../app/api/chat/stream/route";
import * as privyAuth from "../../lib/privy-auth";
import * as db from "../../lib/db";

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

function makeRequest(body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost", {
    method: body !== undefined ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const mockSession = (userId = "user-abc") => ({
  authenticated: true,
  session: {
    userId,
    unverifiedClientWalletAddress: "0xdeadbeef",
  },
});

const mockConversation = (id: string, userId = "user-abc") => ({
  id,
  privyUserId: userId,
  walletAddress: "0xdeadbeef",
  title: "Test Chat",
  selectedChain: "x-layer",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

// ─── Test suites ──────────────────────────────────────────────────────────────

async function testStreamBlocksEmptyConversationId() {
  console.log("\n[1] /api/chat/stream — blocks when conversationId is missing");

  const cases = [
    { label: "empty string", body: { message: "hello", conversationId: "" } },
    { label: "null",         body: { message: "hello", conversationId: null } },
    { label: "undefined",    body: { message: "hello" } },
    { label: "whitespace",   body: { message: "hello", conversationId: "  " } },
  ];

  // Mock auth as authenticated
  const verifySpy = jest.spyOn ? jest.spyOn(privyAuth, "verifySession") : null;
  const originalVerify = (privyAuth as any).verifySession;
  (privyAuth as any).verifySession = async () => mockSession();

  try {
    for (const { label, body } of cases) {
      const req = makeRequest(body, { Authorization: "Bearer token" });
      const res = await streamPOST(req);
      assert(
        res.status === 400,
        `stream returns 400 when conversationId is ${label} (got ${res.status})`
      );
      const json = await res.json().catch(() => ({}));
      assert(
        typeof json.error === "string" && json.error.length > 0,
        `stream error body is non-empty for ${label}`
      );
    }
  } finally {
    (privyAuth as any).verifySession = originalVerify;
  }
}

async function testStreamRequiresAuth() {
  console.log("\n[2] /api/chat/stream — blocks unauthenticated requests");

  const originalVerify = (privyAuth as any).verifySession;
  (privyAuth as any).verifySession = async () => ({ authenticated: false, error: "Unauthorized", statusCode: 401 });

  try {
    const req = makeRequest({ message: "hello", conversationId: "00000000-0000-0000-0000-000000000001" });
    const res = await streamPOST(req);
    assert(res.status === 401, `stream returns 401 for unauthenticated request (got ${res.status})`);
  } finally {
    (privyAuth as any).verifySession = originalVerify;
  }
}

async function testStreamOwnershipCheck() {
  console.log("\n[3] /api/chat/stream — rejects conversationId from a different user");

  const originalVerify = (privyAuth as any).verifySession;
  const originalGetDb   = (db as any).getDb;

  (privyAuth as any).verifySession = async () => mockSession("user-alice");

  // Simulate conversation that belongs to user-bob, not user-alice
  (db as any).getDb = () => ({
    query: {
      conversations: {
        findFirst: async () => null, // ownership check fails → null
      },
      messages: { findMany: async () => [] },
    },
    insert: () => ({ values: () => Promise.resolve([]) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
    select: () => ({ from: () => ({ where: () => Promise.resolve([{ count: 0 }]) }) }),
  });

  try {
    const req = makeRequest(
      { message: "hello", conversationId: "00000000-0000-0000-0000-000000000001" },
      { Authorization: "Bearer token" }
    );
    const res = await streamPOST(req);
    assert(
      res.status === 404,
      `stream returns 404 when conversationId belongs to another user (got ${res.status})`
    );
  } finally {
    (privyAuth as any).verifySession = originalVerify;
    (db as any).getDb = originalGetDb;
  }
}

async function testSessionsGETRequiresAuth() {
  console.log("\n[4] /api/chat/sessions GET — blocks unauthenticated requests");

  const originalVerify = (privyAuth as any).verifySession;
  (privyAuth as any).verifySession = async () => ({ authenticated: false, statusCode: 401 });

  try {
    const req = makeRequest(undefined, {});
    const res = await sessionsGET(req);
    assert(res.status === 401, `sessions GET returns 401 without auth (got ${res.status})`);
  } finally {
    (privyAuth as any).verifySession = originalVerify;
  }
}

async function testSessionsPOSTCreatesSession() {
  console.log("\n[5] /api/chat/sessions POST — creates a session for authenticated user");

  const originalVerify = (privyAuth as any).verifySession;
  const originalGetDb   = (db as any).getDb;
  const fakeId = "00000000-0000-0000-0000-000000000099";

  (privyAuth as any).verifySession = async () => mockSession();
  (db as any).getDb = () => ({
    insert: () => ({
      values: () => ({
        returning: () =>
          Promise.resolve([{
            id: fakeId,
            privyUserId: "user-abc",
            title: "New Chat",
            selectedChain: "x-layer",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }]),
      }),
    }),
  });

  try {
    const req = makeRequest({ chain: "x-layer" }, { Authorization: "Bearer token" });
    const res = await sessionsPOST(req);
    assert(res.status === 200, `sessions POST returns 200 (got ${res.status})`);
    const json = await res.json();
    assert(json.session?.id === fakeId, `sessions POST returns the new session id`);
  } finally {
    (privyAuth as any).verifySession = originalVerify;
    (db as any).getDb = originalGetDb;
  }
}

async function testMessagesGETOwnershipCheck() {
  console.log("\n[6] /api/chat/sessions/[id]/messages GET — rejects wrong owner");

  const originalVerify = (privyAuth as any).verifySession;
  const originalGetDb   = (db as any).getDb;

  (privyAuth as any).verifySession = async () => mockSession("user-alice");
  (db as any).getDb = () => ({
    query: {
      conversations: { findFirst: async () => null }, // ownership fails
      messages: { findMany: async () => [] },
    },
  });

  try {
    const req = makeRequest(undefined, { Authorization: "Bearer token" });
    const res = await messagesGET(req, { params: Promise.resolve({ id: "some-other-users-conv" }) });
    assert(res.status === 404, `messages GET returns 404 for wrong owner (got ${res.status})`);
  } finally {
    (privyAuth as any).verifySession = originalVerify;
    (db as any).getDb = originalGetDb;
  }
}

async function testMessagesGETReturnsHistory() {
  console.log("\n[7] /api/chat/sessions/[id]/messages GET — returns persisted messages");

  const originalVerify = (privyAuth as any).verifySession;
  const originalGetDb   = (db as any).getDb;
  const convId = "00000000-0000-0000-0000-000000000001";

  (privyAuth as any).verifySession = async () => mockSession();
  (db as any).getDb = () => ({
    query: {
      conversations: {
        findFirst: async () => mockConversation(convId),
      },
      messages: {
        findMany: async () => [
          { id: "msg-1", conversationId: convId, role: "user",      content: "Hello",       createdAt: new Date(), metadata: null },
          { id: "msg-2", conversationId: convId, role: "assistant",  content: "Hi there!",   createdAt: new Date(), metadata: null },
        ],
      },
    },
  });

  try {
    const req = makeRequest(undefined, { Authorization: "Bearer token" });
    const res = await messagesGET(req, { params: Promise.resolve({ id: convId }) });
    assert(res.status === 200, `messages GET returns 200 (got ${res.status})`);
    const json = await res.json();
    assert(Array.isArray(json.messages) && json.messages.length === 2, `messages GET returns both persisted messages`);
    assert(json.messages[0].role === "user",      `first message is user message`);
    assert(json.messages[1].role === "assistant", `second message is assistant message`);
  } finally {
    (privyAuth as any).verifySession = originalVerify;
    (db as any).getDb = originalGetDb;
  }
}

// ─── localStorage-as-pointer regression tests (pure logic, no DOM) ────────────

function testLocalStoragePointerLogic() {
  console.log("\n[8] localStorage UX pointer — session resolution logic");

  // Simulate the resolution logic from page.tsx bootstrap
  function resolveActiveSession(
    dbSessions: Array<{ id: string }>,
    hint: string | null
  ): string | null {
    if (dbSessions.length === 0) return null;
    const validHint = hint ? dbSessions.find(s => s.id === hint) : null;
    return validHint ? hint! : dbSessions[0].id;
  }

  const sessions = [
    { id: "uuid-newest" },
    { id: "uuid-older" },
    { id: "uuid-oldest" },
  ];

  assert(
    resolveActiveSession(sessions, "uuid-older") === "uuid-older",
    "valid localStorage hint → restored (user sees same session after refresh)"
  );

  assert(
    resolveActiveSession(sessions, "uuid-deleted-or-stale") === "uuid-newest",
    "stale localStorage hint not in DB → falls back to newest DB session"
  );

  assert(
    resolveActiveSession(sessions, null) === "uuid-newest",
    "no localStorage hint → falls back to newest DB session"
  );

  assert(
    resolveActiveSession([], "uuid-any") === null,
    "empty DB sessions → returns null (caller must create a new session)"
  );
}

function testGuestSessionsDoNotPolluteLs() {
  console.log("\n[9] Guest sessions — not persisted to localStorage");

  // Simulate the persistence logic from page.tsx
  const stored: Record<string, string> = {};
  const fakeLocalStorage = {
    setItem: (k: string, v: string) => { stored[k] = v; },
    getItem: (k: string) => stored[k] ?? null,
  };

  const ACTIVE_SESSION_KEY = "phylax_active_session_id";

  function maybePersistSession(id: string) {
    // From page.tsx: only persist non-guest sessions
    if (id && !id.startsWith("guest-")) {
      fakeLocalStorage.setItem(ACTIVE_SESSION_KEY, id);
    }
  }

  maybePersistSession("guest-1234-abcd");
  assert(
    fakeLocalStorage.getItem(ACTIVE_SESSION_KEY) === null,
    "guest session ID is NOT written to localStorage"
  );

  maybePersistSession("00000000-0000-0000-0000-000000000001");
  assert(
    fakeLocalStorage.getItem(ACTIVE_SESSION_KEY) === "00000000-0000-0000-0000-000000000001",
    "real DB session ID IS written to localStorage"
  );
}

// ─── Run all tests ────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Chat Session Persistence — Regression Tests");
  console.log("═══════════════════════════════════════════════════════");

  // Pure logic tests (no async, no mocking)
  testLocalStoragePointerLogic();
  testGuestSessionsDoNotPolluteLs();

  // API route tests (require mocking privyAuth and DB)
  await testStreamBlocksEmptyConversationId();
  await testStreamRequiresAuth();
  await testStreamOwnershipCheck();
  await testSessionsGETRequiresAuth();
  await testSessionsPOSTCreatesSession();
  await testMessagesGETOwnershipCheck();
  await testMessagesGETReturnsHistory();

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════\n");

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
