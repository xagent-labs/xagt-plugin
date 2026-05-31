import { NextRequest } from "next/server";
import { parseChatMessages } from "@/lib/api/chat-messages";
import { jsonResponse } from "@/lib/api/http";
import { hasOpenRouter } from "@/lib/env";
import { openrouterStream, type ChatMessage } from "@/lib/openrouter";
import { buildResearchContext, renderContextMarkdown } from "@/lib/research/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_BASE = `You are X-Agent, an autonomous crypto research analyst.

Rules you MUST follow:
- Ground every factual claim (price, 24h move, TVL, headline) in the LIVE DATA SNAPSHOT provided in this system message. Quote the exact numbers shown.
- When you cite a news event, link the URL from the snapshot inline like [source.com](https://…).
- If a number you need is not in the snapshot, say "no data" rather than guessing. NEVER invent prices, TVL, or on-chain figures.
- Open with a 1–2 sentence direct answer. Then 3–6 bullet drivers, each ending with a citation. Close with a one-line risk/invalidation.
- Use markdown. Keep it tight — no filler, no boilerplate disclaimers.
- This is intelligence, not financial advice. Skip the boilerplate "DYOR" line; the UI already shows that.`;

interface ResearchBody {
  messages?: unknown;
  model?: string;
  temperature?: number;
}

export async function POST(req: NextRequest) {
  if (!hasOpenRouter()) {
    return jsonResponse(503, {
      error: "OPENROUTER_API_KEY not set. Add it to .env.local — it is the only required key.",
    });
  }

  let body: ResearchBody;
  try {
    body = (await req.json()) as ResearchBody;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const messages = parseChatMessages(body.messages);
  if (!messages) {
    return jsonResponse(400, { error: "messages[] required" });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = lastUser?.content ?? "";

  let contextBlock = "";
  try {
    const ctx = await buildResearchContext({ query, signal: req.signal });
    contextBlock = renderContextMarkdown(ctx);
  } catch (err) {
    contextBlock = `# Live data snapshot unavailable\n${
      err instanceof Error ? err.message : "unknown error"
    }\n\nRespond by acknowledging the data gap; do not invent figures.`;
  }

  const enriched: ChatMessage[] = [
    { role: "system", content: SYSTEM_BASE },
    { role: "system", content: contextBlock },
    ...messages.filter((m) => m.role !== "system"),
  ];

  try {
    const upstream = await openrouterStream({
      messages: enriched,
      model: typeof body.model === "string" ? body.model : undefined,
      temperature: typeof body.temperature === "number" ? body.temperature : 0.3,
      signal: req.signal,
    });

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return jsonResponse(502, { error: message });
  }
}
