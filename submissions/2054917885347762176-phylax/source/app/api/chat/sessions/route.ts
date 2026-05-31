import { NextResponse } from "next/server";
import { verifySession } from "../../../../lib/privy-auth";
import { getDb, schema } from "../../../../lib/db";
import { eq, and, isNull, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const auth = await verifySession(req);
  if (!auth.authenticated || !auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  try {
    const sessions = await db.query.conversations.findMany({
      where: and(
        eq(schema.conversations.privyUserId, auth.session.userId),
        isNull(schema.conversations.deletedAt)
      ),
      orderBy: [desc(schema.conversations.updatedAt)],
    });

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[api/chat/sessions] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await verifySession(req);
  if (!auth.authenticated || !auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  try {
    const { chain } = await req.json();

    const [newSession] = await db
      .insert(schema.conversations)
      .values({
        privyUserId: auth.session.userId,
        walletAddress: auth.session.unverifiedClientWalletAddress || "",
        title: "New Chat",
        selectedChain: chain || "x-layer",
      })
      .returning();

    return NextResponse.json({ session: newSession });
  } catch (err) {
    console.error("[api/chat/sessions] POST error:", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
