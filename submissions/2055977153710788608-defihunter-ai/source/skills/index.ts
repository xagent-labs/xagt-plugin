import { registerSkill } from "./core";
import { registerCanonicalSkills } from "./canonical/register";
import { marketAnalyzerSkill } from "./market-analyzer/skill";
import { narrativeDetectorSkill } from "./narrative-detector/skill";
import { yieldFinderSkill } from "./yield-finder/skill";
import { riskEvaluatorSkill } from "./risk-evaluator/skill";
import { walletAnalyzerSkill } from "./wallet-analyzer/skill";
import { swapRecommenderSkill } from "./swap-recommender/skill";
import { strategyOptimizerSkill } from "./strategy-optimizer/skill";
import { gasTrackerSkill } from "./gas-tracker/skill";
import { protocolLeaderboardSkill } from "./protocol-leaderboard/skill";
import { tokenPriceSkill } from "./token-price/skill";
import { alphaFeedSkill } from "./alpha-feed/skill";

let initialized = false;

export function initializeSkills(): void {
  if (initialized) return;

  registerSkill(marketAnalyzerSkill);
  registerSkill(narrativeDetectorSkill);
  registerSkill(yieldFinderSkill);
  registerSkill(riskEvaluatorSkill);
  registerSkill(walletAnalyzerSkill);
  registerSkill(swapRecommenderSkill);
  registerSkill(strategyOptimizerSkill);
  registerSkill(gasTrackerSkill);
  registerSkill(protocolLeaderboardSkill);

  registerCanonicalSkills();

  initialized = true;
}

export {
  marketAnalyzerSkill,
  narrativeDetectorSkill,
  yieldFinderSkill,
  riskEvaluatorSkill,
  walletAnalyzerSkill,
  swapRecommenderSkill,
  strategyOptimizerSkill,
  gasTrackerSkill,
  protocolLeaderboardSkill,
  tokenPriceSkill,
  alphaFeedSkill,
};
