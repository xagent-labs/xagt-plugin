import type { SkillDefinition, SkillMeta } from "@/types/agent";

/** 基于已有 Skill 注册规范 ID 别名（MCP / 文档统一命名） */
export function createAliasSkill(
  meta: SkillMeta,
  base: SkillDefinition
): SkillDefinition {
  return {
    meta,
    inputSchema: base.inputSchema,
    outputSchema: base.outputSchema,
    execute: base.execute,
  };
}
