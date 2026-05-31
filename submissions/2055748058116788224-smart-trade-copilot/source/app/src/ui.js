// Presentation layer — turns pipeline output into a clean terminal "report
// card". Kept separate from logic so the demo looks like a product, not a script.

import chalk from "chalk";

const W = 64;
const line = (c = "─") => c.repeat(W);

export function banner() {
  console.log(
    chalk.bold.cyan(`
   ╔═══════════════════════════════════════════════════════════╗
   ║   SMART TRADE COPILOT  ·  powered by OKX onchainOS        ║
   ║   "Should I buy this?" — answered with evidence.          ║
   ╚═══════════════════════════════════════════════════════════╝`),
  );
}

export function stageLine(label, state, detail) {
  const icon =
    state === "ok"
      ? chalk.green("✔")
      : state === "skip"
        ? chalk.yellow("◌")
        : chalk.gray("•");
  const text =
    state === "skip"
      ? chalk.yellow(`${label}  ${chalk.dim("(skipped: " + short(detail) + ")")}`)
      : state === "ok"
        ? chalk.white(label)
        : chalk.gray(label);
  console.log(`   ${icon} ${text}`);
}

export function verdictCard(result, token, notes) {
  const v = result.verdict;
  const color =
    v === "BUY" ? chalk.bold.green : v === "CAUTION" ? chalk.bold.yellow : chalk.bold.red;
  const emoji = v === "BUY" ? "🟢" : v === "CAUTION" ? "🟡" : "🔴";

  console.log("\n   " + chalk.dim(line()));
  console.log(
    "   " +
      color(`  ${emoji}  VERDICT: ${v}`) +
      chalk.dim(`   ·   ${token.symbol || token.address.slice(0, 10)} on ${token.chain}`),
  );
  console.log("   " + chalk.dim(line()));

  if (result.biggestRisk) {
    console.log(
      "\n   " +
        chalk.bold("Biggest risk: ") +
        chalk.red(result.biggestRisk.tag) +
        chalk.white(" — " + result.biggestRisk.detail),
    );
  } else {
    console.log("\n   " + chalk.green("No blocking risk detected."));
  }

  if (result.reasons.length) {
    console.log("\n   " + chalk.bold("Findings:"));
    for (const r of result.reasons) {
      const dot =
        r.weight === "veto"
          ? chalk.red("■")
          : r.weight === "floor" || r.weight === "downgrade"
            ? chalk.yellow("▲")
            : chalk.gray("·");
      console.log(`     ${dot} ${chalk.bold(r.tag)} — ${chalk.dim(r.detail)}`);
    }
  }

  if (result.positives.length) {
    console.log("\n   " + chalk.bold("Supporting:"));
    for (const p of result.positives) {
      console.log(`     ${chalk.green("+")} ${chalk.dim(p)}`);
    }
  }

  if (notes && notes.length) {
    console.log("\n   " + chalk.bold("Context:"));
    for (const n of notes) console.log(`     ${chalk.cyan("i")} ${chalk.dim(n)}`);
  }
  console.log("\n   " + chalk.dim(line()));
}

export function skillsUsedFooter(stages) {
  const ran = Object.entries(stages)
    .filter(([, s]) => s.ok)
    .map(([id]) => id);
  const skipped = Object.entries(stages)
    .filter(([, s]) => !s.ok)
    .map(([id]) => id);
  console.log(
    "   " +
      chalk.dim(
        `OKX skills run: ${ran.join(", ") || "none"}` +
          (skipped.length ? `  ·  skipped: ${skipped.join(", ")}` : ""),
      ),
  );
}

export function info(msg) {
  console.log("   " + chalk.cyan("ℹ ") + chalk.white(msg));
}
export function warn(msg) {
  console.log("   " + chalk.yellow("⚠ ") + chalk.yellow(msg));
}
export function err(msg) {
  console.log("   " + chalk.red("✖ ") + chalk.red(msg));
}
export function ok(msg) {
  console.log("   " + chalk.green("✔ ") + chalk.white(msg));
}

function short(s, n = 60) {
  if (!s) return "";
  s = String(s).replace(/\s+/g, " ");
  return s.length > n ? s.slice(0, n) + "…" : s;
}
