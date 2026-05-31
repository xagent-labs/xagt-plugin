export function checkGuardrails(
  amountUsd: number,
  maxBudgetUsd: number,
  slippageLimitPercent: number,
  simulatedSlippage: number
): { valid: boolean; reason?: string } {
  if (amountUsd > maxBudgetUsd) {
    return { valid: false, reason: `Amount $${amountUsd} exceeds max budget $${maxBudgetUsd}` };
  }

  if (simulatedSlippage > slippageLimitPercent) {
    return { valid: false, reason: `Slippage ${simulatedSlippage}% exceeds limit ${slippageLimitPercent}%` };
  }

  return { valid: true };
}
