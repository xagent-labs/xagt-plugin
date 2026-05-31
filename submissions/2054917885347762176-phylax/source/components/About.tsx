"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, Radar, Brain, Activity } from "lucide-react";
import { useRef } from "react";

const points = [
  { icon: ShieldCheck, text: "An AI-powered protection layer for on-chain traders." },
  { icon: Radar, text: "Curates high-quality signals from trusted KOLs in real time." },
  { icon: Brain, text: "Filters noise, scams, and suspicious wallet behavior automatically." },
  { icon: Activity, text: "Detects anomalies and risky assets before you enter the trade." },
];

export function About() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const wordmarkX = useTransform(scrollYProgress, [0, 1], [-40, 40]);

  return (
    <section
      id="about"
      ref={ref}
      className="relative overflow-hidden py-28 md:py-40 bg-surface-soft noise-texture"
    >
      {/* corner gradient blur */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full opacity-40"
          style={{ background: "radial-gradient(closest-side, oklch(0.62 0.19 260 / 0.18), transparent)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full opacity-30"
          style={{ background: "radial-gradient(closest-side, oklch(0.7 0.13 280 / 0.18), transparent)" }}
        />
        <div className="absolute inset-0 grid-texture opacity-40" />
      </div>

      {/* huge backdrop wordmark with parallax */}
      <motion.div
        aria-hidden
        style={{ x: wordmarkX, willChange: "transform" }}
        className="pointer-events-none absolute inset-x-0 -bottom-[12%] flex justify-center select-none"
      >
        <span className="font-display font-bold tracking-tighter text-[22vw] leading-none text-foreground/[0.04]">
          PHYLAX
        </span>
      </motion.div>

      <div className="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-2 gap-16 items-center relative">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-electric font-medium">
              The Guard Layer
            </p>
            <h2 className="mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight">
              What is <span className="text-gradient-brand">PhylaX?</span>
            </h2>
            <p className="mt-6 text-muted-foreground text-lg leading-relaxed max-w-xl">
              PhylaX is a wallet-gated chat-based trading assistant — combining
              natural-language on-chain trading with risk intelligence to protect your capital.
            </p>
          </motion.div>

          <ul className="mt-10 space-y-4">
            {points.map((p, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-4 rounded-2xl border border-border bg-white/60 backdrop-blur p-4 hover:shadow-soft transition-shadow duration-200"
              >
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-gradient-brand text-white shrink-0">
                  <p.icon size={18} />
                </span>
                <span className="text-foreground/90">{p.text}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative aspect-square max-w-md mx-auto w-full"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-brand opacity-10 blur-3xl" />
          <div className="relative h-full rounded-3xl border border-border bg-white/70 backdrop-blur shadow-soft overflow-hidden">
            <svg viewBox="0 0 400 400" className="w-full h-full">
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0" stopColor="oklch(0.62 0.19 260)" />
                  <stop offset="1" stopColor="oklch(0.7 0.13 280)" />
                </linearGradient>
              </defs>
              {[60, 110, 160].map((r, i) => (
                <circle
                  key={r}
                  cx="200"
                  cy="200"
                  r={r}
                  fill="none"
                  stroke="url(#g1)"
                  strokeOpacity={0.5 - i * 0.12}
                  strokeWidth="1"
                />
              ))}
              <circle cx="200" cy="200" r="20" fill="url(#g1)" />
              {[0, 60, 120, 180, 240, 300].map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                const cx = Number((200 + Math.cos(rad) * 110).toFixed(2));
                const cy = Number((200 + Math.sin(rad) * 110).toFixed(2));
                return (
                  <circle key={i} cx={cx} cy={cy} r="5" fill="oklch(0.62 0.19 260)">
                    <animate
                      attributeName="opacity"
                      values="0.3;1;0.3"
                      dur="2.5s"
                      begin={`${i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                );
              })}
            </svg>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
