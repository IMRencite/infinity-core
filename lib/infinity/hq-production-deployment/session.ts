import {
  HQ_PRODUCTION_SESSION_SECURITY_GATE,
  type HqNamedGate,
} from "./contract";
import { isHqProductionHost, isHqProductionRuntime } from "./surface";

export type HqSessionCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
};

export function hqSessionCookieOptions(input: {
  hostname?: string | null;
  protocol?: string | null;
  existing?: Partial<HqSessionCookieOptions & { sameSite?: string }>;
} = {}): HqSessionCookieOptions {
  const https = (input.protocol ?? "").startsWith("https") || isHqProductionHost(input.hostname) || isHqProductionRuntime();
  const sameSiteRaw = String(input.existing?.sameSite ?? "lax").toLowerCase();
  const sameSite = sameSiteRaw === "strict" || sameSiteRaw === "none" ? sameSiteRaw : "lax";
  return {
    httpOnly: true,
    secure: https || Boolean(input.existing?.secure),
    sameSite,
    path: "/",
  };
}

export function evaluateHQProductionSessionSecurityGate(input: {
  sessionServerValidated: boolean;
  httpsOnly: boolean;
  cookie: Partial<HqSessionCookieOptions>;
  logoutInvalidates: boolean;
  privateApiProtected: boolean;
  secretsExposedClientSide: boolean;
  liveCookieInspected?: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (!input.sessionServerValidated) reasons.push("SESSION_NOT_SERVER_VALIDATED");
  if (!input.httpsOnly) reasons.push("SESSION_NOT_HTTPS_ONLY");
  if (input.cookie.httpOnly !== true) reasons.push("COOKIE_NOT_HTTPONLY");
  if (input.cookie.secure !== true) reasons.push("COOKIE_NOT_SECURE");
  if (!input.cookie.sameSite) reasons.push("COOKIE_SAMESITE_MISSING");
  if (!input.logoutInvalidates) reasons.push("LOGOUT_DOES_NOT_INVALIDATE");
  if (!input.privateApiProtected) reasons.push("PRIVATE_API_UNPROTECTED");
  if (input.secretsExposedClientSide) reasons.push("AUTH_SECRET_CLIENT_EXPOSED");
  return {
    gate: HQ_PRODUCTION_SESSION_SECURITY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : input.liveCookieInspected ? ["LIVE_SESSION_PROVEN"] : ["SESSION_SERVER_VALIDATED"],
    proof_level: reasons.length ? "NOT_PROVEN" : input.liveCookieInspected ? "LIVE_SESSION_PROVEN" : "IMPLEMENTATION_PROVEN",
  };
}
