import { zodToJsonSchema } from "@/lib/mcp/zod-to-json-schema";
import { initializeSkills } from "@skills/index";
import { getSkill, listSkillMeta } from "@skills/core";
import type { z } from "zod";

export interface McpToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Exposes registered skills as MCP-compatible tool descriptors.
 * Wire to an MCP server transport in production.
 */
export function getMcpToolCatalog(): McpToolDescriptor[] {
  initializeSkills();
  return listSkillMeta().map((meta) => {
    const skill = getSkill(meta.id);
    const inputSchema = skill
      ? zodToJsonSchema(skill.inputSchema as z.ZodType)
      : { type: "object", properties: {} };

    return {
      name: meta.id,
      description: meta.description,
      inputSchema,
    };
  });
}
