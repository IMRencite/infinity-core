import type { FounderIdeaStatus } from "./constants";
import type { EvidenceCoverage } from "./evidence-coverage";
import { unitEconomicsKnown, type MonetizationEvidenceLayers } from "./monetization-levels";
import type { FounderResearchPacket } from "./research-packet";
import type { LoadedMonetizationBundle } from "@/lib/infinity/venture-selection/types";

export type EvidenceReadiness = {
  readyForDecision: boolean;
  status: FounderIdeaStatus;
  reason:
    | "READY"
    | "NO_RESEARCH_RUN"
    | "PROVIDER_FAILURE"
    | "RESEARCH_INCOMPLETE"
    | "MONETIZATION_ABSENT"
    | "COVERAGE_INSUFFICIENT"
    | "UNIT_ECONOMICS_UNKNOWN";
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
    return { readyForDecision: false, status: "FAILED", reason: "PROVIDER_FAILURE" };
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
  if (!unitEconomicsKnown(input.layers)) {
    return { readyForDecision: false, status: "INSUFFICIENT_EVIDENCE", reason: "UNIT_ECONOMICS_UNKNOWN" };
  }
  return { readyForDecision: true, status: "READY_FOR_DECISION", reason: "READY" };
}
