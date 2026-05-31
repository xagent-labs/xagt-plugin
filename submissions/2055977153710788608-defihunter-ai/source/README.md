# DeFiHunter AI

智能链上机会发现与 DeFi 自动化助手 —— 基于 **Skill 模块化架构** 的 Web3 Agent 操作系统。

> **风险声明**：本项目仅用于学习、研究与黑客松演示，**不构成任何投资建议**。链上操作请自行验证合约与风险。

---

## 1. 项目简介

DeFiHunter AI 将市场分析、收益扫描、叙事检测、风险评估、钱包分析、Swap 建议、Gas 优化等能力拆分为独立 **Skill**，由 **Agent Orchestrator** 根据自然语言自动编排执行，并在赛博朋克风格仪表盘中实时展示结果。

- 默认接入 **DeFiLlama**、**CoinGecko** 等公开 API（无需 Key 即可运行大部分功能）
- API 失败时自动 **降级 Mock 数据层**（明确标注 `dataSource: mock`，不伪装为链上真数据）
- 支持 **MCP 兼容** 工具描述导出（`GET /api/mcp/tools`）

---

## 2. 核心功能

| 能力 | 说明 |
|------|------|
| 市场数据分析 | 多链 TVL、Gas、代币价格与 24h 涨跌 |
| 叙事 Narratives | Trending + 规则引擎叙事强度 |
| 高收益 DeFi 机会 | DeFiLlama 收益池 APY / TVL / 风险分 |
| 协议风险评估 | TVL、审计启发式、黑客事件库 |
| 钱包 / Smart Money | 持仓与标签地址重叠（需 API Key） |
| Swap / 策略推荐 | 1inch 或现货估算；资金分配策略 |
| Alpha Feed | 聚合叙事与代币信号流 |
| Gas 优化 | 多链 Gas 对比与最便宜执行链建议 |
| Skill 执行日志 | 每步成功/失败、耗时、错误信息 |
| 运行历史 & 导出 | 回放历史 Agent 运行、导出 JSON |

---

## 3. 技术栈

- **Next.js 15**（App Router + API Routes）
- **TypeScript**（严格模式）
- **Tailwind CSS** + **Framer Motion**
- **Zustand** 状态管理
- **Zod** 输入/输出校验
- **Node.js** 服务端 Skill 执行

---

## 4. 项目目录结构

```
defihunter-ai/
├── skills/                      # Skill 模块（核心）
│   ├── core/                    # 注册表、执行器、别名工厂
│   ├── canonical/               # 规范 Skill ID 注册
│   ├── token-price/             # token_price
│   ├── alpha-feed/              # alpha_feed
│   ├── market-analyzer/
│   ├── yield-finder/            # + 别名 defi_yield_scan
│   ├── wallet-analyzer/         # + 别名 wallet_analyze
│   ├── swap-recommender/        # + 别名 swap_executor
│   ├── risk-evaluator/          # + 别名 risk_checker
│   ├── narrative-detector/      # + 别名 narrative_detector
│   ├── gas-tracker/             # + 别名 gas_optimizer
│   ├── strategy-optimizer/
│   └── protocol-leaderboard/
├── src/
│   ├── app/                     # 页面与 API
│   ├── components/              # UI 组件
│   ├── lib/agent/               # Planner / Orchestrator / Synthesizer
│   ├── lib/data/                # 数据层 + Providers
│   └── store/                   # Zustand
├── .env.example
└── README.md
```

---

## 5. Agent 架构说明

```
用户指令
   ↓
Planner（正则意图 → Skill 执行计划）
   ↓
Orchestrator（顺序执行，Zod 校验）
   ↓
Synthesizer（汇总 Alpha / Yield / Risk / Actions）
   ↓
UI（终端 + 仪表盘 + 执行日志）
```

- **Memory**：服务端保存近期计划与运行记录
- **错误处理**：单 Skill 失败不中断整条流水线，错误写入 `SkillResult` 与终端日志

---

## 6. Skills 模块说明

每个 Skill 均包含：`description`、`inputSchema`、`outputSchema`、`execute`（异步）。

### 规范 ID（文档 / MCP 推荐）

| Skill ID | 说明 | 数据源 |
|----------|------|--------|
| `token_price` | 代币现货价格 | CoinGecko |
| `defi_yield_scan` | DeFi 收益池扫描 | DeFiLlama |
| `wallet_analyze` | 钱包持仓分析 | Alchemy / Etherscan / **Mock** |
| `swap_executor` | Swap 报价建议 | 1inch（可选）/ CoinGecko |
| `risk_checker` | 协议风险检查 | DeFiLlama |
| `narrative_detector` | 叙事检测 | CoinGecko |
| `alpha_feed` | Alpha 信号流 | CoinGecko |
| `gas_optimizer` | Gas 优化 | Etherscan（可选）/ 估算 |

