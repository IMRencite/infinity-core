import {
  CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
  CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
  evaluateCanonicalReplacementDraftConversion,
  type CanonicalReplacementConversionAttempt,
} from "./gelato-v42-canonical-art-validation-draft-v1.ts";
import {
  CLUB_THROTTLE_NON_CANONICAL_SAMPLE_GELATO_ORDER_ID,
  FINAL_CANONICAL_PRODUCT_PHYSICAL_QC_DEFERRAL_REASON,
  type FinalCanonicalProductPhysicalQcState,
} from "./club-throttle-non-canonical-sample-qc-v1.ts";
import { resolveClubThrottleFulfillmentPrintAssetUrl } from "./club-throttle-fulfillment-art-asset-v1.ts";

export const CANONICAL_REPLACEMENT_DECISION = "DEFER_NO_ADDITIONAL_MANUFACTURING" as const;

export const V42_DRAFT_LIFECYCLE_STATE = "VALIDATED_UNCONVERTED_REFERENCE" as const;
export const V42_DRAFT_MANUFACTURING_INTENT = "NONE" as const;
export const V42_DRAFT_FOUNDER_DECISION = "DEFER_NO_SPEND" as const;

export const FIRST_LEGITIMATE_CANONICAL_ORDER_PHYSICAL_QC_V1 =
  "FIRST_LEGITIMATE_CANONICAL_ORDER_PHYSICAL_QC_V1" as const;

export function canonicalReplacementConversionRequired(): boolean {
  return false;
}

export function clubThrottleReplacementDecisionQc(): "PASS" | "FAIL" {
  return CANONICAL_REPLACEMENT_DECISION === "DEFER_NO_ADDITIONAL_MANUFACTURING" ? "PASS" : "FAIL";
}

export function finalCanonicalProductPhysicalQcState(): {
  FINAL_CANONICAL_PRODUCT_PHYSICAL_QC: FinalCanonicalProductPhysicalQcState;
  FINAL_CANONICAL_PRODUCT_PHYSICAL_QC_DEFERRAL_REASON: typeof FINAL_CANONICAL_PRODUCT_PHYSICAL_QC_DEFERRAL_REASON;
} {
  return {
    FINAL_CANONICAL_PRODUCT_PHYSICAL_QC: "DEFERRED_UNTIL_FIRST_CANONICAL_PRODUCTION_ORDER",
    FINAL_CANONICAL_PRODUCT_PHYSICAL_QC_DEFERRAL_REASON: FINAL_CANONICAL_PRODUCT_PHYSICAL_QC_DEFERRAL_REASON,
  };
}

export function firstLegitimateCanonicalOrderPhysicalQcState(): {
  version: typeof FIRST_LEGITIMATE_CANONICAL_ORDER_PHYSICAL_QC_V1;
  FIRST_LEGITIMATE_CANONICAL_ORDER_PHYSICAL_QC: "ARMED";
  reference_role: "FIRST_CANONICAL_PRODUCT_PHYSICAL_REFERENCE";
} {
  return {
    version: FIRST_LEGITIMATE_CANONICAL_ORDER_PHYSICAL_QC_V1,
    FIRST_LEGITIMATE_CANONICAL_ORDER_PHYSICAL_QC: "ARMED",
    reference_role: "FIRST_CANONICAL_PRODUCT_PHYSICAL_REFERENCE",
  };
}

export function v42ValidationReferenceRetentionQc(input: {
  draft_id: string | null;
  draft_order_type: string | null;
}): "PASS" | "FAIL" {
  if (input.draft_id !== CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID) return "FAIL";
  if ((input.draft_order_type ?? "").toLowerCase() !== "draft") return "FAIL";
  return "PASS";
}

export function validatedDraftAutoConversionGuardQc(input: {
  conversion_ready: boolean;
  conversion_required: boolean;
  conversion_attempt: CanonicalReplacementConversionAttempt;
}): "PASS" | "FAIL" {
  if (input.conversion_ready && !input.conversion_required && input.conversion_attempt.allowed) {
    return "FAIL";
  }
  if (!input.conversion_required && input.conversion_attempt.allowed) {
    return "FAIL";
  }
  return "PASS";
}

export function nonCanonicalSampleScopeGuardQc(input: {
  sample_gelato_order_id: string;
  final_canonical_physical_qc: FinalCanonicalProductPhysicalQcState;
}): "PASS" | "FAIL" {
  if (input.sample_gelato_order_id !== CLUB_THROTTLE_NON_CANONICAL_SAMPLE_GELATO_ORDER_ID) return "FAIL";
  if (input.final_canonical_physical_qc === "PASS") return "FAIL";
  return "PASS";
}

