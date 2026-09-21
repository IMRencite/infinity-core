import type { AffiliatePayout, AffiliatePayoutLimits, AffiliatePayoutProvider } from "./types";

export const UNRESTRICTED_MONEY_MOVEMENT = "DISABLED" as const;
export const MERCURY_MODE = "READ_ONLY" as const;

export function unconfiguredPayoutProvider(): AffiliatePayoutProvider {
  return {
    provider_id: "provider:unconfigured",
    kind: "UNCONFIGURED",
    authorized: false,
    mercury_mutation: false,
  };
}

export function defaultPayoutLimits(): AffiliatePayoutLimits {
  return {
    per_affiliate_maximum: "UNKNOWN",
    per_payout_maximum: "UNKNOWN",
    batch_maximum: "UNKNOWN",
    daily_maximum: "UNKNOWN",
    weekly_maximum: "UNKNOWN",
    monthly_maximum: "UNKNOWN",
    commission_percentage_ceiling: "UNKNOWN",
    venture_specific_ceiling: 5,
    new_affiliate_hold: true,
    fraud_hold: true,
    manual_escalation_threshold: "UNKNOWN",
  };
}

export function authorizeAffiliatePayout(input: {
  economics_known: boolean;
  program_authorized: boolean;
  affiliate_eligible: boolean;
  destination_verified: boolean;
  provider_authorized: boolean;
  scoped_server_credential: boolean;
  hold_period_complete: boolean;
  fraud_clear: boolean;
  compliance_clear: boolean;
  within_limits: boolean;
  idempotent: boolean;
  reconciliation_ready: boolean;
  cloud_runtime_ready: boolean;
  financial_mutation_allowed: boolean;
  qc_mode?: boolean;
}): { authorized: false; live: false; blockers: string[] } {
  const blockers: string[] = [];
  if (!input.economics_known) blockers.push("PENDING_ECONOMICS");
  if (!input.program_authorized) blockers.push("PROGRAM_NOT_AUTHORIZED");
  if (!input.affiliate_eligible) blockers.push("AFFILIATE_NOT_ELIGIBLE");
  if (!input.destination_verified) blockers.push("PAYOUT_DESTINATION_UNVERIFIED");
  if (!input.provider_authorized) blockers.push("PROVIDER_NOT_AUTHORIZED");
  if (!input.scoped_server_credential) blockers.push("SCOPED_CREDENTIAL_MISSING");
  if (!input.hold_period_complete) blockers.push("HOLD_PERIOD");
  if (!input.fraud_clear) blockers.push("FRAUD_HOLD");
  if (!input.compliance_clear) blockers.push("COMPLIANCE_TAX");
  if (!input.within_limits) blockers.push("PAYOUT_LIMIT");
  if (!input.idempotent) blockers.push("IDEMPOTENCY");
  if (!input.reconciliation_ready) blockers.push("RECONCILIATION");
  if (!input.cloud_runtime_ready) blockers.push("CLOUD_RUNTIME");
  if (!input.financial_mutation_allowed) blockers.push("FINANCIAL_MUTATION_DISABLED");
  if (input.qc_mode) blockers.push("QC_NO_LIVE_PAYOUT");
  return { authorized: false, live: false, blockers };
}

export function payoutIdempotencyKey(commissionId: string): string {
  return `affiliate-payout:${commissionId}`;
}

export function processAffiliatePayout(input: {
  commission_id: string;
  amount: number;
  provider_confirmed: boolean;
  provider_failed?: boolean;
  already_paid?: boolean;
  qc_mode?: boolean;
}): AffiliatePayout {
  const key = payoutIdempotencyKey(input.commission_id);
  if (input.qc_mode || input.already_paid) {
    return {
      payout_id: `payout:${input.commission_id}`,
      commission_id: input.commission_id,
      amount: input.amount,
      state: input.already_paid ? "PAID" : "VOIDED",
      provider_reference: null,
      idempotency_key: key,
    };
  }
  if (input.provider_failed) {
    return {
      payout_id: `payout:${input.commission_id}`,
      commission_id: input.commission_id,
      amount: input.amount,
      state: "PROVIDER_FAILURE",
      provider_reference: null,
      idempotency_key: key,
    };
  }
  if (!input.provider_confirmed) {
    return {
      payout_id: `payout:${input.commission_id}`,
      commission_id: input.commission_id,
      amount: input.amount,
      state: "PROCESSING",
      provider_reference: null,
      idempotency_key: key,
    };
  }
  return {
    payout_id: `payout:${input.commission_id}`,
    commission_id: input.commission_id,
    amount: input.amount,
    state: "PAID",
    provider_reference: `provider:${input.commission_id}`,
    idempotency_key: key,
  };
}

export function providerFailureCannotMarkPaid(payout: AffiliatePayout): boolean {
  return payout.state !== "PAID" || Boolean(payout.provider_reference);
}

export function reconcileAffiliatePayout(input: {
  payout: AffiliatePayout;
  provider_reference: string | null;
}): { reconciled: boolean; state: AffiliatePayout["state"] } {
  if (input.payout.state === "PAID" && !input.provider_reference) {
    return { reconciled: false, state: "DISPUTED" };
  }
  if (input.payout.state === "PAID" && input.provider_reference === input.payout.provider_reference) {
    return { reconciled: true, state: "PAID" };
  }
  return { reconciled: false, state: input.payout.state };
}

export function payoutExceedsLimit(amount: number, ceiling: number | "UNKNOWN"): boolean {
  if (ceiling === "UNKNOWN") return true;
  return amount > ceiling;
}

export function retryAffiliatePayout(input: {
  commission_id: string;
  amount: number;
}): ReturnType<typeof processAffiliatePayout> {
  return processAffiliatePayout({
    commission_id: input.commission_id,
    amount: input.amount,
    provider_confirmed: false,
    already_paid: false,
  });
}

export function occupancyNpvPayoutState(): "PENDING_ECONOMICS" {
  return "PENDING_ECONOMICS";
}

export function cloudRuntimeReadyForAutomaticPayout(): false {
  return false;
}
