"use client";

import { motion } from "framer-motion";
import { Brain, Cpu, Radio, Shield, ChartNoAxesCombined, Sparkles } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import type { LucideIcon } from "@/lib/lucide";

const ICONS = [Brain, Radio, Cpu, Shield, ChartNoAxesCombined] as const;
const ACCENT = ["electric", "plasma", "cyan", "warning", "success"] as const;
const ORBIT_RADIUS_PCT = 38;

export function AgentOrbit() {
  const count = AGENTS.length;

  return (
    <section className="relative mx-auto mt-20 max-w-6xl px-4 sm:mt-28 sm:px-6">
      <SectionHeader
        kicker="Multi-agent core"
        title="Specialized agents, one autonomous research engine"
        body="X-Agent orchestrates dedicated agents — research, narrative, signal, security and market — each with its own model, skills and memory. They coordinate continuously so the answer is always source-backed and current."
      />

      <div className="relative mx-auto mt-10 grid place-items-center sm:mt-12">
        <motion.div
          className="relative aspect-square w-full max-w-[520px] pb-10 sm:pb-12"
          style={{ minWidth: "min(280px, 90vw)" }}
        >
          {[260, 360, 460].map((size, i) => (
            <div
              key={size}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/60"
              style={{
                width: `${(size / 460) * 100}%`,
                height: `${(size / 460) * 100}%`,
                opacity: 0.4 - i * 0.1,
              }}
            />
          ))}

          <div className="absolute inset-0 grid place-items-center">
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0 0 hsl(var(--electric) / 0.5)",
                  "0 0 0 22px hsl(var(--electric) / 0)",
                ],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
              className="relative grid h-20 w-20 place-items-center rounded-2xl border border-electric/40 bg-card/80 backdrop-blur-xl sm:h-24 sm:w-24"
            >
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-electric/20 via-transparent to-plasma/20" />
              <Sparkles className="relative h-6 w-6 text-electric sm:h-7 sm:w-7" />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                x-agent core
              </div>
            </motion.div>
          </div>

          <Connector count={count} />

          {AGENTS.map((a, i) => {
            const Icon = ICONS[i % ICONS.length];
            const accent = ACCENT[i % ACCENT.length];
            const angleDeg = (360 / count) * i - 90;
            const rad = (angleDeg * Math.PI) / 180;
            const left = 50 + ORBIT_RADIUS_PCT * Math.cos(rad);
            const top = 50 + ORBIT_RADIUS_PCT * Math.sin(rad);
            return (
              <motion.div
                key={a.id}
                className="absolute z-10"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <OrbitNode label={a.name} icon={Icon} accent={accent} delay={i * 0.12} />
              </motion.div>
            );
          })}
        </motion.div>

        <p className="relative z-10 mt-8 max-w-md px-2 text-center text-[11px] leading-relaxed text-muted-foreground sm:mt-10">
          <span className="font-mono">model-routed via </span>
          <span className="inline-block rounded border border-border bg-card/60 px-2 py-0.5 font-mono">
            openrouter
          </span>
          <span className="mt-1 block font-mono sm:mt-0 sm:inline">
            {" "}
            · claude · gpt-4o · haiku · any model you configure
          </span>
        </p>
      </div>
    </section>
  );
}

function OrbitNode({
  label,
  icon: Icon,
  accent,
  delay,
}: {
  label: string;
  icon: LucideIcon;
  accent: (typeof ACCENT)[number];
  delay: number;
}) {
  const tone =
    accent === "electric"
      ? "border-electric/40 text-electric bg-electric/10"
      : accent === "plasma"
      ? "border-plasma/40 text-plasma bg-plasma/10"
      : accent === "cyan"
      ? "border-cyan/40 text-cyan bg-cyan/10"
      : accent === "warning"
      ? "border-warning/40 text-warning bg-warning/10"
      : "border-success/40 text-success bg-success/10";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, delay }}
      className="flex flex-col items-center"
    >
      <div className={`relative grid h-12 w-12 place-items-center rounded-xl border bg-card/80 backdrop-blur-md sm:h-14 sm:w-14 ${tone}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background animate-pulse-glow" />
      </div>
      <div className="mt-1.5 max-w-[5.5rem] text-center font-mono text-[9px] uppercase leading-tight tracking-wider text-muted-foreground sm:max-w-none sm:whitespace-nowrap sm:text-[10px]">
        {label.replace(" Agent", "")}
      </div>
    </motion.div>
  );
}

function Connector({ count }: { count: number }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      {Array.from({ length: count }).map((_, i) => {
        const angleDeg = (360 / count) * i - 90;
        const rad = (angleDeg * Math.PI) / 180;
        const x = (50 + Math.cos(rad) * ORBIT_RADIUS_PCT).toFixed(3);
        const y = (50 + Math.sin(rad) * ORBIT_RADIUS_PCT).toFixed(3);
        return (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={x}
            y2={y}
            stroke="hsl(var(--electric))"
            strokeWidth="0.15"
            strokeDasharray="0.6 0.6"
            opacity="0.45"
          />
        );
      })}
    </svg>
  );
}

export function SectionHeader({
  kicker,
  title,
  body,
  align = "center",
}: {
  kicker: string;
  title: string;
  body?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={`flex flex-col ${align === "center" ? "items-center text-center" : "items-start"} gap-3`}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse-glow" />
        {kicker}
      </span>
      <h2 className="max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        {title}
      </h2>
      {body && (
        <p className="max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
          {body}
        </p>
      )}
    </div>
  );
}
