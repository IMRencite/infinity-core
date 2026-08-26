import type { EvidenceSignalType } from "../constants";

export const RESEARCH_EVIDENCE_DIMENSIONS = [
  "demand",
  "market",
  "competition",
  "pricing",
  "monetization",
  "distribution",
  "buildability",
  "capital_efficiency",
  "speed_to_revenue",
] as const;

export type ResearchEvidenceDimension = (typeof RESEARCH_EVIDENCE_DIMENSIONS)[number];

export const MATERIAL_RESEARCH_DIMENSIONS = ["demand", "market", "competition", "monetization"] as const;

export type MaterialResearchDimension = (typeof MATERIAL_RESEARCH_DIMENSIONS)[number];

export const DIMENSION_RESEARCH_CLASSES = [
  "DIRECT_EXTERNAL_EVIDENCE_PREFERRED",
  "DERIVED_FROM_GROUNDED_EVIDENCE_ALLOWED",
  "FOUNDER_HYPOTHESIS_ALLOWED_AS_SEED_ONLY",
  "MAY_REMAIN_UNKNOWN",
] as const;

export type DimensionResearchClass = (typeof DIMENSION_RESEARCH_CLASSES)[number];

export const SIGNAL_TO_RESEARCH_DIMENSION: Partial<Record<EvidenceSignalType, ResearchEvidenceDimension>> = {
  search_demand: "demand",
  customer_complaints: "demand",
  purchase_intent: "demand",
  recurring_problem: "demand",
  growing_market: "market",
  underserved_niche: "market",
  regulatory_change: "market",
  technological_shift: "market",
  competitor_presence: "competition",
  competitor_weakness: "competition",
  pricing_pain: "pricing",
  monetization_precedent: "monetization",
  distribution_opportunity: "distribution",
  workflow_inefficiency: "buildability",
  capital_requirement: "capital_efficiency",
  time_to_revenue: "speed_to_revenue",
};

export const DIMENSION_SIGNAL_TYPES: Record<ResearchEvidenceDimension, EvidenceSignalType[]> = {
  demand: ["search_demand", "customer_complaints", "purchase_intent", "recurring_problem"],
  market: ["growing_market", "underserved_niche", "regulatory_change", "technological_shift"],
  competition: ["competitor_presence", "competitor_weakness"],
  pricing: ["pricing_pain"],
  monetization: ["monetization_precedent"],
  distribution: ["distribution_opportunity"],
  buildability: ["workflow_inefficiency"],
  capital_efficiency: ["capital_requirement"],
  speed_to_revenue: ["time_to_revenue"],
};

export const DIMENSION_RESEARCH_CLASS: Record<ResearchEvidenceDimension, DimensionResearchClass> = {
  demand: "DIRECT_EXTERNAL_EVIDENCE_PREFERRED",
  market: "DIRECT_EXTERNAL_EVIDENCE_PREFERRED",
  competition: "DIRECT_EXTERNAL_EVIDENCE_PREFERRED",
  pricing: "DIRECT_EXTERNAL_EVIDENCE_PREFERRED",
  monetization: "DIRECT_EXTERNAL_EVIDENCE_PREFERRED",
  distribution: "DERIVED_FROM_GROUNDED_EVIDENCE_ALLOWED",
  buildability: "DERIVED_FROM_GROUNDED_EVIDENCE_ALLOWED",
  capital_efficiency: "MAY_REMAIN_UNKNOWN",
  speed_to_revenue: "MAY_REMAIN_UNKNOWN",
};

export function isMaterialResearchDimension(
  dimension: ResearchEvidenceDimension,
): dimension is MaterialResearchDimension {
  return (MATERIAL_RESEARCH_DIMENSIONS as readonly string[]).includes(dimension);
}

export function isDirectExternalResearchUseful(dimension: ResearchEvidenceDimension): boolean {
  return DIMENSION_RESEARCH_CLASS[dimension] === "DIRECT_EXTERNAL_EVIDENCE_PREFERRED";
}

export function dimensionFromSignalType(
  signalType: EvidenceSignalType,
): ResearchEvidenceDimension | null {
  return SIGNAL_TO_RESEARCH_DIMENSION[signalType] ?? null;
}
