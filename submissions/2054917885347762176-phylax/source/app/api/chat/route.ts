import { NextResponse } from "next/server";
import { verifySession } from "../../../lib/privy-auth";
import { runAgentLoop } from "../../../lib/anthropic";
import { getDb, schema } from "../../../lib/db";
import { eq, sql, and } from "drizzle-orm";
import { checkRateLimit } from "../../../lib/rate-limit";

/**
 * POST /api/chat
 *
 * Wallet-gated chat endpoint for PhylaX.
 * Uses Tool Registry + LLM Tool-Use Architecture Foundation.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const allowed = await checkRateLimit(`chat:${ip}`, 30, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  // ── 1. Parse request body ───────────────────────────────────────────────
  let body: { conversationId?: string; message?: string; chain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { conversationId, message, chain } = body;
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "Message is too long. Max length is 4000 characters." }, { status: 400 });
  }
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
  }

  // ── 2. Verify user session ───────────────────
  const auth = await verifySession(req);
  if (!auth.authenticated || !auth.session) {
    return NextResponse.json(
      { error: auth.error ?? "Please sign in to use PhylaX." },
      { status: auth.statusCode || 401 }
    );
  }

  // Per-user rate limit post-auth (IP limit alone is spoofable via proxy)
  const userAllowed = await checkRateLimit(`chat:user:${auth.session.userId}`, 20, 60);
  if (!userAllowed) {
    return NextResponse.json({ error: "Too many requests. Please wait before sending another message." }, { status: 429 });
  }

  const db = getDb();

  // ── 3. Database availability check ──────────────────────────────────────
  // MUST fail closed — if DB is unavailable, we cannot verify conversation
  // ownership and proceeding would let any conversationId bypass access control.
  if (!db) {
    console.error("[api/chat] Database unavailable — refusing to proceed without ownership verification.");
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  // ── 4. Verify conversation ownership & persist user message ─────────────
  try {
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(schema.conversations.id, conversationId),
        eq(schema.conversations.privyUserId, auth.session.userId)
      ),
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found or unauthorized" }, { status: 404 });
    }

    await db.insert(schema.messages).values({
      conversationId,
      role: "user",
      content: message,
    });

    const [msgCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId));

    if (Number(msgCount.count) <= 1) {
      const title = message.length > 40 ? message.slice(0, 37) + "..." : message;
      await db
        .update(schema.conversations)
        .set({ title, updatedAt: new Date() })
        .where(eq(schema.conversations.id, conversationId));
    } else {
      await db
        .update(schema.conversations)
        .set({ updatedAt: new Date() })
        .where(eq(schema.conversations.id, conversationId));
    }
  } catch (err) {
    console.error("[api/chat] Failed to persist user message:", err);
    return NextResponse.json(
      { error: "Failed to save message. Please try again." },
      { status: 500 }
    );
  }

  // ── 5. Retrieve History ───────────────────────────────────────────
  let history: { role: "user" | "assistant"; content: string }[] = [];
  try {
    const recentMessages = await db.query.messages.findMany({
      where: eq(schema.messages.conversationId, conversationId),
      orderBy: [sql`${schema.messages.createdAt} desc`],
      limit: 10,
    });
    // Reverse to chronological order, then exclude the LAST message only
    // (the user message we just inserted). Filtering by content is fragile —
    // if the user sends the same text twice, all matching entries get removed.
    const chronological = recentMessages.reverse();
    const withoutLastUserMsg = chronological.slice(0, -1);
    history = withoutLastUserMsg
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));
  } catch (err) {
    console.error("[api/chat] Failed to fetch history context:", err);
  }

  // Attempt to verify wallet session for trading
  let verifiedWalletAddress = "";
  try {
    const { verifyWalletSession } = await import("../../../lib/privy-auth");
    const walletAuth = await verifyWalletSession(req);
    if (walletAuth.authenticated && walletAuth.session) {
      verifiedWalletAddress = walletAuth.session.walletAddress;
    }
  } catch (err) {
    console.error("[api/chat] Wallet verification failed:", err);
  }

  // ── 6. Run Agent Loop ───────────────────────────────────────────────────
  const result = await runAgentLoop(message, chain, history, conversationId, undefined, verifiedWalletAddress);

  // ── 7. Persist Assistant Message ────────────────────────────────────────
  try {
    await db.insert(schema.messages).values({
      conversationId,
      role: "assistant",
      content: result.agentMessage,
      metadata: result.pipelineData as Record<string, unknown>,
      toolCalls: result.toolCallsLog as unknown,
    });
  } catch (err) {
    console.error("[api/chat] Failed to persist assistant message:", err);
  }

  return NextResponse.json({
    agentMessage: result.agentMessage,
    action: result.action,
    chatState: result.chatState,
    conversationId,
    pipelineData: result.pipelineData,
    error: result.error,
  });
}
