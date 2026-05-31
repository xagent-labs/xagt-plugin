"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Github, Sparkles, Terminal, ShieldCheck, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "@/lib/lucide";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-20 sm:pt-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[min(820px,100vw)] -translate-x-1/2 rounded-full bg-electric/10 blur-3xl" />
        <div className="absolute top-20 right-[-40px] h-[220px] w-[220px] rounded-full bg-plasma/10 blur-3xl sm:right-10 sm:h-[280px] sm:w-[280px]" />
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-electric">
            <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse-glow" />
            X-Agent Hackathon · v0.1
          </div>

          <h1 className="mt-6 text-balance text-fluid-display font-semibold leading-[1.05] tracking-tight">
            Autonomous AI{" "}
            <span className="gradient-text">crypto intelligence</span>
            <br className="hidden sm:inline" />
            <span className="text-foreground/80">that researches for you.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-balance text-fluid-base leading-relaxed text-muted-foreground">
            X-Agent is an open-source AI research engine for crypto. Multi-agent
            crawlers read the public web, audit on-chain data and synthesize
            source-backed intelligence — self-hosted, with just an OpenRouter key.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button size="lg" className="font-medium">
                Open the terminal
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a
              href="https://github.com/Dairus01/X-Agent"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Button size="lg" variant="outline" className="font-medium">
                <Github className="h-4 w-4" />
                View on GitHub
              </Button>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <Pill icon={Terminal}>OpenRouter only — one API key</Pill>
            <Pill icon={Sparkles}>No paid APIs · no mock data</Pill>
            <Pill icon={ShieldCheck}>Self-hosted · MIT licensed</Pill>
            <Pill icon={Layers}>OKX skills, native</Pill>
          </div>
        </motion.div>

        <TerminalPreview />
      </div>
    </section>
  );
}

function Pill({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 font-mono backdrop-blur-md">
      <Icon className="h-3 w-3 text-electric" />
      {children}
    </span>
  );
}

function TerminalPreview() {
  const lines: { tag?: string; tagCls?: string; text: string; mono?: boolean }[] = [
    { tag: "user", tagCls: "text-cyan", text: "Why is ETH outperforming SOL this week?" },
    { tag: "plan", tagCls: "text-plasma", text: "spawning research + narrative + market agents" },
    { tag: "skill", tagCls: "text-warning", text: "okx.dex.market(pair=ETH/USDC, depth=top5)" },
    { tag: "skill", tagCls: "text-warning", text: "okx.onchain.gateway(query=staking_inflows_24h)" },
    { tag: "crawl", tagCls: "text-electric", text: "fetched 18 sources · 4 institutions · 12 publications" },
    { tag: "synth", tagCls: "text-success", text: "thesis assembled · 92% confidence · 14 citations →" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="relative mx-auto mt-10 max-w-4xl sm:mt-14"
    >
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-electric/30 via-plasma/20 to-cyan/30 opacity-50 blur-xl" />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-background/60 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-destructive/60" />
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-warning/60" />
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success/60" />
            <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground sm:ml-3">
              x-agent · research session
            </span>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
            <span className="hidden sm:inline">5 agents online</span>
            <span className="sm:hidden">5/5</span>
          </div>
        </div>
        <div className="space-y-1.5 px-3 py-4 font-mono text-[11px] leading-relaxed sm:px-5 sm:py-5 sm:text-[12px]">
          {lines.map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.45 + i * 0.18 }}
              className="flex gap-2 sm:gap-3"
            >
              <span className={`w-10 shrink-0 uppercase tracking-wider sm:w-12 ${l.tagCls}`}>
                {l.tag}
              </span>
              <span className="min-w-0 break-words text-foreground/85">{l.text}</span>
            </motion.div>
          ))}
          <div className="flex gap-2 sm:gap-3">
            <span className="w-10 shrink-0 uppercase tracking-wider text-electric sm:w-12">x</span>
            <span className="terminal-caret text-foreground/60">_</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
