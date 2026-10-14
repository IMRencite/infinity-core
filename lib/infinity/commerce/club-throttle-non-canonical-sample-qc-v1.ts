export const CLUB_THROTTLE_NON_CANONICAL_SAMPLE_GELATO_ORDER_ID =
  "0e22864c-0246-443f-9b38-9d675b575dac" as const;

export const CLUB_THROTTLE_NON_CANONICAL_SAMPLE_COMMERCE_ORDER_ID =
  "cto_55ca5b85df77c55813e0ac6e" as const;

export const FINAL_CANONICAL_PRODUCT_PHYSICAL_QC_DEFERRAL_REASON =
  "NO_INCREMENTAL_MANUFACTURING_SPEND_FOR_VALIDATION_ONLY" as const;

export type FinalCanonicalProductPhysicalQcState =
  | "DEFERRED_UNTIL_FIRST_CANONICAL_PRODUCTION_ORDER"
  | "NOT_RUN"
  | "PENDING_CANONICAL_SHIRT"
  | "PASS"
  | "FAIL";

export type ClubThrottlePhysicalQcSplit = {
  CURRENT_PHYSICAL_REFERENCE_TYPE: "NON_CANONICAL_PRINT_AND_GARMENT_SAMPLE";
  NON_CANONICAL_SAMPLE_PHYSICAL_QC: "PENDING_RECEIPT" | "IN_FLIGHT" | "COMPLETE";
  FINAL_CANONICAL_PRODUCT_PHYSICAL_QC: FinalCanonicalProductPhysicalQcState;
  FINAL_CANONICAL_PRODUCT_PHYSICAL_QC_DEFERRAL_REASON?: typeof FINAL_CANONICAL_PRODUCT_PHYSICAL_QC_DEFERRAL_REASON;
  GELATO_ORDER_MUTATION_AUTHORIZED: false;
};

export function clubThrottleNonCanonicalSampleQcState(input?: {
  fulfillment_status?: string;
  canonical_physical_qc_deferred?: boolean;
}): ClubThrottlePhysicalQcSplit {
  const inFlight = input?.fulfillment_status === "in_production" || input?.fulfillment_status === "shipped";
  const defer = input?.canonical_physical_qc_deferred !== false;
  return {
    CURRENT_PHYSICAL_REFERENCE_TYPE: "NON_CANONICAL_PRINT_AND_GARMENT_SAMPLE",
    NON_CANONICAL_SAMPLE_PHYSICAL_QC: inFlight ? "IN_FLIGHT" : "PENDING_RECEIPT",
    FINAL_CANONICAL_PRODUCT_PHYSICAL_QC: defer
      ? "DEFERRED_UNTIL_FIRST_CANONICAL_PRODUCTION_ORDER"
      : "NOT_RUN",
    FINAL_CANONICAL_PRODUCT_PHYSICAL_QC_DEFERRAL_REASON: defer
      ? FINAL_CANONICAL_PRODUCT_PHYSICAL_QC_DEFERRAL_REASON
      : undefined,
    GELATO_ORDER_MUTATION_AUTHORIZED: false,
  };
}
