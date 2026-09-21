import { MERCURY_PRODUCTION_BASE_URL } from "../../constants";
import type { MercuryPublicConfig } from "./config";
import { mercuryProductionHostCorrect } from "./config";
import { isMercuryReadOnlyTokenClass } from "./token-source";

export const MERCURY_READ_ONLY_VERIFICATION_GATE = "MercuryReadOnlyVerificationGate" as const;

export type MercuryReadOnlyVerificationInput = {
  publicConfig: MercuryPublicConfig;
  authenticatedRead: boolean;
  balanceFromMercury: boolean;
  writeCapabilityEnabled?: boolean;
  leakedCredential?: boolean;
  writeHttpCalls?: number;
};

export type NamedMercuryGate = {
  gate: typeof MERCURY_READ_ONLY_VERIFICATION_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export function evaluateMercuryReadOnlyVerificationGate(input: MercuryReadOnlyVerificationInput): NamedMercuryGate {
  const reasons: string[] = [];
  if (!input.publicConfig.tokenConfigured) reasons.push("TOKEN_MISSING");
  if (!isMercuryReadOnlyTokenClass(input.publicConfig.tokenFingerprint?.type_class)) {
    reasons.push("TOKEN_NOT_READ_ONLY");
  }
  if (input.publicConfig.mode === "PRODUCTION" && !mercuryProductionHostCorrect(input.publicConfig.baseUrl)) {
    reasons.push("WRONG_PRODUCTION_HOST");
  }
  if (input.publicConfig.mode === "PRODUCTION" && input.publicConfig.baseUrl !== MERCURY_PRODUCTION_BASE_URL && !mercuryProductionHostCorrect(input.publicConfig.baseUrl)) {
    reasons.push("HOST_MISMATCH");
  }
  if (!input.authenticatedRead) reasons.push("AUTHENTICATED_READ_FAILED");
  if (!input.balanceFromMercury) reasons.push("BALANCE_NOT_FROM_MERCURY");
  if (input.writeCapabilityEnabled) reasons.push("WRITE_CAPABILITY_ENABLED");
  if ((input.writeHttpCalls ?? 0) > 0) reasons.push("WRITE_HTTP_CALLED");
  if (input.leakedCredential) reasons.push("CREDENTIAL_LEAK");
  return {
    gate: MERCURY_READ_ONLY_VERIFICATION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: reasons.length ? reasons : ["READ_ONLY_VERIFIED"],
  };
}

export async function runMercuryReadOnlyHealthCheck(input: {
  getAccounts: () => Promise<unknown>;
  now?: () => Date;
}): Promise<{ ok: boolean; last_verified_at: string | null; account_access: boolean }> {
  const now = (input.now ?? (() => new Date()))().toISOString();
  try {
    const payload = await input.getAccounts();
    const accounts = payload && typeof payload === "object" && "accounts" in payload
      ? (payload as { accounts?: unknown[] }).accounts
      : Array.isArray(payload) ? payload : null;
    return {
      ok: true,
      last_verified_at: now,
      account_access: Array.isArray(accounts) && accounts.length >= 0,
    };
  } catch {
    return { ok: false, last_verified_at: null, account_access: false };
  }
}
