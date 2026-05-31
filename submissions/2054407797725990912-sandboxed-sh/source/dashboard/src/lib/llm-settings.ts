/**
 * LLM provider configuration for dashboard UX features (e.g. auto-generated mission titles).
 * Stored in localStorage, separate from backend settings.
 */

export interface LLMConfig {
  /** Whether the LLM integration is enabled. */
  enabled: boolean;
  /** Provider identifier (e.g. "cerebras", "openai", "groq"). */
  provider: string;
  /** Base URL for the OpenAI-compatible chat completions endpoint. */
  baseUrl: string;
  /** API key for authentication. */
  apiKey: string;
  /** Model identifier (e.g. "llama-4-scout-17b-16e-instruct"). */
  model: string;
  /** Whether to auto-generate mission titles. */
  autoTitle: boolean;
}

const STORAGE_KEY = "llm-config";

const DEFAULTS: LLMConfig = {
  enabled: false,
  provider: "cerebras",
  baseUrl: "https://api.cerebras.ai/v1",
  apiKey: "",
  model: "gpt-oss-120b-cs",
  autoTitle: true,
};

/** Known providers with sensible defaults. */
export const LLM_PROVIDERS: Record<
  string,
  { name: string; baseUrl: string; defaultModel: string; models: string[] }
> = {
  cerebras: {
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    defaultModel: "gpt-oss-120b-cs",
    models: [
      "gpt-oss-120b-cs",
      "zai-glm-4.6-cs",
    ],
  },
  zai: {
    name: "Z.AI",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    // Keep aligned with https://docs.z.ai/guides/llm/glm
    defaultModel: "glm-5.1",
    models: ["glm-5.1", "glm-5-turbo", "glm-4.7", "glm-4.6", "glm-4.5", "glm-4.6v-flash"],
  },
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
    ],
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4.1-mini",
    models: ["gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o-mini"],
  },
};

interface CerebrasPublicModel {
  id?: string;
  deprecated?: boolean;
}

interface CerebrasPublicModelsResponse {
  data?: CerebrasPublicModel[];
}

/**
 * Fetch the live Cerebras model catalog from their public endpoint.
 * Falls back to static presets if request/parsing fails.
 */
export async function fetchLiveCerebrasModels(): Promise<string[]> {
  const res = await fetch("https://api.cerebras.ai/public/v1/models");
  if (!res.ok) {
    throw new Error(`Failed to fetch Cerebras models (${res.status})`);
  }

  const payload = (await res.json()) as CerebrasPublicModelsResponse;
  const ids = (payload.data ?? [])
    .filter((m) => typeof m.id === "string" && m.id.length > 0 && !m.deprecated)
    .map((m) => m.id as string);

  const uniqueSorted = Array.from(new Set(ids)).sort((a, b) =>
    a.localeCompare(b)
  );
  if (uniqueSorted.length === 0) {
    throw new Error("Cerebras catalog returned no models");
  }
  return uniqueSorted;
}

export function readLLMConfig(): LLMConfig {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<LLMConfig>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function writeLLMConfig(config: LLMConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Quick check: is LLM-powered title generation usable? */
export function isAutoTitleEnabled(): boolean {
  const cfg = readLLMConfig();
  return cfg.enabled && cfg.autoTitle && cfg.apiKey.length > 0;
}
