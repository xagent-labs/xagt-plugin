import type { Skill } from "./types";

export const SKILLS: Skill[] = [
  {
    id: "okx-dex-market",
    name: "DEX Market Analysis",
    category: "dex",
    description:
      "Live DEX pair metrics, liquidity depth, volume momentum and trader concentration across major chains.",
    installed: true,
    executions24h: 1843,
    latencyMs: 412,
    compatibleAgents: ["research", "signal", "market"],
  },
  {
    id: "okx-dex-token",
    name: "Token Discovery",
    category: "dex",
    description:
      "Surface newly launched tokens, contract metadata, dev wallet history and early holder distribution.",
    installed: true,
    executions24h: 1102,
    latencyMs: 380,
    compatibleAgents: ["research", "security"],
  },
  {
    id: "okx-dex-signal",
    name: "Signal Generation",
    category: "signal",
    description:
      "Smart-money tracking, KOL aggregation and unusual flow detection across thousands of wallets.",
    installed: true,
    executions24h: 642,
    latencyMs: 510,
    compatibleAgents: ["signal", "market"],
  },
  {
    id: "okx-wallet-portfolio",
    name: "Wallet Intelligence",
    category: "wallet",
    description:
      "PnL, position breakdown, realized vs unrealized — across EVM, Solana and L2 ecosystems.",
    installed: true,
    executions24h: 487,
    latencyMs: 622,
    compatibleAgents: ["market", "signal"],
  },
  {
    id: "okx-dapp-discovery",
    name: "dApp Discovery",
    category: "dapp",
    description:
      "Index of every meaningful dApp with on-chain activity, fee growth and user retention metrics.",
    installed: true,
    executions24h: 318,
    latencyMs: 290,
    compatibleAgents: ["research", "narrative"],
  },
  {
    id: "okx-defi-portfolio",
    name: "Portfolio Analysis",
    category: "portfolio",
    description:
      "Full portfolio risk decomposition: correlation, drawdown, beta to BTC/ETH, narrative exposure.",
    installed: true,
    executions24h: 211,
    latencyMs: 740,
    compatibleAgents: ["market"],
  },
  {
    id: "okx-dex-bridge",
    name: "Bridge Workflows",
    category: "bridge",
    description:
      "Optimal cross-chain routing across canonical and third-party bridges with risk-adjusted scoring.",
    installed: true,
    executions24h: 96,
    latencyMs: 980,
    compatibleAgents: ["market"],
  },
  {
    id: "okx-dex-strategy",
    name: "Strategy Systems",
    category: "strategy",
    description:
      "Composable strategy engine — DCA, grid, rotation, narrative-weighted exposure.",
    installed: true,
    executions24h: 142,
    latencyMs: 1100,
    compatibleAgents: ["signal", "market"],
  },
  {
    id: "okx-security",
    name: "Security Analysis",
    category: "security",
    description:
      "Contract audit signals: ownership, mint authority, honeypot heuristics, exploit-pattern matches.",
    installed: true,
    executions24h: 412,
    latencyMs: 350,
    compatibleAgents: ["security", "research"],
  },
  {
    id: "okx-onchain-gateway",
    name: "Onchain Gateway",
    category: "onchain",
    description:
      "Unified on-chain read layer for balances, transfers, NFT metadata, contract events.",
    installed: true,
    executions24h: 2204,
    latencyMs: 180,
    compatibleAgents: ["research", "security", "market", "signal"],
  },
];
