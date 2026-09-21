export const AFFILIATE_REFERRAL_CONTRACT = "AffiliateReferralContract" as const;
export const AFFILIATE_AND_REFERRAL_CAPABILITY = "AFFILIATE_AND_REFERRAL" as const;

export const AFFILIATE_PROGRAM_STATES = [
  "DRAFT",
  "ELIGIBILITY_REVIEW",
  "CONFIGURING",
  "READY",
  "ACTIVE",
  "ACTIVE_WITH_RESTRICTIONS",
  "PENDING_COMPLIANCE_REVIEW",
  "PENDING_ECONOMICS",
  "PENDING_PAYOUT_INFRASTRUCTURE",
  "PAUSED",
  "SUSPENDED",
  "NOT_ELIGIBLE",
  "CLOSED",
] as const;
export type AffiliateProgramState = (typeof AFFILIATE_PROGRAM_STATES)[number];

export const AFFILIATE_ATTRIBUTION_STATES = [
  "CLICK",
  "REFERRED",
  "LEAD",
  "CONVERSION_PENDING",
  "CONVERSION_VERIFIED",
  "HOLD_PERIOD",
  "COMMISSION_APPROVED",
  "PAYABLE",
  "QUEUED_FOR_PAYOUT",
  "PROCESSING",
  "PAID",
  "VOIDED",
  "REFUNDED",
  "CHARGEBACK",
  "DISPUTED",
  "FRAUD_REJECTED",
] as const;
export type AffiliateAttributionState = (typeof AFFILIATE_ATTRIBUTION_STATES)[number];

export const AFFILIATE_COMMISSION_MODELS = [
  "FIXED_AMOUNT",
  "PERCENT_OF_TRANSACTION",
  "PERCENT_OF_FIRST_PAYMENT",
  "PERCENT_OF_RECURRING_REVENUE",
  "PERCENT_OF_FIRST_YEAR_REVENUE",
  "TIERED",
  "QUALIFIED_LEAD",
  "QUALIFIED_DEMO",
  "CUSTOM_POLICY",
] as const;
export type AffiliateCommissionModel = (typeof AFFILIATE_COMMISSION_MODELS)[number];

export const AFFILIATE_APPLICATION_STATES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "MORE_INFO_REQUIRED",
  "SUSPENDED",
  "TERMINATED",
] as const;
export type AffiliateApplicationState = (typeof AFFILIATE_APPLICATION_STATES)[number];

export const AFFILIATE_PAYOUT_PROCESSING_STATES = [
  "FAILED",
  "RETRY_ELIGIBLE",
  "PROVIDER_FAILURE",
  "DESTINATION_INVALID",
  "COMPLIANCE_HOLD",
  "FRAUD_HOLD",
] as const;
export type AffiliatePayoutProcessingState =
  | AffiliateAttributionState
  | (typeof AFFILIATE_PAYOUT_PROCESSING_STATES)[number];

export const AFFILIATE_PAYOUT_STATES = [
  "LIVE_AUTOMATIC_PAYOUT",
  "PAYOUT_READY_ARCHITECTURE",
  "PENDING_PAYOUT_INFRASTRUCTURE",
  "PENDING_ECONOMICS",
  "PENDING_COMPLIANCE_REVIEW",
  "NOT_ELIGIBLE",
] as const;
export type AffiliatePayoutState = (typeof AFFILIATE_PAYOUT_STATES)[number];

export const COMMERCIAL_VENTURE_AFFILIATE_COVERAGE_GATE = "CommercialVentureAffiliateCoverageGate" as const;
export const AFFILIATE_PROGRAM_ELIGIBILITY_GATE = "AffiliateProgramEligibilityGate" as const;
export const AFFILIATE_COMMISSION_ECONOMICS_GATE = "AffiliateCommissionEconomicsGate" as const;
export const AFFILIATE_ATTRIBUTION_TRUTH_GATE = "AffiliateAttributionTruthGate" as const;
export const AFFILIATE_CONVERSION_VERIFICATION_GATE = "AffiliateConversionVerificationGate" as const;
export const AFFILIATE_FRAUD_GATE = "AffiliateFraudGate" as const;
export const AFFILIATE_SELF_REFERRAL_GATE = "AffiliateSelfReferralGate" as const;
export const AFFILIATE_DUPLICATE_ATTRIBUTION_GATE = "AffiliateDuplicateAttributionGate" as const;
export const AFFILIATE_COMMISSION_ELIGIBILITY_GATE = "AffiliateCommissionEligibilityGate" as const;
export const AFFILIATE_HOLD_PERIOD_GATE = "AffiliateHoldPeriodGate" as const;
export const AFFILIATE_PAYOUT_AUTHORIZATION_GATE = "AffiliatePayoutAuthorizationGate" as const;
export const AFFILIATE_PAYOUT_LIMIT_GATE = "AffiliatePayoutLimitGate" as const;
export const AFFILIATE_PAYOUT_IDEMPOTENCY_GATE = "AffiliatePayoutIdempotencyGate" as const;
export const AFFILIATE_PAYOUT_RECONCILIATION_GATE = "AffiliatePayoutReconciliationGate" as const;
export const AFFILIATE_TAX_COMPLIANCE_GATE = "AffiliateTaxComplianceGate" as const;
export const AFFILIATE_TERMS_COMPLETENESS_GATE = "AffiliateTermsCompletenessGate" as const;
export const AFFILIATE_CUSTOMER_PRIVACY_GATE = "AffiliateCustomerPrivacyGate" as const;
export const AFFILIATE_PUBLIC_PRIVACY_GATE = "AffiliatePublicPrivacyGate" as const;
export const AFFILIATE_UNKNOWN_NOT_ZERO_GATE = "AffiliateUnknownNotZeroGate" as const;
export const AFFILIATE_NO_FAKE_EVIDENCE_GATE = "AffiliateNoFakeEvidenceGate" as const;
export const AFFILIATE_CLOUD_RUNTIME_READINESS_GATE = "AffiliateCloudRuntimeReadinessGate" as const;
export const OCCUPANCYNPV_AFFILIATE_PROGRAM_GATE = "OccupancyNPVAffiliateProgramGate" as const;
export const AFFILIATE_COMPLIANCE_DISCLOSURE_GATE = "AffiliateComplianceDisclosureGate" as const;
export const AFFILIATE_PROGRAM_LEGAL_COVERAGE_GATE = "AffiliateProgramLegalCoverageGate" as const;
export const AFFILIATE_REFUND_CHARGEBACK_GATE = "AffiliateRefundChargebackGate" as const;
export const AFFILIATE_RECRUITMENT_QUALIFICATION_GATE = "AffiliateRecruitmentQualificationGate" as const;
export const AFFILIATE_QC_TERMINATION_GATE = "AffiliateQcTerminationGate" as const;

export const REQUIRED_AFFILIATE_TERM_SECTIONS = [
  "eligibility",
  "application",
  "approval",
  "commissions",
  "attribution",
  "hold periods",
  "refunds",
  "chargebacks",
  "fraud",
  "prohibited",
  "disclosure",
  "brand",
  "intellectual property",
  "payment",
  "tax",
  "payout",
  "threshold",
  "suspension",
  "termination",
  "forfeiture",
  "program changes",
  "disclaimer",
  "contact",
] as const;

export const OCCUPANCYNPV_AFFILIATE_RECRUITMENT_CATEGORIES = [
  "commercial real-estate consultants",
  "tenant-rep professionals",
  "CRE educators",
  "CRE newsletters",
  "commercial brokerage professionals",
  "commercial property creators",
  "finance and modeling educators",
  "industry communities",
] as const;
