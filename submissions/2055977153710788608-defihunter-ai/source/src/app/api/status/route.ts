import { NextResponse } from "next/server";
import { getDataSourceStatus } from "@/lib/data";
import { initializeSkills } from "@skills/index";
import { listSkillMeta } from "@skills/core";

export async function GET() {
  initializeSkills();
  return NextResponse.json({
    ...getDataSourceStatus(),
    skillCount: listSkillMeta().length,
    timestamp: new Date().toISOString(),
  });
}
