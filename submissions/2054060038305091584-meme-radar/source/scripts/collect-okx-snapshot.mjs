import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const defaultOnchainos = process.env.ONCHAINOS_BIN || "onchainos";
const defaultOutPath = new URL("../public/data/radar-snapshot.json", import.meta.url);

const commandPlan = [
  "onchainos memepump chains",
  "onchainos memepump tokens --chain solana --stage NEW",
  "onchainos memepump token-details --address <token>",
  "onchainos memepump token-dev-info --address <token>",
  "onchainos memepump token-bundle-info --address <token>",
  "onchainos token price-info --address <token>",
  "onchainos security token-scan --tokens 501:<token>",
];

async function runJson(args, options = {}) {
  const onchainos = options.onchainos || defaultOnchainos;
  let stdout;
  try {
    const result = await execFileAsync(onchainos, args, {
      maxBuffer: 1024 * 1024 * 8,
      env: process.env,
      timeout: options.timeoutMs ?? 30_000,
    });
    stdout = result.stdout;
  } catch (error) {
    stdout = error.stdout;
    if (!stdout) throw error;
  }

  const parsed = JSON.parse(stdout);
  if (!parsed.ok) {
    throw new Error(parsed.error || `onchainos ${args.join(" ")} failed`);
  }
  return parsed.data;
}

function firstDefined(source, keys, fallback) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null && source[key] !== "") return source[key];
  }
  return fallback;
}

function numberFrom(source, keys, fallback = 0) {
  const value = firstDefined(source, keys, fallback);
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function hasField(source, keys) {
  return firstDefined(source, keys, undefined) !== undefined;
}

function ageMinutesFrom(source) {
  const direct = numberFrom(source, ["ageMinutes", "tokenAge", "minutesSinceLaunch"], Number.NaN);
  if (Number.isFinite(direct)) return Math.max(0, Math.round(direct));

  const timestamp = numberFrom(source, ["createdTimestamp", "createTime", "launchTimestamp"], Number.NaN);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 0;

  const timestampMs = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  return Math.max(0, Math.round((Date.now() - timestampMs) / 60_000));
}

function arrayFrom(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.list)) return value.list;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.tokenList)) return value.tokenList;
  return [];
}

function flattenObjects(...objects) {
  return Object.assign({}, ...objects.filter(Boolean));
}

function riskLevel(score) {
  if (score >= 82) return "CRITICAL";
  if (score >= 66) return "HIGH";
  if (score >= 38) return "MEDIUM";
  return "LOW";
}

function verdictFromRisk(score, security) {
  const action = String(firstDefined(security, ["action", "verdict"], "")).toLowerCase();
  const level = String(firstDefined(security, ["riskLevel", "level"], "")).toUpperCase();
  if (action.includes("block") || level === "CRITICAL") return "block";
  if (action.includes("warn") || level === "HIGH" || level === "MEDIUM") return "warn";
  if (score >= 82) return "block";
  if (score >= 38) return "warn";
  return "safe";
}

function buildFlags({ stage, devRugs, top10, snipers, bundlers, securityVerdict, liquidity, marketCap, totalHolders, hasLiquidityData }) {
  const flags = [];
  if (securityVerdict === "block") flags.push("security block");
  if (devRugs > 0) flags.push("developer rug history");
  if (top10 > 55) flags.push("top-holder concentration");
  if (snipers > 20 || bundlers > 4) flags.push("sniper or bundler cluster");
  if (liquidity > 0 && liquidity < 10_000) flags.push("thin liquidity");
  if (!hasLiquidityData) flags.push("liquidity data unavailable");
  if (marketCap > 0 && marketCap < 10_000) flags.push("micro market cap");
  if (totalHolders > 0 && totalHolders < 25) flags.push("thin holder base");
  if (stage === "MIGRATING") flags.push("migration candidate");
  if (flags.length === 0) flags.push("no major red flag in current snapshot");
  return flags;
}

function buildOpportunities({ smartMoneyScore, bondingProgress, liquidity, securityVerdict }) {
  if (securityVerdict === "block") return ["none"];
  const opportunities = [];
  if (smartMoneyScore >= 70) opportunities.push("smart-money activity");
  if (bondingProgress >= 80 && bondingProgress < 100) opportunities.push("migration watch");
  if (liquidity >= 50_000) opportunities.push("healthy liquidity");
  if (securityVerdict === "safe") opportunities.push("OKX security scan low risk");
  if (opportunities.length === 0) opportunities.push("research only");
  return opportunities;
}

function buildRecommendedChecks(securityVerdict, hasLiquidityData) {
  if (securityVerdict === "block") return ["Do not trade", "Track only for pattern learning"];
  const checks = ["Run token-bundle-info", "Inspect top-trader addresses", "Re-scan security before any swap"];
  if (!hasLiquidityData) checks.unshift("Refresh price/liquidity route");
  return checks;
}

