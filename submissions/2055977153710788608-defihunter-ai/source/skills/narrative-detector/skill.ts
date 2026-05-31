import { z } from "zod";
import type { SkillDefinition } from "@/types/agent";
import { chainData } from "@/lib/data";

const inputSchema = z.object({
  minStrength: z.number().min(0).max(100).default(50),
  limit: z.number().min(1).max(20).default(5),
});

const outputSchema = z.object({
  narratives: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      strength: z.number(),
      momentum: z.enum(["rising", "stable", "cooling"]),
      relatedTokens: z.array(z.string()),
      socialMentions24h: z.number(),
    })
  ),
  dominantNarrative: z.string().nullable(),
});

export const narrativeDetectorSkill: SkillDefinition = {
  meta: {
    id: "narrative-detector",
    name: "Narrative Detector",
    description: "Detects trending on-chain and social narratives with momentum scoring",
    category: "narrative",
    mcpCompatible: true,
  },
  inputSchema,
  outputSchema,
  async execute(raw) {
    const input = inputSchema.parse(raw);
    const all = await chainData.getNarratives();
    const narratives = all
      .filter((n) => n.strength >= input.minStrength)
      .slice(0, input.limit);

    return {
      narratives,
      dominantNarrative: narratives[0]?.name ?? null,
    };
  },
};
