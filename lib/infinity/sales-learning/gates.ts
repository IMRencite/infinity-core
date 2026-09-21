import {
  INFINITY_SALES_METHOD_ADHERENCE_GATE,
  SALES_COACHING_EVIDENCE_GATE,
  SALES_CONTINUOUS_LEARNING_GATE,
  SALES_TRAINING_PRIVACY_GATE,
} from "./contract";
import { methodAdherenceFailures } from "./evaluate";
import { salesLearningPublicForbiddenPatterns } from "./public";
import type { NamedSalesLearningGate, SalesInteractionObservation, SalesLearningState } from "./types";

function pass(gate: string, reason: string): NamedSalesLearningGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedSalesLearningGate {
  return { gate, result: "FAIL", reasons };
}

export function evaluateSalesContinuousLearningGate(state: SalesLearningState): NamedSalesLearningGate {
  const reasons: string[] = [];
  if (!state.observations.length) reasons.push("NO_LEARNING_OBSERVATIONS");
  if (!Object.values(state.profiles).some((row) => Object.values(row.dimensions).some((dim) => dim.evidence.length > 0))) {
    reasons.push("EVALUATIONS_LACK_EVIDENCE");
  }
  if (!state.assignments.length) reasons.push("NO_COACHING_ASSIGNMENTS");
  if (!state.simulations.length) reasons.push("NO_SIMULATIONS");
  if (!state.simulations.length) reasons.push("SIMULATION_OUTCOMES_MISSING");
  if (!state.metrics.skills_improved && !state.guidance.some((row) => row.validated_at && row.skill)) {
    reasons.push("SKILL_PROFILES_NOT_UPDATED");
  }
  if (!state.guidance.some((row) => row.promotion === "VERIFIED_GUIDANCE" && row.skill)) {
    reasons.push("VALIDATED_GUIDANCE_MISSING");
  }
  return reasons.length ? fail(SALES_CONTINUOUS_LEARNING_GATE, reasons) : pass(SALES_CONTINUOUS_LEARNING_GATE, "CONTINUOUS_LEARNING");
}

export function evaluateInfinitySalesMethodAdherenceGate(observation: SalesInteractionObservation): NamedSalesLearningGate {
  const reasons = methodAdherenceFailures(observation);
  return reasons.length ? fail(INFINITY_SALES_METHOD_ADHERENCE_GATE, reasons) : pass(INFINITY_SALES_METHOD_ADHERENCE_GATE, "METHOD_ADHERENT");
}

export function evaluateSalesCoachingEvidenceGate(state: SalesLearningState): NamedSalesLearningGate {
  const reasons: string[] = [];
  for (const assignment of state.assignments) {
    if (!assignment.evidence.length) reasons.push(`NO_EVIDENCE:${assignment.assignment_id}`);
    if (!assignment.reason || assignment.reason.length < 12) reasons.push(`WEAK_REASON:${assignment.assignment_id}`);
    const profile = state.profiles[assignment.agent_id];
    if (!profile || profile.dimensions[assignment.skill].sample_size < 1) reasons.push(`NO_SAMPLE:${assignment.skill}`);
    if (!profile?.dimensions[assignment.skill].confidence) reasons.push(`NO_CONFIDENCE:${assignment.skill}`);
  }
  if (!state.assignments.length) reasons.push("NO_ASSIGNMENTS");
  return reasons.length ? fail(SALES_COACHING_EVIDENCE_GATE, reasons) : pass(SALES_COACHING_EVIDENCE_GATE, "EVIDENCE_BACKED");
}

export function evaluateSalesTrainingPrivacyGate(serialized: string): NamedSalesLearningGate {
  const reasons: string[] = [];
  for (const pattern of salesLearningPublicForbiddenPatterns()) {
    if (pattern.test(serialized)) reasons.push(`PUBLIC_LEAK:${pattern}`);
  }
  if (/Jane Doe|John Smith|Alex Rivera|harborline\.invalid/i.test(serialized)) reasons.push("PUBLIC_PROSPECT_IDENTITY");
  return reasons.length ? fail(SALES_TRAINING_PRIVACY_GATE, reasons) : pass(SALES_TRAINING_PRIVACY_GATE, "PUBLIC_SANITIZED");
}