function chainIdFor(chainName) {
  const normalized = chainName.toLowerCase();
  if (normalized.includes("sol")) return "501";
  if (normalized.includes("bnb") || normalized.includes("bsc")) return "56";
  if (normalized.includes("base")) return "8453";
  if (normalized.includes("x layer") || normalized.includes("xlayer")) return "196";
  if (normalized.includes("tron")) return "195";
  return "501";
}

function normalizeToken(raw, index, chainName, enrichments = {}) {
  const merged = flattenObjects(
    raw,
    raw?.market,
    raw?.tags,
    enrichments.details,
    enrichments.details?.market,
    enrichments.details?.tags,
    enrichments.dev,
    enrichments.dev?.market,
    enrichments.dev?.tags,
    enrichments.bundle,
    enrichments.bundle?.market,
    enrichments.bundle?.tags,
    enrichments.price,
    enrichments.price?.market,
    enrichments.price?.tags,
    enrichments.advanced,
    enrichments.advanced?.market,
    enrichments.advanced?.tags,
  );
  const address = String(firstDefined(merged, ["address", "tokenAddress", "tokenContractAddress", "contractAddress"], `unknown-${index}`));
  const symbol = String(firstDefined(merged, ["symbol", "tokenSymbol", "ticker"], `TOK${index + 1}`)).slice(0, 12);
  const stage = String(firstDefined(merged, ["stage", "tokenStage"], "NEW")).toUpperCase();
  const marketCap = numberFrom(merged, ["marketCap", "marketCapUsd", "fdv", "mc"], 0);
  const liquidity = numberFrom(merged, ["liquidity", "liquidityUsd"], 0);
  const hasLiquidityData = hasField(merged, ["liquidity", "liquidityUsd"]);
  const volume24h = numberFrom(merged, ["volume24h", "volume24H", "volume", "vol24h", "volumeUsd24h", "volumeUsd1h"], 0);
  const bondingProgress = Math.min(100, numberFrom(merged, ["bondingPercent", "bondingProgress", "progress"], 0));
  const devRugs = numberFrom(merged, ["rugPullCount", "devRugCount", "rugCount", "devRugPullTokenCount"], 0);
  const devLaunches = numberFrom(merged, ["launchCount", "devLaunchCount", "tokenCreateCount", "devCreateTokenCount", "devLaunchedTokenCount"], 0);
  const top10 = numberFrom(merged, ["top10HoldingsPercent", "top10HolderPercent", "top10HoldersPercent", "top10HoldPercent"], 0);
  const snipers = numberFrom(merged, ["sniperCount", "snipers", "sniperWalletCount", "snipersTotal"], 0);
  const bundlers = numberFrom(merged, ["bundlerCount", "bundleCount", "bundlers", "bundlerWalletCount"], 0);
  const totalHolders = numberFrom(merged, ["totalHolders", "holderCount", "holders"], 0);
  const smartMoneyScore = Math.min(
    100,
    Math.round(volume24h / 4500 + bondingProgress * 0.4 + Math.max(0, 20 - devRugs * 5) + (liquidity >= 50_000 ? 8 : 0)),
  );
  const marketRisk = (marketCap > 0 && marketCap < 10_000 ? 12 : 0) + (totalHolders > 0 && totalHolders < 25 ? 10 : 0);
  const liquidityRisk = liquidity > 0 && liquidity < 10_000 ? 18 : !hasLiquidityData ? 8 : 0;
  const baseRisk = devRugs * 13 + Math.max(0, top10 - 28) * 0.9 + bundlers * 5 + snipers * 0.6 + marketRisk + liquidityRisk;
  const securityLevel = String(firstDefined(enrichments.security, ["riskLevel", "level"], "")).toUpperCase();
  const securityPenalty = securityLevel === "CRITICAL" ? 25 : securityLevel === "HIGH" ? 14 : securityLevel === "MEDIUM" ? 6 : 0;
  const riskScore = Math.min(100, Math.round(baseRisk + securityPenalty));
  const securityVerdict = verdictFromRisk(riskScore, enrichments.security);

  return {
    id: `${chainName.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`,
    symbol,
    name: String(firstDefined(merged, ["name", "tokenName"], symbol)),
    address,
    chain: chainName,
    launchpad: String(firstDefined(merged, ["protocolName", "launchpad"], "launchpad")),
    stage: ["NEW", "MIGRATING", "MIGRATED"].includes(stage) ? stage : "NEW",
    ageMinutes: ageMinutesFrom(merged),
    marketCap,
    liquidity,
    volume24h,
    priceChange1h: numberFrom(merged, ["priceChange1h", "change1h", "priceChange"], 0),
    bondingProgress,
    smartMoneyScore,
    riskScore,
    riskLevel: riskLevel(riskScore),
    securityVerdict,
    dev: {
      launches: devLaunches,
      rugs: devRugs,
      holdingPercent: numberFrom(merged, ["devHoldingPercent", "devHoldingsPercent"], 0),
    },
    holders: {
      top10Percent: top10,
      snipers,
      bundlers,
      newWalletPercent: numberFrom(merged, ["newWalletPercent", "freshWalletsPercent"], 0),
    },
    flags: buildFlags({ stage, devRugs, top10, snipers, bundlers, securityVerdict, liquidity, marketCap, totalHolders, hasLiquidityData }),
    opportunities: buildOpportunities({ smartMoneyScore, bondingProgress, liquidity, securityVerdict }),
    recommendedChecks: buildRecommendedChecks(securityVerdict, hasLiquidityData),
    updatedAt: new Date().toISOString(),
  };
}

