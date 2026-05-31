import { NextResponse } from "next/server";
import { z } from "zod";
import { orchestrator } from "@/lib/agent/orchestrator";
import { agentMemory } from "@/lib/agent/memory";
import { nanoid } from "nanoid";

const bodySchema = z.object({
  query: z.string().min(1).max(2000),
  walletAddress: z
    .string()
    .optional()
    .transform((v) => (v && /^0x[a-fA-F0-9]{40}$/i.test(v) ? v : undefined)),
  chainId: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = bodySchema.parse(json);

    agentMemory.appendMessage({
      id: nanoid(),
      role: "user",
      content: body.query,
      timestamp: new Date().toISOString(),
    });

    const result = await orchestrator.run({
      query: body.query,
      walletAddress: body.walletAddress,
      chainId: body.chainId,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
