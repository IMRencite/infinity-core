export const ALLOWED_VALIDATION_EXPERIMENT_TYPES = [

  "grounded_competitor_research",

  "pricing_evidence_research",

  "search_demand_evidence",

  "public_demand_evidence_research",

  "public_review_pain_validation",

  "public_pricing_comparison",

  "distribution_economics_research",

  "comparable_benchmark_research",

  "api_integration_feasibility_probe",

  "technical_prototype_feasibility",

  "landing_page_artifact",

  "seo_demand_validation",

] as const;



/** Requires external traffic/exposure authority — never emitted during synthesis-only FAVC1 validation. */

export const EXPOSURE_REQUIRED_EXPERIMENT_TYPES = [

  "landing_page_demand_test",

  "pricing_test",

  "paid_ads",

] as const;



export const DISALLOWED_VALIDATION_EXPERIMENT_TYPES = [

  "customer_interview",

  "survey",

  "fake_signup",

  "fake_purchase_intent",

  "paid_ads",

  "unsolicited_outreach",

  "fake_customer_interview",

  "fake_survey",

] as const;



export const FAVC1_VALIDATION_MAX_ROUNDS = 1;

export const FAVC1_VALIDATION_MAX_CANDIDATES = 1;

/** Max provider-backed research calls inside one validation round (Step B acquisition). */
export const FAVC1_VALIDATION_MAX_ACQUISITION_CALLS = 1;

/** Legacy alias — acquisition calls per round are capped separately from round count. */
export const FAVC1_VALIDATION_MAX_PROVIDER_CALLS = FAVC1_VALIDATION_MAX_ACQUISITION_CALLS;



export type AllowedValidationExperimentType = (typeof ALLOWED_VALIDATION_EXPERIMENT_TYPES)[number];



export function isAllowedValidationExperimentType(experimentType: string): boolean {

  const normalized = experimentType.toLowerCase();

  if (EXPOSURE_REQUIRED_EXPERIMENT_TYPES.some((item) => normalized.includes(item.replace(/_/g, "")))) {

    return false;

  }

  if (DISALLOWED_VALIDATION_EXPERIMENT_TYPES.some((item) => normalized.includes(item.replace(/_/g, "")))) {

    return false;

  }

  if (normalized.includes("customer_interview") || normalized.includes("survey")) {

    return false;

  }

  return ALLOWED_VALIDATION_EXPERIMENT_TYPES.some(

    (allowed) => normalized === allowed || normalized.includes(allowed.replace(/_/g, "")),

  );

}



export function mapValidationMethodToAllowedExperiment(validationMethod: string | null): string | null {

  if (!validationMethod) return null;

  const normalized = validationMethod.toLowerCase();



  const truthfulMapping: Record<string, string> = {

    customer_interview: "public_review_pain_validation",

    outbound_response_test: "search_demand_evidence",

    landing_page_demand_test: "search_demand_evidence",

    pricing_test: "public_pricing_comparison",

    seo_demand_validation: "search_demand_evidence",

  };

  if (truthfulMapping[normalized]) {

    return truthfulMapping[normalized];

  }



  if (!isAllowedValidationExperimentType(normalized)) {

    return null;

  }

  return normalized;

}


