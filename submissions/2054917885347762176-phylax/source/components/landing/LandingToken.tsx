"use client";
import { motion } from "framer-motion";
import Image from "next/image";

const utilities = [
  { k: "Ticker", v: "$PHYX" },
  { k: "Utility", v: "Copilot access, risk scoring & governance" },
  { k: "Governance", v: "On-chain voting on signal and risk weights" },
  { k: "Ecosystem", v: "Premium DeFi intelligence access" },
  { k: "Protection Score", v: "Stake-weighted execution trust scoring" },
  { k: "Future Utility", v: "Staking & validator nodes" },
];

export function LandingToken() {
  return (
    <section id="token" className="py-28 md:py-36 relative overflow-hidden noise-texture">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full opacity-30" style={{ background: "radial-gradient(closest-side, oklch(0.7 0.13 280 / 0.25), transparent)" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.9 }}
          className="relative h-[420px] flex items-center justify-center order-2 lg:order-1"
        >
          <div className="absolute inset-12 rounded-full bg-gradient-brand opacity-30 blur-3xl" />
          <div className="absolute inset-2 rounded-full border border-indigo-soft/20 animate-ring-spin" style={{ animationDuration: "40s" }} />
          <div className="absolute inset-12 rounded-full border border-electric/15 animate-ring-spin" style={{ animationDuration: "25s", animationDirection: "reverse" }} />
          <div className="absolute inset-8 rounded-full animate-ring-spin opacity-60" style={{
            background: "conic-gradient(from 90deg, transparent, oklch(0.62 0.19 260 / 0.7), transparent 50%)",
            maskImage: "radial-gradient(circle, transparent 60%, black 61%, black 63%, transparent 64%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 60%, black 61%, black 63%, transparent 64%)",
          }} />
          <span className="absolute inset-16 rounded-full border border-electric/40 animate-pulse-ring" />
          <Image src="/aegis-token.png" alt="$PHYX token" width={420} height={420} loading="lazy" className="relative z-10 w-[320px] md:w-[400px] animate-float-slow drop-shadow-2xl" />
        </motion.div>

        <div className="order-1 lg:order-2">
          <p className="text-xs uppercase tracking-[0.2em] text-electric font-medium">Token</p>
          <h2 className="mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight">
            <span className="text-gradient-brand">$PHYX</span> powers the network.
          </h2>
          <p className="mt-5 text-muted-foreground text-lg max-w-xl">
            A utility token aligning traders, signal providers, and validators around a shared standard of trust and execution quality.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 gap-3">
            {utilities.map((u, i) => (
              <motion.div key={u.k} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.4 }}
                className="rounded-2xl border border-border bg-white p-5 hover:shadow-soft transition-shadow"
              >
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{u.k}</p>
                <p className="mt-1.5 font-medium">{u.v}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
