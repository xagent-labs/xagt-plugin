import type { Opportunity } from "../types.js";

export type ReasoningSource = "llm" | "template";

export interface ReasoningResult {
  text: string;
  source: ReasoningSource;
  model?: string;
  degraded: boolean;
  reason_for_degrade?: string;
}

export interface ReasonerConfig {
  anthropicApiKey?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_TIMEOUT_MS = 4000;

export function templateReasoning(opp: Opportunity): string {
  const parts: string[] = [];
  parts.push(`${opp.symbol} on ${opp.chain}: ${opp.thesis}`);
  const m = opp.metrics ?? {};
  const signalBits: string[] = [];
  if (m.triggerWalletCount !== undefined) signalBits.push(`${m.triggerWalletCount} smart-money wallets`);
  if (m.signalAmountUsd !== undefined) signalBits.push(`$${Math.round(m.signalAmountUsd)} flow`);
  if (m.volumeUsd !== undefined) signalBits.push(`$${Math.round(m.volumeUsd).toLocaleString()} 24h vol`);
  if (m.liquidityUsd !== undefined) signalBits.push(`$${Math.round(m.liquidityUsd).toLocaleString()} liq`);
  if (m.priceChangePct !== undefined) signalBits.push(`${m.priceChangePct.toFixed(1)}% px Δ`);
  if (signalBits.length) parts.push(`Signal: ${signalBits.join(" · ")}.`);
  const skills = (opp.evidence ?? []).map((e) => e.skill).filter(Boolean);
  if (skills.length) parts.push(`Evidence: ${[...new Set(skills)].join(", ")}.`);
  if (opp.risk?.level) parts.push(`Risk ${opp.risk.level} (${opp.risk.verdict}).`);
  parts.push(`Invalidation: ${opp.invalidation}`);
  return parts.join(" ");
}

export async function generateReasoning(
  opp: Opportunity,
  config: ReasonerConfig = {},
): Promise<ReasoningResult> {
  const apiKey = config.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      text: templateReasoning(opp),
      source: "template",
      degraded: true,
      reason_for_degrade: "ANTHROPIC_API_KEY not set",
    };
  }

  const model = config.model ?? DEFAULT_MODEL;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const prompt = buildPrompt(opp);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 220,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        text: templateReasoning(opp),
        source: "template",
        degraded: true,
        reason_for_degrade: `anthropic api status ${response.status}`,
      };
    }
    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("\n")
      .trim();
    if (!text) {
      return {
        text: templateReasoning(opp),
        source: "template",
        degraded: true,
        reason_for_degrade: "anthropic returned empty content",
      };
    }
    return { text, source: "llm", model, degraded: false };
  } catch (err) {
    return {
      text: templateReasoning(opp),
      source: "template",
      degraded: true,
      reason_for_degrade: `anthropic call failed: ${(err as Error).message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildPrompt(opp: Opportunity): string {
  const metrics = JSON.stringify(opp.metrics ?? {}, null, 0);
  const evidence = (opp.evidence ?? []).map((e) => `- ${e.skill}: ${e.summary}`).join("\n");
  return [
    "You are the Reasoner agent on The Desk, a Bloomberg-style terminal for AI trading agents.",
    "Write 2-3 sentences (max 80 words) explaining why this opportunity is or is not actionable.",
    "Be concrete: cite the signal, the risk, and what would invalidate the thesis. No hype, no emojis.",
    "",
    `Symbol: ${opp.symbol} (${opp.chain})`,
    `Status: ${opp.status} · Action: ${opp.action} · Score: ${opp.score}/100 · Confidence: ${opp.confidence}`,
    `Thesis: ${opp.thesis}`,
    `Risk: ${opp.risk?.level ?? "unknown"} · ${opp.risk?.verdict ?? "unknown"} · ${(opp.risk?.reasons ?? []).join("; ")}`,
    `Metrics: ${metrics}`,
    "Evidence:",
    evidence || "- (no OKX skill evidence attached)",
    `Invalidation: ${opp.invalidation}`,
  ].join("\n");
}
