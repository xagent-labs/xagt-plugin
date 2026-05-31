import { z } from "zod";
import type { SkillDefinition } from "@/types/agent";
import { chainData } from "@/lib/data";

const inputSchema = z.object({
  protocol: z.string().optional(),
  maxAcceptableRisk: z.number().default(50),
});

const outputSchema = z.object({
  profiles: z.array(
    z.object({
      protocol: z.string(),
      chain: z.string(),
      auditScore: z.number(),
      overallRisk: z.number(),
      severity: z.enum(["low", "medium", "high", "critical"]),
      factors: z.array(z.string()),
    })
  ),
  safeProtocols: z.array(z.string()),
  alerts: z.array(
    z.object({
      protocol: z.string(),
      severity: z.enum(["low", "medium", "high", "critical"]),
      message: z.string(),
    })
  ),
});

function severityFromRisk(risk: number): "low" | "medium" | "high" | "critical" {
  if (risk < 30) return "low";
  if (risk < 50) return "medium";
  if (risk < 70) return "high";
  return "critical";
}

export const riskEvaluatorSkill: SkillDefinition = {
  meta: {
    id: "risk-evaluator",
    name: "Risk Evaluator",
    description: "Evaluates protocol audit, liquidity, and centralization risk",
    category: "risk",
    mcpCompatible: true,
  },
  inputSchema,
  outputSchema,
  async execute(rawInput) {
    const input = inputSchema.parse(rawInput);
    const raw = await chainData.getProtocolRisks(input.protocol);

    const profiles = raw.map((p) => {
      const severity = severityFromRisk(p.overallRisk);
      const factors: string[] = [];
      if (p.exploitHistory) factors.push("Historical exploit detected");
      if (p.centralizationRisk > 50) factors.push("High admin key / governance centralization");
      if (p.liquidityRisk > 50) factors.push("Thin liquidity relative to TVL");
      if (p.auditScore < 70) factors.push("Below-threshold audit coverage");

      return {
        protocol: p.protocol,
        chain: p.chain,
        auditScore: p.auditScore,
        overallRisk: p.overallRisk,
        severity,
        factors,
      };
    });

    const safeProtocols = profiles
      .filter((p) => p.overallRisk <= input.maxAcceptableRisk)
      .map((p) => p.protocol);

    const alerts = profiles
      .filter((p) => p.overallRisk > input.maxAcceptableRisk)
      .map((p) => ({
        protocol: p.protocol,
        severity: p.severity,
        message: `Risk score ${p.overallRisk} exceeds threshold ${input.maxAcceptableRisk}`,
      }));

    return { profiles, safeProtocols, alerts };
  },
};
