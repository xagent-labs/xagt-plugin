"use client";

import type { WalletContext } from "@/types/agent";
import { NeonCard } from "@/components/ui/NeonCard";
import { formatUsd } from "@/lib/utils/format";

interface WalletPanelProps {
  wallet: WalletContext | null;
  dataSource?: "live" | "mock";
}

export function WalletPanel({ wallet, dataSource }: WalletPanelProps) {
  return (
    <NeonCard title="Wallet Analysis" delay={0.16}>
      {!wallet ? (
        <p className="text-xs text-hunter-muted">
          填写钱包地址并运行 wallet / portfolio 相关指令以分析持仓
        </p>
      ) : (
        <>
          {dataSource && (
            <p className="mb-2 text-[10px] uppercase text-hunter-muted">
              数据源:{" "}
              <span className={dataSource === "live" ? "text-hunter-neon" : "text-hunter-amber"}>
                {dataSource === "live" ? "链上 API" : "Mock（演示数据）"}
              </span>
            </p>
          )}
          <p className="truncate font-mono text-[10px] text-hunter-cyan">{wallet.address}</p>
          <p className="mt-2 text-lg font-bold text-hunter-neon">
            {formatUsd(wallet.balances.reduce((s, b) => s + b.usdValue, 0))}
          </p>
          <ul className="mt-3 space-y-1 text-xs">
            {wallet.balances.map((b) => (
              <li key={b.symbol} className="flex justify-between border-b border-hunter-border/40 py-1">
                <span>{b.symbol}</span>
                <span className="text-hunter-text">
                  {b.amount.toFixed(4)} · {formatUsd(b.usdValue)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-hunter-muted">
            Recent txs (chain {wallet.chainId}): {wallet.recentTxCount}
          </p>
        </>
      )}
    </NeonCard>
  );
}
