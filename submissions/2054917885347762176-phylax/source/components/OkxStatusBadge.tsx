import { SourceMeta } from "../lib/schemas";

interface Props {
  meta: SourceMeta | null;
}

export function OkxStatusBadge({ meta }: Props) {
  if (!meta) return null;

  const isReal       = meta.source === "okx_real";
  const isFailed     = meta.source === "okx_real_failed";
  const isExecOff    = meta.source === "execution_disabled";

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Data source badge */}
      {isReal && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          OKX Real Data
        </span>
      )}
      {isFailed && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          OKX Real Failed
        </span>
      )}
      {isExecOff && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Execution Disabled
        </span>
      )}

      {/* Chain badge */}
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border bg-electric/10 border-electric/20 text-electric font-medium">
        ⬡ {meta.chainName}
      </span>

      {/* Provider */}
      <span className="px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground font-medium">
        {meta.provider}
      </span>

      {/* Timestamp */}
      <span className="text-muted-foreground font-mono">
        {new Date(meta.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}
