import {
  CALCULATOR_CLONE_PATTERN,
  CRE_ADJACENT_PATTERN,
  MIN_MATERIAL_DIFFERENCE_DIMENSIONS,
  OCCUPANCYNPV_CANDIDATE_ID,
  SECOND_VENTURE_DIFFERENTIATION_GATE,
  type DifferentiationDimension,
} from "./constants";
import { OCCUPANCYNPV_DIFFERENTIATION_BASELINE, occupancyNpvCloneSignals } from "./occupancy-npv-baseline";
import type { OpportunityUniverseCandidate, SecondVentureDifferentiationGateResult } from "./types";

function classifyCandidateProfile(candidate: OpportunityUniverseCandidate): Record<DifferentiationDimension, string> {
  const blob = `${candidate.title} ${candidate.market} ${candidate.problem} ${candidate.customer} ${candidate.businessModel.join(" ")}`.toLowerCase();
  const generated = /qr|review request|generated|parser|csv|report kit|document/.test(blob);
  const workflow = /automation|booking|compliance|change order|questionnaire/.test(blob);
  return {
    industry: candidate.market.toLowerCase().includes("commercial real estate")
      ? "commercial_real_estate_lease_analytics"
      : candidate.market.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 80),
    customer_type: candidate.customer.toLowerCase().includes("broker")
      ? "tenant_representation_brokers_and_boutique_cre_agencies"
      : candidate.customer.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 80),
    purchase_behavior: /month|\/mo/.test(candidate.recommendedPricing)
      ? "monthly_self_serve_subscription"
      : /deal|transaction|per-use|per-report/.test(candidate.recommendedPricing.toLowerCase())
        ? "usage_or_transaction"
        : "unspecified_purchase_behavior",
    revenue_model: candidate.recommendedModel === "UNKNOWN"
      ? candidate.businessModel[0] ?? "unknown"
      : candidate.recommendedModel,
    backend_model: generated
      ? "generated_artifact_store_not_lease_workspace"
      : workflow
        ? "workflow_object_store"
        : "unspecified_backend",
    fulfillment_type: generated
      ? "generated_digital_deliverable"
      : /entitlement|subscription/.test(candidate.recommendedModel)
        ? "recurring_access"
        : "unspecified_fulfillment",
    product_interaction: CALCULATOR_CLONE_PATTERN.test(blob)
      ? "authenticated_npv_calculator_and_scenario_comparison"
      : generated
        ? "generate_and_deliver_artifact"
        : "workflow_or_service",
    data_model: generated
      ? "location_or_job_plus_generated_kit"
      : "unspecified_collection",
    acquisition_channel: /local business|salon|restaurant|contractor/.test(blob)
      ? "local_smb_organic_and_direct"
      : "unspecified_acquisition",
    operational_workflow: generated
      ? "add_location_generate_kit_share_or_print"
      : "unspecified_workflow",
  };
}

export function evaluateSecondVentureDifferentiationGate(
  candidate: OpportunityUniverseCandidate,
): SecondVentureDifferentiationGateResult {
  const reasons: string[] = [];
  if (candidate.id === OCCUPANCYNPV_CANDIDATE_ID) {
    reasons.push("cannot_select_occupancynpv_as_second_venture");
  }
  const clone = occupancyNpvCloneSignals(candidate);
  reasons.push(...clone);
  const blob = `${candidate.title} ${candidate.market} ${candidate.problem}`;
  if (CALCULATOR_CLONE_PATTERN.test(blob) && !/review|qr/.test(blob.toLowerCase())) {
    reasons.push("analysis_calculator_or_estimator_clone");
  }
  if (CRE_ADJACENT_PATTERN.test(blob) && candidate.id !== OCCUPANCYNPV_CANDIDATE_ID) {
    reasons.push("cre_or_property_adjacent");
  }

  const profile = classifyCandidateProfile(candidate);
  const comparison = Object.fromEntries(
    (Object.keys(OCCUPANCYNPV_DIFFERENTIATION_BASELINE) as DifferentiationDimension[]).map((dimension) => {
      const occupancyNpv = OCCUPANCYNPV_DIFFERENTIATION_BASELINE[dimension];
      const value = profile[dimension];
      return [dimension, { occupancyNpv, candidate: value, different: value !== occupancyNpv }];
    }),
  ) as SecondVentureDifferentiationGateResult["comparison"];

  const differentDimensions = Object.values(comparison).filter((row) => row.different).length;
  const cloneRejected = reasons.length > 0;
  const result = !cloneRejected && differentDimensions >= MIN_MATERIAL_DIFFERENCE_DIMENSIONS ? "PASS" : "FAIL";
  if (result === "FAIL" && !cloneRejected) reasons.push("insufficient_material_difference");

  return {
    gate: SECOND_VENTURE_DIFFERENTIATION_GATE,
    result,
    candidateId: candidate.id,
    differentDimensions,
    requiredDimensions: MIN_MATERIAL_DIFFERENCE_DIMENSIONS,
    comparison,
    cloneRejected,
    reasons,
  };
}
