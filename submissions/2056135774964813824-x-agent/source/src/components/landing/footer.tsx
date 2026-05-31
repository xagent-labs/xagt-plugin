"use client";

import Link from "next/link";
import { Github, Sparkles } from "lucide-react";

const LINK_GROUPS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Terminal", href: "/dashboard" },
      { label: "AI Research", href: "/research" },
      { label: "Agents", href: "/agents" },
      { label: "Narratives", href: "/narratives" },
      { label: "Market Intel", href: "/market" },
    ],
  },
  {
    title: "Engine",
    links: [
      { label: "Signals", href: "/signals" },
      { label: "Watchlist", href: "/watchlist" },
      { label: "Reports", href: "/reports" },
      { label: "Sources", href: "/sources" },
      { label: "Skills", href: "/skills" },
    ],
  },
  {
    title: "Open source",
    links: [
      { label: "GitHub", href: "https://github.com/Dairus01/X-Agent", external: true },
      { label: "MIT License", href: "https://opensource.org/license/mit", external: true },
      { label: "OpenRouter", href: "https://openrouter.ai", external: true },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="relative mx-auto mt-20 max-w-6xl px-4 pb-[max(env(safe-area-inset-bottom),3rem)] pt-12 sm:mt-28 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-md sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-electric/40 to-transparent" />

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg border border-electric/40 bg-electric/10">
                <Sparkles className="h-4 w-4 text-electric" />
              </div>
              <div className="font-semibold tracking-tight">X-Agent</div>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Autonomous AI crypto intelligence — open source, self-hosted, OpenRouter-powered.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
              5 agents online
            </div>
          </div>

          {LINK_GROUPS.map((g) => (
            <div key={g.title}>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {g.title}
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {g.links.map((l) =>
                  l.external ? (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center">
          <div className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} X-Agent · MIT licensed · No paid APIs, real data only.
          </div>
          <a
            href="https://github.com/Dairus01/X-Agent"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-3 w-3" />
            github.com/Dairus01/X-Agent
          </a>
        </div>
      </div>
    </footer>
  );
}
