import { createAskReviewAccount, resolveAskReviewSession, signInAskReview, signOutAskReview } from "./customers";
import {
  ASKREVIEW_JSON_PRODUCTION_FALLBACK,
  askreviewMustUseProductionPersistence,
  askreviewProductionPersistenceEnabled,
  durableCreateKit,
  durableCreateLocation,
  durableGetLocation,
  durableListKits,
  durableListLocations,
  durablePatchLocation,
  durableSession,
  durableSignin,
  durableSignout,
  durableSignup,
} from "./durable";
import { fulfillAskReviewKit } from "./fulfillment";
import { createAskReviewKit, createAskReviewLocation, getAskReviewLocation, listAskReviewLocations, listKitsForLocation, patchAskReviewLocation } from "./locations";
import type { AskReviewAccount } from "./types";

export type AskReviewResolvedAccount = {
  accountId: string;
  email: string;
  qaAccess: boolean;
};

export function askReviewUsesProductionPersistence(): boolean {
  return askreviewProductionPersistenceEnabled();
}

export function askReviewJsonProductionFallback(): typeof ASKREVIEW_JSON_PRODUCTION_FALLBACK {
  return ASKREVIEW_JSON_PRODUCTION_FALLBACK;
}

export async function repoSignup(input: { email: string; password: string }) {
  if (askreviewMustUseProductionPersistence()) {
    if (!askreviewProductionPersistenceEnabled()) return { ok: false as const, reason: "PRODUCTION_PERSISTENCE_UNAVAILABLE" };
    return durableSignup(input);
  }
  return createAskReviewAccount(input);
}

export async function repoSignin(input: { email: string; password: string }) {
  if (askreviewMustUseProductionPersistence()) {
    if (!askreviewProductionPersistenceEnabled()) return { ok: false as const, reason: "PRODUCTION_PERSISTENCE_UNAVAILABLE" };
    return durableSignin(input);
  }
  return signInAskReview(input);
}

export async function repoSignout(sessionId: string | null | undefined) {
  if (askreviewMustUseProductionPersistence()) {
    if (askreviewProductionPersistenceEnabled()) await durableSignout();
    return;
  }
  signOutAskReview(sessionId);
}

export async function repoResolveAccount(sessionId: string | null | undefined): Promise<AskReviewResolvedAccount | null> {
  if (askreviewMustUseProductionPersistence()) {
    if (!askreviewProductionPersistenceEnabled()) return null;
    const session = await durableSession();
    if (!session) return null;
    return { accountId: session.accountId, email: session.email, qaAccess: session.qaAccess };
  }
  const account = resolveAskReviewSession(sessionId);
  return account ? { accountId: account.accountId, email: account.email, qaAccess: account.qaAccess } : null;
}

export async function repoListLocations(input: Parameters<typeof listAskReviewLocations>[0]) {
  if (askreviewMustUseProductionPersistence()) {
    if (!askreviewProductionPersistenceEnabled()) throw new Error("PRODUCTION_PERSISTENCE_UNAVAILABLE");
    return durableListLocations(input);
  }
  return listAskReviewLocations(input);
}

export async function repoCreateLocation(input: Parameters<typeof createAskReviewLocation>[0]) {
  if (askreviewMustUseProductionPersistence()) {
    if (!askreviewProductionPersistenceEnabled()) return { ok: false as const, reason: "PRODUCTION_PERSISTENCE_UNAVAILABLE" };
    return durableCreateLocation(input);
  }
  return createAskReviewLocation(input);
}

export async function repoGetLocation(accountId: string, locationId: string) {
  if (askreviewMustUseProductionPersistence()) {
    if (!askreviewProductionPersistenceEnabled()) return null;
    return durableGetLocation(accountId, locationId);
  }
  return getAskReviewLocation(accountId, locationId);
}

export async function repoPatchLocation(input: Parameters<typeof patchAskReviewLocation>[0]) {
  if (askreviewMustUseProductionPersistence()) {
    if (!askreviewProductionPersistenceEnabled()) return null;
    return durablePatchLocation(input);
  }
  return patchAskReviewLocation(input);
}

export async function repoListKits(accountId: string, locationId: string) {
  if (askreviewMustUseProductionPersistence()) {
    if (!askreviewProductionPersistenceEnabled()) return [];
    return durableListKits(accountId, locationId);
  }
  return listKitsForLocation(accountId, locationId);
}

export async function repoFulfillKit(input: { accountId: string; locationId: string }) {
  if (askreviewMustUseProductionPersistence()) {
    if (!askreviewProductionPersistenceEnabled()) {
      return { ok: false as const, reason: "PRODUCTION_PERSISTENCE_UNAVAILABLE", recovery: "CUSTOMER_SUPPORT_REQUIRED" };
    }
    const created = await durableCreateKit(input);
    if (!created.ok) {
      return {
        ok: false as const,
        reason: created.reason,
        recovery: created.reason === "NOT_FOUND" ? "CUSTOMER_SUPPORT_REQUIRED" : "DELIVERY_RETRY",
      };
    }
    return { ok: true as const, kit: created.kit, verified: true as const };
  }
  return fulfillAskReviewKit(input);
}

export function accountFromResolved(account: AskReviewResolvedAccount): Pick<AskReviewAccount, "accountId" | "email" | "qaAccess"> {
  return account;
}
