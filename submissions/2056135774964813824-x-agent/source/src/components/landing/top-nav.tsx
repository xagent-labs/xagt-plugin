"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Github, Menu, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { label: "Agents", href: "#agents" },
  { label: "Skills", href: "#skills" },
  { label: "Narratives", href: "#narratives" },
  { label: "How it works", href: "#how" },
];

export function LandingTopNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-2xl border border-border bg-background/70 px-2.5 py-2 backdrop-blur-xl sm:gap-3 sm:px-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg border border-electric/40 bg-electric/10">
            <Sparkles className="h-3.5 w-3.5 text-electric" />
          </div>
          <span className="text-sm font-semibold tracking-tight">X-Agent</span>
          <span className="hidden rounded-full border border-border bg-card/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground sm:inline-flex">
            v0.1
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle variant="compact" />
          <a
            href="https://github.com/Dairus01/X-Agent"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden md:inline-flex"
          >
            <Button variant="ghost" size="sm" className="font-medium">
              <Github className="h-3.5 w-3.5" />
              GitHub
            </Button>
          </a>
          <Link href="/dashboard">
            <Button size="sm" className="font-medium">
              Launch
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid h-8 w-8 place-items-center rounded-md border border-border bg-card/60 text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="landing-mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl border border-border bg-background/95 p-2 shadow-2xl backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm text-foreground/85 transition-colors hover:bg-card/60 hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="https://github.com/Dairus01/X-Agent"
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-foreground/85 transition-colors hover:bg-card/60 hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
