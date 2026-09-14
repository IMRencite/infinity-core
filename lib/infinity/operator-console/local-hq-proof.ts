import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";

export const HQ_LIVE_PROOF_HEADER = "x-infinity-hq-live-proof";
export const HQ_LIVE_PROOF_COOKIE = "infinity-hq-live-proof";
export const HQ_LOCAL_PROOF_USER_ID = "local-hq-observability-proof";
export const HQ_DEV_CLIENT_BUILD = "hq-secondary-status-readable-v1";
/** Founder-facing local HQ. Port 3001 is non-canonical and must not be used as browser proof. */
export const FOUNDER_HQ_CANONICAL_PORT = 3000;
export const FOUNDER_HQ_CANONICAL_ORIGIN = "http://localhost:3000";
export const FOUNDER_HQ_CANONICAL_DASHBOARD = `${FOUNDER_HQ_CANONICAL_ORIGIN}/dashboard`;
const HQ_DEV_CLIENT_BUILD_STORAGE_KEY = "infinity-hq-dev-client-build";

export function hqDevClientBuildId(): string {
  if (process.env.NODE_ENV === "production") return "";
  return HQ_DEV_CLIENT_BUILD;
}

/** When HQ chrome changes, bump HQ_DEV_CLIENT_BUILD so an already-open founder tab hard-reloads once. */
export function consumeHqDevClientBuildReload(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "production") return false;
  const current = HQ_DEV_CLIENT_BUILD;
  try {
    const previous = window.sessionStorage.getItem(HQ_DEV_CLIENT_BUILD_STORAGE_KEY);
    window.sessionStorage.setItem(HQ_DEV_CLIENT_BUILD_STORAGE_KEY, current);
    return Boolean(previous && previous !== current);
  } catch {
    return false;
  }
}

export function isLocalHqProofHost(hostname: string | null | undefined): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const host = (hostname ?? "").split(":")[0];
  return host === "localhost" || host === "127.0.0.1";
}

export function isLocalHqObservabilityProofRequest(request: Request): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(request.url);
    if (!isLocalHqProofHost(url.hostname)) return false;
  } catch {
    return false;
  }
  if (request.headers.get(HQ_LIVE_PROOF_HEADER) === "1") return true;
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").some((part) => {
    const [name, value] = part.trim().split("=");
    return (name === HQ_LIVE_PROOF_COOKIE || name === HQ_LIVE_PROOF_HEADER) && value === "1";
  });
}

export async function isLocalHqObservabilityProofSession(): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const { cookies, headers } = await import("next/headers");
    const headerStore = await headers();
    if (!isLocalHqProofHost(headerStore.get("host"))) return false;
    if (headerStore.get(HQ_LIVE_PROOF_HEADER) === "1") return true;
    const cookieStore = await cookies();
    return (
      cookieStore.get(HQ_LIVE_PROOF_COOKIE)?.value === "1" ||
      cookieStore.get(HQ_LIVE_PROOF_HEADER)?.value === "1"
    );
  } catch {
    return false;
  }
}

export function localHqProofOrganizationId(): string {
  return LIVE_ORG;
}

export function isCanonicalFounderHqOrigin(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const port = parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80;
    if (host !== "localhost" && host !== "127.0.0.1") return false;
    return port === FOUNDER_HQ_CANONICAL_PORT;
  } catch {
    return false;
  }
}

export function evaluateFounderHqRuntimeSourceGate(input: {
  inspectedOrigin: string;
}): { gate: "FounderHqRuntimeSourceGate"; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (!isCanonicalFounderHqOrigin(input.inspectedOrigin)) {
    reasons.push("NON_CANONICAL_HQ_ORIGIN");
  }
  if (/:(3001)\b/.test(input.inspectedOrigin)) {
    reasons.push("PORT_3001_IS_NON_CANONICAL");
  }
  return {
    gate: "FounderHqRuntimeSourceGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["PORT_3000_AUTHORITATIVE"],
  };
}

export function hqBrowserProofHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  if (process.env.NODE_ENV === "production") return {};
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return {};
  return { [HQ_LIVE_PROOF_HEADER]: "1" };
}
