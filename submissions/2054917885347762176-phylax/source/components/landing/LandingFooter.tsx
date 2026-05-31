"use client";
import { Particles } from "./Particles";

const cols = [
  { title: "Product", links: [{ label: "Use App", href: "#cta" }, { label: "Docs", href: "#about" }, { label: "API", href: "#" }] },
  { title: "Company", links: [{ label: "Team", href: "#team" }, { label: "Contact", href: "#" }, { label: "Careers", href: "#" }] },
  { title: "Community", links: [{ label: "Twitter", href: "https://x.com/sztch" }, { label: "Telegram", href: "#" }, { label: "Discord", href: "#" }] },
  { title: "Legal", links: [{ label: "Terms", href: "#" }, { label: "Privacy", href: "#" }, { label: "Disclosure", href: "#" }] },
];

export function LandingFooter() {
  return (
    <footer className="relative overflow-hidden text-white pt-16 md:pt-24 noise-texture"
      style={{ background: "linear-gradient(180deg, oklch(0.18 0.05 265) 0%, oklch(0.28 0.1 270) 60%, oklch(0.4 0.14 270) 100%)" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-10 left-1/3 h-[400px] w-[400px] rounded-full opacity-30" style={{ background: "radial-gradient(closest-side, oklch(0.62 0.19 260 / 0.5), transparent)" }} />
      </div>
      <Particles count={20} color="oklch(0.82 0.11 220)" />

      {/* Gradient divider line */}
      <div className="relative mx-auto max-w-5xl px-6 lg:px-10 mb-12">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Footer content — brand left, link columns right */}
      <div className="mx-auto max-w-5xl px-6 lg:px-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand block */}
          <div className="lg:col-span-4">
            <div className="text-2xl font-bold tracking-tight">Phyla<span className="text-gradient-brand">X</span></div>
            <p className="mt-3 max-w-xs text-sm text-white/50 leading-relaxed">The AI execution firewall for OKX X Layer. Scan. Gate. Execute.</p>
          </div>

          {/* Link columns — compact grid */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-6">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium">{c.title}</p>
                <ul className="mt-3 space-y-2">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel={l.href.startsWith("http") ? "noreferrer" : undefined}
                        className="text-sm text-white/70 hover:text-white transition-colors relative inline-block group"
                      >
                        {l.label}
                        <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-electric to-indigo-soft group-hover:w-full transition-all duration-300" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto max-w-5xl px-6 lg:px-10 mt-12 pb-6 flex flex-wrap justify-between items-center gap-3 relative z-10 border-t border-white/10 pt-6">
        <p className="text-xs text-white/40">© 2026 PhylaX. All rights reserved.</p>
        <p className="text-xs text-white/50 tracking-[0.2em] uppercase">Scan · Gate · Execute</p>
      </div>

      {/* Backdrop PHYLAX watermark — smaller, tighter */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center select-none overflow-hidden" style={{ height: "18vw" }}>
        <span className="font-display font-bold tracking-tighter leading-[0.78] text-white/[0.04] select-none text-[20vw] md:text-[14vw] lg:text-[10vw]" style={{ transform: "translateY(25%)" }}>
          PHYLAX
        </span>
      </div>
    </footer>
  );
}
