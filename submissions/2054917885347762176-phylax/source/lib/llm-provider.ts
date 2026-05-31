// ─── LLM Provider Abstraction ────────────────────────────────────────────────
//
// Supports Anthropic (Claude) and DeepSeek (OpenAI-compatible) with automatic
// fallback. Set via env:
//   LLM_PROVIDER=anthropic (default) | deepseek
//   ANTHROPIC_API_KEY=...
//   DEEPSEEK_API_KEY=...
//
// If primary provider fails with credits/billing error, auto-falls back to the
// other provider if its key is configured.
// ─────────────────────────────────────────────────────────────────────────────

import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LLMToolDef {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface LLMToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMResponse {
  textContent: string | null;
  toolCalls: LLMToolCall[];
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "unknown";
  // Raw content for Anthropic message history threading
  rawContent?: unknown;
}

export interface LLMToolResult {
  toolCallId: string;
  content: string;
  isError: boolean;
}

export type ProviderName = "anthropic" | "deepseek";

// ─── Provider Interface ──────────────────────────────────────────────────────

interface LLMProvider {
  name: ProviderName;
  chat(
    system: string,
    messages: { role: "user" | "assistant"; content: unknown }[],
    tools: LLMToolDef[],
    maxTokens?: number
  ): Promise<LLMResponse>;
  // Build the message to append after receiving an LLM response
  buildAssistantMessage(response: LLMResponse): { role: "assistant"; content: unknown };
  // Build the tool results message to send back
  buildToolResultsMessage(results: LLMToolResult[]): { role: "user"; content: unknown };
}

// ─── Anthropic Provider ──────────────────────────────────────────────────────

function createAnthropicProvider(apiKey: string, model: string): LLMProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: "anthropic",
    async chat(system, messages, tools, maxTokens = 1000) {
      const anthropicTools = tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool.InputSchema,
      }));

      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0,
        system,
        messages: messages as Anthropic.MessageParam[],
        tools: anthropicTools,
      });

      const textBlocks = response.content.filter(c => c.type === "text") as Anthropic.TextBlock[];
      const toolUseBlocks = response.content.filter(c => c.type === "tool_use") as Anthropic.ToolUseBlock[];

      return {
        textContent: textBlocks.map(b => b.text).join("\n") || null,
        toolCalls: toolUseBlocks.map(b => ({
          id: b.id,
          name: b.name,
          input: b.input as Record<string, unknown>,
        })),
        stopReason: response.stop_reason === "tool_use" ? "tool_use" : "end_turn",
        rawContent: response.content,
      };
    },
    buildAssistantMessage(response) {
      return { role: "assistant", content: response.rawContent as Anthropic.ContentBlock[] };
    },
    buildToolResultsMessage(results) {
      return {
        role: "user",
        content: results.map(r => ({
          type: "tool_result" as const,
          tool_use_id: r.toolCallId,
          content: r.content,
          is_error: r.isError,
        })),
      };
    },
  };
}

// ─── DeepSeek Provider (OpenAI-compatible) ───────────────────────────────────

