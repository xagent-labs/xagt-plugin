"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { NeonCard } from "@/components/ui/NeonCard";
import { useDeFiHunterStore } from "@/store/defihunter-store";

const QUICK_COMMANDS = [
  "Scan top yield opportunities on Ethereum",
  "What narratives are trending right now?",
  "Analyze my wallet smart money overlap",
  "Build a balanced yield strategy for $50k",
  "Evaluate Aave and GMX protocol risk",
  "Quote swap 1 ETH to USDC",
  "Compare gas fees across chains",
  "Show top DeFi protocols by TVL",
];

export function AgentTerminal() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    isAgentRunning,
    walletAddress,
    setWallet,
    chainId,
    setChainId,
    runAgentQuery,
    clearTerminal,
  } = useDeFiHunterStore();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isAgentRunning]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || isAgentRunning) return;
    setInput("");
    await runAgentQuery(q);
  };

  return (
    <NeonCard title="AI Command Terminal" glow className="flex h-full flex-col">
      <motion.div
        className="mb-3 flex flex-wrap gap-2 border-b border-hunter-border pb-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <input
          type="text"
          placeholder="0x... wallet (optional)"
          value={walletAddress}
          onChange={(e) => setWallet(e.target.value)}
          className="flex-1 min-w-[140px] rounded border border-hunter-border bg-hunter-bg px-2 py-1 text-[10px] text-hunter-text outline-none focus:border-hunter-neon"
        />
        <select
          value={chainId}
          onChange={(e) => setChainId(Number(e.target.value))}
          className="rounded border border-hunter-border bg-hunter-bg px-2 py-1 text-[10px] text-hunter-text outline-none focus:border-hunter-neon"
        >
          <option value={1}>Ethereum</option>
          <option value={42161}>Arbitrum</option>
          <option value={8453}>Base</option>
        </select>
        <button
          type="button"
          onClick={clearTerminal}
          className="rounded border border-hunter-border px-2 py-1 text-[10px] text-hunter-muted hover:border-hunter-danger hover:text-hunter-danger"
        >
          CLEAR
        </button>
      </motion.div>

      <motion.div
        ref={scrollRef}
        className="relative mb-3 h-[320px] flex-1 overflow-y-auto rounded border border-hunter-border bg-hunter-bg/80 p-3 font-mono text-xs scanlines"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2"
            >
              <span
                className={clsx(
                  "mr-2 uppercase text-[10px]",
                  msg.role === "user" && "text-hunter-cyan",
                  msg.role === "agent" && "text-hunter-neon",
                  msg.role === "skill" && "text-hunter-amber",
                  msg.role === "system" && "text-hunter-muted"
                )}
              >
                [{msg.role}]
              </span>
              <span className="text-hunter-text">{msg.content}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {isAgentRunning && (
          <motion.p
            className="text-hunter-neon"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            ▸ Executing skill pipeline...
          </motion.p>
        )}
      </motion.div>

      <motion.div className="mb-2 flex flex-wrap gap-1">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            type="button"
            disabled={isAgentRunning}
            onClick={() => setInput(cmd)}
            className="rounded border border-hunter-border/60 px-2 py-0.5 text-[9px] text-hunter-muted transition hover:border-hunter-neon/40 hover:text-hunter-neon disabled:opacity-40"
          >
            {cmd.slice(0, 28)}…
          </button>
        ))}
      </motion.div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <span className="self-center text-hunter-neon">&gt;</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isAgentRunning}
          placeholder="Enter command — yield scan, narrative detect, risk eval..."
          className="flex-1 rounded border border-hunter-border bg-transparent px-2 py-2 text-sm outline-none focus:border-hunter-neon disabled:opacity-50"
        />
        <motion.button
          type="submit"
          disabled={isAgentRunning || !input.trim()}
          whileTap={{ scale: 0.97 }}
          className="rounded border border-hunter-neon bg-hunter-neon/10 px-4 py-2 text-xs font-bold uppercase text-hunter-neon hover:bg-hunter-neon/20 disabled:opacity-40"
        >
          {isAgentRunning ? "..." : "RUN"}
        </motion.button>
      </form>
    </NeonCard>
  );
}
