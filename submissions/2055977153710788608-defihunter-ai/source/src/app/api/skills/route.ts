import { NextResponse } from "next/server";
import { initializeSkills } from "@skills/index";
import { listSkillMeta } from "@skills/core";

export async function GET() {
  initializeSkills();
  const skills = listSkillMeta();
  return NextResponse.json({ skills });
}
