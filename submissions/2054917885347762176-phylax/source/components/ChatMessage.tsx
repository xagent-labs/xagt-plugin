"use client";

import { useEffect, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

export interface ChatStep {
  label: string;
  status: "running" | "done" | "error";
  id: string;
}

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  cardType?: "trade-plan" | "risk-result" | "quote" | null;
  cardData?: Record<string, unknown> | null;
  isLoading?: boolean;
  steps?: ChatStep[];
}

interface Props {
  message: ChatMessageData;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  }, []);

  // ── User message: dark capsule bubble, right-aligned ──
  if (isUser) {
    return (
      <div
        ref={ref}
        style={{
          opacity: 0,
          transform: "translateY(6px)",
          transition: "opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1), transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="flex justify-end"
      >
        <div
          className="max-w-[80%] sm:max-w-[70%] rounded-3xl px-5 py-3 text-sm sm:text-[15px] leading-relaxed bg-primary text-primary-foreground"
        >
          <div style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{message.content}</div>
        </div>
      </div>
    );
  }

  // ── System message: warning capsule ──
  if (isSystem) {
    return (
      <div
        ref={ref}
        style={{
          opacity: 0,
          transform: "translateY(6px)",
          transition: "opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1), transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="flex justify-start"
      >
        <div className="flex items-start gap-3 max-w-[85%]">
          <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 bg-[var(--app-danger)]/10 text-[var(--app-danger)] border border-[var(--app-danger)]/20">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed bg-[var(--app-danger)]/5 border border-[var(--app-danger)]/10 text-[var(--app-danger)]">
            <div style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{message.content}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Assistant message: NO bubble — clean text on grid (Xona-style) ──
  return (
    <div
      ref={ref}
      style={{
        opacity: 0,
        transform: "translateY(6px)",
        transition: "opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1), transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      className="flex justify-start"
    >
      <div className="max-w-[90%] sm:max-w-[85%]">
        {/* Step progress — show just the activity spinner, no labels */}
        {message.steps && message.steps.some(s => s.status === "running") && message.isLoading && (
          <div className="flex items-center gap-2 mb-3 ml-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          </div>
        )}

        {/* Content — directly rendered, no bubble */}
        {message.isLoading && (!message.steps || message.steps.length === 0) ? (
          <div className="flex items-center gap-2 py-1 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs font-medium">Processing…</span>
          </div>
        ) : (
          <div
            className="prose-phylax text-sm sm:text-[15px] leading-relaxed text-foreground"
            style={{
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={{
                p: ({ node, ...props }) => <p className="mb-2.5 last:mb-0" {...props} />,
                a: ({ node, ...props }) => <a className="text-primary hover:underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2.5 last:mb-0 space-y-1.5" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2.5 last:mb-0 space-y-1.5" {...props} />,
                li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                code: ({ node, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return !match ? (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-[13px] font-mono border border-border" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-muted p-3 rounded-lg text-[13px] font-mono border border-border overflow-x-auto mb-2.5" {...props}>
                      {children}
                    </code>
                  );
                },
                strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                em: ({ node, ...props }) => <em className="italic" {...props} />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
