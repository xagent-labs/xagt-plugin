import { NextRequest } from "next/server";
import { parseChatMessages } from "@/lib/api/chat-messages";
import { jsonResponse } from "@/lib/api/http";
import { hasOpenRouter } from "@/lib/env";
import { openrouterStream } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are X-Agent, an autonomous crypto research assistant.
Cite public sources. Give source-backed, refutable answers. Be concise.
Never fabricate prices, TVL, or on-chain data — say so when you do not have it.`;

interface ChatBody {
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

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const messages = parseChatMessages(body.messages);
  if (!messages) {
    return jsonResponse(400, { error: "messages[] required" });
  }

  if (messages[0]?.role !== "system") {
    messages.unshift({ role: "system", content: SYSTEM_PROMPT });
  }

  try {
    const upstream = await openrouterStream({
      messages,
      model: typeof body.model === "string" ? body.model : undefined,
      temperature:
        typeof body.temperature === "number" ? body.temperature : undefined,
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
