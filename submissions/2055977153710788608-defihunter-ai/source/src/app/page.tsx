"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { AgentTerminal } from "@/components/terminal/AgentTerminal";
import { YieldTable } from "@/components/dashboard/YieldTable";
import { AlphaFeed } from "@/components/dashboard/AlphaFeed";
import { RiskPanel } from "@/components/dashboard/RiskPanel";
import { SkillGrid } from "@/components/dashboard/SkillGrid";
import { MetricsBar } from "@/components/dashboard/MetricsBar";
import { GasTracker } from "@/components/dashboard/GasTracker";
import { RecommendationsPanel } from "@/components/dashboard/RecommendationsPanel";
import { RunHistory } from "@/components/dashboard/RunHistory";
import { SkillExecutionLog } from "@/components/dashboard/SkillExecutionLog";
import { WalletPanel } from "@/components/dashboard/WalletPanel";
import { useDeFiHunterStore } from "@/store/defihunter-store";

export default function HomePage() {
  const {
    refreshDashboard,
    isDashboardLoading,
    topYields,
    alphaFeed,
    riskAlerts,
    recommendedActions,
    runHistory,
    lastRun,
    autoRefresh,
    setAutoRefresh,
    exportLastRun,
    restoreRun,
    skillResults,
    isAgentRunning,
    walletSnapshot,
    walletDataSource,
  } = useDeFiHunterStore();

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => refreshDashboard(), 60_000);
    return () => clearInterval(id);
  }, [autoRefresh, refreshDashboard]);

  return (
    <motion.div
      className="grid-bg relative flex min-h-screen flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Header />

      <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MetricsBar />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => refreshDashboard()}
              disabled={isDashboardLoading}
              className="rounded border border-hunter-border px-3 py-1 text-[10px] uppercase text-hunter-neon hover:bg-hunter-neon/10 disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`rounded border px-3 py-1 text-[10px] uppercase ${
                autoRefresh
                  ? "border-hunter-neon bg-hunter-neon/10 text-hunter-neon"
                  : "border-hunter-border text-hunter-muted"
              }`}
            >
              Auto 60s
            </button>
            <button
              type="button"
              onClick={exportLastRun}
              disabled={!lastRun}
              className="rounded border border-hunter-border px-3 py-1 text-[10px] uppercase text-hunter-cyan hover:bg-hunter-cyan/10 disabled:opacity-40"
            >
              Export JSON
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-12">
          <section className="flex flex-col gap-4 xl:col-span-5">
            <AgentTerminal />
            <SkillExecutionLog results={skillResults} loading={isAgentRunning} />
            <RunHistory runs={runHistory} onSelect={restoreRun} />
          </section>

          <section className="flex flex-col gap-4 xl:col-span-7">
            <YieldTable yields={topYields} loading={isDashboardLoading} />
            <WalletPanel wallet={walletSnapshot} dataSource={walletDataSource ?? undefined} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <AlphaFeed items={alphaFeed} loading={isDashboardLoading} />
              <RiskPanel alerts={riskAlerts} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <GasTracker />
              <RecommendationsPanel actions={recommendedActions} />
            </div>
            <SkillGrid />
          </section>
        </div>
      </main>

      <footer className="border-t border-hunter-border px-6 py-2 text-center text-[10px] text-hunter-muted">
        DeFiHunter AI v1.2 · 17 Skill 注册 · DeFiLlama · CoinGecko · Mock 可降级
      </footer>
    </motion.div>
  );
}
