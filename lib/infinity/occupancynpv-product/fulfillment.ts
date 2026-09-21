import { applyVerifiedPayment, detectOrphanedPaidCustomers } from "@/lib/infinity/fulfillment";
import { occupancynpvPerDealOffer, occupancynpvProfessionalOffer } from "@/lib/infinity/venture-operating-scale/occupancynpv-fulfillment";
import { linkStripeCustomer } from "./customers";
import {
  overlayFor,
  PROFESSIONAL_CANCELLATION_POLICY,
  PROFESSIONAL_FAILED_PAYMENT_POLICY,
  reconcileOccupancynpvEntitlement,
} from "./policy";
import type { OccupancynpvProductStore } from "./store";

export function fulfillOccupancynpvVerifiedPayment(input: {
  store: OccupancynpvProductStore;
  offerId: "PROFESSIONAL" | "PER_DEAL";
  customerId: string;
  paymentReference: string;
  eventId: string;
  subscriptionReference?: string | null;
  stripeCustomerId?: string | null;
  expiresAt?: string | null;
  periodEnd?: string | null;
}) {
  if (!input.store.customers.has(input.customerId)) return { ok: false as const, reason: "CUSTOMER_MISSING" };
  if (input.stripeCustomerId) linkStripeCustomer(input.store, input.customerId, input.stripeCustomerId);
  const offer = input.offerId === "PROFESSIONAL" ? occupancynpvProfessionalOffer() : occupancynpvPerDealOffer();
  const applied = applyVerifiedPayment({
    store: input.store.fulfillment,
    ventureId: "occupancynpv",
    offerId: input.offerId,
    contractId: offer.fulfillment_contract_id,
    paymentReference: input.paymentReference,
    eventId: input.eventId,
    customerIdentityId: input.customerId,
    subscriptionReference: input.subscriptionReference,
    entitlementType: input.offerId === "PROFESSIONAL" ? "PROFESSIONAL_ACCESS" : "ONE_DEAL_WORKSPACE",
    resourceScope: input.offerId === "PROFESSIONAL" ? "occupancynpv.application" : "occupancynpv.deal_workspace",
    quantity: 1,
    recurring: input.offerId === "PROFESSIONAL",
    expiresAt: input.expiresAt ?? input.periodEnd,
    deliveryExecutorReady: input.offerId === "PROFESSIONAL",
  });
  if (input.offerId === "PER_DEAL" && applied.entitlement.status === "ACTIVE") {
    applied.order.state = "ENTITLEMENT_ACTIVE";
    applied.verification.proven = false;
    applied.verification.reasons = ["workspace_allocation_pending"];
    input.store.fulfillment.failures.delete(applied.order.order_id);
  }
  if (input.offerId === "PROFESSIONAL") {
    const overlay = overlayFor(input.store, applied.entitlement);
    overlay.billing_state = "ACTIVE";
    overlay.paid_through = applied.entitlement.expires_at;
    overlay.renewal_stopped = false;
    if (!applied.duplicate) {
      overlay.purchase_kind = "INITIAL";
      overlay.initial_purchase_completed = true;
    }
    input.store.billing.set(applied.entitlement.entitlement_id, overlay);
  }
  return { ok: true as const, ...applied };
}

export function applyOccupancynpvSubscriptionEvent(input: {
  store: OccupancynpvProductStore;
  entitlementId: string;
  event: "invoice.paid" | "invoice.payment_failed" | "customer.subscription.deleted";
  periodEnd?: string | null;
  now?: string;
}) {
  const entitlement = input.store.fulfillment.entitlements.get(input.entitlementId);
  if (!entitlement) return { ok: false as const, reason: "ENTITLEMENT_MISSING", entitlement: null };
  const overlay = overlayFor(input.store, entitlement);

  if (input.event === "invoice.paid") {
    entitlement.status = "ACTIVE";
    if (input.periodEnd) entitlement.expires_at = input.periodEnd;
    overlay.billing_state = "ACTIVE";
    overlay.paid_through = input.periodEnd ?? overlay.paid_through;
    overlay.renewal_stopped = false;
    if (overlay.initial_purchase_completed) overlay.purchase_kind = "RENEWAL";
    overlay.initial_purchase_completed = true;
    input.store.billing.set(entitlement.entitlement_id, overlay);
    return { ok: true as const, reason: "RENEWED", entitlement, billing_state: overlay.billing_state, policy: PROFESSIONAL_FAILED_PAYMENT_POLICY };
  }

  if (input.event === "invoice.payment_failed") {
    entitlement.status = "PAST_DUE";
    overlay.billing_state = "PAST_DUE";
    input.store.billing.set(entitlement.entitlement_id, overlay);
    reconcileOccupancynpvEntitlement({ entitlement, overlay, now: input.now });
    return {
      ok: true as const,
      reason: PROFESSIONAL_FAILED_PAYMENT_POLICY.code,
      entitlement,
      state: overlay.billing_state,
      billing_state: overlay.billing_state,
      policy: PROFESSIONAL_FAILED_PAYMENT_POLICY,
    };
  }

  overlay.renewal_stopped = true;
  overlay.billing_state = "CANCELLED_THROUGH_PAID_PERIOD";
  if (input.periodEnd) {
    entitlement.expires_at = input.periodEnd;
    overlay.paid_through = input.periodEnd;
  }
  if (entitlement.status !== "EXPIRED" && entitlement.status !== "REVOKED") {
    entitlement.status = "ACTIVE";
  }
  reconcileOccupancynpvEntitlement({ entitlement, overlay, now: input.now });
  input.store.billing.set(entitlement.entitlement_id, overlay);
  return {
    ok: true as const,
    reason: PROFESSIONAL_CANCELLATION_POLICY.code,
    entitlement,
    renewal_stopped: true,
    billing_state: overlay.billing_state,
    policy: PROFESSIONAL_CANCELLATION_POLICY,
  };
}

export function occupancynpvOrphans(store: OccupancynpvProductStore, paymentReferences: string[]) {
  return detectOrphanedPaidCustomers({
    store: store.fulfillment,
    payments: paymentReferences.map((payment_reference) => ({
      payment_reference,
      venture_id: "occupancynpv",
      customer_identity_id: null,
      offer_id: null,
      succeeded: true,
      confirmed_at: "2026-09-07T00:00:00.000Z",
    })),
  });
}
