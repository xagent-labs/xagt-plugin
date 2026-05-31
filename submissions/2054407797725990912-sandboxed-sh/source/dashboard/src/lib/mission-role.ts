import type { Mission } from "./api/missions";

function missionRoleText(mission: Mission): string {
  const history = Array.isArray(mission.history) ? mission.history : [];
  const firstUserPrompt = history.find((entry) => entry.role === "user")?.content ?? "";
  return [
    mission.title ?? "",
    mission.short_description ?? "",
    firstUserPrompt,
  ].join("\n").toLowerCase();
}

export function inferMissionRole(mission: Mission): "boss" | "worker" | null {
  if (mission.parent_mission_id) return "worker";

  const text = missionRoleText(mission);
  if (text.includes("orchestrator-boss") || text.includes("[boss]")) {
    return "boss";
  }

  return null;
}
