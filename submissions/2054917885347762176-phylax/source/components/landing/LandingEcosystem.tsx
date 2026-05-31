"use client";
import { motion } from "framer-motion";
import { Radio, BrainCircuit, ScanLine, Gauge, ShieldCheck } from "lucide-react";
import { Particles } from "./Particles";

const nodes = [
  { icon: Radio, label: "Trading Intent", sub: "You ask PhylaX what to trade" },
  { icon: BrainCircuit, label: "Token Discovery", sub: "AI surfaces opportunities & signals" },
  { icon: ScanLine, label: "Security Scan", sub: "OKX-powered contract risk check" },
  { icon: Gauge, label: "Swap Preparation", sub: "Best route quoted via OKX DEX" },
  { icon: ShieldCheck, label: "User Execution", sub: "You sign & execute from your wallet" },
];

export function LandingEcosystem() {
  return (
    <section className="relative py-32 md:py-44 bg-navy-deep text-white overflow-hidden noise-texture">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full opacity-30 animate-drift-x" style={{ background: "radial-gradient(closest-side, oklch(0.62 0.19 260 / 0.5), transparent)" }} />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full opacity-25" style={{ background: "radial-gradient(closest-side, oklch(0.7 0.13 280 / 0.5), transparent)" }} />
        <div className="absolute inset-0 grid-texture opacity-30" />
      </div>
      <Particles count={24} color="oklch(0.82 0.11 220)" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-soft font-medium">Execution Flow</p>
          <h2 className="mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight">
            One continuous{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-electric via-indigo-soft to-cyan-soft animate-gradient-shift">
              flow from intent to on-chain action.
            </span>
          </h2>
          <p className="mt-5 text-white/60 text-lg max-w-xl">From trading idea to wallet-signed execution — every step is guided, checked, and under your control.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.9 }} className="mt-20 relative">
          {/* Desktop horizontal flow */}
          <div className="hidden md:block relative">
            <svg className="absolute top-10 left-0 right-0 w-full h-24 -z-0" viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="flowGrad" x1="0" x2="1">
                  <stop offset="0" stopColor="oklch(0.62 0.19 260)" stopOpacity="0.2" />
                  <stop offset="0.5" stopColor="oklch(0.7 0.13 280)" stopOpacity="0.6" />
                  <stop offset="1" stopColor="oklch(0.82 0.11 220)" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <path d="M 60 40 Q 250 10, 500 40 T 940 40" stroke="url(#flowGrad)" strokeWidth="1.5" fill="none" />
              {[0, 0.6, 1.2, 1.8, 2.4].map((delay, i) => (
                <circle key={i} r="3.5" fill="oklch(0.82 0.11 220)">
                  <animateMotion dur="4s" begin={`${delay}s`} repeatCount="indefinite" path="M 60 40 Q 250 10, 500 40 T 940 40" />
                  <animate attributeName="opacity" values="0;1;1;0" dur="4s" begin={`${delay}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </svg>
            <div className="grid grid-cols-5 gap-4 relative">
              {nodes.map((n, i) => (
                <motion.div key={n.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.12, duration: 0.6 }} className="flex flex-col items-center text-center group">
                  <div className="relative">
                    <span className="absolute inset-0 rounded-2xl border border-electric/40 animate-pulse-ring" style={{ animationDelay: `${i * 0.5}s` }} />
                    <div className="relative grid place-items-center h-20 w-20 rounded-2xl bg-white/5 backdrop-blur border border-white/10 shadow-glow group-hover:border-electric/60 transition-colors duration-500">
                      <n.icon size={26} className="text-cyan-soft" />
                      <span className="absolute inset-x-2 top-2 h-px bg-gradient-to-r from-transparent via-cyan-soft to-transparent animate-scan" />
                    </div>
                  </div>
                  <p className="mt-5 text-sm font-semibold text-white">{n.label}</p>
                  <p className="mt-1 text-xs text-white/50">{n.sub}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile vertical stack */}
          <div className="md:hidden space-y-4">
            {nodes.map((n, i) => (
              <motion.div key={n.label} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4"
              >
                <div className="grid place-items-center h-12 w-12 rounded-xl bg-white/5 border border-white/10 shrink-0">
                  <n.icon size={20} className="text-cyan-soft" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{n.label}</p>
                  <p className="text-xs text-white/50">{n.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
