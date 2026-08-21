import type { TenancyStrategy, VentureStage } from "./constants";
import type { DataSensitivity, ProviderCandidateQuote, TreasuryBudgetInput, VentureSystemsEvidence } from "./types";

function stageOf(evidence: VentureSystemsEvidence): VentureStage {
  return evidence.ventureStage ?? "EXPERIMENTAL";
}

function sensitivityOf(evidence: VentureSystemsEvidence): DataSensitivity {
  if (evidence.regulatedIndustry) return "REGULATED";
  return evidence.dataSensitivity ?? "STANDARD";
}

export function selectTenancyStrategy(input: {
  stage: VentureStage;
  sensitivity: DataSensitivity;
  spinoutLikelihood?: "LOW" | "MEDIUM" | "HIGH" | null;
  dedicatedIsolationValuable?: boolean | null;
  paidMonthlyCostUsd?: number | null;
  freeAlternativeExists?: boolean;
  expectedScale?: "SMALL" | "MEDIUM" | "LARGE" | null;
}): TenancyStrategy {
  if (input.sensitivity === "REGULATED" || input.sensitivity === "HIGH") {
    return "DEDICATED_PER_VENTURE";
  }
  if (input.spinoutLikelihood === "HIGH") return "DEDICATED_PER_COMPANY";

  const preRevenue = input.stage === "EXPERIMENTAL" || input.stage === "PRE_REVENUE";
  const expensivePaid = input.paidMonthlyCostUsd != null && input.paidMonthlyCostUsd >= 100;
  if (preRevenue && input.freeAlternativeExists && expensivePaid) {
    return "SHARED";
  }
  if (preRevenue) {
    return input.expectedScale === "LARGE" ? "SHARED_WITH_LOGICAL_ISOLATION" : "DEFERRED";
  }

  if (
    (input.stage === "MATURE" || input.stage === "EARLY_REVENUE" || input.stage === "SPINOUT_CANDIDATE") &&
    input.dedicatedIsolationValuable !== false
  ) {
    return "DEDICATED_PER_VENTURE";
  }

  return "SHARED_WITH_LOGICAL_ISOLATION";
}

export function tenancyForEvidence(
  evidence: VentureSystemsEvidence,
  quote?: ProviderCandidateQuote | null,
): TenancyStrategy {
  return selectTenancyStrategy({
    stage: stageOf(evidence),
    sensitivity: sensitivityOf(evidence),
    spinoutLikelihood: evidence.spinoutLikelihood,
    dedicatedIsolationValuable: evidence.dedicatedIsolationValuable,
    paidMonthlyCostUsd: quote?.estimatedMonthlyCostUsd ?? null,
    freeAlternativeExists: quote ? quote.freeTierAdequate === false && Boolean(evidence.providerQuotes?.some((item) => item.freeTierAdequate)) : Boolean(evidence.providerQuotes?.some((item) => item.freeTierAdequate)),
    expectedScale: evidence.expectedScale,
  });
}

export function dedicatedRequiredForTenancy(strategy: TenancyStrategy): boolean {
  return strategy === "DEDICATED_PER_VENTURE" || strategy === "DEDICATED_PER_COMPANY";
}

export function budgetKnown(budget: TreasuryBudgetInput | null | undefined): budget is TreasuryBudgetInput & { monthlySoftwareBudgetUsd: number } {
  return Boolean(budget && budget.actuality !== "UNKNOWN" && budget.monthlySoftwareBudgetUsd != null && Number.isFinite(budget.monthlySoftwareBudgetUsd));
}
