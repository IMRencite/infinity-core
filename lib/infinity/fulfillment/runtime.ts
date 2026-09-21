import { createHash } from "node:crypto";
import type {
  CustomerEntitlement,
  CustomerIdentityReference,
  FulfillmentExecution,
  FulfillmentFailure,
  FulfillmentOrder,
  FulfillmentVerification,
  PaidTransactionRef,
  RecoveryOutcome,
} from "./types";

export type FulfillmentStore = {
  identities: Map<string, CustomerIdentityReference>;
  orders: Map<string, FulfillmentOrder>;
  entitlements: Map<string, CustomerEntitlement>;
  executions: Map<string, FulfillmentExecution>;
  failures: Map<string, FulfillmentFailure>;
  seenPaymentEvents: Set<string>;
};

export function createFulfillmentStore(): FulfillmentStore {
  return {
    identities: new Map(),
    orders: new Map(),
    entitlements: new Map(),
    executions: new Map(),
    failures: new Map(),
    seenPaymentEvents: new Set(),
  };
}

export function resolveCustomerIdentity(input: {
  store: FulfillmentStore;
  ventureId: string;
  customerIdentityId?: string | null;
  checkoutClientReferenceId?: string | null;
  providerCustomerRef?: string | null;
  email?: string | null;
}): { identity: CustomerIdentityReference | null; reason: string } {
  if (input.customerIdentityId && input.store.identities.has(input.customerIdentityId)) {
    return { identity: input.store.identities.get(input.customerIdentityId) ?? null, reason: "CANONICAL_ID" };
  }
  if (input.checkoutClientReferenceId) {
    const found = [...input.store.identities.values()].find(
      (row) => row.venture_id === input.ventureId && row.checkout_client_reference_id === input.checkoutClientReferenceId,
    );
    if (found) return { identity: found, reason: "CHECKOUT_CLIENT_REFERENCE" };
  }
  if (input.providerCustomerRef) {
    const found = [...input.store.identities.values()].find(
      (row) => row.venture_id === input.ventureId && row.provider_customer_ref === input.providerCustomerRef,
    );
    if (found) return { identity: found, reason: "PROVIDER_CUSTOMER_REF" };
  }
  void input.email;
  return { identity: null, reason: "EMAIL_IS_NOT_AUTHORIZATION" };
}

export function upsertCustomerIdentity(input: {
  store: FulfillmentStore;
  ventureId: string;
  customerIdentityId: string;
  checkoutClientReferenceId?: string | null;
  providerCustomerRef?: string | null;
  accountId?: string | null;
}): CustomerIdentityReference {
  const existing = input.store.identities.get(input.customerIdentityId);
  const identity: CustomerIdentityReference = {
    customer_identity_id: input.customerIdentityId,
    venture_id: input.ventureId,
    provider_customer_ref: input.providerCustomerRef ?? existing?.provider_customer_ref ?? null,
    checkout_client_reference_id: input.checkoutClientReferenceId ?? existing?.checkout_client_reference_id ?? null,
    account_id: input.accountId ?? existing?.account_id ?? null,
    email_is_not_authorization: true,
  };
  input.store.identities.set(identity.customer_identity_id, identity);
  return identity;
}

function orderIdFor(paymentReference: string, offerId: string): string {
  return `ford_${createHash("sha256").update(`${paymentReference}:${offerId}`).digest("hex").slice(0, 24)}`;
}

function entitlementIdFor(customerIdentityId: string, offerId: string, paymentReference: string): string {
  return `ent_${createHash("sha256").update(`${customerIdentityId}:${offerId}:${paymentReference}`).digest("hex").slice(0, 24)}`;
}

