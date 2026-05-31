"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Github, KeyRound, ShieldCheck, ShieldOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "@/lib/lucide";

const PRINCIPLES: { icon: LucideIcon; title: string; body: string; accent: string }[] = [
  {
    icon: KeyRound,
    title: "OpenRouter only",
    body: "Exactly one API token. Route across Claude, GPT-4o, Haiku, Llama or anything OpenRouter exposes — no other paid keys.",
    accent: "text-electric border-electric/30 bg-electric/10",
  },
  {
    icon: ShieldOff,
    title: "No paid APIs, no mock feeds",
    body: "Crawlers read the public web. On-chain comes from open RPCs and OKX's public skill surface. No simulated data anywhere.",
    accent: "text-plasma border-plasma/30 bg-plasma/10",
  },
  {
    icon: ShieldCheck,
    title: "Self-hosted by default",
    body: "Your deployment, your infra, your data. MIT-licensed. No accounts, no telemetry, no vendor lock-in.",
    accent: "text-cyan border-cyan/30 bg-cyan/10",
  },
  {
    icon: Sparkles,
    title: "Hackable end-to-end",
    body: "TypeScript, Next.js App Router, shadcn-style primitives. Swap models, add skills, write your own agent — it's all yours.",
    accent: "text-success border-success/30 bg-success/10",
  },
];

export function OpenSourceCta() {
  return (
    <section className="relative mx-auto mt-28 max-w-6xl px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card/40 p-6 backdrop-blur-xl sm:p-10 lg:p-12"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[420px] w-[min(820px,100%)] -translate-x-1/2 rounded-full bg-electric/10 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-[200px] w-[200px] rounded-full bg-plasma/10 blur-3xl sm:h-[260px] sm:w-[260px]" />
          <div className="absolute inset-0 grid-bg opacity-25" />
        </div>

        <div className="relative flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-electric/30 bg-electric/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-electric">
            <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse-glow" />
            Open source · MIT
          </span>
          <h2 className="mt-5 max-w-3xl text-balance text-fluid-3xl font-semibold leading-tight tracking-tight">
            Run the entire AI research engine on your own machine
          </h2>
          <p className="mt-3 max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            X-Agent is the intelligence layer for crypto you can clone, audit, and ship — with only an OpenRouter key and zero paid integrations.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button size="lg" className="font-medium">
                Launch the terminal
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="https://github.com/Dairus01/X-Agent" target="_blank" rel="noreferrer noopener">
              <Button size="lg" variant="outline" className="font-medium">
                <Github className="h-4 w-4" />
                Clone on GitHub
              </Button>
            </a>
          </div>

          <div className="mt-10 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="rounded-xl border border-border bg-card/60 p-4 text-left backdrop-blur-md"
                >
                  <div className={`grid h-9 w-9 place-items-center rounded-md border ${p.accent}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-sm font-semibold">{p.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
