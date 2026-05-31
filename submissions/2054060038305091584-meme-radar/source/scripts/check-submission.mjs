import { access, readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";

const requiredFiles = [
  "README.md",
  "SUBMISSION.md",
  "docs/demo/meme-radar-demo.mp4",
  "public/data/radar-snapshot.json",
  "scripts/collect-okx-snapshot.mjs",
  "scripts/radar-server.mjs",
  ".github/workflows/build.yml",
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

async function exists(file) {
  await access(file);
}

async function main() {
  for (const file of requiredFiles) {
    await exists(file);
  }

  const readme = await readFile("README.md", "utf8");
  const submission = await readFile("SUBMISSION.md", "utf8");
  const demo = await stat("docs/demo/meme-radar-demo.mp4");

  const checks = [
    ["README mentions OKX skills", /okx-dex-trenches/.test(readme) && /okx-security/.test(readme)],
    ["README links demo video", readme.includes("docs/demo/meme-radar-demo.mp4")],
    ["README mentions #XAgentHackathon", /#XAgentHackathon/.test(readme)],
    ["Submission has one-line description", /One-line description/.test(submission)],
    ["Submission has submit command", submission.includes("@xagt/agent-plugin@latest submit")],
    ["Demo video is not empty", demo.size > 100_000],
  ];

  const failed = checks.filter(([, ok]) => !ok);
  for (const [label, ok] of checks) {
    console.log(`${ok ? "OK" : "FAIL"} ${label}`);
  }

  if (failed.length > 0) {
    process.exitCode = 1;
    return;
  }

  await run("npm", ["run", "build"]);
  console.log("Submission package is ready. Review SUBMISSION.md, then run npm run submit.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