### 扩展 ID（向后兼容）

`market-analyzer`、`yield-finder`、`wallet-analyzer`、`swap-recommender`、`risk-evaluator`、`narrative-detector`、`gas-tracker`、`strategy-optimizer`、`protocol-leaderboard`

---

## 7. API 数据源说明

| Provider | 用途 | 是否需要 Key |
|----------|------|------------|
| **DeFiLlama** | 收益池、链 TVL、协议、黑客 | 否 |
| **CoinGecko** | 价格、Trending、全局情绪 | 否（Pro Key 可选） |
| **1inch** | 聚合 Swap 报价 | 是 `ONEINCH_API_KEY` |
| **Alchemy** | 钱包 ERC20/ETH 余额 | 是 `ALCHEMY_API_KEY` |
| **Etherscan** | Gas Oracle、ETH 余额 | 是 `ETHERSCAN_API_KEY` |

- HTTP 层：**超时 12s**、**失败重试 2 次**
- 不可用时不静默失败：控制台 `warn` + 降级 Mock

---

## 8. Mock Blockchain Data Layer 说明

文件：`src/lib/data/mock-chain-provider.ts`

- 当 `USE_MOCK_DATA=true` 或 Live API 失败时使用
- 钱包 Skill 在未配置 Alchemy/Etherscan 时返回 **Mock 持仓**（`dataSource: "mock"`）
- UI **Wallet Analysis** 面板会显示「Mock（演示数据）」
- **不会**将 Mock 标注为 Live

---

## 9. 环境变量配置

复制模板：

```bash
cd defihunter-ai
copy .env.example .env.local
```

| 变量 | 必填 | 说明 |
|------|------|------|
| `USE_MOCK_DATA` | 否 | `true` 强制 Mock；`false` 使用真实 API |
| `ONEINCH_API_KEY` | 否 | Swap 精准报价 |
| `ALCHEMY_API_KEY` | 否 | 钱包分析（推荐） |
| `ETHERSCAN_API_KEY` | 否 | Gas + 钱包备选 |
| `COINGECKO_API_KEY` | 否 | Pro 限额 |

---

## 10. 安装步骤

```bash
cd defihunter-ai
npm install
```

---

## 11. 本地启动步骤

```bash
npm run dev
```

浏览器访问终端输出的地址（通常为 **http://localhost:3000**）。

验证接口：

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/status
```

---

## 12. 构建与部署步骤

```bash
npm run typecheck
npm run build
npm run start
```

若构建报错 `pages-manifest.json` 缺失，请清理后重试：

```bash
rmdir /s /q .next
npm run build
```

---

## 13. 常见问题

**Q: 页头显示 Mock Fallback？**  
A: 检查 `USE_MOCK_DATA` 是否为 `true`，或 Live API 是否被墙/限流。

**Q: 钱包分析无数据？**  
A: 需配置 `ALCHEMY_API_KEY` 或 `ETHERSCAN_API_KEY`，否则使用 Mock 并会在 UI 标注。

**Q: CoinGecko 429？**  
A: 降低刷新频率，或配置 `COINGECKO_API_KEY`。

**Q: Agent 报 wallet 校验错误？**  
A: 钱包相关指令需填写合法 `0x` + 40 位十六进制地址。

---

## 14. 已修复 Bug 列表（v1.2）

- 修复 `page.tsx` 等组件 JSX 闭合标签错误导致构建失败
- 修复 Agent 终端将失败 Skill 仍标为 success 的问题
- 修复 Synthesizer 仅识别旧 Skill ID 导致仪表盘空数据
- 补充规范 Skill ID 别名（`defi_yield_scan`、`wallet_analyze` 等）
- 新增 `token_price`、`alpha_feed` Skill
- 新增 Skill 执行日志、钱包分析面板
- 收益扫描支持 `chainId` 过滤
- HTTP 请求增加重试；钱包输出标注 `dataSource`
- 数值展示防 NaN（`formatUsd` / `safeNum`）
- Dashboard API 改用规范 Skill ID

---

## 15. 后续可扩展方向

- 接入 DexScreener / The Graph
- 钱包交易历史可视化
- WebSocket 实时推送
- 多 Agent 并行与任务队列
- 链上交易模拟（非自动广播）

---

## 16. API 路由一览

| 方法 | 路径 |
|------|------|
| GET | `/api/health` |
| GET | `/api/status` |
| GET | `/api/dashboard` |
| GET | `/api/gas` |
| GET | `/api/skills` |
| POST | `/api/skills/execute` |
| POST | `/api/agent/run` |
| GET | `/api/mcp/tools` |

---

## License

MIT
