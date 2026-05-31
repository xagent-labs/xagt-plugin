"use client";

import { ArrowUpRight, Globe, Newspaper, ShieldCheck } from "lucide-react";
import type { SourceRef } from "@/lib/types";
import { cn, pickHost, relativeTime } from "@/lib/utils";

export function SourceCard({
  source,
  index,
  compact,
  className,
}: {
  source: SourceRef;
  index?: number;
  compact?: boolean;
  className?: string;
}) {
  const host = source.domain || pickHost(source.url);
  const reliability = Math.round((source.reliability ?? 0.75) * 100);
  const relevance = Math.round((source.relevance ?? 0.7) * 100);

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group flex items-start gap-3 rounded-lg border border-border bg-card/60 p-3 backdrop-blur-md transition-colors hover:bg-card/90 hover:border-electric/30",
        className,
      )}
    >
      {typeof index === "number" && (
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border bg-background/60 font-mono text-[10px] text-muted-foreground">
          {index + 1}
        </div>
      )}
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-secondary/40 text-muted-foreground">
        <Newspaper className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Globe className="h-3 w-3" />
          <span className="truncate font-mono">{host}</span>
          {source.publishedAt && (
            <>
              <span>·</span>
              <span>{relativeTime(source.publishedAt)}</span>
            </>
          )}
        </div>
        <div className="mt-1 text-sm font-medium leading-snug">
          {source.title}
          <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 -translate-y-0.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-1" />
        </div>
        {!compact && (
          <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-success" />
              {reliability}% reliable
            </span>
            <span>·</span>
            <span>{relevance}% relevant</span>
            {source.category && (
              <>
                <span>·</span>
                <span className="lowercase">{source.category}</span>
              </>
            )}
          </div>
        )}
      </div>
    </a>
  );
}
