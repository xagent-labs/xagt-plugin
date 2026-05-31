"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export function CTA({ onLaunch }: { onLaunch?: () => void }) {
  return (
    <section id="cta" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-[2rem] overflow-hidden p-10 md:p-16 text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.21 0.05 265), oklch(0.32 0.12 270))" }}
        >
          <div
            className="absolute -top-32 -right-32 h-[400px] w-[400px] rounded-full opacity-50"
            style={{ background: "radial-gradient(closest-side, oklch(0.62 0.19 260 / 0.6), transparent)" }}
          />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Trade with risk intelligence.
            </h2>
            <p className="mt-4 text-white/70 text-lg">
              Chat with PhylaX before every on-chain trade. Scan. Quote. Confirm.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={onLaunch}
                className="group inline-flex items-center gap-2 rounded-full bg-white text-navy px-7 py-3.5 text-sm font-medium hover:bg-white/90 transition-[background-color,transform] duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Launch Agent
                <ArrowUpRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <a href="#safety-model" className="inline-flex items-center gap-2 rounded-full border border-white/30 text-white px-7 py-3.5 text-sm font-medium hover:bg-white/10 transition-[background-color] duration-150">
                View Safety Model
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
