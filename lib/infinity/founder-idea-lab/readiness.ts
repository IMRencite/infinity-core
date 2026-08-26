import type { FounderIdeaStatus } from "./constants";
import type { EvidenceCoverage } from "./evidence-coverage";
import type { MonetizationEvidenceLayers } from "./monetization-levels";
import type { FounderResearchPacket } from "./research-packet";
import type { CandidateEvaluationDraft, LoadedMonetizationBundle } from "@/lib/infinity/venture-selection/types";
import { DEFAULT_BUILD_GATE_THRESHOLDS } from "@/lib/infinity/venture-selection/constants";
import { passesBuildGate } from "@/lib/infinity/venture-selection/decisions/classify";
import { isResearchAdapterPlaceholderEconomics, unitEconomicsNumericallyKnown } from "./economics-known";

/**
 * `readyForDecision` means Infinity has enough research evidence to emit an
 * idea classification (VALIDATE / HOLD / REJECT, and BUILD only if economics
 * also pass). It does not mean ready to build, spend, or launch.
 */
export type EvidenceReadiness = {
  readyForDecision: boolean;
  status: FounderIdeaStatus;
  reason:
    | "READY"
    | "NO_RESEARCH_RUN"
    | "PROVIDER_FAILURE"
    | "RESEARCH_INCOMPLETE"
    | "MONETIZATION_ABSENT"
    | "COVERAGE_INSUFFICIENT";
};

export type BuildReadiness = {
  buildReady: boolean;
  reason:
    | "BUILD_READY"
    | "NOT_DECISION_READY"
    | "NO_EVALUATION"
    | "UNIT_ECONOMICS_UNKNOWN"
    | "PLACEHOLDER_ECONOMICS"
    | "BUILD_GATE_FAILED";
  buildGateReasons: string[];
};

export function evaluateEvidenceReadiness(input: {
  packet: FounderResearchPacket | null;
  coverage: EvidenceCoverage;
  monetization: LoadedMonetizationBundle | null;
  layers: MonetizationEvidenceLayers;
}): EvidenceReadiness {
  if (!input.packet) {
    return { readyForDecision: false, status: "INSUFFICIENT_EVIDENCE", reason: "NO_RESEARCH_RUN" };
  }
  if (input.packet.failed) {
    return { readyForDecision: false, status: "RESEARCH_INCOMPLETE", reason: "PROVIDER_FAILURE" };
  }
  if (input.packet.requiresMoreResearch && !input.coverage.materialCoverageSufficient) {
    return { readyForDecision: false, status: "RESEARCH_INCOMPLETE", reason: "RESEARCH_INCOMPLETE" };
  }
  if (!input.monetization) {
    return { readyForDecision: false, status: "INSUFFICIENT_EVIDENCE", reason: "MONETIZATION_ABSENT" };
  }
  if (!input.coverage.materialCoverageSufficient) {
    return { readyForDecision: false, status: "INSUFFICIENT_EVIDENCE", reason: "COVERAGE_INSUFFICIENT" };
  }
  return { readyForDecision: true, status: "READY_FOR_DECISION", reason: "READY" };
}

export function evaluateBuildReadiness(input: {
  decisionReady: boolean;
  evaluation: CandidateEvaluationDraft | null;
}): BuildReadiness {
  if (!input.decisionReady) {
    return { buildReady: false, reason: "NOT_DECISION_READY", buildGateReasons: [] };
  }
  if (!input.evaluation) {
    return { buildReady: false, reason: "NO_EVALUATION", buildGateReasons: [] };
  }
  const plan = input.evaluation.candidate.monetization?.primaryPlan ?? null;
  if (isResearchAdapterPlaceholderEconomics(plan)) {
    return { buildReady: false, reason: "PLACEHOLDER_ECONOMICS", buildGateReasons: [] };
  }
  if (!unitEconomicsNumericallyKnown(plan)) {
    return { buildReady: false, reason: "UNIT_ECONOMICS_UNKNOWN", buildGateReasons: [] };
  }
  const gate = passesBuildGate({ evaluation: input.evaluation, thresholds: DEFAULT_BUILD_GATE_THRESHOLDS });
  if (!gate.passes) {
    return { buildReady: false, reason: "BUILD_GATE_FAILED", buildGateReasons: gate.reasons };
  }
  return { buildReady: true, reason: "BUILD_READY", buildGateReasons: [] };
}
