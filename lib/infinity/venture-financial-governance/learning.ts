import type { LearningPrior, NamedGate } from "./types";
import { inspectFinancialGovernance, mutateFinancialGovernance } from "./store";
import { computeVentureLedger } from "./ledger";
import type { NormalizedPerformanceEvent } from "@/lib/infinity/performance-intelligence-engine/types";

const MIN_SAMPLES_FOR_UNIVERSAL = 3;

export function financialResultsToPerformanceEvents(ventureId: string): NormalizedPerformanceEvent[] {
  const ledger = computeVentureLedger(inspectFinancialGovernance(), ventureId);
  const now = ledger.updated_at;
  const rows: Array<{ metric: string; value: number | null }> = [
    { metric: "actual_gross_revenue_usd", value: ledger.gross_revenue.value },
    { metric: "actual_net_revenue_usd", value: ledger.net_revenue.value },
    { metric: "actual_spent_capital_usd", value: ledger.spent_capital.actuality === "UNKNOWN" ? null : ledger.spent_capital.value },
    { metric: "actual_contribution_usd", value: ledger.contribution_profit.actuality === "UNKNOWN" ? null : ledger.contribution_profit.value },
    { metric: "budget_utilization_pct", value: null },
  ];
  return rows
    .filter((row) => row.value != null)
    .map((row) => ({
      id: `finlearn:${ventureId}:${row.metric}:${now}`,
      sourceId: "venture_financial_governance_v1",
      sourceReference: `${ventureId}:${row.metric}`,
      eventType: "venture_financial_actual",
      metric: row.metric,
      value: row.value as number,
      unit: "USD",
      ventureId,
      occurredAt: now,
      observedAt: now,
      provenance: { layer: "ACTUAL", contract: ledger.contract },
    }));
}

export function upsertFinancialPrior(input: Omit<LearningPrior, "prior_id"> & { prior_id?: string }): LearningPrior {
  const prior: LearningPrior = {
    ...input,
    prior_id: input.prior_id ?? `prior:${input.name}:${input.context}`,
    confidence: input.sample_size < MIN_SAMPLES_FOR_UNIVERSAL ? "INSUFFICIENT" : input.confidence,
  };
  mutateFinancialGovernance((state) => {
    state.priors = state.priors.filter((row) => row.prior_id !== prior.prior_id);
    state.priors.push(prior);
  });
  return prior;
}

export function learnCrossVenturePriors(input: {
  name: string;
  values: number[];
  context: string;
  date_range: string;
  evidence_sources: string[];
}): LearningPrior {
  const sample = input.values.length;
  const mean = sample === 0 ? null : input.values.reduce((sum, value) => sum + value, 0) / sample;
  return upsertFinancialPrior({
    name: input.name,
    value: sample < MIN_SAMPLES_FOR_UNIVERSAL ? null : mean,
    sample_size: sample,
    confidence: sample < MIN_SAMPLES_FOR_UNIVERSAL ? "INSUFFICIENT" : sample >= 8 ? "MEDIUM" : "LOW",
    context: input.context,
    date_range: input.date_range,
    evidence_sources: input.evidence_sources,
  });
}

export function evaluateLearningConfidence(prior: LearningPrior): NamedGate {
  return {
    gate: "FinancialLearningConfidenceGate",
    result: prior.sample_size > 0 && Boolean(prior.confidence) ? "PASS" : "FAIL",
    reasons: prior.sample_size < MIN_SAMPLES_FOR_UNIVERSAL ? ["TINY_SAMPLE_NOT_UNIVERSAL"] : [],
  };
}
