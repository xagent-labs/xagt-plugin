"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Brain, History, Send, Sparkles, Square } from "lucide-react";
import { PageHeader, PageShell } from "@/components/app/page-header";
import { AIThinkingLoader } from "@/components/ai-thinking-loader";
import { useChatStream } from "@/lib/use-chat-stream";
import { useResearchHistory } from "@/lib/stores/research";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Why is ETH outperforming SOL this week?",
  "Map the restaking ecosystem with TVL + risk",
  "Find narratives with rotating DEX liquidity",
  "Audit the BERA token contract end-to-end",
  "What's driving the AI agent sector right now?",
  "Compare ARB vs OP fundamentals over the last 30d",
];

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const runs = useResearchHistory((s) => s.runs);
  const addRun = useResearchHistory((s) => s.add);
  const patchRun = useResearchHistory((s) => s.patch);

  const { send, stop, streaming, text, error } = useChatStream({
    endpoint: "/api/research",
    onDelta: (_d, full) => {
      if (activeId) patchRun(activeId, { answer: full });
    },
    onDone: (full) => {
      if (activeId) patchRun(activeId, { answer: full, status: "done" });
    },
    onError: (err) => {
      if (activeId) patchRun(activeId, { status: "error", answer: err.message });
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || streaming) return;
    const id = `run-${Date.now()}`;
    setActiveId(id);
    addRun({ id, query: q, answer: "", createdAt: new Date().toISOString(), status: "streaming" });
    void send([{ role: "user", content: q }]);
  }

  const active = activeId ? runs.find((r) => r.id === activeId) : null;

  return (
    <PageShell>
      <PageHeader
        kicker="autonomous research"
        tone="electric"
        title="AI Research"
        description="Ask anything. The research agent will plan a workflow, invoke skills, crawl sources and synthesize a source-backed answer."
      />

      <form
        onSubmit={onSubmit}
        className="mt-6 overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-md"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <Sparkles className="h-4 w-4 text-electric" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to research?"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            disabled={streaming}
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              <Square className="h-3 w-3" />
              Stop
            </button>
          ) : (
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-electric/40 bg-electric/10 px-3 py-1.5 text-xs font-medium text-electric transition-colors hover:bg-electric/20"
            >
              <Send className="h-3 w-3" />
              Research
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            try
          </span>
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setQuery(e)}
              className="rounded-full border border-border bg-background/40 px-2.5 py-1 text-[11px] text-foreground/80 transition-colors hover:border-electric/40 hover:text-electric"
            >
              {e}
            </button>
          ))}
        </div>
      </form>

      {active ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-md"
        >
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <Brain className="h-3 w-3 text-electric" /> agent reasoning
            {streaming && <AIThinkingLoader />}
          </div>
          <article className="prose prose-invert mt-3 max-w-none whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
            {text || active.answer || (streaming ? "…" : "")}
          </article>
          {error && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
        </motion.div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3 text-electric" /> how research works
            </div>
            <ol className="mt-3 space-y-3">
              {[
                ["Plan", "Agent resolves intent, identifies entities and target sources."],
                ["Invoke", "Calls relevant skills — okx.dex.market, okx.onchain.gateway, RSS feeds."],
                ["Crawl", "Pulls canonical bodies from public news, docs and on-chain explorers."],
                ["Synthesize", "Produces a source-backed answer with confidence, citations and follow-ups."],
              ].map((s, i) => (
                <li key={s[0]} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/30 p-3">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded border border-electric/40 bg-electric/10 font-mono text-[10px] text-electric">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{s[0]}</div>
                    <div className="text-xs text-muted-foreground">{s[1]}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <History className="h-3 w-3 text-cyan" /> recent runs
            </div>
            <ul className="mt-3 space-y-2">
              {runs.length === 0 ? (
                <li className="rounded-md border border-dashed border-border bg-background/30 px-3 py-2 text-[11px] text-muted-foreground">
                  No runs yet. Submit a query to start.
                </li>
              ) : (
                runs.slice(0, 6).map((r) => (
                  <li
                    key={r.id}
                    className={cn(
                      "group flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/30 px-3 py-2 text-xs text-foreground/80",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveId(r.id);
                        setQuery(r.query);
                      }}
                      className="min-w-0 flex-1 truncate text-left"
                    >
                      {r.query}
                    </button>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground transition-colors group-hover:text-electric" />
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </PageShell>
  );
}
