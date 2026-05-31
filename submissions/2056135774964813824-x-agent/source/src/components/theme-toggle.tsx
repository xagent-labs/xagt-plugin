"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/stores/theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "icon" | "compact" | "row";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && theme === "light";
  const label = isLight ? "Switch to dark mode" : "Switch to light mode";

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border border-border bg-card/60 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground transition-colors hover:border-electric/40 hover:text-foreground",
          className,
        )}
      >
        {mounted && isLight ? (
          <Sun className="h-3 w-3 text-warning" />
        ) : (
          <Moon className="h-3 w-3 text-electric" />
        )}
        <span className="flex-1 text-left">{mounted ? (isLight ? "light" : "dark") : "theme"}</span>
        <span className="text-[9px]">⌥T</span>
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-electric/40 hover:text-foreground",
          className,
        )}
      >
        {mounted && isLight ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{mounted ? (isLight ? "Light" : "Dark") : "Theme"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-lg border border-border bg-card/60 text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground",
        className,
      )}
    >
      {mounted && isLight ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
