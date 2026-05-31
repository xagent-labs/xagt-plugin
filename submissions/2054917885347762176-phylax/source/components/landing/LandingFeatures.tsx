"use client";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Sparkles, ShieldAlert, BrainCircuit, Lock, type LucideIcon } from "lucide-react";
import { useRef, type MouseEvent } from "react";

type Feature = { title: string; desc: string; icon: LucideIcon; accent: string; span?: string };

const features: Feature[] = [
  { title: "Token Discovery", desc: "Surfaces trending tokens and market signals on OKX X Layer so you can find opportunities before the crowd does.", icon: Sparkles, accent: "oklch(0.62 0.19 260)", span: "md:col-span-2" },
  { title: "Pre-Trade Security Checks", desc: "Runs OKX-powered contract audits on any token — scanning for honeypots, ownership risks, liquidity lock status, and contract red flags before you enter.", icon: ShieldAlert, accent: "oklch(0.7 0.13 280)" },
  { title: "AI Risk Intelligence", desc: "Chat-based DeFi analysis powered by AI. Ask anything about a token, market, or trade — and get clear, risk-aware analysis before you commit to a position.", icon: BrainCircuit, accent: "oklch(0.78 0.12 220)" },
  { title: "Wallet-Gated Execution", desc: "PhylaX prepares your swap via OKX-powered routing and OKX DEX. You review everything and sign the final transaction from your own wallet. Always.", icon: Lock, accent: "oklch(0.45 0.13 270)", span: "md:col-span-2" },
];

function FeatureCard({ f, i }: { f: Feature; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 120, damping: 16 });
  const ry = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 120, damping: 16 });

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
    el.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  return (
    <motion.div ref={ref} onMouseMove={handleMove} onMouseLeave={() => { mx.set(0.5); my.set(0.5); }}
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: i * 0.08, duration: 0.6 }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200, transformStyle: "preserve-3d" }}
      whileTap={{ scale: 0.985 }}
      className={`group relative rounded-3xl overflow-hidden transition-transform duration-500 hover:-translate-y-1 ${f.span ?? ""}`}
    >
      <div aria-hidden className="pointer-events-none absolute -inset-4 rounded-[2rem] opacity-60 blur-2xl -z-10" style={{ background: `radial-gradient(60% 60% at 50% 80%, ${f.accent.replace(")", " / 0.18)")}, transparent 70%)` }} />
      <div
        className="relative h-full rounded-3xl p-8 md:p-10 overflow-hidden backdrop-blur-2xl border border-white/70 shadow-[0_24px_60px_-30px_oklch(0.45_0.13_270/0.35),0_2px_6px_-2px_oklch(0.45_0.13_270/0.15),inset_0_1px_0_oklch(1_0_0/0.9)] transition-all duration-500 group-hover:shadow-[0_40px_90px_-30px_oklch(0.62_0.19_260/0.45),0_4px_10px_-2px_oklch(0.45_0.13_270/0.2),inset_0_1px_0_oklch(1_0_0/0.95)]"
        style={{ backgroundImage: `linear-gradient(180deg, oklch(1 0 0 / 0.78), oklch(0.97 0.02 255 / 0.55)), radial-gradient(600px circle at var(--mx, 50%) var(--my, 50%), ${f.accent.replace(")", " / 0.12)")}, transparent 55%)` }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24" style={{ background: "linear-gradient(180deg, oklch(1 0 0 / 0.55), transparent)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.95), transparent)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: "radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), oklch(1 0 0 / 0.5), transparent 60%)", mixBlendMode: "overlay" }} />

        <div className="relative" style={{ transform: "translateZ(20px)" }}>
          <div className="inline-grid place-items-center h-12 w-12 rounded-2xl text-white shadow-soft transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1"
            style={{ background: `linear-gradient(135deg, ${f.accent}, oklch(0.7 0.13 280))`, boxShadow: `0 10px 30px -10px ${f.accent.replace(")", " / 0.6)")}, inset 0 1px 0 oklch(1 0 0 / 0.3)` }}
          >
            <f.icon size={20} />
          </div>
        </div>
        <div className="relative mt-8" style={{ transform: "translateZ(30px)" }}>
          <h3 className="font-display text-2xl font-semibold tracking-tight">{f.title}</h3>
          <p className="mt-3 text-muted-foreground leading-relaxed max-w-md">{f.desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function LandingFeatures() {
  return (
    <section id="features" className="relative py-28 md:py-36 overflow-hidden noise-texture">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full opacity-20 animate-float-slow" style={{ background: "radial-gradient(closest-side, oklch(0.62 0.19 260 / 0.4), transparent)" }} />
        <div className="absolute bottom-1/4 right-1/4 h-[450px] w-[450px] rounded-full opacity-20 animate-float-slow" style={{ background: "radial-gradient(closest-side, oklch(0.7 0.13 280 / 0.4), transparent)", animationDelay: "3s" }} />
      </div>
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-electric font-medium">Capabilities</p>
          <h2 className="mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight">Built for <span className="text-gradient-brand">Smarter DeFi Trading</span></h2>
          <p className="mt-5 text-muted-foreground text-lg">A modular intelligence stack designed for confident, informed on-chain execution.</p>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {features.map((f, i) => <FeatureCard key={f.title} f={f} i={i} />)}
        </div>
      </div>
    </section>
  );
}
