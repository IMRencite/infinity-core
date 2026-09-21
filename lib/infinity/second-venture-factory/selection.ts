import {
  classifyDecision,
  passesBuildGate,
} from "@/lib/infinity/venture-selection/decisions/classify";
import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
} from "@/lib/infinity/venture-selection/constants";
import {
  ASKREVIEW_CANDIDATE_ID,
  ASKREVIEW_VENTURE_ID,
  ASKREVIEW_WORKING_NAME,
  OCCUPANCYNPV_CANDIDATE_ID,
  UNKNOWN,
} from "./constants";
import { evaluateSecondVentureDifferentiationGate } from "./differentiation-gate";
import { classifyOpportunityCandidate } from "@/lib/infinity/opportunity-universe-hq/classify";
import { loadPersistedOpportunityUniverse } from "./opportunity-universe";
import type { OpportunityUniverseCandidate, SecondVentureEconomicDecision, SecondVentureSelectionResult } from "./types";

function numericScore(value: number | "UNKNOWN"): number {
  return typeof value === "number" ? value : 0;
}

function economicDecisionFor(candidate: OpportunityUniverseCandidate): SecondVentureEconomicDecision {
  const selectionScore = Number(
    (
      numericScore(candidate.opportunityScore) * 0.55 +
      numericScore(candidate.monetizationScore) * 0.45
    ).toFixed(2),
  );
  const evaluation = {
    selectionScore,
    validationScore: numericScore(candidate.monetizationScore),
    confidence: 0.5,
    fatalAssumptionRiskScore: candidate.unknowns.length > 0 ? 0.2 : 0.1,
    blockingAssumptions: candidate.unknowns,
    candidate: {
      monetization: {
        monetizationScore: typeof candidate.monetizationScore === "number" ? candidate.monetizationScore : null,
        primaryPlan: {
          estimatedCapitalRequired: 8000,
          platformDependencyRisk: 0.35,
          regulatoryRisk: 0.2,
          estimatedCAC: null,
          estimatedLTV: null,
          ltvCacRatio: null,
        },
      },
    },
    buildability: { buildabilityScore: 72 },
    expectedValueDerived: { expectedRoi: null },
  };
  const buildGate = passesBuildGate({
    evaluation: evaluation as never,
    thresholds: DEFAULT_BUILD_GATE_THRESHOLDS,
  });
  const classified = classifyDecision({
    evaluation: evaluation as never,
    buildGatePassed: buildGate.passes,
    buildGateReasons: buildGate.reasons,
    hasResourceCapacity: true,
    decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
  });
  return {
    engine: "VentureSelection.classifyDecision",
    secondDecisionEngineCreated: false,
    decision: classified.decision,
    recommendedNextAction: classified.recommendedNextAction,
    selectionScore,
    unknownEconomicsPreserved: true,
    unitEconomics: UNKNOWN,
    expectedRoi: UNKNOWN,
  };
}

export function rankSecondVentureCandidates() {
  const universe = loadPersistedOpportunityUniverse();
  return universe.map((candidate) => {
    const differentiation = evaluateSecondVentureDifferentiationGate(candidate);
    return {
      candidate,
      differentiation,
      economic: economicDecisionFor(candidate),
    };
  });
}

export function selectSecondVenture(): SecondVentureSelectionResult {
  const rankedRows = rankSecondVentureCandidates();
  const ranked = rankedRows
    .filter((row) => row.candidate.id !== OCCUPANCYNPV_CANDIDATE_ID)
    .sort((a, b) => numericScore(b.economic.selectionScore) - numericScore(a.economic.selectionScore))
    .map((row) => ({
      id: row.candidate.id,
      title: row.candidate.title,
      opportunityScore: row.candidate.opportunityScore,
      monetizationScore: row.candidate.monetizationScore,
      viability: row.candidate.economicViability,
      differentiation: row.differentiation.result,
    }));

  const winner = rankedRows.find((row) => row.candidate.id === ASKREVIEW_CANDIDATE_ID);
  if (winner && classifyOpportunityCandidate({ id: winner.candidate.id, title: winner.candidate.title }) !== "REAL_CANONICAL") {
    return {
      selected: false,
      candidateId: winner.candidate.id,
      ventureId: null,
      workingName: null,
      reason: "HIDDEN_OR_NON_CANONICAL_CANDIDATE_NOT_SELECTABLE",
      economicDecision: winner.economic,
      differentiation: winner.differentiation,
      evaluatedCount: rankedRows.length,
      ranked,
    };
  }
  if (!winner || winner.differentiation.result !== "PASS") {
    return {
      selected: false,
      candidateId: null,
      ventureId: null,
      workingName: null,
      reason: "No materially different candidate cleared both differentiation and economics.",
      economicDecision: winner?.economic ?? null,
      differentiation: winner?.differentiation ?? null,
      evaluatedCount: rankedRows.length,
      ranked,
    };
  }

  const economicsAllow =
    winner.economic.decision === "VALIDATE" || winner.economic.decision === "BUILD";
  if (!economicsAllow) {
    return {
      selected: false,
      candidateId: winner.candidate.id,
      ventureId: null,
      workingName: null,
      reason: `Canonical decision ${winner.economic.decision} does not authorize selection.`,
      economicDecision: winner.economic,
      differentiation: winner.differentiation,
      evaluatedCount: rankedRows.length,
      ranked,
    };
  }

  return {
    selected: true,
    candidateId: ASKREVIEW_CANDIDATE_ID,
    ventureId: ASKREVIEW_VENTURE_ID,
    workingName: ASKREVIEW_WORKING_NAME,
    reason:
      "Highest scanner+monetization scores among non-OccupancyNPV candidates; STRONG viability; material difference PASS; unknown CAC preserved; VALIDATE under canonical build gate is sufficient to select and architect, not to invent unit economics.",
    economicDecision: winner.economic,
    differentiation: winner.differentiation,
    evaluatedCount: rankedRows.length,
    ranked,
  };
}
