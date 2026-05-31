"use client";

import { motion } from "framer-motion";
import { Sparkles, ShieldAlert, BrainCircuit, Lock, type LucideIcon } from "lucide-react";
import { useRef, type MouseEvent } from "react";

type Feature = {
  title: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
  span?: string;
};

const features: Feature[] = [
  {
    title: "Curated Signals",
    desc: "Aggregates and filters high-conviction calls from trusted KOLs, scored by historical performance.",
    icon: Sparkles,
    accent: "oklch(0.62 0.19 260)",
    span: "md:col-span-2",
  },
  {
    title: "Risk Detection",
    desc: "Detect suspicious token behavior, wallet anomalies, and manipulated trends in real time.",
    icon: ShieldAlert,
    accent: "oklch(0.7 0.13 280)",
  },
  {
    title: "AI Intelligence",
    desc: "AI-assisted market interpretation and signal verification across X Layer liquidity.",
    icon: BrainCircuit,
    accent: "oklch(0.78 0.12 220)",
  },
  {
    title: "Protection Layer",
    desc: "Built as a smart defensive layer before entering risky trades — a guard you don't see.",
    icon: Lock,
    accent: "oklch(0.21 0.05 265)",
    span: "md:col-span-2",
  },
];

function FeatureCard({ f, i }: { f: Feature; i: number }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative rounded-3xl border border-border bg-white p-8 overflow-hidden transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-glow ${f.span ?? ""}`}
      style={{
        backgroundImage: `radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), ${f.accent.replace(")", " / 0.08)")}, transparent 60%)`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-60 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: `linear-gradient(90deg, transparent, ${f.accent}, transparent)` }}
      />
      <span className="absolute top-5 right-5 flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
          style={{ background: f.accent }}
        />
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ background: f.accent }}
        />
      </span>

      <div className="relative">
        <div
          className="inline-grid place-items-center h-12 w-12 rounded-2xl text-white shadow-soft transition-transform duration-250 ease-out group-hover:scale-110 group-hover:-translate-y-1 group-hover:rotate-3"
          style={{ background: `linear-gradient(135deg, ${f.accent}, oklch(0.7 0.13 280))` }}
        >
          <f.icon size={20} />
        </div>
        <h3 className="mt-6 font-display text-2xl font-semibold">{f.title}</h3>
        <p className="mt-3 text-muted-foreground leading-relaxed max-w-md">{f.desc}</p>
      </div>
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="safety-model" className="relative py-28 md:py-36 overflow-hidden noise-texture">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full opacity-20 animate-float-slow"
          style={{ background: "radial-gradient(closest-side, oklch(0.62 0.19 260 / 0.4), transparent)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 h-[450px] w-[450px] rounded-full opacity-20 animate-float-slow"
          style={{
            background: "radial-gradient(closest-side, oklch(0.7 0.13 280 / 0.4), transparent)",
            animationDelay: "3s",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-electric font-medium">Capabilities</p>
          <h2 className="mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight">
            Built for <span className="text-gradient-brand">Smarter Protection</span>
          </h2>
          <p className="mt-5 text-muted-foreground text-lg">
            A modular intelligence stack designed for the unforgiving pace of on-chain markets.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FeatureCard key={f.title} f={f} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
