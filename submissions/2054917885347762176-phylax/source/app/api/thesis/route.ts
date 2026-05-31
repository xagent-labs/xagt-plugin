import { NextResponse } from "next/server";
import { parseThesis } from "../../../lib/anthropic";
import { verifySession } from "../../../lib/privy-auth";
import { checkRateLimit } from "../../../lib/rate-limit";
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const allowed = await checkRateLimit(`thesis:${ip}`, 30, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const { thesis } = await req.json();

    if (!thesis || typeof thesis !== "string") {
      return NextResponse.json({ error: "Thesis must be a non-empty string" }, { status: 400 });
    }

    if (thesis.length > 8000) {
      return NextResponse.json({ error: "Thesis is too long. Max length is 8000 characters." }, { status: 400 });
    }

    const auth = await verifySession(req);
    if (!auth.authenticated || !auth.session) {
      return NextResponse.json(
        { error: auth.error ?? "Please sign in to use PhylaX." },
        { status: auth.statusCode || 401 }
      );
    }

    const intent = await parseThesis(thesis);

    return NextResponse.json({ intent });
  } catch (error) {
    console.error("Thesis parsing error:", error);
    return NextResponse.json({ error: "Failed to parse thesis" }, { status: 500 });
  }
}
