import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/growth-engine/venture-identity";
import { evaluateAffiliateProgramEligibility } from "./eligibility";
import { askReviewAffiliateProgram, occupancyNpvAffiliateProgram } from "./occupancy";
import type { AffiliateProgram } from "./types";

export function provisionAffiliateCapability(input: {
  venture_id: string;
  commercial: boolean;
  explicitly_non_commercial?: boolean;
}): AffiliateProgram | { exception: "NON_COMMERCIAL" | "NOT_ELIGIBLE"; reason: string } {
  if (input.explicitly_non_commercial || !input.commercial) {
    return { exception: "NON_COMMERCIAL", reason: "NON_COMMERCIAL" };
  }
  if (input.venture_id === CRE_VENTURE_ID) return occupancyNpvAffiliateProgram();
  if (input.venture_id === ASKREVIEW_VENTURE_ID) return askReviewAffiliateProgram();
  const eligibility = evaluateAffiliateProgramEligibility({
    venture_id: input.venture_id,
    commercial: true,
    venture_type: "COMMERCIAL_VENTURE",
    regulatory_context: "UNKNOWN",
    legal_restrictions: [],
    business_model: "UNKNOWN",
    customer_type: "UNKNOWN",
    referral_compensation_suitable: true,
    tracking_ready: false,
    payment_ready: false,
    payout_ready: false,
    contribution_known: false,
  });
  return {
    program_id: `affiliate-program:${input.venture_id}`,
    venture_id: input.venture_id,
    display_name: "Affiliate & Referral Program",
    state: eligibility.program_state,
    commercial: true,
    capability_provisioned: true,
    activated: false,
    eligibility_reason: eligibility.reason,
    commission_model: "PENDING_ECONOMICS",
    commission: "PENDING_ECONOMICS",
    payout_state: "PENDING_ECONOMICS",
    public_path: "/affiliates",
    portal_path: "/affiliates/portal",
    terms_path: "/affiliates/terms",
  };
}

export function commercialVenturesReceiveAffiliateCapability(ventures: Array<{
  venture_id: string;
  commercial: boolean;
  explicitly_non_commercial?: boolean;
}>): boolean {
  return ventures.every((venture) => {
    const provisioned = provisionAffiliateCapability(venture);
    if ("exception" in provisioned) return provisioned.exception === "NON_COMMERCIAL";
    return provisioned.capability_provisioned && !provisioned.activated;
  });
}
