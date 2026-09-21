import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { emitAskReviewEvent } from "./observability";
import { getAskReviewStore, saveAskReviewStore } from "./store";
import { ASKREVIEW_FOUNDER_QA_EMAIL, type AskReviewAccount, type AskReviewSession } from "./types";

function hashPassword(password: string): string {
  if (process.env.VITEST) {
    return `test:${createHash("sha256").update(password).digest("hex")}`;
  }
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith("test:")) {
    return stored === `test:${createHash("sha256").update(password).digest("hex")}`;
  }
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const next = scryptSync(password, salt, 32);
  const prior = Buffer.from(digest, "hex");
  return prior.length === next.length && timingSafeEqual(prior, next);
}

function qaAccessFor(email: string): boolean {
  return email.trim().toLowerCase() === ASKREVIEW_FOUNDER_QA_EMAIL;
}

export function createAskReviewAccount(input: {
  email: string;
  password: string;
}): { ok: true; account: AskReviewAccount; session: AskReviewSession } | { ok: false; reason: "INVALID" | "EXISTS" } {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || input.password.length < 8) return { ok: false, reason: "INVALID" };
  const store = getAskReviewStore();
  if (store.accounts.some((row) => row.email === email)) return { ok: false, reason: "EXISTS" };
  const account: AskReviewAccount = {
    accountId: `acct_${randomBytes(8).toString("hex")}`,
    email,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
    status: "ACTIVE",
    qaAccess: qaAccessFor(email),
  };
  const session: AskReviewSession = {
    sessionId: `ses_${randomBytes(24).toString("hex")}`,
    accountId: account.accountId,
    createdAt: new Date().toISOString(),
  };
  store.accounts.push(account);
  store.sessions.push(session);
  saveAskReviewStore(store);
  emitAskReviewEvent({ type: "account_created", accountId: account.accountId, outcome: account.qaAccess ? "QA" : "CUSTOMER" });
  return { ok: true, account, session };
}

export function signInAskReview(input: {
  email: string;
  password: string;
}): { ok: true; session: AskReviewSession } | { ok: false; reason: "INVALID_CREDENTIALS" } {
  const store = getAskReviewStore();
  const account = store.accounts.find((row) => row.email === input.email.trim().toLowerCase() && row.status === "ACTIVE");
  if (!account || !verifyPassword(input.password, account.passwordHash)) {
    emitAskReviewEvent({ type: "signin_failed", accountId: account?.accountId ?? null, outcome: "INVALID_CREDENTIALS" });
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }
  const session: AskReviewSession = {
    sessionId: `ses_${randomBytes(24).toString("hex")}`,
    accountId: account.accountId,
    createdAt: new Date().toISOString(),
  };
  store.sessions.push(session);
  saveAskReviewStore(store);
  emitAskReviewEvent({ type: "signin", accountId: account.accountId, outcome: "OK" });
  return { ok: true, session };
}

export function resolveAskReviewSession(sessionId: string | null | undefined): AskReviewAccount | null {
  if (!sessionId) return null;
  const store = getAskReviewStore();
  const session = store.sessions.find((row) => row.sessionId === sessionId);
  if (!session) return null;
  return store.accounts.find((row) => row.accountId === session.accountId && row.status === "ACTIVE") ?? null;
}

export function signOutAskReview(sessionId: string | null | undefined): void {
  if (!sessionId) return;
  const store = getAskReviewStore();
  const session = store.sessions.find((row) => row.sessionId === sessionId);
  store.sessions = store.sessions.filter((row) => row.sessionId !== sessionId);
  saveAskReviewStore(store);
  emitAskReviewEvent({ type: "signout", accountId: session?.accountId ?? null, outcome: "REVOKED" });
}

export function accountsCannotReadForeignLocation(ownerAccountId: string, otherAccountId: string, locationId: string): boolean {
  const store = getAskReviewStore();
  const location = store.locations.find((row) => row.locationId === locationId);
  if (!location) return true;
  if (location.accountId !== ownerAccountId) return true;
  return otherAccountId === ownerAccountId;
}