export function futureCustomerOrderCanonicalArtQc(cwd?: string): "PASS" | "FAIL" {
  const resolved = resolveClubThrottleFulfillmentPrintAssetUrl({
    sku: "LOT_LINE",
    garment_color: "black",
    cwd,
  });
  if (!resolved.ok) return "FAIL";
  if (resolved.url.includes("candidate3") || resolved.url.includes("de2da007")) return "FAIL";
  if (!resolved.url.includes("lot_line-black-production-print-master")) return "FAIL";
  return "PASS";
}

export function canonicalArtProviderValidationBundleFromV42Report(report: {
  PRINT_ART?: Record<string, unknown>;
  COMBINED?: Record<string, unknown>;
  LIVE_ART?: Record<string, unknown>;
}): {
  CANONICAL_ART_DIGITAL_QC: "PASS" | "FAIL";
  CANONICAL_ART_PROVIDER_DOWNLOAD_QC: "PASS" | "FAIL";
  CANONICAL_ART_PROVIDER_CONFIGURATION_QC: "PASS" | "FAIL";
  CANONICAL_ART_FULFILLMENT_CONFIGURATION_QC: "PASS" | "FAIL";
  CANONICAL_ART_PROVIDER_VALIDATION_QC: "PASS" | "FAIL";
} {
  const downloaded =
    report.PRINT_ART?.DRAFT_PROVIDER_DOWNLOADED_ART_SHA === CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256;
  const identity = report.PRINT_ART?.DRAFT_CANONICAL_ART_IDENTITY_QC === "PASS";
  const chain = report.PRINT_ART?.V42_DRAFT_ARTWORK_IDENTITY_CHAIN_QC === "PASS";
  const printCfg = report.PRINT_ART?.GELATO_DRAFT_PRINT_CONFIGURATION_VALIDATION_QC === "PASS";
  const e2e = report.COMBINED?.GELATO_DRAFT_END_TO_END_FULFILLMENT_VALIDATION_QC === "PASS";
  const live = report.LIVE_ART?.V42_CANONICAL_ART_LIVE_HASH_QC === "PASS";
  const digital = live && chain ? "PASS" : "FAIL";
  const providerDownload = downloaded && identity ? "PASS" : "FAIL";
  const providerConfig = printCfg ? "PASS" : "FAIL";
  const fulfillmentConfig = e2e ? "PASS" : "FAIL";
  const providerValidation =
    digital === "PASS" && providerDownload === "PASS" && providerConfig === "PASS" && fulfillmentConfig === "PASS"
      ? "PASS"
      : "FAIL";
  return {
    CANONICAL_ART_DIGITAL_QC: digital,
    CANONICAL_ART_PROVIDER_DOWNLOAD_QC: providerDownload,
    CANONICAL_ART_PROVIDER_CONFIGURATION_QC: providerConfig,
    CANONICAL_ART_FULFILLMENT_CONFIGURATION_QC: fulfillmentConfig,
    CANONICAL_ART_PROVIDER_VALIDATION_QC: providerValidation,
  };
}

export function clubThrottleV42EngineeringCloseoutState(): {
  ENGINEERING_STATE: "STABLE_LOCKED";
  VENTURE_STATE: "LIVE_OPERATING";
  CLUB_THROTTLE_RUNTIME: "AUTONOMOUS_OPERATIONS";
  FULFILLMENT_STATE: "NORMAL_OPERATIONS_WITH_SAMPLE_MONITORING";
  FOUNDER_ACTION_REQUIRED: "NONE";
  NEXT_SYSTEM_PRIORITY: "AUTONOMOUS_DISCOVERY_CONTINUATION";
} {
  return {
    ENGINEERING_STATE: "STABLE_LOCKED",
    VENTURE_STATE: "LIVE_OPERATING",
    CLUB_THROTTLE_RUNTIME: "AUTONOMOUS_OPERATIONS",
    FULFILLMENT_STATE: "NORMAL_OPERATIONS_WITH_SAMPLE_MONITORING",
    FOUNDER_ACTION_REQUIRED: "NONE",
    NEXT_SYSTEM_PRIORITY: "AUTONOMOUS_DISCOVERY_CONTINUATION",
  };
}

export function evaluateV42DraftConversionAttempt(input: {
  production_conversion_authorized: boolean;
  env?: NodeJS.ProcessEnv;
}): CanonicalReplacementConversionAttempt {
  if (!canonicalReplacementConversionRequired()) {
    return {
      allowed: false,
      reason: "CANONICAL_REPLACEMENT_CONVERSION_NOT_REQUIRED",
      patch_body: null,
    };
  }
  return evaluateCanonicalReplacementDraftConversion({
    provider_order_id: CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
    production_conversion_authorized: input.production_conversion_authorized,
    env: input.env,
  });
}
