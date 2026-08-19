/** Deterministic hot takes derived only from persisted structured values — no AI calls. */

export type HotTakeInput = {
  decision?: string | null;
  fatalAssumptionRisk?: number | null;
  buildFatalThreshold?: number;
  expectedRoi?: number | null;
  ltvCacRatio?: number | null;
  monetizationScore?: number | null;
  selectionScore?: number | null;
  validationOutcome?: string | null;
  fatalRiskBefore?: number | null;
  fatalRiskAfter?: number | null;
  hasMarketPerformance?: boolean;
  blockingAssumptionCount?: number;
  groundedResearchCount?: number;
};

export function deriveHotTakes(input: HotTakeInput): string[] {
  const takes: string[] = [];
  const fatalThreshold = input.buildFatalThreshold ?? 0.45;
  const fatal = input.fatalAssumptionRisk ?? input.fatalRiskAfter ?? null;

  if (fatal != null && fatal > fatalThreshold) {
    takes.push(
      `[FACT] Fatal assumption risk is ${fatal.toFixed(2)}, above the BUILD maximum of ${fatalThreshold.toFixed(2)}.`,
    );
  }

  if (
    input.fatalRiskBefore != null &&
    input.fatalRiskAfter != null &&
    input.fatalRiskAfter < input.fatalRiskBefore
  ) {
    takes.push(
      `[FACT] Validation research reduced fatal risk from ${input.fatalRiskBefore.toFixed(2)} to ${input.fatalRiskAfter.toFixed(2)}, but not enough for BUILD.`,
    );
  } else if (
    input.fatalRiskBefore != null &&
    input.fatalRiskAfter != null &&
    input.fatalRiskAfter === input.fatalRiskBefore
  ) {
    takes.push("[FACT] Validation did not materially change fatal assumption risk.");
  }

  if (input.expectedRoi != null && input.expectedRoi >= 3 && input.ltvCacRatio != null && input.ltvCacRatio >= 3) {
    takes.push("[INFERENCE] Unit economics look attractive if acquisition assumptions hold.");
  }

  if (input.monetizationScore != null && input.monetizationScore >= 70) {
    takes.push("[INFERENCE] Monetization analysis supports a credible revenue model.");
  }

  if (input.decision === "VALIDATE") {
    takes.push("[INFERENCE] Infinity recommends more validation before committing to BUILD.");
  } else if (input.decision === "BUILD") {
    takes.push("[FACT] Selection gates passed — Infinity would proceed toward company formation.");
  } else if (input.decision === "REJECT") {
    takes.push("[FACT] Selection evaluation rejected this candidate for the current cycle.");
  }

  if ((input.blockingAssumptionCount ?? 0) > 0 && fatal != null && fatal > fatalThreshold) {
    takes.push("[INFERENCE] Blocking assumptions remain the primary uncertainty.");
  }

  if (input.hasMarketPerformance === false) {
    // Explicitly do not claim traction
  }

  if ((input.groundedResearchCount ?? 0) > 0 && takes.length < 2) {
    takes.push("[INFERENCE] Grounded research exists, but key assumptions still need resolution.");
  }

  return takes.slice(0, 5);
}
