import type {
  SkillExecutionContext,
  SkillInvocation,
  SkillResult,
} from "@/types/agent";
import { getSkill } from "./registry";

export class SkillExecutionError extends Error {
  constructor(
    message: string,
    public readonly skillId: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "SkillExecutionError";
  }
}

export async function executeSkill(
  invocation: SkillInvocation,
  ctx: SkillExecutionContext
): Promise<SkillResult> {
  const started = Date.now();
  const skill = getSkill(invocation.skillId);

  if (!skill) {
    return {
      skillId: invocation.skillId,
      status: "error",
      error: `Unknown skill: ${invocation.skillId}`,
      durationMs: Date.now() - started,
      executedAt: new Date().toISOString(),
    };
  }

  try {
    const parsedInput = skill.inputSchema.parse(invocation.input);
    const output = await skill.execute(parsedInput, ctx);
    const validated = skill.outputSchema.parse(output);

    return {
      skillId: invocation.skillId,
      status: "success",
      data: validated,
      durationMs: Date.now() - started,
      executedAt: new Date().toISOString(),
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Skill execution failed";
    return {
      skillId: invocation.skillId,
      status: "error",
      error: message,
      durationMs: Date.now() - started,
      executedAt: new Date().toISOString(),
    };
  }
}

export async function executeSkillsParallel(
  invocations: SkillInvocation[],
  ctx: SkillExecutionContext
): Promise<SkillResult[]> {
  return Promise.all(invocations.map((inv) => executeSkill(inv, ctx)));
}

export async function executeSkillsSequential(
  invocations: SkillInvocation[],
  ctx: SkillExecutionContext
): Promise<SkillResult[]> {
  const results: SkillResult[] = [];
  for (const inv of invocations) {
    if (ctx.signal?.aborted) break;
    results.push(await executeSkill(inv, ctx));
  }
  return results;
}
