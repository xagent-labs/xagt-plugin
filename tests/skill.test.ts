import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("xagt-setup skill", () => {
  it("documents required setup behavior", async () => {
    const skill = await readFile("skills/xagt-setup/SKILL.md", "utf8");
    expect(skill).toMatch(/name: xagt-setup/);
    expect(skill).toMatch(/npx skills add okx\/plugin-store --skill plugin-store/);
    expect(skill).toMatch(/not part of this plugin/);
    expect(skill).toMatch(/OAuth/);
    expect(skill).toMatch(/report/i);
  });
});
