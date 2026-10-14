import { DEFAULT_BUILD_GATE_THRESHOLDS } from "@/lib/infinity/venture-selection/constants";

export const VENTURE_VALIDATION_EVIDENCE_GAP_MODEL_V1 = "VENTURE_VALIDATION_EVIDENCE_GAP_MODEL_V1" as const;

export type EvidenceGapRecord = {
  candidate_id: string;
  candidate_name: string | null;
  scanner_score: number | null;
  selection_score: number | null;
  monetization_score: number | null;
  decision: string;
  failed_build_gates: string[];
  insufficient_evidence_fields: string[];
  validation_questions: string[];
  recommended_next_sources: string[];
  next_validation_action: string;
};

function gateFailuresFromRow(row: {
  selection_score: number | null;
  monetization_score: number | null;
  validation_score: number | null;
  buildability_score: number | null;
  confidence: number | null;
  fatal_assumption_risk_score: number | null;
  decision: string;
}): string[] {
  const t = DEFAULT_BUILD_GATE_THRESHOLDS;
  const failed: string[] = [];
  if ((row.selection_score ?? 0) < t.minSelectionScore) failed.push("selectionScore");
  if ((row.monetization_score ?? 0) < t.minMonetizationScore) failed.push("monetizationScore");
  if ((row.validation_score ?? 0) < t.minValidationScore) failed.push("validationScore");
  if ((row.buildability_score ?? 0) < t.minBuildabilityScore) failed.push("buildabilityScore");
  if ((row.confidence ?? 0) < t.minEvidenceConfidence) failed.push("confidence");
  if ((row.fatal_assumption_risk_score ?? 1) > t.maxFatalAssumptionRisk) failed.push("fatalAssumptionRisk");
  if (String(row.decision).toUpperCase() !== "BUILD") failed.push("decisionNotBuild");
  return failed;
}

export function buildEvidenceGapFromEvaluation(row: {
  opportunity_candidate_id: string;
  opportunity_score: number | null;
  selection_score: number | null;
  monetization_score: number | null;
  validation_score: number | null;
  buildability_score: number | null;
  confidence: number | null;
  fatal_assumption_risk_score: number | null;
  decision: string;
  blocking_assumptions: unknown;
  title?: string | null;
}): EvidenceGapRecord {
  const blocking = Array.isArray(row.blocking_assumptions)
    ? (row.blocking_assumptions as string[])
    : typeof row.blocking_assumptions === "object" && row.blocking_assumptions
      ? Object.values(row.blocking_assumptions as Record<string, string>)
      : [];

  const failed = gateFailuresFromRow(row);
  const questions = blocking.map((a) => `Resolve blocking assumption: ${String(a)}`);

  return {
    candidate_id: row.opportunity_candidate_id,
    candidate_name: row.title ?? null,
    scanner_score: row.opportunity_score,
    selection_score: row.selection_score,
    monetization_score: row.monetization_score,
    decision: row.decision,
    failed_build_gates: failed,
    insufficient_evidence_fields: failed.includes("validationScore")
      ? ["validation_evidence", "market_proof"]
      : failed.includes("confidence")
        ? ["evidence_confidence"]
        : ["build_gate_completion"],
    validation_questions: questions.length ? questions : ["Incremental public evidence for top blocking assumptions."],
    recommended_next_sources: [
      "search_demand_evidence",
      "distribution_economics_research",
      "public_pricing_comparison",
    ],
    next_validation_action: "AUTONOMOUS_BOUNDED_REVALIDATION_WHEN_DUE",
  };
}