export function applyVerifiedPayment(input: {
  store: FulfillmentStore;
  ventureId: string;
  offerId: string;
  contractId: string;
  paymentReference: string;
  eventId: string;
  customerIdentityId: string;
  subscriptionReference?: string | null;
  entitlementType: string;
  resourceScope: string;
  quantity: number;
  recurring?: boolean;
  expiresAt?: string | null;
  now?: string;
  deliveryExecutorReady?: boolean;
}): {
  order: FulfillmentOrder;
  entitlement: CustomerEntitlement;
  duplicate: boolean;
  fulfilled: boolean;
  verification: FulfillmentVerification;
} {
  const now = input.now ?? "2026-09-07T00:00:00.000Z";
  const duplicate = input.store.seenPaymentEvents.has(input.eventId);
  input.store.seenPaymentEvents.add(input.eventId);
  const orderKey = orderIdFor(input.paymentReference, input.offerId);
  const existingOrder = input.store.orders.get(orderKey);
  const order: FulfillmentOrder = existingOrder ?? {
    order_id: orderKey,
    venture_id: input.ventureId,
    offer_id: input.offerId,
    customer_identity_id: input.customerIdentityId,
    payment_reference: input.paymentReference,
    contract_id: input.contractId,
    state: "FULFILLMENT_ORDER_CREATED",
    idempotency_key: input.eventId,
    created_at: now,
  };
  if (!existingOrder) input.store.orders.set(order.order_id, order);

  const existingEntitlement = [...input.store.entitlements.values()].find(
    (row) =>
      row.venture_id === input.ventureId &&
      row.customer_identity_id === input.customerIdentityId &&
      row.offer_id === input.offerId &&
      (input.recurring ? true : row.payment_reference === input.paymentReference),
  );
  const entitlement: CustomerEntitlement = existingEntitlement ?? {
    entitlement_id: entitlementIdFor(input.customerIdentityId, input.offerId, input.paymentReference),
    venture_id: input.ventureId,
    customer_identity_id: input.customerIdentityId,
    offer_id: input.offerId,
    payment_reference: input.paymentReference,
    subscription_reference: input.subscriptionReference ?? null,
    entitlement_type: input.entitlementType,
    resource_scope: input.resourceScope,
    quantity: input.quantity,
    quantity_remaining: input.recurring ? null : input.quantity,
    start_at: now,
    expires_at: input.expiresAt ?? null,
    status: "ACTIVE",
    consumed_at: null,
    revoked_at: null,
    source: "verified_payment",
    version: "1",
    traceability: order.order_id,
  };
  if (existingEntitlement && input.recurring && input.expiresAt) {
    existingEntitlement.expires_at = input.expiresAt;
    existingEntitlement.status = "ACTIVE";
    existingEntitlement.subscription_reference = input.subscriptionReference ?? existingEntitlement.subscription_reference;
  }
  input.store.entitlements.set(entitlement.entitlement_id, entitlement);

  const executorReady = input.deliveryExecutorReady === true;
  const verification: FulfillmentVerification = {
    verification_id: `ver_${order.order_id}`,
    order_id: order.order_id,
    method: "DELIVERY_AND_ACCESS_PROOF",
    proven: executorReady,
    reasons: executorReady ? [] : ["delivery_executor_unavailable"],
  };
  order.state = executorReady ? "FULFILLMENT_COMPLETE" : "FULFILLMENT_FAILED";
  if (!executorReady && !input.store.failures.has(order.order_id)) {
    input.store.failures.set(order.order_id, {
      failure_id: `fail_${order.order_id}`,
      order_id: order.order_id,
      reason: "DELIVERY_EXECUTOR_UNAVAILABLE",
      recovery: "CUSTOMER_SUPPORT_REQUIRED",
    });
  }
  return {
    order,
    entitlement,
    duplicate,
    fulfilled: order.state === "FULFILLMENT_COMPLETE",
    verification,
  };
}

export function consumeOneTimeEntitlement(input: {
  store: FulfillmentStore;
  entitlementId: string;
  customerIdentityId: string;
  now?: string;
}): { ok: boolean; reason: string; entitlement: CustomerEntitlement | null } {
  const entitlement = input.store.entitlements.get(input.entitlementId) ?? null;
  if (!entitlement) return { ok: false, reason: "ENTITLEMENT_MISSING", entitlement: null };
  if (entitlement.customer_identity_id !== input.customerIdentityId) {
    return { ok: false, reason: "CROSS_CUSTOMER_DENIED", entitlement };
  }
  if (entitlement.status === "CONSUMED" || (entitlement.quantity_remaining ?? 1) <= 0) {
    return { ok: false, reason: "ENTITLEMENT_CONSUMED", entitlement };
  }
  if (entitlement.status !== "ACTIVE") return { ok: false, reason: `ENTITLEMENT_${entitlement.status}`, entitlement };
  entitlement.quantity_remaining = (entitlement.quantity_remaining ?? 1) - 1;
  if ((entitlement.quantity_remaining ?? 0) <= 0) {
    entitlement.status = "CONSUMED";
    entitlement.consumed_at = input.now ?? "2026-09-07T00:00:00.000Z";
  }
  return { ok: true, reason: "ALLOCATED", entitlement };
}

