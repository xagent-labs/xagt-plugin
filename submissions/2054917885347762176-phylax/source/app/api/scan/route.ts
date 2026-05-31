import { NextResponse } from "next/server";
import { scanToken, OkxRealModeError } from "../../../lib/okx";
import { determineRiskAction } from "../../../lib/risk-scoring";
import { checkRateLimit } from "../../../lib/rate-limit";
import { verifySession } from "../../../lib/privy-auth";
import { normalizeChain } from "../../../lib/chains";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const allowed = await checkRateLimit(`scan:${ip}`, 30, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const { address, riskMode, chain } = await req.json();

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    let chainConfig;
    try {
      chainConfig = normalizeChain(chain);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Server-side X Layer enforcement — scan is only available on X Layer
    if (chainConfig.id !== "x-layer") {
      return NextResponse.json(
        { error: "Token scanning is currently available on X Layer only." },
        { status: 403 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid EVM address format" }, { status: 400 });
    }

    const auth = await verifySession(req);
    if (!auth.authenticated || !auth.session) {
      return NextResponse.json({ error: auth.error ?? "Please sign in to use PhylaX." }, { status: auth.statusCode || 401 });
    }

    const scanResult = await scanToken(address, chainConfig.id);
    const {
      riskLevel,
      decision,
      executionAllowed,
      isScanned,
      isHoneypot,
      triggeredLabels,
      unknownReason,
      meta,
    } = scanResult;

    // decision from OKX adapter: "safe" | "high_risk" | "unknown"
    // Pass through to determineRiskAction for riskMode gating
    const action = determineRiskAction(decision, riskMode ?? "conservative");

    return NextResponse.json({
      riskLevel,
      decision,
      executionAllowed,
      isScanned,
      isHoneypot,
      triggeredLabels,
      unknownReason,
      action,
      meta,
    });
  } catch (err) {
    if (err instanceof OkxRealModeError) {
      return NextResponse.json(
        { error: err.message, meta: err.meta, integration: "okx-security" },
        { status: 502 }
      );
    }
    console.error("Scan error:", err);
    return NextResponse.json({ error: "Failed to scan token" }, { status: 500 });
  }
}