function createDeepSeekProvider(apiKey: string, model: string): LLMProvider {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });

  // Track conversation as OpenAI-format messages
  return {
    name: "deepseek",
    async chat(system, messages, tools, maxTokens = 1000) {
      const openaiTools: OpenAI.ChatCompletionTool[] = tools.map(t => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema as unknown as OpenAI.FunctionParameters,
        },
      }));

      // Convert messages to OpenAI format
      const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: system },
      ];

      for (const msg of messages) {
        if (msg.role === "user") {
          // Could be string or array of tool results
          if (typeof msg.content === "string") {
            openaiMessages.push({ role: "user", content: msg.content });
          } else if (Array.isArray(msg.content)) {
            // Tool results from Anthropic format — convert to OpenAI tool messages
            for (const item of msg.content as { type: string; tool_use_id: string; content: string; is_error: boolean }[]) {
              if (item.type === "tool_result") {
                openaiMessages.push({
                  role: "tool",
                  tool_call_id: item.tool_use_id,
                  content: item.content,
                } as OpenAI.ChatCompletionToolMessageParam);
              }
            }
          }
        } else if (msg.role === "assistant") {
          if (typeof msg.content === "string") {
            openaiMessages.push({ role: "assistant", content: msg.content });
          } else if (Array.isArray(msg.content)) {
            // Anthropic raw content — extract text and tool_use
            const items = msg.content as { type: string; text?: string; id?: string; name?: string; input?: unknown }[];
            const textParts = items.filter(i => i.type === "text").map(i => i.text || "").join("\n");
            const reasoningParts = items.filter(i => i.type === "reasoning_content").map(i => i.text || "").join("\n");
            const toolUseParts = items.filter(i => i.type === "tool_use");

            const assistantMsg: any = { role: "assistant" };
            
            if (textParts) {
              assistantMsg.content = textParts;
            } else if (toolUseParts.length > 0) {
              assistantMsg.content = null;
            } else {
              assistantMsg.content = "";
            }

            if (reasoningParts) {
              assistantMsg.reasoning_content = reasoningParts;
            }

            if (toolUseParts.length > 0) {
              assistantMsg.tool_calls = toolUseParts.map(t => ({
                id: t.id!,
                type: "function" as const,
                function: {
                  name: t.name!,
                  arguments: JSON.stringify(t.input),
                },
              }));
            }
            
            openaiMessages.push(assistantMsg);
          }
        }
      }

      // DeepSeek stability: retry once on empty/malformed response
      let response: OpenAI.ChatCompletion | null = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await client.chat.completions.create({
            model,
            max_tokens: maxTokens,
            temperature: 0,
            messages: openaiMessages,
            tools: openaiTools.length > 0 ? openaiTools : undefined,
          });
          // Validate: must have at least one choice
          if (response.choices && response.choices.length > 0) break;
          console.warn(`[deepseek] Attempt ${attempt + 1}: empty choices, retrying...`);
          response = null;
        } catch (err) {
          lastError = err;
          if (attempt === 0) {
            console.warn(`[deepseek] Attempt 1 failed, retrying...`, err instanceof Error ? err.message : err);
            await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
          }
        }
      }
      if (!response || !response.choices?.length) {
        throw lastError || new Error("DeepSeek returned no response after 2 attempts");
      }

      const choice = response.choices[0];
      const msg = choice.message;

      // Filter out malformed tool calls (DeepSeek sometimes returns empty function names)
      const validToolCalls = (msg.tool_calls || []).filter(tc => {
        const fn = tc as { function?: { name?: string; arguments?: string } };
        return fn.function?.name && fn.function.name.trim().length > 0;
      });

      const toolCalls: LLMToolCall[] = validToolCalls.map(tc => {
        const fn = tc as { id: string; type: string; function: { name: string; arguments: string } };
        return {
          id: fn.id,
          name: fn.function.name,
          input: (() => {
            try { return JSON.parse(fn.function.arguments || "{}"); } catch { return {}; }
          })(),
        };
      });

      // Build rawContent in Anthropic-compatible format for message threading
      const rawContent: unknown[] = [];
      const reasoning = (msg as any).reasoning_content;
      if (reasoning) {
        rawContent.push({ type: "reasoning_content", text: reasoning });
      }
      if (msg.content) {
        rawContent.push({ type: "text", text: msg.content });
      }
      for (const tc of toolCalls) {
        rawContent.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input });
      }

      return {
        textContent: msg.content || null,
        toolCalls,
        stopReason: choice.finish_reason === "tool_calls" || toolCalls.length > 0 ? "tool_use" : "end_turn",
        rawContent,
      };
    },
    buildAssistantMessage(response) {
      return { role: "assistant", content: response.rawContent as unknown[] };
    },
    buildToolResultsMessage(results) {
      // Return in Anthropic format — the chat() method converts it to OpenAI format
      return {
        role: "user",
        content: results.map(r => ({
          type: "tool_result",
          tool_use_id: r.toolCallId,
          content: r.content,
          is_error: r.isError,
        })),
      };
    },
  };
}

// ─── Provider Manager ────────────────────────────────────────────────────────

const PRIMARY = (process.env.LLM_PROVIDER || "anthropic").toLowerCase() as ProviderName;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

function getProvider(name: ProviderName): LLMProvider | null {
  if (name === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return createAnthropicProvider(process.env.ANTHROPIC_API_KEY, ANTHROPIC_MODEL);
  }
  if (name === "deepseek" && process.env.DEEPSEEK_API_KEY) {
    return createDeepSeekProvider(process.env.DEEPSEEK_API_KEY, DEEPSEEK_MODEL);
  }
  return null;
}

function getFallbackName(primary: ProviderName): ProviderName {
  return primary === "anthropic" ? "deepseek" : "anthropic";
}

function isCreditError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("credit") || lower.includes("billing") || lower.includes("payment")
    || lower.includes("insufficient") || lower.includes("quota");
}

export function getActiveProvider(): LLMProvider | null {
  return getProvider(PRIMARY) || getProvider(getFallbackName(PRIMARY));
}

export function getActiveProviderWithFallback(): { provider: LLMProvider; fallback: LLMProvider | null } | null {
  const primary = getProvider(PRIMARY);
  const fallbackName = getFallbackName(PRIMARY);
  const fallback = getProvider(fallbackName);

  if (primary) return { provider: primary, fallback };
  if (fallback) return { provider: fallback, fallback: null };
  return null;
}

// ─── Resilient chat with auto-fallback ───────────────────────────────────────

export async function chatWithFallback(
  provider: LLMProvider,
  fallback: LLMProvider | null,
  system: string,
  messages: { role: "user" | "assistant"; content: unknown }[],
  tools: LLMToolDef[],
  maxTokens?: number
): Promise<{ response: LLMResponse; usedProvider: ProviderName }> {
  if (typeof global !== "undefined" && (global as any).__mockChatWithFallback) {
    return (global as any).__mockChatWithFallback(provider, fallback, system, messages, tools, maxTokens);
  }
  try {
    const response = await provider.chat(system, messages, tools, maxTokens);
    return { response, usedProvider: provider.name };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[llm] ${provider.name} failed: ${errMsg}`);

    if (fallback && isCreditError(errMsg)) {
      console.log(`[llm] Auto-falling back to ${fallback.name}`);
      const response = await fallback.chat(system, messages, tools, maxTokens);
      return { response, usedProvider: fallback.name };
    }

    throw err; // Re-throw if no fallback or not a credit error
  }
}

export type { LLMProvider };
