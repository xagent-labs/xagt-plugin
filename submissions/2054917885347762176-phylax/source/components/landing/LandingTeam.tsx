"use client";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
function LinkedInIcon({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
import Image from "next/image";
import { useRef, type MouseEvent } from "react";

function XIcon({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.45L22 22h-6.79l-4.74-6.2L4.9 22H2.14l6.98-7.97L2 2h6.91l4.28 5.66L18.244 2Zm-2.38 18h1.86L8.22 4H6.24l9.624 16Z" />
    </svg>
  );
}

const members = [
  { name: "Sztch", role: "Co-Founder", tag: "01", image: "/team-sztch.jpg", twitter: "https://x.com/sztch", linkedin: "https://www.linkedin.com/in/arisandanawari" },
  { name: "kaccy", role: "Co-Founder", tag: "02", image: "/team-kaccy.jpg", twitter: "#", linkedin: "#" },
  { name: "dropy sh", role: "Co-Founder", tag: "03", image: "/team-dropy.jpg", twitter: "https://x.com/elhr90581", linkedin: "https://www.linkedin.com/in/hilmi-heidar-26910b34a" },
];

function MemberCard({ m, i }: { m: (typeof members)[number]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 90, damping: 22 });
  const ry = useSpring(useTransform(mx, [0, 1], [-7, 7]), { stiffness: 90, damping: 22 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    mx.set(px); my.set(py);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  };

  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={() => { mx.set(0.5); my.set(0.5); }}
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200, transformStyle: "preserve-3d" }}
      className="group relative rounded-3xl p-[1px] overflow-hidden"
    >
      <div aria-hidden className="absolute inset-0 rounded-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-700" style={{ background: "linear-gradient(135deg, oklch(0.62 0.19 260 / 0.35), oklch(1 0 0 / 0.4) 30%, transparent 55%, oklch(0.7 0.13 280 / 0.35))" }} />
      <div className="relative h-full rounded-3xl bg-white/55 backdrop-blur-2xl p-8 overflow-hidden border border-white/60 shadow-[0_30px_80px_-40px_oklch(0.45_0.13_270/0.4)] transition-shadow duration-700 group-hover:shadow-[0_40px_100px_-30px_oklch(0.62_0.19_260/0.45)]"
        style={{ backgroundImage: "linear-gradient(180deg, oklch(1 0 0 / 0.55), oklch(1 0 0 / 0.25)), radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), oklch(0.62 0.19 260 / 0.10), transparent 60%)" }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.9), transparent)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: "radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), oklch(1 0 0 / 0.5), transparent 60%)", mixBlendMode: "overlay" }} />

        <div className="relative flex items-start justify-between" style={{ transform: "translateZ(25px)" }}>
          <div className="relative">
            <div className="relative h-14 w-14 rounded-2xl overflow-hidden ring-1 ring-white/70 shadow-[0_10px_30px_-10px_oklch(0.45_0.13_270/0.5)] transition-transform duration-700 group-hover:scale-[1.04]">
              <Image src={m.image} alt={m.name} width={56} height={56} className="h-full w-full object-cover grayscale-[40%] group-hover:grayscale-0 transition-all duration-700" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-cyan-soft ring-2 ring-white">
              <span className="absolute inset-0 rounded-full bg-cyan-soft animate-ping opacity-60" />
            </span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground/60">/{m.tag}</span>
        </div>

        <div className="relative mt-8" style={{ transform: "translateZ(30px)" }}>
          <h3 className="font-display text-xl font-semibold tracking-tight">{m.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{m.role}</p>
        </div>

        <div className="relative mt-8 pt-4 border-t border-border/50 flex items-center justify-between" style={{ transform: "translateZ(20px)" }}>
          <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">Connect</span>
          <div className="flex items-center gap-2 opacity-100 md:opacity-80 md:group-hover:opacity-100 transition-opacity duration-300">
            <a href={m.twitter} target="_blank" rel="noreferrer" aria-label={`${m.name} on X`} className="grid place-items-center h-8 w-8 rounded-full bg-white/80 backdrop-blur border border-white/80 text-foreground/80 hover:text-foreground hover:border-electric/60 hover:bg-white transition-all duration-300">
              <XIcon />
            </a>
            <a href={m.linkedin} target="_blank" rel="noreferrer" aria-label={`${m.name} on LinkedIn`} className="grid place-items-center h-8 w-8 rounded-full bg-white/80 backdrop-blur border border-white/80 text-foreground/80 hover:text-foreground hover:border-electric/60 hover:bg-white transition-all duration-300">
              <LinkedInIcon />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LandingTeam() {
  return (
    <section id="team" className="relative py-28 md:py-36 bg-surface overflow-hidden noise-texture">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 right-1/4 h-[500px] w-[500px] rounded-full opacity-20 animate-float-slow" style={{ background: "radial-gradient(closest-side, oklch(0.7 0.13 280 / 0.4), transparent)" }} />
        <div className="absolute bottom-0 left-1/4 h-[460px] w-[460px] rounded-full opacity-20 animate-float-slow" style={{ background: "radial-gradient(closest-side, oklch(0.62 0.19 260 / 0.35), transparent)", animationDelay: "3s" }} />
      </div>
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-electric font-medium">Team</p>
          <h2 className="mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight">The minds behind <span className="text-gradient-brand">PhylaX.</span></h2>
          <p className="mt-5 text-muted-foreground text-lg">A lean team building smarter, safer DeFi tooling on OKX X Layer.</p>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((m, i) => <MemberCard key={m.name} m={m} i={i} />)}
        </div>
      </div>
    </section>
  );
}
