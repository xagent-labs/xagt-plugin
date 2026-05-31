"use client";

import { motion } from "framer-motion";
import { GitBranch, KeyRound, Rocket, Workflow } from "lucide-react";
import { SectionHeader } from "@/components/landing/agent-orbit";
import type { LucideIcon } from "@/lib/lucide";

const STEPS: {
  step: string;
  title: string;
  body: string;
  icon: LucideIcon;
  accent: "electric" | "plasma" | "cyan" | "success";
  command?: string;
}[] = [
  {
    step: "01",
    title: "Clone the repo",
    body: "MIT-licensed. No accounts, no signup, no SaaS dashboard to attach to. You own the deployment.",
    icon: GitBranch,
    accent: "electric",
    command: "git clone github.com/x-agent/x-agent && cd x-agent",
  },
  {
    step: "02",
    title: "Drop in your OpenRouter key",
    body: "One environment variable. That's the only API token X-Agent needs to route across Claude, GPT-4o, Haiku, Llama and anything OpenRouter supports.",
    icon: KeyRound,
    accent: "plasma",
    command: "echo OPENROUTER_API_KEY=sk-or-... >> .env.local",
  },
  {
    step: "03",
    title: "Boot the agents",
    body: "Research, narrative, signal, security and market agents come online. OKX skills load. Public sources start being crawled.",
    icon: Workflow,
    accent: "cyan",
    command: "pnpm install && pnpm dev",
  },
  {
    step: "04",
    title: "Ask anything",
    body: "Type a question. Watch the workflow execute step by step. Get a source-backed thesis you can audit, copy or hand to your team.",
    icon: Rocket,
    accent: "success",
    command: "open http://localhost:3000",
  },
];

const TONE: Record<string, string> = {
  electric: "border-electric/40 text-electric bg-electric/10",
  plasma: "border-plasma/40 text-plasma bg-plasma/10",
  cyan: "border-cyan/40 text-cyan bg-cyan/10",
  success: "border-success/40 text-success bg-success/10",
};

export function HowItWorks() {
  return (
    <section className="relative mx-auto mt-20 max-w-6xl px-4 sm:mt-28 sm:px-6">
      <SectionHeader
        kicker="From clone to thesis in minutes"
        title="Four steps. One key. Zero paid APIs."
        body="X-Agent ships as a Next.js app you self-host. Everything you see in the demo comes from public sources or your own configured providers."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="relative overflow-hidden rounded-xl border border-border bg-card/60 p-5 backdrop-blur-md"
            >
              <div className="pointer-events-none absolute -top-12 right-0 font-mono text-[80px] font-bold leading-none text-foreground/[0.04]">
                {s.step}
              </div>
              <div className={`relative grid h-10 w-10 place-items-center rounded-lg border ${TONE[s.accent]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="relative mt-4 text-sm font-semibold">{s.title}</div>
              <p className="relative mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {s.body}
              </p>
              {s.command && (
                <div className="relative mt-4 flex min-w-0 items-center gap-1 overflow-hidden rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5 font-mono text-[10.5px] text-foreground/80">
                  <span className="shrink-0 text-electric">$</span>
                  <span className="min-w-0 truncate">{s.command}</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
