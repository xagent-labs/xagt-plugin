"use client";

import { SIGNAL_META, type Signals } from "@/lib/types";

interface Props {
  signals: Signals;
}

function barColor(value: number) {
  if (value >= 0.8) return "bg-red-500";
  if (value >= 0.65) return "bg-orange-500";
  if (value > 0) return "bg-emerald-500";
  return "bg-neutral-200";
}

export default function SignalPanel({ signals }: Props) {
  const keys = Object.keys(SIGNAL_META) as Array<keyof typeof SIGNAL_META>;

  return (
    <div className="card flex flex-col gap-3">
      <p className="label-col">Signal breakdown</p>
      {keys.map((key) => {
        const meta = SIGNAL_META[key];
        const val = Math.max(0, Math.min(1, signals[key] as number));
        const pct = Math.round(val * 100);
        const contribution = (val * meta.weight).toFixed(3);

        return (
          <div key={key}>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm font-medium text-neutral-800">{meta.label}</span>
              <span className="text-sm text-neutral-500">
                <span className="text-neutral-400 mr-2">+{contribution}</span>
                {pct}%
              </span>
            </div>
            <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(val)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-neutral-400 mt-1">{meta.description}</p>
          </div>
        );
      })}
    </div>
  );
}
