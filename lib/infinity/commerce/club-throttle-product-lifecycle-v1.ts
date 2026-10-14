import type { ClubThrottleProductConcept } from "./club-throttle-autonomous-product-development-v1.ts";

export const CLUB_THROTTLE_NEW_PRODUCT_VISUAL_APPROVAL_POLICY =
  "FOUNDER_VISUAL_APPROVAL_REQUIRED_FOR_NEW_SKU" as const;

export type ClubThrottleProductLifecycleStage =
  | "OPPORTUNITY"
  | "CONCEPT"
  | "CREATIVE_BRIEF"
  | "AWAITING_FOUNDER_VISUAL_APPROVAL"
  | "ARTWORK"
  | "ART_QC"
  | "GARMENT_ADAPTATION"
  | "PRODUCTION_MASTER"
  | "PRODUCT_CONFIGURATION"
  | "STOREFRONT_READY"
  | "PUBLISHED";

export type ClubThrottleProductLifecycleRow = ClubThrottleProductConcept & {
  lifecycle_stage: ClubThrottleProductLifecycleStage;
  creative_brief_summary?: string;
  garment_context?: { light: "PLANNED"; dark: "PLANNED" };
};

export function advanceTopClubThrottleProductConcept(
  concepts: ClubThrottleProductConcept[],
): {
  advanced: ClubThrottleProductLifecycleRow[];
  PRODUCTS_ADVANCED_BEYOND_CONCEPT: number;
  policy: typeof CLUB_THROTTLE_NEW_PRODUCT_VISUAL_APPROVAL_POLICY;
} {
  if (!concepts.length) {
    return { advanced: [], PRODUCTS_ADVANCED_BEYOND_CONCEPT: 0, policy: CLUB_THROTTLE_NEW_PRODUCT_VISUAL_APPROVAL_POLICY };
  }
  const [top, ...rest] = concepts;
  const advancedTop: ClubThrottleProductLifecycleRow = {
    ...top,
    lifecycle_stage: "CREATIVE_BRIEF",
    qc_state: "DESIGN_BRIEF",
    creative_brief_summary: `Original ${top.theme}: ${top.market_signal}. Back-print apparel; no competitor art; dark/light garment plans required before production master.`,
    garment_context: { light: "PLANNED", dark: "PLANNED" },
  };
  const held: ClubThrottleProductLifecycleRow[] = rest.map((c) => ({
    ...c,
    lifecycle_stage: "CONCEPT" as const,
  }));
  return {
    advanced: [advancedTop, ...held],
    PRODUCTS_ADVANCED_BEYOND_CONCEPT: 1,
    policy: CLUB_THROTTLE_NEW_PRODUCT_VISUAL_APPROVAL_POLICY,
  };
}

export function clubThrottleProductCreativeQc(row: ClubThrottleProductLifecycleRow | null): "PASS" | "HOLD" {
  if (!row) return "HOLD";
  if (row.brand_fit_score < 70) return "HOLD";
  if (row.lifecycle_stage === "CONCEPT") return "HOLD";
  return "PASS";
}

export function productGarmentContextArtQc(row: ClubThrottleProductLifecycleRow | null): "PASS" | "FAIL" | "PENDING" {
  if (!row?.garment_context) return "PENDING";
  if (row.garment_context.light === "PLANNED" && row.garment_context.dark === "PLANNED") return "PASS";
  return "FAIL";
}

export function autonomousStorefrontProductPublishQc(input: {
  lifecycle_stage: ClubThrottleProductLifecycleStage;
  manufacturing_authorized: boolean;
}): "PASS" | "FAIL" | "NOT_READY" {
  if (input.manufacturing_authorized) return "FAIL";
  if (input.lifecycle_stage === "PUBLISHED" || input.lifecycle_stage === "STOREFRONT_READY") return "PASS";
  return "NOT_READY";
}
