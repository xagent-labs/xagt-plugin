import type { AgentPlan, AgentRunResult, TerminalMessage } from "@/types/agent";

const MAX_RUNS = 50;
const MAX_MESSAGES = 200;

class AgentMemoryStore {
  private plans: AgentPlan[] = [];
  private runs: AgentRunResult[] = [];
  private messages: TerminalMessage[] = [];

  addPlan(plan: AgentPlan): void {
    this.plans.unshift(plan);
    if (this.plans.length > MAX_RUNS) this.plans.pop();
  }

  addRun(run: AgentRunResult): void {
    this.runs.unshift(run);
    if (this.runs.length > MAX_RUNS) this.runs.pop();
  }

  appendMessage(msg: TerminalMessage): void {
    this.messages.push(msg);
    if (this.messages.length > MAX_MESSAGES) {
      this.messages = this.messages.slice(-MAX_MESSAGES);
    }
  }

  getMessages(): TerminalMessage[] {
    return [...this.messages];
  }

  getRecentRuns(limit = 10): AgentRunResult[] {
    return this.runs.slice(0, limit);
  }

  getLastRun(): AgentRunResult | undefined {
    return this.runs[0];
  }

  clear(): void {
    this.plans = [];
    this.runs = [];
    this.messages = [];
  }
}

export const agentMemory = new AgentMemoryStore();
