"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bookmark,
  Bot,
  ChartNoAxesCombined,
  FileText,
  Flame,
  Newspaper,
  Radio,
  Sparkles,
  Terminal,
  Wrench,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { LucideIcon } from "@/lib/lucide";
import { cn } from "@/lib/utils";

const NAV: { group: string; items: { label: string; href: string; icon: LucideIcon; hint?: string }[] }[] = [
  {
    group: "Intelligence",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: Terminal, hint: "⌘1" },
      { label: "AI Research", href: "/research", icon: Sparkles, hint: "⌘2" },
      { label: "Agents", href: "/agents", icon: Bot, hint: "⌘3" },
    ],
  },
  {
    group: "Market",
    items: [
      { label: "Narratives", href: "/narratives", icon: Flame },
      { label: "Market Intel", href: "/market", icon: ChartNoAxesCombined },
      { label: "Signals", href: "/signals", icon: Radio },
    ],
  },
  {
    group: "Workspace",
    items: [
      { label: "Watchlist", href: "/watchlist", icon: Bookmark },
      { label: "Reports", href: "/reports", icon: FileText },
      { label: "Sources", href: "/sources", icon: Newspaper },
      { label: "Skills", href: "/skills", icon: Wrench },
    ],
  },
];

interface AppSidebarProps {
  /** Persistent desktop (default) hides below lg; drawer flavour shows always. */
  variant?: "persistent" | "drawer";
  onNavigate?: () => void;
}

export function AppSidebar({ variant = "persistent", onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        "flex h-dvh w-full max-w-[17rem] shrink-0 flex-col border-r border-border bg-background/80 backdrop-blur-xl",
        variant === "persistent" && "sticky top-0 hidden w-60 max-w-none lg:flex",
      )}
    >
      <div className="flex items-center gap-2 px-4 py-4">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg border border-electric/40 bg-electric/10">
            <Sparkles className="h-4 w-4 text-electric" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight leading-none">X-Agent</div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              research terminal
            </div>
          </div>
        </Link>
        {variant === "drawer" && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close menu"
            className="ml-auto grid h-8 w-8 place-items-center rounded-md border border-border bg-card/60 text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mx-3 mb-2 flex items-center justify-between rounded-md border border-border bg-card/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
          <span className="font-mono">5 agents online</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">v0.1</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {NAV.map((group) => (
          <div key={group.group} className="mt-3">
            <div className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {group.group}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((it) => {
                const active = pathname === it.href || (it.href !== "/" && pathname?.startsWith(it.href));
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors min-h-[40px]",
                        active
                          ? "bg-electric/10 text-electric"
                          : "text-foreground/80 hover:bg-card/80 hover:text-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          active ? "text-electric" : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.hint && (
                        <span className="hidden font-mono text-[9px] text-muted-foreground group-hover:inline">
                          {it.hint}
                        </span>
                      )}
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse-glow" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-lg border border-border bg-card/60 p-3 backdrop-blur-md">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Activity className="h-3 w-3 text-electric animate-pulse-glow" />
          <span className="font-mono">routed via openrouter</span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          One key, all models. No paid APIs.
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <Tag>claude</Tag>
          <Tag>gpt-4o</Tag>
          <Tag>haiku</Tag>
        </div>
      </div>

      <div className="mx-3 mb-3">
        <ThemeToggle variant="row" />
      </div>

      <div className="border-t border-border/60 px-4 py-3 text-[10px] font-mono text-muted-foreground">
        MIT · self-hosted · {new Date().getFullYear()}
      </div>
    </aside>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}
