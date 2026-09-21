import {
  HQ_PRODUCTION_HOST,
  HQ_PRODUCTION_ORIGIN,
  HQ_PUBLIC_AUTH_PATHS,
  HQ_PRIVATE_PATH_PREFIXES,
  HQ_PRIVATE_API_ROUTES,
  HQ_PUBLIC_SAFE_API_ROUTES,
  HQ_RUNTIME_INTERNAL_API_ROUTES,
  LOCAL_HQ_ORIGIN,
  type HqApiClass,
} from "./contract";

export function isHqProductionHost(hostname: string | null | undefined): boolean {
  const host = (hostname ?? "").split(":")[0].toLowerCase();
  return host === HQ_PRODUCTION_HOST;
}

export function isHqProductionRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.INFINITY_HQ_SURFACE === "1";
}

export function founderHqCanonicalOrigin(env: NodeJS.Dict<string> = process.env): string {
  const configured = (env.INFINITY_HQ_PUBLIC_URL ?? env.NEXT_PUBLIC_INFINITY_HQ_URL ?? "").trim().replace(/\/$/, "");
  if (configured) return configured;
  if (isHqProductionRuntime() || env.VERCEL === "1") return HQ_PRODUCTION_ORIGIN;
  return LOCAL_HQ_ORIGIN;
}

export function isSafeHqRedirectPath(target: string | null | undefined): boolean {
  if (!target) return false;
  if (!target.startsWith("/")) return false;
  if (target.startsWith("//")) return false;
  if (target.includes("://")) return false;
  if (target.includes("\\")) return false;
  return true;
}

export function safeHqRedirectPath(target: string | null | undefined, fallback = "/dashboard"): string {
  return isSafeHqRedirectPath(target) ? target! : fallback;
}

export function classifyHqPath(pathname: string): HqApiClass | "HQ_PRIVATE_PAGE" | "PUBLIC_AUTH" | "OTHER" {
  const path = pathname.split("?")[0] || "/";
  if (HQ_PUBLIC_AUTH_PATHS.some((row) => path === row || path.startsWith(`${row}/`))) return "PUBLIC_AUTH";
  if (HQ_PUBLIC_SAFE_API_ROUTES.some((row) => path === row || path.startsWith(`${row}/`))) return "PUBLIC_SAFE";
  if (path.startsWith("/api/operator-console/dev/")) return "LOCAL_ONLY";
  if (HQ_RUNTIME_INTERNAL_API_ROUTES.some((row) => path === row || path.startsWith(`${row}/`))) return "RUNTIME_INTERNAL";
  if (HQ_PRIVATE_API_ROUTES.some((row) => path === row || path.startsWith(`${row}/`))) return "HQ_PRIVATE";
  if (HQ_PRIVATE_PATH_PREFIXES.some((row) => path === row || path.startsWith(`${row}/`))) {
    return path.startsWith("/api/") ? "HQ_PRIVATE" : "HQ_PRIVATE_PAGE";
  }
  return "OTHER";
}

export function hqPrivateApiCount(): number {
  return HQ_PRIVATE_API_ROUTES.length;
}

export function hostnameFromRequest(request: { url?: string; headers?: Headers } | Request): string | null {
  try {
    if (request instanceof Request || (request as Request).headers) {
      const host = (request as Request).headers?.get("host") ?? (request as Request).headers?.get("x-forwarded-host");
      if (host) return host.split(":")[0].toLowerCase();
    }
    if (request.url) return new URL(request.url).hostname.toLowerCase();
  } catch {
    return null;
  }
  return null;
}
