import type { AgentRunResult } from "@/types/agent";

export interface AgentRequestBody {
  query: string;
  walletAddress?: string;
  chainId?: number;
}

export interface SkillsListResponse {
  skills: {
    id: string;
    name: string;
    description: string;
    category: string;
    mcpCompatible: boolean;
  }[];
}

export async function runAgent(body: AgentRequestBody): Promise<AgentRunResult> {
  const res = await fetch("/api/agent/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Agent run failed");
  }

  return res.json();
}

export async function listSkills(): Promise<SkillsListResponse> {
  const res = await fetch("/api/skills");
  if (!res.ok) throw new Error("Failed to load skills");
  return res.json();
}

export async function executeSkillApi(
  skillId: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch("/api/skills/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skillId, input }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Skill execution failed");
  }

  return res.json();
}

export async function getDashboardData() {
  const res = await fetch("/api/dashboard");
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}
