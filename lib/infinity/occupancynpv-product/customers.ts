import { upsertCustomerIdentity } from "@/lib/infinity/fulfillment";
import { hashPassword, newId, nowIso, passwordsMatch, type OccupancynpvProductStore } from "./store";
import type { OccupancynpvAuthSession, OccupancynpvCustomer } from "./types";

export function createOccupancynpvAccount(input: {
  store: OccupancynpvProductStore;
  email: string;
  password: string;
  now?: string;
}): { ok: true; customer: OccupancynpvCustomer; session: OccupancynpvAuthSession } | { ok: false; reason: string } {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || input.password.length < 8) return { ok: false, reason: "INVALID_ACCOUNT_FIELDS" };
  if ([...input.store.auth.values()].some((row) => row.email === email)) return { ok: false, reason: "EMAIL_IN_USE" };
  const authIdentityId = newId("auth");
  const customerId = newId("cust");
  const created = nowIso(input.now);
  input.store.auth.set(authIdentityId, { auth_identity_id: authIdentityId, email, password_hash: hashPassword(input.password) });
  const customer: OccupancynpvCustomer = {
    customer_id: customerId,
    venture_id: "occupancynpv",
    auth_identity_id: authIdentityId,
    email,
    status: "ACTIVE",
    stripe_customer_id: null,
    created_at: created,
    updated_at: created,
  };
  input.store.customers.set(customerId, customer);
  upsertCustomerIdentity({
    store: input.store.fulfillment,
    ventureId: "occupancynpv",
    customerIdentityId: customerId,
    checkoutClientReferenceId: customerId,
    accountId: authIdentityId,
  });
  const session: OccupancynpvAuthSession = { auth_identity_id: authIdentityId, customer_id: customerId, email };
  input.store.sessions.set(authIdentityId, session);
  return { ok: true, customer, session };
}

export function signInOccupancynpv(input: {
  store: OccupancynpvProductStore;
  email: string;
  password: string;
}): { ok: true; session: OccupancynpvAuthSession } | { ok: false; reason: string } {
  const email = input.email.trim().toLowerCase();
  const auth = [...input.store.auth.values()].find((row) => row.email === email);
  if (!auth || !passwordsMatch(input.password, auth.password_hash)) return { ok: false, reason: "INVALID_CREDENTIALS" };
  const customer = [...input.store.customers.values()].find((row) => row.auth_identity_id === auth.auth_identity_id);
  if (!customer || customer.status !== "ACTIVE") return { ok: false, reason: "CUSTOMER_DISABLED" };
  const session: OccupancynpvAuthSession = {
    auth_identity_id: auth.auth_identity_id,
    customer_id: customer.customer_id,
    email: customer.email,
  };
  input.store.sessions.set(auth.auth_identity_id, session);
  return { ok: true, session };
}

export function signOutOccupancynpv(store: OccupancynpvProductStore, authIdentityId: string): void {
  store.sessions.delete(authIdentityId);
}

export function resolveOccupancynpvSession(
  store: OccupancynpvProductStore,
  authIdentityId?: string | null,
): OccupancynpvAuthSession | null {
  if (!authIdentityId) return null;
  return store.sessions.get(authIdentityId) ?? null;
}

export function linkStripeCustomer(store: OccupancynpvProductStore, customerId: string, stripeCustomerId: string): OccupancynpvCustomer | null {
  const customer = store.customers.get(customerId);
  if (!customer) return null;
  customer.stripe_customer_id = stripeCustomerId;
  customer.updated_at = nowIso();
  upsertCustomerIdentity({
    store: store.fulfillment,
    ventureId: "occupancynpv",
    customerIdentityId: customerId,
    providerCustomerRef: stripeCustomerId,
    checkoutClientReferenceId: customerId,
    accountId: customer.auth_identity_id,
  });
  return customer;
}
