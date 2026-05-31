import { Particles } from "./Particles";

const cols = [
  { title: "Product", links: ["Use App", "Docs", "API"] },
  { title: "Company", links: ["Team", "Contact", "Careers"] },
  { title: "Community", links: ["Twitter", "Telegram", "Discord"] },
  { title: "Legal", links: ["Terms", "Privacy", "Disclosure"] },
];

export function Footer() {
  return (
    <footer
      className="relative overflow-hidden text-white pt-24 md:pt-32 noise-texture"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.18 0.05 265) 0%, oklch(0.28 0.1 270) 60%, oklch(0.4 0.14 270) 100%)",
      }}
    >
      {/* overflow-hidden on footer ensures the -bottom-[10%] PHYLAX backdrop
          wordmark stays clipped inside the footer and does not extend the page height */}
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-10 left-1/3 h-[400px] w-[400px] rounded-full opacity-30"
          style={{ background: "radial-gradient(closest-side, oklch(0.62 0.19 260 / 0.5), transparent)" }}
        />
      </div>

      <Particles count={20} color="oklch(0.82 0.11 220)" />

      {/* floating divider line */}
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10 mb-16">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-5 gap-12 relative z-10">
        <div className="lg:col-span-2">
          <div className="text-3xl font-bold tracking-tight">
            Phyla<span className="text-gradient-brand">X</span>
          </div>
          <p className="mt-4 max-w-sm text-white/60 leading-relaxed">
            Risk intelligence before every on-chain trade. Wallet-gated chat-based trading assistant.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-xs uppercase tracking-widest text-white/50">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-white/80 hover:text-white transition-colors relative inline-block group"
                  >
                    {l}
                    <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-gradient-to-r from-electric to-indigo-soft scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-10 mt-16 pb-8 flex flex-wrap justify-between items-center gap-4 relative z-10 border-t border-white/10 pt-8">
        <p className="text-sm text-white/60">© {new Date().getFullYear()} PhylaX. All rights reserved.</p>
        <p className="text-sm text-white/80 tracking-[0.25em] uppercase">Scan · Quote · Confirm</p>
      </div>

      {/* Backdrop wordmark — contained by overflow-hidden on the footer wrapper */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center select-none animate-drift-x">
        <span className="font-display font-bold tracking-tighter text-[26vw] leading-none text-white/[0.04]">
          PHYLAX
        </span>
      </div>
    </footer>
  );
}
