import { NextResponse } from "next/server";
import { verifyWalletSession } from "../../../lib/privy-auth";
import { getDb, schema } from "../../../lib/db";
import { eq, and, desc } from "drizzle-orm";

const TX_HISTORY_EVENT = "phylax:tx_history";

/**
 * GET /api/tx-history?wallet=0x...
 * Returns confirmed tx history for a wallet, newest first.
 * No auth required — it's public on-chain data.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ txs: [] });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ txs: [] });
  }

  try {
    const rows = await db.query.auditLog.findMany({
      where: and(
        eq(schema.auditLog.event, TX_HISTORY_EVENT),
        eq(schema.auditLog.walletAddress, wallet)
      ),
      orderBy: [desc(schema.auditLog.timestamp)],
      limit: 50,
    });

    const txs = rows
      .map((row: typeof schema.auditLog.$inferSelect) => {
        try {
          return row.metadata as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ txs });
  } catch (err) {
    console.error("[tx-history] GET error:", err);
    return NextResponse.json({ txs: [] });
  }
}

/**
 * POST /api/tx-history
 * Persists a confirmed tx to audit_log for cross-session history.
 * Requires wallet auth.
 */
export async function POST(req: Request) {
  const auth = await verifyWalletSession(req);
  if (!auth.authenticated || !auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { id, fromSymbol, toSymbol, amountUsd, expectedOutputUsd, gasFeeUsd, txHash, explorerUrl, chain, confirmedAt } = body;

  if (!txHash || !fromSymbol || !toSymbol) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate tx hash format
  if (typeof txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "Invalid txHash" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    // DB unavailable — not a critical error, tx already confirmed on-chain
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    await db.insert(schema.auditLog).values({
      event: TX_HISTORY_EVENT,
      privyUserId: auth.session.userId,
      walletAddress: auth.session.walletAddress.toLowerCase(),
      metadata: {
        id: id ?? txHash,
        fromSymbol,
        toSymbol,
        amountUsd: amountUsd ?? 0,
        expectedOutputUsd: expectedOutputUsd ?? 0,
        gasFeeUsd: gasFeeUsd ?? 0,
        txHash,
        explorerUrl: explorerUrl ?? null,
        chain: chain ?? "X Layer",
        confirmedAt: confirmedAt ?? new Date().toISOString(),
      },
    });

    return NextResponse.json({ ok: true, persisted: true });
  } catch (err) {
    console.error("[tx-history] POST error:", err);
    // Non-fatal — tx is confirmed on-chain regardless
    return NextResponse.json({ ok: true, persisted: false });
  }
}
