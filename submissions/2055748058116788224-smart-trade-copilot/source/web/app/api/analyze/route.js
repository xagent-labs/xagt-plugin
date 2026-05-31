// Streaming analysis endpoint. Runs the autonomous agent server-side
// (LLM + OKX keys never reach the browser) and streams every step —
// agent thoughts, each OKX skill call, and the final deterministic
// verdict — to the UI as Server-Sent Events.

import { runAgent } from "../../../lib/agent.js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const symbol = String(body.symbol || "").trim();
  const prompt = String(body.prompt || "").slice(0, 300);
  if (!symbol) return new Response("symbol required", { status: 400 });

  // Optional execution intent. `confirmed` must be an explicit true sent
  // by the user clicking "Broadcast" — the agent never self-confirms.
  const buy = body.buy === true;
  // null → let the agent pick the chain-appropriate pay token
  // (ETH on Ethereum, OKB on X Layer). Don't hardcode okb here.
  const payToken = body.payToken ? String(body.payToken).slice(0, 16) : null;
  const amount = body.amount ? String(body.amount).slice(0, 24) : "0.5";
  const confirmed = body.confirmed === true;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          /* client closed */
        }
      };
      send({ type: "start", symbol });
      try {
        await runAgent({ symbol, prompt, buy, payToken, amount, confirmed }, send);
        send({ type: "done" });
      } catch (e) {
        send({ type: "fatal", error: e?.message || String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
