import fs from "node:fs";
import type { BlackBoxPolicy, EventType } from "../types.js";

export const DEFAULT_POLICY_PATH = "blackbox/policies.json";
export const DEFAULT_OPPORTUNITY_ORDER_USD = 25;
export const DEFAULT_MAX_QUOTE_AGE_SECONDS = 60;

export type PolicyRiskVerdict = "allow" | "review" | "block" | "approved" | "veto" | string;

export interface PolicyEvaluationInput {
  policy: BlackBoxPolicy;
  chain?: string;
  riskVerdict?: PolicyRiskVerdict;
  riskReason?: string;
  quoteRequired?: boolean;
  hasExecutableQuote?: boolean;
  requiredEvents?: {
    required: EventType[];
    present: ReadonlySet<EventType>;
  };
  traceIntegrity?: {
    required: boolean;
    valid: boolean;
    errors?: string[];
  };
  allocation?: {
    sizeUsd: number;
    bookValueUsd: number;
  };
  route?: {
    chain: string;
    slippageBps: number;
  };
  confirmation?: {
    required: boolean;
    exists: boolean;
    confirmed: boolean;
  };
  executionExists?: boolean;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  errors: string[];
  reasons: string[];
  warnings: string[];
}

export function loadPolicy(policyPath = DEFAULT_POLICY_PATH): BlackBoxPolicy {
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf8")) as BlackBoxPolicy;
  return {
    ...policy,
    maxQuoteAgeSeconds: policy.maxQuoteAgeSeconds ?? DEFAULT_MAX_QUOTE_AGE_SECONDS,
  };
}

export function evaluatePolicy(input: PolicyEvaluationInput): PolicyEvaluationResult {
  const { policy } = input;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.traceIntegrity?.required && !input.traceIntegrity.valid) {
    const detail = input.traceIntegrity.errors?.join("; ");
    errors.push(`trace integrity invalid${detail ? `: ${detail}` : ""}`);
  }

  if (input.requiredEvents) {
    for (const requiredType of input.requiredEvents.required) {
      if (!input.requiredEvents.present.has(requiredType)) {
        errors.push(`missing required event: ${requiredType}`);
      }
    }
  }

  if (input.chain && !policy.allowedChains.includes(input.chain)) {
    errors.push(`${input.chain} is not allowed by policy`);
  }

  if (input.riskVerdict !== undefined) {
    const verdict = String(input.riskVerdict);
    if (verdict === "veto" || verdict === "block") {
      errors.push(`risk veto is final: ${input.riskReason ?? "risk officer veto"}`);
    } else if (!["approved", "allow", "review"].includes(verdict)) {
      errors.push("risk verdict must be approved or veto");
    }
  }

  if (input.quoteRequired && !input.hasExecutableQuote) {
    errors.push("no executable OKX quote yet");
  }

  if (input.allocation) {
    const maxAllowedUsd = maxAllowedPositionUsd(policy, input.allocation.bookValueUsd);
    if (input.allocation.sizeUsd > maxAllowedUsd) {
      errors.push(`allocation ${input.allocation.sizeUsd} USD exceeds max position ${maxAllowedUsd.toFixed(2)} USD`);
    }
    if (isMainnetCapped(policy) && input.allocation.sizeUsd > policy.realFundsCapUsd) {
      errors.push(`mainnet allocation ${input.allocation.sizeUsd} USD exceeds real-funds cap ${policy.realFundsCapUsd} USD`);
    }
  }

  if (input.route) {
    if (input.route.slippageBps > policy.maxSlippageBps) {
      errors.push(`quote slippage ${input.route.slippageBps} bps exceeds policy ${policy.maxSlippageBps} bps`);
    }
    if (!policy.allowedChains.includes(input.route.chain)) {
      errors.push(`route chain ${input.route.chain} is not allowed`);
    }
  }

  if (input.confirmation?.required) {
    if (!input.confirmation.exists) {
      errors.push("missing user confirmation");
    } else if (!input.confirmation.confirmed) {
      errors.push("user confirmation is not affirmative");
    }
  }

  if (input.executionExists && errors.length > 0) {
    warnings.push("execution event exists even though current policy gate fails");
  }

  return {
    allowed: errors.length === 0,
    errors,
    reasons: errors.length ? errors : ["policy allows capped quote-backed action"],
    warnings,
  };
}

export function maxAllowedPositionUsd(policy: BlackBoxPolicy, bookValueUsd: number) {
  return (bookValueUsd * policy.maxPositionPct) / 100;
}

export function isMainnetCapped(policy: BlackBoxPolicy) {
  return policy.signingMode === "mainnet-capped" || policy.executionMode === "mainnet-capped";
}
