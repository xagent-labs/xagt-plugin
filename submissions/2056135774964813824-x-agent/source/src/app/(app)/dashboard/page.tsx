"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Cpu,
  Flame,
  Newspaper,
  Radio,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { SKILLS } from "@/lib/skills";
import { AgentCard } from "@/components/agent-card";
import { useResearchHistory } from "@/lib/stores/research";
import { cn, relativeTime } from "@/lib/utils";

interface NewsResponse {
  source: string;
  feeds: string[];
  count: number;
  items: { id: string; title: string; url: string; source: string; publishedAt: string }[];
  error?: string;
}

const TONE: Record<string, string> = {
  electric: "text-electric border-electric/30 bg-electric/10",
  plasma: "text-plasma border-plasma/30 bg-plasma/10",
  cyan: "text-cyan border-cyan/30 bg-cyan/10",
  success: "text-success border-success/30 bg-success/10",
};

const QUICK_ACTIONS = [
  {
    title: "Start a research run",
    desc: "Spin up the autonomous research workflow on any thesis or token.",
    href: "/research",
    icon: Sparkles,
    tone: "electric",
  },
  {
    title: "Browse live narratives",
    desc: "Watch sector rotations the narrative agent is clustering right now.",
    href: "/narratives",
    icon: Flame,
    tone: "plasma",
  },
  {
    title: "Inspect signals",
    desc: "Review trade-grade signals with attached confidence and reasoning.",
    href: "/signals",
    icon: Radio,
    tone: "cyan",
  },
  {
    title: "Audit a contract",
    desc: "Hand the security agent any contract address for a structured review.",
    href: "/agents",
    icon: Terminal,
    tone: "warning",
  },
];

const TONE_ICON: Record<string, string> = {
  electric: "text-electric bg-electric/10 border-electric/30",
  plasma: "text-plasma bg-plasma/10 border-plasma/30",
  cyan: "text-cyan bg-cyan/10 border-cyan/30",
  warning: "text-warning bg-warning/10 border-warning/30",
};

export default function DashboardPage() {
  const runs = useResearchHistory((s) => s.runs);
  const [news, setNews] = useState<NewsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/news?limit=8")
      .then((r) => r.json() as Promise<NewsResponse>)
      .then((j) => {
        if (!cancelled && !j.error) setNews(j);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    {
      label: "Agents",
      value: String(AGENTS.length),
      hint: "configured",
      tone: "electric" as const,
      icon: Bot,
    },
    {
      label: "Skills",
      value: String(SKILLS.length),
      hint: "registered",
      tone: "plasma" as const,
      icon: Wrench,
    },
    {
      label: "Research runs",
      value: String(runs.length),
      hint: runs.length === 0 ? "none yet" : "this device",
      tone: "cyan" as const,
      icon: Cpu,
    },
    {
      label: "Sources",
      value: news ? String(news.count) : "—",
      hint: news ? `${news.feeds.length} public feeds` : "loading…",
      tone: "success" as const,
      icon: Radio,
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-5xl pad-fluid-x py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-electric/30 bg-electric/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-electric">
          <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse-glow" />
          autonomous · online
        </div>
        <h1 className="text-fluid-3xl font-semibold tracking-tight text-balance">
          Mission control
        </h1>
        <p className="max-w-2xl text-fluid-sm text-muted-foreground text-pretty">
          Your agents are running continuously in the background. Ask anything from the command bar,
          or jump into one of the workflows below.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 md:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="relative overflow-hidden rounded-xl border border-border bg-card/60 p-4 backdrop-blur-md"
            >
              <div className="flex items-start justify-between">
                <div className={cn("grid h-8 w-8 place-items-center rounded-md border", TONE[s.tone])}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">{s.hint}</span>
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight">{s.value}</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-10 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Quick actions</h2>
          <p className="text-xs text-muted-foreground">Launch a workflow or jump into a surface.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {QUICK_ACTIONS.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.a
              key={a.title}
              href={a.href}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-card/60 p-4 backdrop-blur-md transition-colors hover:border-electric/40 hover:bg-card/80"
            >
              <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md border", TONE_ICON[a.tone])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium text-foreground">{a.title}</div>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-electric" />
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{a.desc}</div>
              </div>
            </motion.a>
          );
        })}
      </div>

      {news && news.items.length > 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-card/40 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Newspaper className="h-3.5 w-3.5 text-electric" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                public feed · live
              </span>
            </div>
            <a
              href="/sources"
              className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              all sources
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          <ul className="mt-3 divide-y divide-border/60">
            {news.items.slice(0, 5).map((it) => (
              <li key={it.id}>
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col gap-1 py-2.5 hover:opacity-80 sm:flex-row sm:items-start sm:gap-3"
                >
                  <div className="hidden w-24 shrink-0 truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:block">
                    {it.source}
                  </div>
                  <div className="min-w-0 flex-1 text-sm font-medium leading-snug">
                    {it.title}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-0">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:hidden">
                      {it.source}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {relativeTime(it.publishedAt)}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-10 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Agents</h2>
          <p className="text-xs text-muted-foreground">Specialized agents coordinated via OpenRouter.</p>
        </div>
        <a
          href="/agents"
          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          all agents
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {AGENTS.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + i * 0.04 }}
          >
            <AgentCard agent={a} dense />
          </motion.div>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-border bg-card/40 p-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-electric animate-pulse-glow" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            engine status
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat label="Router" value="openrouter" sub="single API token · model-agnostic" />
          <Stat label="Data" value="public sources" sub="rss · coingecko · defillama" />
          <Stat label="License" value="self-hosted" sub="MIT · cloneable" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
