import { NextResponse } from "next/server";
import { verifySession } from "../../../../../../lib/privy-auth";
import { getDb, schema } from "../../../../../../lib/db";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await verifySession(req);
  if (!auth.authenticated || !auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }



  try {
    // 1. Verify ownership of the conversation first
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(schema.conversations.id, id),
        eq(schema.conversations.privyUserId, auth.session.userId)
      ),
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // 2. Fetch messages
    const messages = await db.query.messages.findMany({
      where: eq(schema.messages.conversationId, id),
      orderBy: [asc(schema.messages.createdAt)],
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[api/chat/sessions/[id]/messages] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
