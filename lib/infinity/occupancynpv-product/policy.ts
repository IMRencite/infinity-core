import type { CustomerEntitlement } from "@/lib/infinity/fulfillment";
import {
  occupancynpvDurablePersistenceProven,
  occupancynpvProductProductionProven,
  readOccupancynpvProductionEvidence,
} from "@/lib/infinity/venture-operating-scale/occupancynpv-production-evidence";
import type { OccupancynpvProductStore } from "./store";

export const PROFESSIONAL_USAGE_POLICY = {
  status: "PASS" as const,
  code: "PROFESSIONAL_USAGE_POLICY_V1" as const,
  seats: 1,
  workspace_numerical_cap: null,
  unlimited_marketing_claim: false,
  multiple_seats: false,
  team_accounts: false,
  access_while: "PROFESSIONAL_ACCESS_ACTIVE" as const,
  create_requires: [
    "valid_entitlement",
    "customer_ownership",
    "system_security_constraints",
    "canonical_product_rules",
  ] as const,
  recommended: {
    seats: 1,
    workspace_cap: null,
    create_while_active: true,
  },
  enforced: "ONE_SEAT_ACTIVE_ENTITLEMENT_NO_NUMERIC_CAP" as const,
};

export const PROFESSIONAL_FAILED_PAYMENT_POLICY = {
  status: "PASS" as const,
  code: "PROFESSIONAL_FAILED_PAYMENT_POLICY_V1" as const,
  initial_state: "PAST_DUE" as const,
  paid_through_access_preserved: true,
  failure_count_threshold: null,
  end_of_paid_period: "EXPIRED" as const,
  no_invented_grace: true,
  suspend_after_n_failures: false,
  states: ["ACTIVE", "PAST_DUE", "SUSPENDED", "EXPIRED"] as const,
  architecture: {
    invoice_payment_failed: "PAST_DUE" as const,
    no_invented_grace: true,
    automatic_suspend: false,
  },
};

export const PROFESSIONAL_CANCELLATION_POLICY = {
  status: "PASS" as const,
  code: "PROFESSIONAL_CANCELLATION_POLICY_V1" as const,
  future_renewal_stopped: true,
  paid_through_access_preserved: true,
  immediate_entitlement_revocation: false,
  prorated_refund_from_cancellation_alone: false,
};

export const OCCUPANCYNPV_REFUND_POLICY = {
  status: "PASS" as const,
  code: "OCCUPANCYNPV_REFUND_POLICY_V1" as const,
  automatic_stripe_refund: false,
  applicable_law_exception: true,
  professional_initial: {
    window_calendar_days: 7,
    requires_no_workspace: true,
    after_workspace: "NON_REFUNDABLE" as const,
  },
  professional_renewal: "NON_REFUNDABLE_ONCE_COMPLETED" as const,
  per_deal_unused: {
    window_calendar_days: 7,
    requires_unused: true,
  },
  per_deal_consumed: "NON_REFUNDABLE" as const,
};

export function occupancynpvProductionPersistenceState() {
  const evidence = readOccupancynpvProductionEvidence();
  const durable = occupancynpvDurablePersistenceProven();
  return {
    status: durable ? "DURABLE" as const : "PARTIAL" as const,
    durable,
    migration: "20260907030000_occupancynpv_paid_product_v1.sql" as const,
    migration_applied: evidence?.tables_exist === true,
    executable_store: durable ? "SUPABASE" as const : "IN_PROCESS" as const,
    production_supabase_configured: evidence?.identity_verified === true,
    blocker: "OCCUPANCYNPV_PRODUCTION_PERSISTENCE_CONFIGURATION" as const,
  };
}

export function occupancynpvProductProductionVerificationState() {
  const evidence = readOccupancynpvProductionEvidence();
  const verified = occupancynpvProductProductionProven();
  return {
    status: verified ? "VERIFIED" as const : "UNVERIFIED" as const,
    paid_application_deployed: evidence?.paid_application_deployed === true,
    browser_verified: evidence?.browser_verified === true,
    tenant_isolation_production_verified: evidence?.tenant_isolation_verified === true,
    production_auth_backend: evidence?.production_auth_backend ?? "UNVERIFIED",
    customer_facing_ui_qc: "RenderedCustomerFacingPageGutterGate" as const,
    blocker: "OCCUPANCYNPV_PRODUCT_PRODUCTION_VERIFICATION" as const,
  };
}

export const OCCUPANCYNPV_PRODUCTION_PERSISTENCE = occupancynpvProductionPersistenceState();
export const OCCUPANCYNPV_PRODUCT_PRODUCTION_VERIFICATION = occupancynpvProductProductionVerificationState();

export const OCCUPANCYNPV_CUSTOMER_POLICY_COPY = {
  professionalSeat: "one authenticated user",
  professionalBilling: "annual",
  professionalCancel: "Cancellation stops future renewal",
  professionalPaidThrough: "access continues through the already-paid billing period",
  professionalInitialRefund: "within 7 calendar days of the initial purchase",
  professionalInitialCondition: "no DealWorkspace has yet been created",
  professionalRenewalRefund: "Renewal payments are non-refundable once the renewal has completed",
  perDealWorkspace: "one DealWorkspace",
  perDealCharge: "one-time",
  perDealUnusedRefund: "within 7 calendar days of purchase",
  perDealConsume: "first successful DealWorkspace allocation consumes",
} as const;

