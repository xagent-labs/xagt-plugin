import { registerSkill } from "../core";
import { createAliasSkill } from "../core/create-alias";
import { marketAnalyzerSkill } from "../market-analyzer/skill";
import { narrativeDetectorSkill } from "../narrative-detector/skill";
import { yieldFinderSkill } from "../yield-finder/skill";
import { riskEvaluatorSkill } from "../risk-evaluator/skill";
import { walletAnalyzerSkill } from "../wallet-analyzer/skill";
import { swapRecommenderSkill } from "../swap-recommender/skill";
import { gasTrackerSkill } from "../gas-tracker/skill";
import { tokenPriceSkill } from "../token-price/skill";
import { alphaFeedSkill } from "../alpha-feed/skill";

/** 注册规范 Skill ID（与文档 / MCP 命名一致） */
export function registerCanonicalSkills(): void {
  registerSkill(
    createAliasSkill(
      {
        id: "defi_yield_scan",
        name: "DeFi Yield Scan",
        description: "Scans DeFiLlama yield pools with risk-adjusted ranking",
        category: "yield",
        mcpCompatible: true,
      },
      yieldFinderSkill
    )
  );

  registerSkill(
    createAliasSkill(
      {
        id: "wallet_analyze",
        name: "Wallet Analyze",
        description: "Analyzes wallet balances and smart-money overlap",
        category: "wallet",
        mcpCompatible: true,
      },
      walletAnalyzerSkill
    )
  );

  registerSkill(
    createAliasSkill(
      {
        id: "swap_executor",
        name: "Swap Executor",
        description: "Quotes swap routes with slippage analysis (1inch or spot fallback)",
        category: "swap",
        mcpCompatible: true,
      },
      swapRecommenderSkill
    )
  );

  registerSkill(
    createAliasSkill(
      {
        id: "risk_checker",
        name: "Risk Checker",
        description: "Evaluates protocol risk using TVL and exploit history",
        category: "risk",
        mcpCompatible: true,
      },
      riskEvaluatorSkill
    )
  );

  registerSkill(
    createAliasSkill(
      {
        id: "narrative_detector",
        name: "Narrative Detector",
        description: "Detects trending narratives from market and social proxies",
        category: "narrative",
        mcpCompatible: true,
      },
      narrativeDetectorSkill
    )
  );

  registerSkill(
    createAliasSkill(
      {
        id: "gas_optimizer",
        name: "Gas Optimizer",
        description: "Compares gas across chains and suggests optimal execution chain",
        category: "gas",
        mcpCompatible: true,
      },
      gasTrackerSkill
    )
  );

  registerSkill(tokenPriceSkill);
  registerSkill(alphaFeedSkill);
}
