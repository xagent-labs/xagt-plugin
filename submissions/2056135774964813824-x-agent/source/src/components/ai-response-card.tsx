"use client";

import { Brain, Copy, RefreshCw, ThumbsDown, ThumbsUp, Share2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SourceRef } from "@/lib/types";
import type { LucideIcon } from "@/lib/lucide";
import { cn, relativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { SourceCard } from "@/components/source-card";

export interface AIResponse {
  id: string;
  question: string;
  answer: string;
  confidence: number;
  agent: string;
  model: string;
  timestamp: string;
  sources: SourceRef[];
  skillsUsed?: string[];
  followUps?: string[];
}

export function AIResponseCard({
  response,
  onAskFollowUp,
  className,
}: {
  response: AIResponse;
  onAskFollowUp?: (q: string) => void;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-md",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-electric/50 to-transparent" />

      <div className="border-b border-border/60 bg-background/40 px-5 py-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">your question</div>
        <h3 className="mt-1 text-base font-semibold leading-snug">{response.question}</h3>
      </div>

      <div className="px-5 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-electric/30 bg-electric/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-electric">
            <Brain className="h-3 w-3" /> {response.agent}
          </span>
          <Badge variant="outline" className="font-mono lowercase">{response.model}</Badge>
          <ConfidenceBadge value={response.confidence} />
          <span className="ml-auto text-[10px] text-muted-foreground">
            {relativeTime(response.timestamp)}
          </span>
        </div>

        <div className="prose prose-invert prose-sm mt-4 max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:text-foreground/90 prose-strong:text-foreground prose-code:rounded prose-code:bg-secondary/60 prose-code:px-1 prose-code:py-px prose-code:font-mono prose-code:text-xs prose-a:text-electric prose-a:no-underline hover:prose-a:underline">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{response.answer}</ReactMarkdown>
        </div>
      </div>

      {response.skillsUsed && response.skillsUsed.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 px-5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>skills</span>
          {response.skillsUsed.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded border border-cyan/30 bg-cyan/10 px-1.5 py-0.5 font-mono text-cyan normal-case tracking-normal"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {response.sources.length > 0 && (
        <div className="mt-4 px-5">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>{response.sources.length} citations</span>
            <span className="h-px flex-1 bg-border/60" />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {response.sources.slice(0, 6).map((s, i) => (
              <SourceCard key={s.id} source={s} index={i} compact />
            ))}
          </div>
        </div>
      )}

      {response.followUps && response.followUps.length > 0 && (
        <div className="mt-4 px-5">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            suggested follow-ups
          </div>
          <div className="flex flex-wrap gap-2">
            {response.followUps.map((q) => (
              <button
                key={q}
                onClick={() => onAskFollowUp?.(q)}
                className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] hover:border-electric/30 hover:bg-electric/10 hover:text-electric transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-1 border-t border-border/60 bg-background/30 px-5 py-2 text-muted-foreground">
        <ActionBtn icon={Copy} label="Copy" />
        <ActionBtn icon={RefreshCw} label="Regenerate" />
        <ActionBtn icon={Share2} label="Share" />
        <span className="ml-auto flex items-center gap-1">
          <ActionBtn icon={ThumbsUp} label="Helpful" />
          <ActionBtn icon={ThumbsDown} label="Not helpful" />
        </span>
      </div>
    </article>
  );
}

function ActionBtn({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] hover:bg-secondary/60 hover:text-foreground"
      title={label}
    >
      <Icon className="h-3 w-3" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
