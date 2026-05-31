/**
 * Environment access — server-side only.
 *
 * Hard rule: OpenRouter is the ONLY API token. No paid APIs. No Twitter/Reddit.
 * Everything else is public RSS / public REST and needs no key.
 */

export const env = {
  /** The single LLM credential. Set OPENROUTER_API_KEY in .env.local */
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  /** Optional model override; defaults to a fast, cheap chat model on OpenRouter.
   *  Gemini 2.0 Flash: ~$0.10/$0.40 per M tokens — ~10× cheaper than Claude Haiku,
   *  streams well, and handles the research/narrative workloads in this app. */
  openrouterModel: process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001",
  /** Optional referer the OpenRouter dashboard uses for app attribution */
  openrouterReferer: process.env.OPENROUTER_REFERER ?? "https://x-agent.local",
  /** Optional title the OpenRouter dashboard uses for app attribution */
  openrouterTitle: process.env.OPENROUTER_TITLE ?? "X-Agent",
} as const;

export function assertOpenRouter(): void {
  if (!env.openrouterApiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to .env.local — it is the only required key.",
    );
  }
}

export function hasOpenRouter(): boolean {
  return Boolean(env.openrouterApiKey);
}
