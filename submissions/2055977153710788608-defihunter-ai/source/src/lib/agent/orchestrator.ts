import { nanoid } from "nanoid";
import { initializeSkills } from "@skills/index";
import { executeSkillsSequential } from "@skills/core";
import type { AgentRunResult, SkillInvocation } from "@/types/agent";
import { createAgentPlan } from "./planner";
import { synthesizeAgentResponse } from "./synthesizer";
import { agentMemory } from "./memory";

export interface OrchestratorInput {
  query: string;
  walletAddress?: string;
  chainId?: number;
  parallel?: boolean;
}

export class AgentOrchestrator {
  constructor() {
    initializeSkills();
  }

  async run(input: OrchestratorInput): Promise<AgentRunResult> {
    const runId = nanoid();
    const chainId = input.chainId ?? 1;
    const started = Date.now();

    const plan = createAgentPlan({
      query: input.query,
      walletAddress: input.walletAddress,
      chainId,
    });

    agentMemory.addPlan(plan);

    const invocations: SkillInvocation[] = plan.steps.map((s) => ({
      skillId: s.skillId,
      input: s.input,
    }));

    const ctx = {
      requestId: runId,
      walletAddress: input.walletAddress,
      chainId,
    };

    const results = await executeSkillsSequential(invocations, ctx);
    const totalDurationMs = Date.now() - started;

    const output = synthesizeAgentResponse(runId, plan, results, totalDurationMs);
    agentMemory.addRun(output);
    agentMemory.appendMessage({
      id: nanoid(),
      role: "agent",
      content: output.synthesis.summary,
      timestamp: new Date().toISOString(),
    });

    return output;
  }
}

export const orchestrator = new AgentOrchestrator();
