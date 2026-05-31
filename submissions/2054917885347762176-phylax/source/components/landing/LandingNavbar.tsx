"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const items = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Team", href: "#team" },
  { label: "$PHYX", href: "#token" },
];

export function LandingNavbar({ onLaunchApp }: { onLaunchApp: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "glass-dark border-b border-white/10" : "bg-transparent"}`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 md:h-20 flex items-center justify-between">
        <span className={`text-xl md:text-2xl font-bold tracking-tight transition-colors ${scrolled ? "text-white" : "text-foreground"}`}>
          Phyla<span className="text-gradient-brand">X</span>
        </span>

        <nav className="hidden md:flex items-center gap-1">
          {items.map((it) => (
            <a
              key={it.label}
              href={it.href}
              className={`relative group px-4 py-2 text-sm rounded-full transition-all duration-300 ${scrolled ? "text-white/80 hover:text-white" : "text-foreground/70 hover:text-foreground"}`}
            >
              {it.label}
              <span className={`absolute left-4 right-4 -bottom-0.5 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${scrolled ? "bg-gradient-to-r from-electric to-indigo-soft" : "bg-foreground/40"}`} />
            </a>
          ))}
          <button
            onClick={onLaunchApp}
            className="ml-3 relative inline-flex items-center rounded-full bg-gradient-brand text-white px-5 py-2 text-sm font-medium hover:shadow-glow transition-all duration-300 hover:scale-[1.03]"
            style={{ boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.2), 0 10px 30px -10px oklch(0.62 0.19 260 / 0.5)" }}
          >
            Launch App
          </button>
        </nav>

        <button
          aria-label="Menu"
          onClick={() => setOpen((o) => !o)}
          className={`md:hidden p-2 rounded-full transition-colors ${scrolled ? "text-white" : "text-foreground"}`}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="md:hidden overflow-hidden text-white"
            style={{ background: "oklch(0.21 0.05 265)" }}
          >
            <div className="px-6 py-6 flex flex-col gap-1">
              {items.map((it) => (
                <a key={it.label} href={it.href} onClick={() => setOpen(false)} className="px-3 py-3 rounded-xl text-base text-white/80 hover:bg-white/10 hover:text-white">
                  {it.label}
                </a>
              ))}
              <button onClick={() => { setOpen(false); onLaunchApp(); }} className="mt-2 rounded-xl bg-gradient-brand text-white px-5 py-3 text-center font-medium">
                Launch App
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
