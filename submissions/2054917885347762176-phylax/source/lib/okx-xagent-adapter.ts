/**
 * XAgent/OKX Skill Adapter Boundary
 * 
 * This file serves as the documentation and boundary definition for how PhylaX 
 * integrates with the OKX XAgent ecosystem for the Build X-Agent Hackathon.
 * 
 * Boundary Definition:
 * 1. Agent / Development / Submission Workflow:
 *    - XAgent skills (`okx-agentic-wallet`, `plugin-store`, `okx-dex-swap`) are installed
 *      in `.agents/skills/` and are utilized by the AI agent during the development,
 *      reasoning, and submission processes.
 *    - These skills provide the overarching intelligence and capabilities for discovering
 *      strategies and understanding OKX APIs.
 * 
 * 2. Runtime PhylaX Execution:
 *    - PhylaX is a Next.js web application that executes in a user's browser and server.
 *    - At runtime, PhylaX uses the underlying capabilities provided by the OKX Onchain OS CLI
 *      (which powers the XAgent skills) via the `lib/okx.ts` wrapper.
 *    - `lib/okx.ts` directly interacts with the DEX aggregators, token scanners, and routing
 *      engines that the `okx-dex-swap` and `okx-security` skills rely on.
 * 
 * This adapter pattern ensures that the intelligence gained from the XAgent skills
 * translates directly into production-safe, runtime-executable code via `lib/okx.ts`.
 */

import * as okx from "./okx";

export const XAgentRuntimeAdapter = {
  // Map the XAgent 'okx-dex-swap' capabilities to the runtime equivalent
  dexSwap: {
    getQuote: okx.getSwapTxData,
    checkAllowance: okx.checkAllowance,
    getApprovalTx: okx.getApproveTxData,
  },
  
  // Map the XAgent 'okx-security' capabilities to the runtime equivalent
  security: {
    scanToken: okx.scanToken,
  },

  // Map the XAgent 'okx-dex-token' / 'okx-dex-signal' capabilities
  market: {
    getSignals: okx.getSignals,
  }
};
