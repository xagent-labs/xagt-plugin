import type { SkillDefinition } from "@/types/agent";
import type { z } from "zod";

const registry = new Map<string, SkillDefinition>();

export function registerSkill(skill: SkillDefinition): void {
  if (registry.has(skill.meta.id)) {
    throw new Error(`Skill already registered: ${skill.meta.id}`);
  }
  registry.set(skill.meta.id, skill);
}

export function getSkill(id: string): SkillDefinition | undefined {
  return registry.get(id);
}

export function listSkills(): SkillDefinition[] {
  return Array.from(registry.values());
}

export function listSkillMeta() {
  return listSkills().map((s) => s.meta);
}