export function applyRecurringPaymentPolicy(input: {
  store: FulfillmentStore;
  entitlementId: string;
  event: "invoice.paid" | "invoice.payment_failed" | "customer.subscription.deleted";
  periodEnd?: string | null;
  failedPaymentPolicy?: "REQUIRED" | "SUSPEND" | "NONE";
}): { ok: boolean; reason: string; entitlement: CustomerEntitlement | null } {
  const entitlement = input.store.entitlements.get(input.entitlementId) ?? null;
  if (!entitlement) return { ok: false, reason: "ENTITLEMENT_MISSING", entitlement: null };
  if (input.event === "invoice.paid") {
    entitlement.status = "ACTIVE";
    if (input.periodEnd) entitlement.expires_at = input.periodEnd;
    return { ok: true, reason: "RENEWED", entitlement };
  }
  if (input.event === "invoice.payment_failed") {
    if (input.failedPaymentPolicy !== "SUSPEND") {
      return { ok: false, reason: "PROFESSIONAL_FAILED_PAYMENT_POLICY_REQUIRED", entitlement };
    }
    entitlement.status = "SUSPENDED";
    return { ok: true, reason: "SUSPENDED", entitlement };
  }
  entitlement.status = "EXPIRED";
  entitlement.expires_at = input.periodEnd ?? entitlement.expires_at;
  return { ok: true, reason: "PERIOD_END_OR_CANCELLED", entitlement };
}

export function detectOrphanedPaidCustomers(input: {
  store: FulfillmentStore;
  payments: PaidTransactionRef[];
}): { count: number; orphans: string[] } {
  const orphans = input.payments
    .filter((row) => row.succeeded)
    .filter((row) => {
      const hasOrder = [...input.store.orders.values()].some((order) => order.payment_reference === row.payment_reference);
      const hasEntitlement = [...input.store.entitlements.values()].some(
        (entitlement) => entitlement.payment_reference === row.payment_reference,
      );
      const hasRecovery = [...input.store.failures.values()].some((failure) =>
        [...input.store.orders.values()].some(
          (order) => order.order_id === failure.order_id && order.payment_reference === row.payment_reference,
        ),
      );
      return !hasOrder && !hasEntitlement && !hasRecovery;
    })
    .map((row) => row.payment_reference);
  return { count: orphans.length, orphans };
}

export function fulfillmentMetrics(store: FulfillmentStore) {
  const entitlements = [...store.entitlements.values()];
  return {
    payments_confirmed: store.seenPaymentEvents.size,
    fulfillment_orders_created: store.orders.size,
    fulfillment_completed: [...store.orders.values()].filter((row) => row.state === "FULFILLMENT_COMPLETE").length,
    fulfillment_failed: [...store.orders.values()].filter((row) => row.state === "FULFILLMENT_FAILED").length,
    fulfillment_recovery_pending: store.failures.size,
    active_entitlements: entitlements.filter((row) => row.status === "ACTIVE").length,
    suspended_entitlements: entitlements.filter((row) => row.status === "SUSPENDED").length,
    expired_entitlements: entitlements.filter((row) => row.status === "EXPIRED").length,
    consumed_entitlements: entitlements.filter((row) => row.status === "CONSUMED").length,
    orphaned_paid_customers: 0,
  };
}

export function recoveryOutcomeForFailure(reason: string): RecoveryOutcome {
  if (reason === "DELIVERY_EXECUTOR_UNAVAILABLE") return "CUSTOMER_SUPPORT_REQUIRED";
  if (reason === "ENTITLEMENT_REPAIR") return "ENTITLEMENT_REPAIR";
  return "MANUAL_EXCEPTION";
}