export type OccupancynpvBillingState =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED_THROUGH_PAID_PERIOD"
  | "EXPIRED"
  | "SUSPENDED";

export type OccupancynpvEntitlementOverlay = {
  entitlement_id: string;
  billing_state: OccupancynpvBillingState;
  paid_through: string | null;
  renewal_stopped: boolean;
  purchase_kind: "INITIAL" | "RENEWAL";
  initial_purchase_completed: boolean;
};

export type OccupancynpvRefundDecision = "ELIGIBLE" | "INELIGIBLE" | "REVIEW_REQUIRED";

export function calendarDaysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((end - start) / 86_400_000);
}

export function evaluateOccupancynpvRefundRequest(input: {
  offer: "PROFESSIONAL" | "PER_DEAL";
  purchaseKind: "INITIAL" | "RENEWAL";
  purchasedAt: string | null;
  now: string;
  workspaceAllocated: boolean | null;
  entitlementConsumed?: boolean | null;
  applicableLawClaimed?: boolean;
}): {
  decision: OccupancynpvRefundDecision;
  automatic_stripe_refund: false;
  applicable_law_exception: true;
  reason: string;
} {
  const base = {
    automatic_stripe_refund: false as const,
    applicable_law_exception: true as const,
  };
  if (!input.purchasedAt || input.workspaceAllocated === null) {
    return { ...base, decision: "REVIEW_REQUIRED", reason: "EVIDENCE_INCOMPLETE" };
  }
  if (input.applicableLawClaimed) {
    return { ...base, decision: "REVIEW_REQUIRED", reason: "APPLICABLE_LAW_REVIEW" };
  }
  if (input.offer === "PROFESSIONAL" && input.purchaseKind === "RENEWAL") {
    return { ...base, decision: "INELIGIBLE", reason: "RENEWAL_NON_REFUNDABLE" };
  }
  const withinWindow = calendarDaysBetween(input.purchasedAt, input.now) <= 7;
  if (input.offer === "PROFESSIONAL") {
    if (input.workspaceAllocated) {
      return { ...base, decision: "INELIGIBLE", reason: "WORKSPACE_CREATED" };
    }
    if (!withinWindow) {
      return { ...base, decision: "INELIGIBLE", reason: "WINDOW_EXPIRED" };
    }
    return { ...base, decision: "ELIGIBLE", reason: "INITIAL_UNUSED_WITHIN_7_DAYS" };
  }
  if (input.entitlementConsumed === true || input.workspaceAllocated) {
    return { ...base, decision: "INELIGIBLE", reason: "ENTITLEMENT_CONSUMED" };
  }
  if (!withinWindow) {
    return { ...base, decision: "INELIGIBLE", reason: "WINDOW_EXPIRED" };
  }
  return { ...base, decision: "ELIGIBLE", reason: "UNUSED_WITHIN_7_DAYS" };
}

export function defaultOccupancynpvBillingOverlay(
  entitlement: CustomerEntitlement,
): OccupancynpvEntitlementOverlay {
  return {
    entitlement_id: entitlement.entitlement_id,
    billing_state: entitlement.status === "PAST_DUE" ? "PAST_DUE" : "ACTIVE",
    paid_through: entitlement.expires_at,
    renewal_stopped: false,
    purchase_kind: "INITIAL",
    initial_purchase_completed: true,
  };
}

export function overlayFor(
  store: OccupancynpvProductStore,
  entitlement: CustomerEntitlement,
): OccupancynpvEntitlementOverlay {
  const existing = store.billing.get(entitlement.entitlement_id);
  if (existing) return existing;
  const created = defaultOccupancynpvBillingOverlay(entitlement);
  store.billing.set(entitlement.entitlement_id, created);
  return created;
}

export function reconcileOccupancynpvEntitlement(input: {
  entitlement: CustomerEntitlement;
  overlay: OccupancynpvEntitlementOverlay;
  now?: string;
}): CustomerEntitlement {
  const now = input.now ?? "2026-09-07T00:00:00.000Z";
  const paidThrough = input.overlay.paid_through ?? input.entitlement.expires_at;
  if (
    (input.entitlement.status === "ACTIVE" || input.entitlement.status === "PAST_DUE") &&
    paidThrough &&
    now >= paidThrough
  ) {
    input.entitlement.status = "EXPIRED";
    input.overlay.billing_state = "EXPIRED";
  }
  return input.entitlement;
}

export function professionalAccessAllowsUse(input: {
  entitlement: CustomerEntitlement;
  overlay: OccupancynpvEntitlementOverlay;
  now?: string;
}): boolean {
  reconcileOccupancynpvEntitlement(input);
  if (
    input.entitlement.status === "EXPIRED" ||
    input.entitlement.status === "REVOKED" ||
    input.entitlement.status === "SUSPENDED" ||
    input.entitlement.status === "FAILED"
  ) {
    return false;
  }
  if (input.entitlement.status !== "ACTIVE" && input.entitlement.status !== "PAST_DUE") {
    return false;
  }
  const paidThrough = input.overlay.paid_through ?? input.entitlement.expires_at;
  if (paidThrough && (input.now ?? "2026-09-07T00:00:00.000Z") >= paidThrough) {
    return false;
  }
  return true;
}

export function occupancynpvCustomerSurfacesAvoidUnlimited(text: string): boolean {
  return !/\bunlimited\b/i.test(text);
}
