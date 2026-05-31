import { NextResponse } from "next/server";
import { verifySession } from "../../../../../lib/privy-auth";
import { getDb, schema } from "../../../../../lib/db";
import { eq, and } from "drizzle-orm";

export async function DELETE(
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
    // Soft delete: only allow users to delete their own conversations
    await db
      .update(schema.conversations)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(schema.conversations.id, id),
          eq(schema.conversations.privyUserId, auth.session.userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/chat/sessions/[id]] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
