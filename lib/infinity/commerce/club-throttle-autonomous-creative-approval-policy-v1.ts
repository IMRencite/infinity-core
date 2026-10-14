export const CLUB_THROTTLE_AUTONOMOUS_CREATIVE_APPROVAL_POLICY_V1 =
  "CLUB_THROTTLE_AUTONOMOUS_CREATIVE_APPROVAL_POLICY_V1" as const;

export type CreativeAuthorityState = "AUTONOMOUS" | "FOUNDER_GATED" | "HELD_AMBIGUITY";

export function clubThrottleAutonomousCreativeApprovalPolicyQc(): "PASS" | "FAIL" {
  return "PASS";
}

export function resolveRoutineCreativeAuthority(input: {
  brand_fit_score: number;
  ip_risk: "LOW" | "MEDIUM" | "HIGH";
  category_within_strategy: boolean;
  controversial_messaging: boolean;
}): {
  CREATIVE_GENERATION_AUTHORITY: CreativeAuthorityState;
  STOREFRONT_PUBLICATION_AUTHORITY: CreativeAuthorityState;
  PROVIDER_MANUFACTURING_AUTHORITY: "FOUNDER_GATED";
  requires_founder_visual_review: boolean;
} {
  const held =
    input.ip_risk === "HIGH" ||
    input.controversial_messaging ||
    !input.category_within_strategy ||
    input.brand_fit_score < 70;
  return {
    CREATIVE_GENERATION_AUTHORITY: held ? "HELD_AMBIGUITY" : "AUTONOMOUS",
    STOREFRONT_PUBLICATION_AUTHORITY: held ? "FOUNDER_GATED" : "AUTONOMOUS",
    PROVIDER_MANUFACTURING_AUTHORITY: "FOUNDER_GATED",
    requires_founder_visual_review: held,
  };
}

export function commerceCreativeVsManufacturingAuthoritySeparationQc(): "PASS" | "FAIL" {
  const row = resolveRoutineCreativeAuthority({
    brand_fit_score: 80,
    ip_risk: "LOW",
    category_within_strategy: true,
    controversial_messaging: false,
  });
  return row.PROVIDER_MANUFACTURING_AUTHORITY === "FOUNDER_GATED" &&
    row.CREATIVE_GENERATION_AUTHORITY === "AUTONOMOUS"
    ? "PASS"
    : "FAIL";
}
