import { NextResponse } from "next/server";
import { verifySession } from "../../../../lib/privy-auth";
import { runAgentLoop } from "../../../../lib/anthropic";
import { getDb, schema } from "../../../../lib/db";
import { eq, sql, and } from "drizzle-orm";
import { checkRateLimit } from "../../../../lib/rate-limit";

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  // Helper to return a proper SSE error response — returning plain JSON from
  // an SSE endpoint causes the client's EventSource to silently fail or throw
  // a parse error because it expects text/event-stream format.
  function sseError(message: string, status: number = 400): Response {
    const payload = JSON.stringify({ type: "error", error: message });
    const body = `event: error\ndata: ${payload}\n\n`;
    return new Response(body, {
      status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const allowed = await checkRateLimit(`chat_stream:${ip}`, 30, 60);
  if (!allowed) {
    return sseError("Too many requests. Please try again later.", 429);
  }

  let body: { conversationId?: string; message?: string; chain?: string };
  try {
    body = await req.json();
  } catch {
    return sseError("Invalid request body.", 400);
  }

  const { conversationId, message, chain } = body;
  if (!message || typeof message !== "string" || !message.trim()) {
    return sseError("Message is required.", 400);
  }
  if (message.length > 4000) {
    return sseError("Message is too long. Max length is 4000 characters.", 400);
  }
  if (!conversationId) {
    return sseError("conversationId is required.", 400);
  }

  const auth = await verifySession(req);
  if (!auth.authenticated || !auth.session) {
    return sseError(auth.error ?? "Please sign in to use PhylaX.", auth.statusCode || 401);
  }

  // Per-user rate limit post-auth
  const userAllowed = await checkRateLimit(`chat_stream:user:${auth.session.userId}`, 20, 60);
  if (!userAllowed) {
    return sseError("Too many requests. Please wait before sending another message.", 429);
  }

  const db = getDb();

  // Hard fail if DB unavailable — cannot verify conversation ownership without it.
  if (!db) {
    console.error("[api/chat/stream] Database unavailable — refusing to proceed without ownership verification.");
    return sseError("Service temporarily unavailable. Please try again shortly.", 503);
  }

  try {
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(schema.conversations.id, conversationId),
        eq(schema.conversations.privyUserId, auth.session.userId)
      ),
    });

    if (!conversation) {
      return sseError("Conversation not found or unauthorized", 404);
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
        await db.update(schema.conversations).set({ title, updatedAt: new Date() }).where(eq(schema.conversations.id, conversationId));
      } else {
        await db.update(schema.conversations).set({ updatedAt: new Date() }).where(eq(schema.conversations.id, conversationId));
      }
    } catch (err) {
      console.error("[api/chat/stream] Failed to persist user message:", err);
      return sseError("Failed to save message. Please try again.", 500);
    }

  let history: { role: "user" | "assistant"; content: string }[] = [];
  try {
    const recentMessages = await db.query.messages.findMany({
      where: eq(schema.messages.conversationId, conversationId),
      orderBy: [sql`${schema.messages.createdAt} desc`],
      limit: 10,
    });
    const chronological = recentMessages.reverse();
    const withoutLastUserMsg = chronological.slice(0, -1);
    history = withoutLastUserMsg
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));
  } catch (err) {
    console.error("[api/chat/stream] Failed to fetch history context:", err);
  }

  let verifiedWalletAddress = "";
  try {
    const { verifyWalletSession } = await import("../../../../lib/privy-auth");
    const walletAuth = await verifyWalletSession(req);
    if (walletAuth.authenticated && walletAuth.session) {
      verifiedWalletAddress = walletAuth.session.walletAddress;
    }
  } catch (err) {
    console.error("[api/chat/stream] Wallet verification failed:", err);
  }
  
  console.log(`[debug] [api/chat/stream] Connected wallet address available to chat stream: ${verifiedWalletAddress || "NONE"}`);

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: Record<string, unknown>) => {
        const payload = JSON.stringify({ type, ...data });
        controller.enqueue(encoder.encode(`event: ${type}\ndata: ${payload}\n\n`));
      };

      try {
        const result = await runAgentLoop(message, chain, history, conversationId, (type, data) => {
          sendEvent(type, data);
        }, verifiedWalletAddress);

        try {
          await db.insert(schema.messages).values({
            conversationId,
            role: "assistant",
            content: result.agentMessage,
            metadata: result.pipelineData as Record<string, unknown>,
            toolCalls: result.toolCallsLog as unknown,
          });
        } catch (err) {
          console.error("[api/chat/stream] Failed to persist assistant message:", err);
        }

        sendEvent("final", {
          agentMessage: result.agentMessage,
          action: result.action,
          chatState: result.chatState,
          pipelineData: result.pipelineData
        });
        controller.close();
      } catch (err) {
        sendEvent("error", { error: err instanceof Error ? err.message : "Unknown error" });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
