import { describe, expect, it } from "vitest";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/growth-engine/venture-identity";
import { learnFromSalesEvidence } from "@/lib/infinity/venture-sales-floor/intelligence";
import {
  AFFILIATE_PROGRAM_TERMS,
  MERCURY_MODE,
  SALES_FLOOR_HQ_VISUAL_QC_RECORD,
  UNRESTRICTED_MONEY_MOVEMENT,
  affiliateCommissionAcquisitionEconomics,
  affiliateCommissionAuthority,
  classifyQcTermination,
  commercializationPathIncludesAffiliate,
  affiliateLearningReachesSalesIntelligence,
  affiliateObservationsToSalesIntelligence,
  affiliateTermsAreSubstantive,
  legalRouteIsNotLegalCoverage,
  authorizeAffiliatePayout,
  chargebackAffectsCommission,
  clickCreatesNoCommission,
  cloudRuntimeReadyForAutomaticPayout,
  commercialVenturesReceiveAffiliateCapability,
  evaluateAffiliateAttributionTruthGate,
  evaluateAffiliateCloudRuntimeReadinessGate,
  evaluateAffiliateCommissionEconomicsGate,
  evaluateAffiliateCommissionEligibilityGate,
  evaluateAffiliateComplianceDisclosureGate,
  evaluateAffiliateConversionVerificationGate,
  evaluateAffiliateCustomerPrivacyGate,
  evaluateAffiliateDuplicateAttributionGate,
  evaluateAffiliateFraudGate,
  evaluateAffiliateHoldPeriodGate,
  evaluateAffiliateNoFakeEvidenceGate,
  evaluateAffiliatePayoutAuthorizationGate,
  evaluateAffiliatePayoutIdempotencyGate,
  evaluateAffiliatePayoutLimitGate,
  evaluateAffiliatePayoutReconciliationGate,
  evaluateAffiliateProgramEligibilityGate,
  evaluateAffiliateProgramLegalCoverageGate,
  evaluateAffiliatePublicPrivacyGate,
  evaluateAffiliateQcTerminationGate,
  evaluateAffiliateRecruitmentQualificationGate,
  evaluateAffiliateRefundChargebackGate,
  evaluateAffiliateSelfReferralGate,
  evaluateAffiliateTermsCompletenessGate,
  evaluateAffiliateUnknownNotZeroGate,
  evaluateCommercialVentureAffiliateCoverageGate,
  evaluateOccupancyNPVAffiliateProgramGate,
  occupancyNpvAffiliateProgram,
  occupancyNpvFinancialLock,
  occupancyNpvPayoutBlockers,
  occupancyNpvRecruitmentCategories,
  processAffiliatePayout,
  productionAffiliatesCreated,
  retryAffiliatePayout,
  provisionAffiliateCapability,
  qcAffiliatePortalFixture,
  refundAffectsCommission,
  resetFixtureApplications,
  resolveAffiliateAttribution,
  commissionRequiresVerifiedConversion,
  submitAffiliateApplication,
  unconfiguredPayoutProvider,
} from "..";

