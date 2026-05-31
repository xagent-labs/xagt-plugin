"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/openrouter";

interface UseChatStreamOptions {
  onDelta?: (delta: string, full: string) => void;
  onDone?: (full: string) => void;
  onError?: (err: Error) => void;
  endpoint?: string;
}

interface UseChatStreamReturn {
  send: (messages: ChatMessage[], opts?: { model?: string }) => Promise<void>;
  stop: () => void;
  streaming: boolean;
  text: string;
  error: string | null;
}

/**
 * Consumes OpenRouter-shaped SSE (`data: {choices:[{delta:{content}}]}`) from
 * /api/chat or /api/research (via `endpoint`). Lives client-side so route handlers stay simple.
 */
export function useChatStream(opts: UseChatStreamOptions = {}): UseChatStreamReturn {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const send = useCallback(
    async (messages: ChatMessage[], sendOpts: { model?: string } = {}) => {
      stop();
      const ctl = new AbortController();
      abortRef.current = ctl;
      setText("");
      setError(null);
      setStreaming(true);

      try {
        const res = await fetch(opts.endpoint ?? "/api/chat", {
          method: "POST",
          signal: ctl.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, model: sendOpts.model }),
        });

        if (!res.ok || !res.body) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail.error ?? `request failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line || !line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = json.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                full += delta;
                setText(full);
                opts.onDelta?.(delta, full);
              }
            } catch {
              // ignore keep-alives / partial json
            }
          }
        }

        opts.onDone?.(full);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const message = err instanceof Error ? err.message : "stream error";
        setError(message);
        opts.onError?.(err instanceof Error ? err : new Error(message));
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [opts, stop],
  );

  return { send, stop, streaming, text, error };
}
