import { describe, expect, it } from "vitest";

import type { Mission } from "./api/missions";
import { inferMissionRole } from "./mission-role";

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "mission-1",
    status: "active",
    title: "Test mission",
    history: [],
    created_at: "2026-03-16T00:00:00Z",
    updated_at: "2026-03-16T00:00:00Z",
    ...overrides,
  };
}

describe("inferMissionRole", () => {
  it("returns worker when parent_mission_id is present", () => {
    expect(inferMissionRole(makeMission({ parent_mission_id: "boss-1" }))).toBe("worker");
  });

  it("returns boss when short description names orchestrator-boss", () => {
    expect(
      inferMissionRole(
        makeMission({ short_description: "Use boss skill: `orchestrator-boss`." })
      )
    ).toBe("boss");
  });

  it("returns boss when the title uses the historical [BOSS] prefix", () => {
    expect(inferMissionRole(makeMission({ title: "[BOSS] Old orchestrator" }))).toBe("boss");
  });

  it("returns null for normal missions", () => {
    expect(inferMissionRole(makeMission())).toBeNull();
  });

  it("handles missions without historical transcript arrays", () => {
    expect(inferMissionRole(makeMission({ history: undefined as unknown as Mission["history"] }))).toBeNull();
  });
});
