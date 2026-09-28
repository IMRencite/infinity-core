import { HQ_PRODUCTION_ORIGIN } from "@/lib/infinity/hq-production-deployment/contract";

export const HQ_RECOVERY_LANDING_PATH = "/auth/recovery" as const;

/** Production recovery landing — email link target; GET must not verify the token. */
export const HQ_PASSWORD_RECOVERY_LANDING_URL =
  `${HQ_PRODUCTION_ORIGIN}${HQ_RECOVERY_LANDING_PATH}` as const;

export type RecoveryCredentialParams = {
  token_hash: string | null;
  code: string | null;
  type: string | null;
};

/** Parse recovery params from a URL search string without logging secrets. */
export function parseRecoveryCredentialFromSearch(search: string): RecoveryCredentialParams {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    token_hash: params.get("token_hash"),
    code: params.get("code"),
    type: params.get("type"),
  };
}

export function recoveryCredentialPresent(params: RecoveryCredentialParams): boolean {
  return Boolean((params.token_hash || params.code) && params.type === "recovery");
}

export function passwordRecoveryLandingForOrigin(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${HQ_RECOVERY_LANDING_PATH}`;
}

/** Supabase recovery email template link (scanner-safe): SiteURL + TokenHash, not ConfirmationURL. */
export function supabaseRecoveryEmailLinkTemplate(): string {
  return `${HQ_PRODUCTION_ORIGIN}${HQ_RECOVERY_LANDING_PATH}?token_hash={{ .TokenHash }}&type=recovery`;
}

export function recoveryLandingMustNotAutoVerify(source: string): boolean {
  return (
    !/\bverifyOtp\s*\(/.test(source)
    && !/\bexchangeCodeForSession\s*\(/.test(source)
    && !/useEffect\s*\([\s\S]*?(verifyOtp|exchangeCodeForSession)/.test(source)
  );
}
