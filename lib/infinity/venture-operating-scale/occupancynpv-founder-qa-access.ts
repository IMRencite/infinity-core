import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const OCCUPANCYNPV_FOUNDER_QA_GRANT_PATH =
  ".infinity/venture-operating-scale/occupancynpv-founder-qa-grant.json" as const;

export const OCCUPANCYNPV_INTERNAL_QA_OFFER = "INTERNAL_QA" as const;
export const OCCUPANCYNPV_INTERNAL_QA_ENTITLEMENT = "INTERNAL_QA_ACCESS" as const;
export const OCCUPANCYNPV_INTERNAL_QA_PAYMENT_PREFIX = "internal_qa_" as const;
export const OCCUPANCYNPV_FOUNDER_QA_CANDIDATE_EMAIL = "infinitemediaresources@gmail.com" as const;

export type OccupancynpvFounderQaGrant = {
  grant_id: string;
  venture: "OccupancyNPV";
  entitlement_type: typeof OCCUPANCYNPV_INTERNAL_QA_ENTITLEMENT;
  offer_id: typeof OCCUPANCYNPV_INTERNAL_QA_OFFER;
  candidate_email: typeof OCCUPANCYNPV_FOUNDER_QA_CANDIDATE_EMAIL;
  auth_identity_id: string | null;
  customer_id: string | null;
  status: "ACTIVE" | "REVOKED" | "PENDING_BIND";
  commercial_purchase: false;
  revenue_usd: 0;
  stripe_payment: "NONE";
  paid_customer: false;
  fulfillment_revenue_attribution: "EXCLUDED";
  authority: string;
  created_at: string;
  bound_at: string | null;
  revoked_at: string | null;
  public_discovery: false;
};

export function occupancynpvInternalQaPaymentReference(grantId: string): string {
  return `${OCCUPANCYNPV_INTERNAL_QA_PAYMENT_PREFIX}${grantId}`;
}

export function isOccupancynpvInternalQaPaymentReference(reference: string | null | undefined): boolean {
  return Boolean(reference?.startsWith(OCCUPANCYNPV_INTERNAL_QA_PAYMENT_PREFIX));
}

export function occupancynpvEntitlementIsCommercial(input: {
  offer_id?: string | null;
  entitlement_type?: string | null;
  payment_reference?: string | null;
}): boolean {
  if (input.offer_id === OCCUPANCYNPV_INTERNAL_QA_OFFER) return false;
  if (input.entitlement_type === OCCUPANCYNPV_INTERNAL_QA_ENTITLEMENT) return false;
  if (isOccupancynpvInternalQaPaymentReference(input.payment_reference)) return false;
  return true;
}

export function defaultOccupancynpvFounderQaGrant(now = new Date().toISOString()): OccupancynpvFounderQaGrant {
  return {
    grant_id: "qa_occupancynpv_founder_v1",
    venture: "OccupancyNPV",
    entitlement_type: OCCUPANCYNPV_INTERNAL_QA_ENTITLEMENT,
    offer_id: OCCUPANCYNPV_INTERNAL_QA_OFFER,
    candidate_email: OCCUPANCYNPV_FOUNDER_QA_CANDIDATE_EMAIL,
    auth_identity_id: null,
    customer_id: null,
    status: "ACTIVE",
    commercial_purchase: false,
    revenue_usd: 0,
    stripe_payment: "NONE",
    paid_customer: false,
    fulfillment_revenue_attribution: "EXCLUDED",
    authority: "Founder-authorized INTERNAL_QA_ACCESS for production product inspection after public launch. Authentication required. Payment not required. Email is a candidate identity and is not authorization by itself.",
    created_at: now,
    bound_at: null,
    revoked_at: null,
    public_discovery: false,
  };
}

export function readOccupancynpvFounderQaGrant(): OccupancynpvFounderQaGrant | null {
  if (!existsSync(OCCUPANCYNPV_FOUNDER_QA_GRANT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_FOUNDER_QA_GRANT_PATH, "utf8")) as OccupancynpvFounderQaGrant;
  } catch {
    return null;
  }
}

export function persistOccupancynpvFounderQaGrant(grant: OccupancynpvFounderQaGrant) {
  mkdirSync(dirname(OCCUPANCYNPV_FOUNDER_QA_GRANT_PATH), { recursive: true });
  writeFileSync(OCCUPANCYNPV_FOUNDER_QA_GRANT_PATH, `${JSON.stringify(grant, null, 2)}\n`);
  return grant;
}

export function occupancynpvFounderQaSessionEligible(input: {
  email: string;
  authIdentityId: string;
  grant?: OccupancynpvFounderQaGrant | null;
}): boolean {
  const grant = input.grant ?? readOccupancynpvFounderQaGrant() ?? defaultOccupancynpvFounderQaGrant();
  if (grant.status === "REVOKED") return false;
  if (grant.auth_identity_id && grant.auth_identity_id === input.authIdentityId) return true;
  return grant.status === "ACTIVE"
    && input.email.trim().toLowerCase() === grant.candidate_email
    && Boolean(input.authIdentityId);
}

export function bindOccupancynpvFounderQaIdentity(input: {
  authIdentityId: string;
  customerId: string;
  email: string;
  now?: string;
}): OccupancynpvFounderQaGrant {
  const now = input.now ?? new Date().toISOString();
  const prior = readOccupancynpvFounderQaGrant() ?? defaultOccupancynpvFounderQaGrant(now);
  if (prior.status === "REVOKED") return prior;
  if (!occupancynpvFounderQaSessionEligible({ email: input.email, authIdentityId: input.authIdentityId, grant: prior })) {
    return prior;
  }
  return persistOccupancynpvFounderQaGrant({
    ...prior,
    auth_identity_id: input.authIdentityId,
    customer_id: input.customerId,
    bound_at: prior.bound_at ?? now,
    status: "ACTIVE",
  });
}

export function revokeOccupancynpvFounderQaGrant(now = new Date().toISOString()): OccupancynpvFounderQaGrant {
  const prior = readOccupancynpvFounderQaGrant() ?? defaultOccupancynpvFounderQaGrant(now);
  return persistOccupancynpvFounderQaGrant({
    ...prior,
    status: "REVOKED",
    revoked_at: now,
  });
}

export function occupancynpvFounderQaHqProjection() {
  const grant = readOccupancynpvFounderQaGrant() ?? defaultOccupancynpvFounderQaGrant();
  return {
    founderQaAccess: grant.status === "REVOKED" ? "REVOKED" as const : "AVAILABLE" as const,
    entitlement: OCCUPANCYNPV_INTERNAL_QA_ENTITLEMENT,
    identityResolved: Boolean(grant.auth_identity_id),
    candidateEmail: grant.candidate_email,
    paymentRequired: false,
    publicBypass: false,
    loginUrl: "https://occupancynpv.com/occupancynpv/app/login",
    appUrl: "https://occupancynpv.com/occupancynpv/app",
  };
}
