/**
 * OpenRouter chat completions client (server-only).
 *
 * Streams Server-Sent Events as raw Response.body so route handlers can
 * forward them straight to the browser without buffering.
 */

import { assertOpenRouter, env } from "@/lib/env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterStreamOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  signal?: AbortSignal;
}

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterCompleteOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  signal?: AbortSignal;
  maxTokens?: number;
}

/** Non-streaming completion — used when the route needs structured JSON back. */
export async function openrouterComplete(
  opts: OpenRouterCompleteOptions,
): Promise<string> {
  assertOpenRouter();

  const res = await fetch(ENDPOINT, {
    method: "POST",
    signal: opts.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openrouterApiKey}`,
      "HTTP-Referer": env.openrouterReferer,
      "X-Title": env.openrouterTitle,
    },
    body: JSON.stringify({
      model: opts.model ?? env.openrouterModel,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.35,
      max_tokens: opts.maxTokens ?? 4096,
      stream: false,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await safeRead(res);
    throw new Error(
      `OpenRouter request failed: ${res.status} ${res.statusText} ${detail}`.trim(),
    );
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned empty completion");
  return content;
}

export async function openrouterStream(
  opts: OpenRouterStreamOptions,
): Promise<Response> {
  assertOpenRouter();

  const res = await fetch(ENDPOINT, {
    method: "POST",
    signal: opts.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openrouterApiKey}`,
      "HTTP-Referer": env.openrouterReferer,
      "X-Title": env.openrouterTitle,
    },
    body: JSON.stringify({
      model: opts.model ?? env.openrouterModel,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.4,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await safeRead(res);
    throw new Error(
      `OpenRouter request failed: ${res.status} ${res.statusText} ${detail}`.trim(),
    );
  }

  return res;
}

async function safeRead(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