describe("Universal Affiliate & Referral System V1", () => {
  it("21-24. every commercial venture gets capability; non-commercial exempt; no blind activation", () => {
    expect(commercialVenturesReceiveAffiliateCapability([
      { venture_id: CRE_VENTURE_ID, commercial: true },
      { venture_id: ASKREVIEW_VENTURE_ID, commercial: true },
      { venture_id: "lab", commercial: false, explicitly_non_commercial: true },
    ])).toBe(true);
    expect(evaluateCommercialVentureAffiliateCoverageGate().result).toBe("PASS");
    expect(evaluateAffiliateProgramEligibilityGate().result).toBe("PASS");
    expect(evaluateAffiliateProgramEligibilityGate({
      venture_id: "regulated",
      commercial: true,
      venture_type: "FINANCIAL",
      regulatory_context: "REGULATED",
      legal_restrictions: [],
      business_model: "UNKNOWN",
      customer_type: "CONSUMER",
      referral_compensation_suitable: true,
      tracking_ready: true,
      payment_ready: true,
      payout_ready: true,
      contribution_known: true,
      regulated_auto_activate: true,
    }).reasons[0]).toMatch(/COMPLIANCE|REGULATED/);
    const occupancy = occupancyNpvAffiliateProgram();
    expect(occupancy.activated).toBe(false);
    expect(occupancy.state).toBe("PENDING_ECONOMICS");
  });

  it("25-30. attribution, conversion, and hold rules", () => {
    expect(evaluateAffiliateAttributionTruthGate().result).toBe("PASS");
    expect(clickCreatesNoCommission(resolveAffiliateAttribution({
      affiliate_id: "a1",
      link_id: "l1",
      clicked_at: "2026-09-15T00:00:00.000Z",
      attribution_window_days: 30,
    }).state)).toBe(true);
    expect(evaluateAffiliateConversionVerificationGate().result).toBe("PASS");
    expect(evaluateAffiliateHoldPeriodGate().result).toBe("PASS");
    expect(evaluateAffiliateCommissionEligibilityGate().result).toBe("PASS");
  });

  it("31-34. refund, chargeback, duplicate, and self-referral", () => {
    expect(refundAffectsCommission("COMMISSION_APPROVED")).toBe("REFUNDED");
    expect(chargebackAffectsCommission("PAYABLE")).toBe("CHARGEBACK");
    expect(evaluateAffiliateDuplicateAttributionGate().result).toBe("PASS");
    expect(evaluateAffiliateSelfReferralGate().result).toBe("PASS");
    expect(evaluateAffiliateFraudGate().result).toBe("PASS");
  });

  it("35-38. payout idempotency, confirmation, and unknown economics", () => {
    expect(evaluateAffiliatePayoutIdempotencyGate().result).toBe("PASS");
    expect(evaluateAffiliatePayoutReconciliationGate().result).toBe("PASS");
    expect(evaluateAffiliateCommissionEconomicsGate().result).toBe("PASS");
    expect(evaluateAffiliateUnknownNotZeroGate("UNKNOWN", "UNKNOWN").result).toBe("PASS");
    expect(evaluateAffiliateUnknownNotZeroGate("UNKNOWN", "0").result).toBe("FAIL");
  });

  it("39-41. commission authority and privacy", () => {
    const authority = affiliateCommissionAuthority();
    expect(authority.kind).toBe("AFFILIATE_COMMISSION_AUTHORITY");
    expect(authority.authorized).toBe(false);
    expect(evaluateAffiliateCustomerPrivacyGate().result).toBe("PASS");
    expect(evaluateAffiliatePublicPrivacyGate().result).toBe("PASS");
    expect(JSON.stringify(qcAffiliatePortalFixture())).not.toMatch(/customer@|purchaser/i);
  });

  it("42-44. application, portal fixture, and substantive terms", () => {
    resetFixtureApplications();
    const applied = submitAffiliateApplication({
      name: "QC Fixture",
      email: "qc-fixture@example.test",
      agreement_accepted: true,
      production: false,
    });
    expect(applied.ok).toBe(true);
    expect(applied.application?.production).toBe(false);
    expect(submitAffiliateApplication({
      name: "Prod",
      email: "prod@example.test",
      agreement_accepted: true,
      production: true,
    }).ok).toBe(false);
    expect(qcAffiliatePortalFixture().affiliate_id).toContain("fixture");
    expect(affiliateTermsAreSubstantive(AFFILIATE_PROGRAM_TERMS)).toBe(true);
    expect(legalRouteIsNotLegalCoverage({ route_exists: true, terms_text: "Affiliate Terms" })).toBe(true);
    expect(evaluateAffiliateTermsCompletenessGate().result).toBe("PASS");
    resetFixtureApplications();
  });

  it("45-49. fraud hold, ceiling, Mercury, money movement, and no live payout", () => {
    expect(evaluateAffiliatePayoutLimitGate().result).toBe("PASS");
    expect(evaluateAffiliatePayoutAuthorizationGate().result).toBe("PASS");
    expect(MERCURY_MODE).toBe("READ_ONLY");
    expect(UNRESTRICTED_MONEY_MOVEMENT).toBe("DISABLED");
    expect(unconfiguredPayoutProvider().mercury_mutation).toBe(false);
    expect(authorizeAffiliatePayout({
      economics_known: false,
      program_authorized: false,
      affiliate_eligible: false,
      destination_verified: false,
      provider_authorized: false,
      scoped_server_credential: false,
      hold_period_complete: false,
      fraud_clear: false,
      compliance_clear: false,
      within_limits: false,
      idempotent: true,
      reconciliation_ready: true,
      cloud_runtime_ready: false,
      financial_mutation_allowed: false,
      qc_mode: true,
    }).live).toBe(false);
    expect(cloudRuntimeReadyForAutomaticPayout()).toBe(false);
    expect(evaluateAffiliateCloudRuntimeReadinessGate().result).toBe("PASS");
  });

  it("50-58. OccupancyNPV first program uses real state and no fake production evidence", () => {
    const program = occupancyNpvAffiliateProgram();
    expect(program.venture_id).toBe(CRE_VENTURE_ID);
    expect(evaluateOccupancyNPVAffiliateProgramGate().result).toBe("PASS");
    expect(program.commission).toBe("PENDING_ECONOMICS");
    expect(occupancyNpvRecruitmentCategories().every((row) => !row.contacts_invented && !row.outreach_sent)).toBe(true);
    expect(productionAffiliatesCreated()).toBe(false);
    expect(evaluateAffiliateNoFakeEvidenceGate({}).result).toBe("PASS");
    const money = occupancyNpvFinancialLock();
    expect(money.verified_cash).toBe(50);
    expect(money.occupancynpv_allocation).toBe(25);
    expect(money.spend_authority).toBe(5);
    expect(money.committed).toBe(0);
    expect(money.mercury).toBe("READ_ONLY");
    expect(occupancyNpvPayoutBlockers().length).toBeGreaterThan(0);
    const learning = affiliateObservationsToSalesIntelligence([{
      observation_id: "aff-1",
      kind: "RECRUITMENT_CHANNEL",
      key: "cre-newsletter",
      converts: true,
      weight: 2,
    }]);
    expect(affiliateLearningReachesSalesIntelligence([{
      observation_id: "aff-1",
      kind: "RECRUITMENT_CHANNEL",
      key: "cre-newsletter",
      converts: true,
      weight: 2,
    }])).toBe(true);
    expect(learnFromSalesEvidence(learning).changes_priority).toBe(true);
    const ask = provisionAffiliateCapability({ venture_id: ASKREVIEW_VENTURE_ID, commercial: true });
    expect("capability_provisioned" in ask && ask.capability_provisioned).toBe(true);
  });

  it("1-20. attribution, economics, payout retries, and acquisition economics", () => {
    expect(clickCreatesNoCommission("CLICK")).toBe(true);
    expect(resolveAffiliateAttribution({
      affiliate_id: "a1",
      code: "CRE1",
      clicked_at: "2026-09-15T00:00:00.000Z",
      attribution_window_days: 30,
    }).code).toBe("CRE1");
    expect(commissionRequiresVerifiedConversion({
      checkout_start: true,
      conversion_verified: false,
      eligible: true,
    })).toBe(false);
    expect(commissionRequiresVerifiedConversion({
      conversion_verified: true,
      eligible: true,
    })).toBe(true);
    const first = processAffiliatePayout({
      commission_id: "c-retry",
      amount: 10,
      provider_confirmed: false,
    });
    const retry = retryAffiliatePayout({ commission_id: "c-retry", amount: 10 });
    expect(first.idempotency_key).toBe(retry.idempotency_key);
    const failed = processAffiliatePayout({
      commission_id: "c-fail",
      amount: 10,
      provider_confirmed: false,
      provider_failed: true,
    });
    expect(failed.state).toBe("PROVIDER_FAILURE");
    expect(failed.state).not.toBe("PAID");
    const economics = affiliateCommissionAcquisitionEconomics({
      attributed_revenue: "UNKNOWN",
      commission_accrued: 0,
      commission_payable: 0,
      commission_paid: 0,
      paid_acquisition: 0,
    });
    expect(economics.paid_acquisition).toBe(0);
    expect(economics.distinct_from_paid_acquisition).toBe(true);
    expect(commercializationPathIncludesAffiliate()).toBe(true);
  });

  it("39-40. successful proof survives manual-after-proof; termination before proof does not pass", () => {
    expect(evaluateAffiliateQcTerminationGate().result).toBe("PASS");
    expect(SALES_FLOOR_HQ_VISUAL_QC_RECORD).toEqual({
      qc_result: "PASS",
      process_termination: "MANUAL_AFTER_PROOF",
      proof_emitted: true,
    });
    expect(classifyQcTermination({
      proof_emitted: false,
      terminated: true,
      intentional: true,
    }).qc_result).toBe("INCOMPLETE");
    expect(evaluateAffiliateComplianceDisclosureGate().result).toBe("PASS");
    expect(evaluateAffiliateRefundChargebackGate().result).toBe("PASS");
    expect(evaluateAffiliateRecruitmentQualificationGate().result).toBe("PASS");
    expect(evaluateAffiliateProgramLegalCoverageGate().result).toBe("PASS");
    expect(appliedStatus()).toBe("SUBMITTED");
  });
});

function appliedStatus() {
  resetFixtureApplications();
  const applied = submitAffiliateApplication({
    name: "QC Fixture",
    email: "qc-fixture@example.test",
    agreement_accepted: true,
    production: false,
  });
  const status = applied.application?.status ?? "MISSING";
  resetFixtureApplications();
  return status;
}
