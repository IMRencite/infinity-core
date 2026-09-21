import { DEFAULT_BUILD_GATE_THRESHOLDS } from "../constants";
import type { CandidateEvaluationDraft } from "../types";

export type BuildGateAuditRow = {
  gate: string;
  actual: number;
  threshold: number;
  pass: boolean;
  comparator: "min" | "max";
};

export function auditBuildGate(input: {
  evaluation: CandidateEvaluationDraft;
  thresholds?: typeof DEFAULT_BUILD_GATE_THRESHOLDS;
}): { passes: boolean; rows: BuildGateAuditRow[]; reasons: string[] } {
  const thresholds = input.thresholds ?? DEFAULT_BUILD_GATE_THRESHOLDS;
  const plan = input.evaluation.candidate.monetization?.primaryPlan;
  const rows: BuildGateAuditRow[] = [
    {
      gate: "selectionScore",
      actual: input.evaluation.selectionScore,
      threshold: thresholds.minSelectionScore,
      pass: input.evaluation.selectionScore >= thresholds.minSelectionScore,
      comparator: "min",
    },
    {
      gate: "monetizationScore",
      actual: input.evaluation.candidate.monetization?.monetizationScore ?? 0,
      threshold: thresholds.minMonetizationScore,
      pass: (input.evaluation.candidate.monetization?.monetizationScore ?? 0) >= thresholds.minMonetizationScore,
      comparator: "min",
    },
    {
      gate: "validationScore",
      actual: input.evaluation.validationScore,
      threshold: thresholds.minValidationScore,
      pass: input.evaluation.validationScore >= thresholds.minValidationScore,
      comparator: "min",
    },
    {
      gate: "buildabilityScore",
      actual: input.evaluation.buildability.buildabilityScore,
      threshold: thresholds.minBuildabilityScore,
      pass: input.evaluation.buildability.buildabilityScore >= thresholds.minBuildabilityScore,
      comparator: "min",
    },
    {
      gate: "confidence",
      actual: input.evaluation.confidence,
      threshold: thresholds.minEvidenceConfidence,
      pass: input.evaluation.confidence >= thresholds.minEvidenceConfidence,
      comparator: "min",
    },
    {
      gate: "fatalAssumptionRisk",
      actual: input.evaluation.fatalAssumptionRiskScore,
      threshold: thresholds.maxFatalAssumptionRisk,
      pass: input.evaluation.fatalAssumptionRiskScore <= thresholds.maxFatalAssumptionRisk,
      comparator: "max",
    },
    {
      gate: "platformDependencyRisk",
      actual: plan?.platformDependencyRisk ?? 0,
      threshold: thresholds.maxPlatformDependency,
      pass: (plan?.platformDependencyRisk ?? 0) <= thresholds.maxPlatformDependency,
      comparator: "max",
    },
    {
      gate: "regulatoryRisk",
      actual: plan?.regulatoryRisk ?? 0,
      threshold: thresholds.maxRegulatoryRisk,
      pass: (plan?.regulatoryRisk ?? 0) <= thresholds.maxRegulatoryRisk,
      comparator: "max",
    },
    {
      gate: "capitalRequired",
      actual: plan?.estimatedCapitalRequired ?? 0,
      threshold: thresholds.maxStartupCapital,
      pass: (plan?.estimatedCapitalRequired ?? 0) <= thresholds.maxStartupCapital,
      comparator: "max",
    },
    {
      gate: "expectedROI",
      actual: input.evaluation.expectedValueDerived.expectedRoi ?? 0,
      threshold: thresholds.minExpectedRoi,
      pass: (input.evaluation.expectedValueDerived.expectedRoi ?? 0) >= thresholds.minExpectedRoi,
      comparator: "min",
    },
    {
      gate: "ltvCacRatio",
      actual: plan?.ltvCacRatio ?? 0,
      threshold: thresholds.minLtvCacRatio,
      pass: (plan?.ltvCacRatio ?? 0) >= thresholds.minLtvCacRatio,
      comparator: "min",
    },
  ];

  const reasons = rows.filter((row) => !row.pass).map((row) => `${row.gate} ${row.comparator === "min" ? "below" : "above"} threshold`);
  return { passes: reasons.length === 0, rows, reasons };
}
