import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { initializeSkills } from "@skills/index";
import { executeSkill } from "@skills/core";

const bodySchema = z.object({
  skillId: z.string(),
  input: z.record(z.unknown()).default({}),
  chainId: z.number().optional(),
  walletAddress: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    initializeSkills();
    const body = bodySchema.parse(await req.json());

    const result = await executeSkill(
      { skillId: body.skillId, input: body.input },
      {
        requestId: nanoid(),
        chainId: body.chainId ?? 1,
        walletAddress: body.walletAddress,
      }
    );

    if (result.status === "error") {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Execution failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
