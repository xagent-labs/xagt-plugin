/**
 * Lightweight client for calling an OpenAI-compatible chat completions API.
 * Used by dashboard UX features (auto-title generation, etc.).
 */

import { readLLMConfig } from "./llm-settings";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionChoice {
  message: { content: string };
}

interface ChatCompletionResponse {
  choices: ChatCompletionChoice[];
}

export interface LLMConnectionTestResult {
  ok: boolean;
  content?: string;
  error?: string;
}

/**
 * Send a chat completion request to the configured LLM provider.
 * Returns the assistant's response text, or null on failure.
 */
async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number }
): Promise<string | null> {
  const cfg = readLLMConfig();
  const apiKey = cfg.apiKey.trim();
  const baseUrl = cfg.baseUrl.trim();
  const model = cfg.model.trim();
  if (!cfg.enabled || !apiKey || !baseUrl || !model) return null;

  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options?.maxTokens ?? 60,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(
        `[LLM] Chat completion failed: HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
      );
      return null;
    }

    const data = (await res.json()) as ChatCompletionResponse;
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.warn("[LLM] Chat completion error:", err);
    return null;
  }
}

/**
 * Runs a direct probe against the configured provider and returns a detailed result.
 * Used by the settings page so connection failures can show actionable errors.
 */
export async function testLLMConnection(): Promise<LLMConnectionTestResult> {
  const cfg = readLLMConfig();
  const apiKey = cfg.apiKey.trim();
  const baseUrl = cfg.baseUrl.trim();
  const model = cfg.model.trim();

  if (!apiKey) return { ok: false, error: "API key is empty" };
  if (!baseUrl) return { ok: false, error: "Base URL is empty" };
  if (!model) return { ok: false, error: "Model is empty" };

  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Return exactly: OK" }],
        max_tokens: 64,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const text = (await res.text()).trim();
      return { ok: false, error: text || `HTTP ${res.status}` };
    }

    const data = (await res.json()) as ChatCompletionResponse;
    if (!Array.isArray(data.choices) || data.choices.length === 0) {
      return { ok: false, error: "Model returned no choices" };
    }
    const content = data.choices[0]?.message?.content?.trim();
    return { ok: true, content: content || "Connected (no text returned)" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network request failed",
    };
  }
}

/**
 * Generate a concise mission title from the first user message and assistant reply.
 * Returns null if the LLM is not configured or the request fails.
 */
export async function generateMissionTitle(
  userMessage: string,
  assistantReply: string
): Promise<string | null> {
  const trimmedUser = userMessage.slice(0, 800);
  const trimmedAssistant = assistantReply.slice(0, 800);

  return chatCompletion(
    [
      {
        role: "system",
        content:
          "Generate a short, descriptive title (3-8 words) for this coding mission. " +
          "Return ONLY the title text, no quotes, no prefix, no explanation.",
      },
      {
        role: "user",
        content: `User request:\n${trimmedUser}\n\nAssistant response:\n${trimmedAssistant}`,
      },
    ],
    { maxTokens: 30 }
  );
}
