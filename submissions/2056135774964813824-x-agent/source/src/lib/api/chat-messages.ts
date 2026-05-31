import type { ChatMessage } from "@/lib/openrouter";

const MAX_MESSAGES = 16;
const MAX_CONTENT_LEN = 8000;

/** Validate and normalize chat payloads at the API boundary. */
export function parseChatMessages(
  incoming: unknown,
): ChatMessage[] | null {
  if (!Array.isArray(incoming)) return null;

  const messages = incoming
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        typeof (m as ChatMessage).content === "string" &&
        ((m as ChatMessage).role === "user" ||
          (m as ChatMessage).role === "assistant" ||
          (m as ChatMessage).role === "system"),
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, MAX_CONTENT_LEN),
    }));

  return messages.length ? messages : null;
}
