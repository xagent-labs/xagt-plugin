"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Command, Menu, Search, Sparkles, Wifi } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/lib/stores/theme";
import { useUI } from "@/lib/stores/ui";
import type { LucideIcon } from "@/lib/lucide";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Why is ETH outperforming SOL this week?",
  "Audit the BERA token contract",
  "Top 5 narratives by 24h volume",
  "Show me restaking inflows trend",
  "Find DEX liquidity rotating into Base",
];

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const toggleTheme = useTheme((s) => s.toggle);
  const toggleSidebar = useUI((s) => s.toggleSidebar);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        toggleTheme();
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleTheme]);

  const filtered = query
    ? SUGGESTIONS.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : SUGGESTIONS;

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/70 px-3 backdrop-blur-xl sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open navigation"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-card/60 text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <button
          onClick={() => setOpen(true)}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-electric" />
          <span className="hidden truncate sm:inline">
            Ask the agents anything — research, narratives, on-chain audits...
          </span>
          <span className="truncate sm:hidden">Ask anything…</span>
          <span className="ml-auto hidden shrink-0 items-center gap-1 rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
            <Command className="h-3 w-3" />
            K
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <StatusPill icon={Wifi} tone="success" className="hidden md:inline-flex">
            5 agents
          </StatusPill>
          <ThemeToggle />
          <button
            className="hidden h-9 w-9 place-items-center rounded-lg border border-border bg-card/60 text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground sm:grid"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      {open && <CommandPalette query={query} onQuery={setQuery} suggestions={filtered} onClose={() => setOpen(false)} />}
    </>
  );
}

function StatusPill({
  icon: Icon,
  tone,
  children,
  className,
}: {
  icon: LucideIcon;
  tone: "success" | "warning";
  children: React.ReactNode;
  className?: string;
}) {
  const cls =
    tone === "success"
      ? "border-success/30 bg-success/10 text-success"
      : "border-warning/30 bg-warning/10 text-warning";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider",
        cls,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
}

function CommandPalette({
  query,
  onQuery,
  suggestions,
  onClose,
}: {
  query: string;
  onQuery: (v: string) => void;
  suggestions: string[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-3 pt-[max(env(safe-area-inset-top),5rem)] backdrop-blur-md sm:px-4 sm:pt-24">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <Search className="h-4 w-4 text-electric" />
          <input
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Ask the agents anything..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </span>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          <div className="px-2 pb-1 pt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Suggested questions
          </div>
          {suggestions.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              No matches — press Enter to send to research agent.
            </div>
          ) : (
            suggestions.map((s) => (
              <button
                key={s}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground/85 transition-colors hover:bg-card/80 hover:text-foreground"
                onClick={onClose}
              >
                <Sparkles className="h-3.5 w-3.5 text-electric" />
                <span className="flex-1 truncate">{s}</span>
                <span className="rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  ↵
                </span>
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 bg-background/40 px-4 py-2 font-mono text-[10px] text-muted-foreground">
          <span>routed via openrouter</span>
          <span>⌘K toggle · ESC close</span>
        </div>
      </motion.div>
    </div>
  );
}
