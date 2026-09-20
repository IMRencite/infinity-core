import { GROWTH_ACTIVATION_REQUIRED, GROWTH_EXPERIMENT_ACTIVE, type NamedGrowthGate, type VentureGrowthStrategy } from "./contract";

export function evaluatePassiveEvidenceWaitingGate(input: {
  status: VentureGrowthStrategy["current_status"];
  activeOrRecentEvidenceTactic: boolean;
  legitimateExternalDependency: boolean;
}): NamedGrowthGate {
  const reasons: string[] = [];
  if (input.status === "WAITING_FOR_EVIDENCE" && !input.activeOrRecentEvidenceTactic && !input.legitimateExternalDependency) {
    reasons.push("PASSIVE_WAITING_WITHOUT_EVIDENCE_ACTION");
  }
  return { gate: "PassiveEvidenceWaitingGate", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateVentureGrowthReadinessGate(input: {
  hasStrategy: boolean;
  hasAcquisitionPath: boolean;
  hasConversionPath: boolean;
  hasMeasurement: boolean;
  hasInitialTactic: boolean;
  hasNextLearningObjective: boolean;
}): NamedGrowthGate {
  const reasons: string[] = [];
  if (!input.hasStrategy) reasons.push("GROWTH_STRATEGY_MISSING");
  if (!input.hasAcquisitionPath) reasons.push("ACQUISITION_PATH_MISSING");
  if (!input.hasConversionPath) reasons.push("CONVERSION_PATH_MISSING");
  if (!input.hasMeasurement) reasons.push("MEASUREMENT_MISSING");
  if (!input.hasInitialTactic) reasons.push("INITIAL_TACTIC_MISSING");
  if (!input.hasNextLearningObjective) reasons.push("NEXT_LEARNING_OBJECTIVE_MISSING");
  return { gate: "VentureGrowthReadinessGate", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function classifyOperatingGrowthState(input: {
  publiclyLaunched: boolean;
  evidenceGeneratingTactic: boolean;
  sparsePerformanceEvidence: boolean;
}): VentureGrowthStrategy["current_status"] {
  if (input.publiclyLaunched && input.evidenceGeneratingTactic) return GROWTH_EXPERIMENT_ACTIVE;
  if (input.publiclyLaunched && !input.evidenceGeneratingTactic) return GROWTH_ACTIVATION_REQUIRED;
  if (input.sparsePerformanceEvidence && input.evidenceGeneratingTactic) return "QUEUED";
  if (input.publiclyLaunched) return "READY";
  return "GROWTH_STRATEGY_REQUIRED";
}
