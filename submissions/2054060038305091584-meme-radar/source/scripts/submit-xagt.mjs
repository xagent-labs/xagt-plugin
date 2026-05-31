import { spawn } from "node:child_process";

const repo = process.env.PUBLIC_REPO_URL || "";
const deploy = process.env.PUBLIC_DEPLOY_URL || "";

if (!repo) {
  console.error("PUBLIC_REPO_URL is required before submitting.");
  console.error("Example:");
  console.error('  PUBLIC_REPO_URL="https://github.com/<owner>/meme-radar" npm run submit:xagt');
  process.exit(1);
}

const args = [
  "@xagt/agent-plugin@latest",
  "submit",
  "--name",
  "Meme Radar",
  "--intro",
  "An AI on-chain radar that finds fresh meme tokens and ranks them by smart-money signal, holder structure, and rug risk.",
  "--repo",
  repo,
];

if (deploy) {
  args.push("--deploy", deploy);
}

const child = spawn("npx", args, {
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
