import type { AgentPlan, AgentPlanStep } from "@/types/agent";
import { nanoid } from "nanoid";
import { matchesSkill, SKILL } from "./skill-ids";

interface PlanContext {
  query: string;
  walletAddress?: string;
  chainId: number;
}

const INTENT_PATTERNS: { pattern: RegExp; skills: AgentPlanStep[] }[] = [
  {
    pattern: /yield|apy|farm|earn/i,
    skills: [
      { skillId: "defi_yield_scan", reason: "Scan high-yield pools (DeFiLlama)", input: { minApy: 5, maxRiskScore: 60 } },
      { skillId: "risk_checker", reason: "Validate protocol safety", input: { maxAcceptableRisk: 50 } },
    ],
  },
  {
    pattern: /narrative|trend|hot/i,
    skills: [
      { skillId: "narrative_detector", reason: "Detect trending narratives", input: { minStrength: 60, limit: 5 } },
      { skillId: "token_price", reason: "Token price context", input: { symbols: ["ETH", "BTC", "SOL"] } },
    ],
  },
  {
    pattern: /alpha|signal|feed/i,
    skills: [
      { skillId: "alpha_feed", reason: "Build alpha signal feed", input: { minStrength: 50, limit: 8 } },
    ],
  },
  {
    pattern: /wallet|holdings|portfolio|smart money/i,
    skills: [
      {
        skillId: "wallet_analyze",
        reason: "Analyze wallet composition",
        input: { includeSmartMoneyComparison: true },
      },
    ],
  },
  {
    pattern: /swap|trade|exchange/i,
    skills: [
      {
        skillId: "swap_executor",
        reason: "Quote optimal swap route",
        input: { fromToken: "ETH", toToken: "USDC", amountIn: 1 },
      },
    ],
  },
  {
    pattern: /strategy|allocate|deploy|capital/i,
    skills: [
      {
        skillId: "strategy-optimizer",
        reason: "Build yield allocation strategy",
        input: { capitalUsd: 10000, riskTolerance: "balanced" },
      },
      { skillId: "risk_checker", reason: "Cross-check protocol risks", input: {} },
    ],
  },
  {
    pattern: /risk|safe|audit|exploit/i,
    skills: [{ skillId: "risk_checker", reason: "Full protocol risk scan", input: {} }],
  },
  {
    pattern: /market|price|tvl|volume|chain/i,
    skills: [
      { skillId: "market-analyzer", reason: "Multi-chain market snapshot", input: {} },
      { skillId: "token_price", reason: "Spot prices", input: { symbols: ["ETH", "WBTC", "USDC"] } },
    ],
  },
  {
    pattern: /gas|gwei|fee|cheap/i,
    skills: [{ skillId: "gas_optimizer", reason: "Cross-chain gas comparison", input: {} }],
  },
  {
    pattern: /leaderboard|top protocol|ranking|dominance/i,
    skills: [
      { skillId: "protocol-leaderboard", reason: "TVL protocol rankings", input: { limit: 12 } },
    ],
  },
];

function isWalletSkill(id: string): boolean {
  return matchesSkill(id, SKILL.WALLET);
}

function isYieldSkill(id: string): boolean {
  return matchesSkill(id, SKILL.YIELD);
}

function isSwapSkill(id: string): boolean {
  return matchesSkill(id, SKILL.SWAP);
}

function isGasSkill(id: string): boolean {
  return matchesSkill(id, SKILL.GAS);
}

function enrichStep(step: AgentPlanStep, ctx: PlanContext): AgentPlanStep {
  const input = { ...step.input };

  if (isWalletSkill(step.skillId)) {
    if (ctx.walletAddress) input.walletAddress = ctx.walletAddress;
    input.chainId = ctx.chainId;
  }
  if (step.skillId === "market-analyzer" || step.skillId === "token_price") {
    if (ctx.chainId) input.chainId = ctx.chainId;
  }
  if (isSwapSkill(step.skillId)) {
    input.chainId = ctx.chainId;
    if (ctx.walletAddress) input.walletAddress = ctx.walletAddress;
  }
  if (isYieldSkill(step.skillId)) {
    input.chainId = ctx.chainId;
  }
  if (step.skillId === "strategy-optimizer") {
    input.preferredChains = [ctx.chainId];
  }
  if (isGasSkill(step.skillId)) {
    input.chainIds = [1, ctx.chainId, 8453].filter((v, i, a) => a.indexOf(v) === i);
  }

  return { ...step, input };
}

export function createAgentPlan(ctx: PlanContext): AgentPlan {
  const matched = INTENT_PATTERNS.find((p) => p.pattern.test(ctx.query));

  let steps: AgentPlanStep[] = matched
    ? matched.skills.map((s) => enrichStep(s, ctx))
    : [
        { skillId: "market-analyzer", reason: "Baseline market scan", input: { chainId: ctx.chainId } },
        { skillId: "alpha_feed", reason: "Alpha pulse", input: { minStrength: 50 } },
        { skillId: "defi_yield_scan", reason: "Top yield opportunities", input: { minApy: 4, maxRiskScore: 65 } },
        { skillId: "risk_checker", reason: "Risk overlay", input: { maxAcceptableRisk: 55 } },
      ];

  steps = steps.filter((s) => !isWalletSkill(s.skillId) || Boolean(ctx.walletAddress));

  if (ctx.walletAddress && !steps.some((s) => isWalletSkill(s.skillId))) {
    steps.push(
      enrichStep(
        {
          skillId: "wallet_analyze",
          reason: "Wallet-aware context",
          input: { includeSmartMoneyComparison: true },
        },
        ctx
      )
    );
  }

  return {
    id: nanoid(),
    query: ctx.query,
    steps,
    createdAt: new Date().toISOString(),
  };
}
