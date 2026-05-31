import clsx from "clsx";

interface StatusBadgeProps {
  label: string;
  variant?: "success" | "warning" | "danger" | "neutral";
}

export function StatusBadge({ label, variant = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        variant === "success" && "bg-hunter-neon/10 text-hunter-neon border border-hunter-neon/30",
        variant === "warning" && "bg-hunter-amber/10 text-hunter-amber border border-hunter-amber/30",
        variant === "danger" && "bg-hunter-danger/10 text-hunter-danger border border-hunter-danger/30",
        variant === "neutral" && "bg-hunter-border/50 text-hunter-muted border border-hunter-border"
      )}
    >
      {label}
    </span>
  );
}