async function enrichToken(raw, index, chainName, options) {
  const address = String(firstDefined(raw, ["address", "tokenAddress", "tokenContractAddress", "contractAddress"], ""));
  if (!address) return normalizeToken(raw, index, chainName);

  const chainId = chainIdFor(chainName);
  const safeRun = async (args) => {
    try {
      return await runJson(args, options);
    } catch {
      return null;
    }
  };

  const [details, dev, bundle, price, advanced, securityRaw] = await Promise.all([
    safeRun(["memepump", "token-details", "--chain", chainName.toLowerCase(), "--address", address]),
    safeRun(["memepump", "token-dev-info", "--chain", chainName.toLowerCase(), "--address", address]),
    safeRun(["memepump", "token-bundle-info", "--chain", chainName.toLowerCase(), "--address", address]),
    safeRun(["token", "price-info", "--chain", chainName.toLowerCase(), "--address", address]),
    safeRun(["token", "advanced-info", "--chain", chainName.toLowerCase(), "--address", address]),
    safeRun(["security", "token-scan", "--tokens", `${chainId}:${address}`]),
  ]);

  const security = Array.isArray(securityRaw) ? securityRaw[0] : securityRaw;
  return normalizeToken(raw, index, chainName, { details, dev, bundle, price, advanced, security });
}

export async function readSnapshot(outPath = defaultOutPath) {
  return JSON.parse(await readFile(outPath, "utf8"));
}

export async function collectSnapshot(options = {}) {
  const outPath = options.outPath || defaultOutPath;
  const limit = options.limit ?? 10;
  const chain = options.chain ?? "solana";
  const stage = options.stage ?? "NEW";

  try {
    const chains = await runJson(["memepump", "chains"], options);
    const chainInfo = arrayFrom(chains).find((item) => String(item.chainName || "").toLowerCase().includes(chain.toLowerCase())) || {};
    const chainName = chainInfo.chainName || "Solana";
    const rawTokens = await runJson(["memepump", "tokens", "--chain", chain, "--stage", stage], options);
    const list = arrayFrom(rawTokens).slice(0, limit);
    const tokens = await Promise.all(list.map((token, index) => enrichToken(token, index, chainName, options)));
    const snapshot = {
      generatedAt: new Date().toISOString(),
      source: "okx-live",
      okxSkills: ["okx-dex-trenches", "okx-dex-token", "okx-dex-signal", "okx-security"],
      status: {
        ok: true,
        mode: "okx-live",
        message: "Live OKX snapshot generated through the local Onchain OS CLI.",
        commandsAttempted: commandPlan,
      },
      summary: {
        scanned: tokens.length,
        highRisk: tokens.filter((token) => token.riskLevel === "HIGH" || token.riskLevel === "CRITICAL").length,
        smartMoneyHits: tokens.filter((token) => token.smartMoneyScore >= 70).length,
        blocked: tokens.filter((token) => token.securityVerdict === "block").length,
      },
      tokens,
    };
    await writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    return snapshot;
  } catch (error) {
    const existing = await readSnapshot(outPath);
    return {
      ...existing,
      status: {
        ok: false,
        mode: "fallback",
        message: "Live OKX refresh failed, so Meme Radar kept the bundled demo snapshot.",
        commandsAttempted: commandPlan,
        liveError: error.message,
      },
    };
  }
}

async function main() {
  const snapshot = await collectSnapshot();
  if (snapshot.status?.ok) {
    console.log(`Wrote OKX live snapshot to ${defaultOutPath.pathname}`);
  } else {
    console.warn(`OKX live snapshot unavailable: ${snapshot.status?.liveError}`);
    console.warn(`Kept ${snapshot.source} snapshot at ${defaultOutPath.pathname}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
