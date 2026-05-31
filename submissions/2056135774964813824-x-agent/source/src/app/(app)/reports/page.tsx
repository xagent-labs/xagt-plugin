"use client";

import { Archive, FileText, FolderClock, ScrollText } from "lucide-react";
import { PageHeader, PageShell, EmptyState } from "@/components/app/page-header";

export default function ReportsPage() {
  return (
    <PageShell>
      <PageHeader
        kicker="archived research"
        tone="plasma"
        title="Reports"
        description="Every research run is preserved as an immutable, source-backed report. Replay any answer, fork it, or export it as Markdown."
        actions={
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 font-mono text-[11px] backdrop-blur-md sm:flex">
            <FolderClock className="h-3 w-3 text-plasma" />
            <span className="text-foreground">0</span>
            <span className="text-muted-foreground">archived</span>
          </div>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Storage", value: "local · IndexedDB", icon: Archive, tone: "text-plasma" },
          { label: "Format", value: "Markdown + JSON", icon: ScrollText, tone: "text-electric" },
          { label: "Replay", value: "deterministic · sourced", icon: FileText, tone: "text-cyan" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-md"
            >
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <Icon className={`h-3 w-3 ${s.tone}`} />
                {s.label}
              </div>
              <div className="mt-2 text-base font-medium">{s.value}</div>
            </div>
          );
        })}
      </div>

      <EmptyState
        icon={FileText}
        title="No reports yet"
        description="Run a query from AI Research and the synthesized report — with citations, confidence and reasoning — will be archived here automatically."
        hint="Reports → /research → submit a query → archived on completion"
      />
    </PageShell>
  );
}
