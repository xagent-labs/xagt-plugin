"use client";

import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useRef } from "react";
import { Particles } from "./Particles";

const word: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Hero({ onLaunch }: { onLaunch?: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const markY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-32 md:pt-40 pb-24 md:pb-32 noise-texture">
      {/* radial bg with parallax */}
      <motion.div style={{ y: bgY, willChange: "transform" }} className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-40 -left-20 h-[520px] w-[520px] rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(closest-side, oklch(0.7 0.13 280 / 0.25), transparent)",
          }}
        />
        <div
          className="absolute top-20 right-0 h-[600px] w-[600px] rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(closest-side, oklch(0.62 0.19 260 / 0.18), transparent)",
          }}
        />
      </motion.div>

      <Particles count={14} />

      <div className="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-12 gap-12 items-center relative">
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white/60 backdrop-blur px-4 py-1.5 text-xs tracking-wide text-muted-foreground"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-electric opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-electric" />
            </span>
            AI-powered signal intelligence
          </motion.div>

          <h1 className="mt-8 font-display font-bold tracking-tight text-foreground leading-[0.92] text-[clamp(3.5rem,11vw,9rem)]">
            {["CURATE", "DETECT", "PROTECT"].map((w, i) => (
              <motion.span
                key={w}
                custom={i}
                variants={word}
                initial="hidden"
                animate="show"
                className="block"
              >
                {w === "PROTECT" ? (
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-electric via-indigo-soft to-cyan-soft animate-gradient-shift">
                    {w}
                  </span>
                ) : (
                  w
                )}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed"
          >
            PhylaX provides risk intelligence before every on-chain trade — a wallet-gated
            chat-based assistant for natural-language on-chain trading.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <button
              onClick={onLaunch}
              className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-brand text-white px-7 py-3.5 text-sm font-medium shadow-glow hover:shadow-glow transition-[transform,box-shadow] duration-250 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
              style={{ boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.2), 0 20px 60px -20px oklch(0.62 0.19 260 / 0.6)" }}
            >
              <span
                aria-hidden
                className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"
                style={{ background: "var(--gradient-brand)" }}
              />
              Use App
              <ArrowUpRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
            <a
              href="#about"
              className="group inline-flex items-center gap-2 rounded-full bg-white border border-foreground/80 text-foreground px-7 py-3.5 text-sm font-medium hover:bg-foreground hover:text-white transition-[background-color,color,transform] duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Read More
            </a>
          </motion.div>
        </div>

        <motion.div
          style={{ y: markY, willChange: "transform" }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5 relative h-[420px] md:h-[520px] flex items-center justify-center"
        >
          {/* outer thin orbital ring */}
          <div className="absolute inset-4 rounded-full border border-electric/20 animate-ring-spin" style={{ animationDuration: "30s" }} />
          {/* rotating gradient ring */}
          <div
            className="absolute inset-10 rounded-full animate-ring-spin opacity-70"
            style={{
              background:
                "conic-gradient(from 0deg, transparent, oklch(0.62 0.19 260 / 0.6), transparent 40%, oklch(0.7 0.13 280 / 0.6), transparent 80%)",
              maskImage:
                "radial-gradient(circle, transparent 56%, black 57%, black 60%, transparent 61%)",
              WebkitMaskImage:
                "radial-gradient(circle, transparent 56%, black 57%, black 60%, transparent 61%)",
            }}
          />
          <div className="absolute inset-16 rounded-full bg-gradient-brand opacity-20 blur-3xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/PhylaX-mark.png"
            alt="PhylaX 3D shield emblem"
            width={520}
            height={520}
            className="relative z-10 w-[340px] md:w-[460px] animate-float-slow drop-shadow-2xl"
          />
        </motion.div>
      </div>
    </section>
  );
}
