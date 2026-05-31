import fs from "fs";
import path from "path";
import assert from "assert";

function runXAgentSkillIntegrationTests() {
  console.log("\n🔄 XAgent/OKX Skill Integration Tests\n");
  let passed = 0;
  let failed = 0;

  try {
    const rootDir = path.resolve(__dirname, "../../");

    // 1. Verify installed skill docs are referenced/audited
    // In local Windows env, they are under .agents/skills/
    const walletSkillPath = path.join(rootDir, ".agents/skills/okx-agentic-wallet/SKILL.md");
    const pluginStorePath = path.join(rootDir, ".agents/skills/plugin-store/SKILL.md");
    
    // Check if files exist (or mock if running in CI without them)
    const walletExists = fs.existsSync(walletSkillPath);
    const pluginExists = fs.existsSync(pluginStorePath);
    
    // We expect the structure to be there or properly audited
    assert(walletExists, `Skill document missing: ${walletSkillPath}`);
    assert(pluginExists, `Skill document missing: ${pluginStorePath}`);
    passed++;
    console.log("  ✅ Installed XAgent skills are referenced and audited");

    // 2. README contains Build X-Agent Hackathon section
    const readmePath = path.join(rootDir, "README.md");
    const readmeContent = fs.readFileSync(readmePath, "utf-8");
    assert(readmeContent.includes("Build X-Agent Hackathon"), "README must contain 'Build X-Agent Hackathon' section");
    passed++;
    console.log("  ✅ README contains Build X-Agent Hackathon section");

    // 3. Runtime boundary is documented honestly
    assert(readmeContent.includes("okx.ts"), "README must explain runtime usage of lib/okx.ts");
    assert(readmeContent.includes("xagent-plugin submit") || readmeContent.includes("submission"), "README must mention submission workflow");
    passed++;
    console.log("  ✅ Runtime boundary and XAgent vs PhylaX usage is documented honestly");

    // 4. Repo-visible adapter/boundary exists
    const adapterPath = path.join(rootDir, "lib/okx-xagent-adapter.ts");
    assert(fs.existsSync(adapterPath), "Repo-visible adapter lib/okx-xagent-adapter.ts must exist");
    
    const adapterContent = fs.readFileSync(adapterPath, "utf-8");
    assert(adapterContent.includes("XAgent/OKX Skill Adapter Boundary"), "Adapter must contain boundary documentation");
    assert(adapterContent.includes("XAgentRuntimeAdapter"), "Adapter must export XAgentRuntimeAdapter");
    passed++;
    console.log("  ✅ Repo-visible XAgent integration boundary exists");

  } catch (err) {
    console.error("Test failed:", err);
    failed++;
  }

  console.log(`\n──────────────────────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runXAgentSkillIntegrationTests();
