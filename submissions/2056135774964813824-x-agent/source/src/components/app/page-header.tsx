import type { LucideIcon } from "@/lib/lucide";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  kicker?: string;
  title: string;
  description?: string;
  tone?: "electric" | "plasma" | "cyan" | "success" | "warning";
  actions?: React.ReactNode;
}

const TONE: Record<NonNullable<PageHeaderProps["tone"]>, string> = {
  electric: "border-electric/30 bg-electric/10 text-electric",
  plasma: "border-plasma/30 bg-plasma/10 text-plasma",
  cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
};

export function PageHeader({
  kicker,
  title,
  description,
  tone = "electric",
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4 sm:pb-5">
      <div className="min-w-0 flex-1">
        {kicker && (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
              TONE[tone],
            )}
          >
            <span className="h-1 w-1 rounded-full bg-current animate-pulse-glow" />
            {kicker}
          </div>
        )}
        <h1 className="mt-2 text-fluid-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-fluid-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-6xl pad-fluid-x py-6 sm:py-8 lg:py-10">
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  hint?: string;
}) {
  return (
    <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center backdrop-blur-md">
      <div className="grid h-12 w-12 place-items-center rounded-xl border border-electric/30 bg-electric/10 text-electric">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      {hint && (
        <div className="mt-4 rounded-lg border border-border/60 bg-background/40 px-3 py-2 font-mono text-[11px] text-foreground/70">
          {hint}
        </div>
      )}
    </div>
  );
}
