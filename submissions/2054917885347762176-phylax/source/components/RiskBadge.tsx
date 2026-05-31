import { TokenSignal } from "../lib/schemas";

type RiskStatus = TokenSignal["riskStatus"];

export function RiskBadge({ status }: { status?: RiskStatus }) {
  if (!status || status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
        Scanning…
      </span>
    );
  }

  if (status === "safe") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        LOW Risk
      </span>
    );
  }

  if (status === "high_risk") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        High Risk
      </span>
    );
  }

  if (status === "skipped") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
        Skipped
      </span>
    );
  }

  if (status === "unknown") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Unknown Risk
      </span>
    );
  }

  return null;
}
