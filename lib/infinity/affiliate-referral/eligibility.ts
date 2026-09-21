import type { AffiliateEligibilityInput, AffiliateEligibilityResult } from "./types";

export function evaluateAffiliateProgramEligibility(input: AffiliateEligibilityInput): AffiliateEligibilityResult {
  if (input.explicitly_non_commercial || !input.commercial) {
    return {
      eligible_for_capability: false,
      eligible_for_activation: false,
      program_state: "NOT_ELIGIBLE",
      reason: "NON_COMMERCIAL",
    };
  }
  if (input.regulated_auto_activate) {
    return {
      eligible_for_capability: true,
      eligible_for_activation: false,
      program_state: "PENDING_COMPLIANCE_REVIEW",
      reason: "REGULATED_VENTURE_REQUIRES_COMPLIANCE_REVIEW",
    };
  }
  if (input.legal_restrictions.length > 0) {
    return {
      eligible_for_capability: true,
      eligible_for_activation: false,
      program_state: "PENDING_COMPLIANCE_REVIEW",
      reason: `LEGAL_RESTRICTION:${input.legal_restrictions.join(",")}`,
    };
  }
  if (!input.referral_compensation_suitable) {
    return {
      eligible_for_capability: true,
      eligible_for_activation: false,
      program_state: "NOT_ELIGIBLE",
      reason: "REFERRAL_COMPENSATION_NOT_SUITABLE",
    };
  }
  if (!input.contribution_known) {
    return {
      eligible_for_capability: true,
      eligible_for_activation: false,
      program_state: "PENDING_ECONOMICS",
      reason: "UNKNOWN_CONTRIBUTION_BLOCKS_ACTIVATION",
    };
  }
  if (!input.payout_ready) {
    return {
      eligible_for_capability: true,
      eligible_for_activation: false,
      program_state: "PENDING_PAYOUT_INFRASTRUCTURE",
      reason: "PAYOUT_INFRASTRUCTURE_NOT_READY",
    };
  }
  if (!input.tracking_ready || !input.payment_ready) {
    return {
      eligible_for_capability: true,
      eligible_for_activation: false,
      program_state: "CONFIGURING",
      reason: "TRACKING_OR_PAYMENT_NOT_READY",
    };
  }
  return {
    eligible_for_capability: true,
    eligible_for_activation: true,
    program_state: "READY",
    reason: "ELIGIBLE_AND_READY",
  };
}

export function capabilityDoesNotActivate(result: AffiliateEligibilityResult): boolean {
  return result.eligible_for_capability && !result.eligible_for_activation && result.program_state !== "READY";
}
