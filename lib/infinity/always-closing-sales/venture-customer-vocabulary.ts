export const UNKNOWN = "UNKNOWN" as const;

export type VentureCustomerVocabulary = {
  venture_id: string;
  approved_product_terms: string[];
  preferred_feature_names: string[];
  common_customer_language: string[];
  industry_terminology: string[];
  terms_to_avoid: string[];
  internal_only_terminology: string[];
};

export const OCCUPANCYNPV_CUSTOMER_VOCABULARY: VentureCustomerVocabulary = {
  venture_id: "occupancynpv",
  approved_product_terms: [
    "OccupancyNPV",
    "lease comparison",
    "free trial",
    "renewal",
    "relocation",
  ],
  preferred_feature_names: [
    "side-by-side comparison",
    "NPV",
    "property-value impact",
  ],
  common_customer_language: [
    "lease",
    "rent",
    "occupancy",
    "downtime",
    "move-in costs",
    "scenario",
    "comparison",
    "spreadsheet",
  ],
  industry_terminology: [
    "NPV",
    "cap rate",
    "tenant-rep",
    "remaining term",
  ],
  terms_to_avoid: [
    "verified path",
    "canonical",
    "eligible_at",
    "DealWorkspace",
    "next best commercial action",
    "next best action",
  ],
  internal_only_terminology: [
    "runtime",
    "composer",
    "semantic",
    "venture offer",
    "offer truth",
    "qualified state",
    "conversion destination",
    "stage-aware CTA",
    "provider",
  ],
};

const REGISTRY: Record<string, VentureCustomerVocabulary> = {
  occupancynpv: OCCUPANCYNPV_CUSTOMER_VOCABULARY,
};

export function loadVentureCustomerVocabulary(venture_id: string): VentureCustomerVocabulary {
  return REGISTRY[venture_id] ?? {
    venture_id,
    approved_product_terms: [],
    preferred_feature_names: [],
    common_customer_language: [],
    industry_terminology: [],
    terms_to_avoid: [],
    internal_only_terminology: [],
  };
}

export function evaluateVentureCustomerVocabularyGate(vocab: VentureCustomerVocabulary): {
  gate: "VentureCustomerVocabulary";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const ok = Boolean(vocab.venture_id && vocab.approved_product_terms.length && vocab.internal_only_terminology.length);
  return {
    gate: "VentureCustomerVocabulary",
    result: ok ? "PASS" : "FAIL",
    reasons: ok ? ["VOCABULARY_PRESENT"] : ["VOCABULARY_INCOMPLETE"],
  };
}
