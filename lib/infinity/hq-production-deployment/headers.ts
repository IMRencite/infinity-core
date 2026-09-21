import {
  HQ_HTTPS_GATE,
  HQ_INDEXATION_PRIVACY_GATE,
  HQ_PRIVATE_CACHE_GATE,
  HQ_SECURITY_HEADERS_GATE,
  type HqNamedGate,
} from "./contract";

export const HQ_SECURITY_HEADERS: Record<string, string> = {
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  "Strict-Transport-Security": "max-age=31536000",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://infinity-runtime.vercel.app",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

export function applyHqProductionHeaders(headers: Headers, options: { includeHsts?: boolean } = {}): void {
  for (const [key, value] of Object.entries(HQ_SECURITY_HEADERS)) {
    if (key === "Strict-Transport-Security" && options.includeHsts === false) continue;
    headers.set(key, value);
  }
}

export function evaluateHQHTTPSGate(input: {
  certificateValid: boolean;
  https: boolean;
  applicationLoads: boolean;
  authOverHttps: boolean;
  httpRedirects?: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (!input.certificateValid) reasons.push("CERTIFICATE_INVALID");
  if (!input.https) reasons.push("HTTPS_FAILED");
  if (!input.applicationLoads) reasons.push("APPLICATION_DID_NOT_LOAD");
  if (!input.authOverHttps) reasons.push("AUTH_NOT_OVER_HTTPS");
  return {
    gate: HQ_HTTPS_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["HTTPS_VALID"],
  };
}

export function evaluateHQSecurityHeadersGate(input: {
  headers: Record<string, string | null | undefined>;
  cspImplemented?: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  const get = (name: string) => Object.entries(input.headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? "";
  if (!/nosniff/i.test(get("x-content-type-options") ?? "")) reasons.push("X_CONTENT_TYPE_OPTIONS");
  if (!get("referrer-policy")) reasons.push("REFERRER_POLICY");
  if (!get("permissions-policy")) reasons.push("PERMISSIONS_POLICY");
  if (!/deny|sameorigin/i.test(get("x-frame-options") ?? "") && !/frame-ancestors/i.test(get("content-security-policy") ?? "")) {
    reasons.push("FRAME_PROTECTION");
  }
  if (input.cspImplemented === false) {
    // CSP may be intentionally deferred if untested; still require the other headers.
  } else if (!get("content-security-policy")) {
    reasons.push("CSP_MISSING");
  }
  return {
    gate: HQ_SECURITY_HEADERS_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["HEADERS_PRESENT"],
  };
}

export function evaluateHQIndexationPrivacyGate(input: {
  robotsDisallow: boolean;
  xRobotsNoindex: boolean;
  authWall: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (!input.robotsDisallow) reasons.push("ROBOTS_MISSING");
  if (!input.xRobotsNoindex) reasons.push("X_ROBOTS_TAG_MISSING");
  if (!input.authWall) reasons.push("AUTH_WALL_MISSING");
  return {
    gate: HQ_INDEXATION_PRIVACY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["NOINDEX_AND_AUTH_WALL"],
  };
}

export function evaluateHQPrivateCacheGate(input: {
  privatePagesNoStore: boolean;
  privateApisNoStore: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (!input.privatePagesNoStore) reasons.push("PRIVATE_PAGE_CACHEABLE");
  if (!input.privateApisNoStore) reasons.push("PRIVATE_API_CACHEABLE");
  return {
    gate: HQ_PRIVATE_CACHE_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["PRIVATE_NO_STORE"],
  };
}
