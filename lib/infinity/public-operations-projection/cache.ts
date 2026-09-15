import type { PublicOperationsProjection } from "./types";

const DEFAULT_TTL_MS = 30_000;

let cached: { at: number; projection: PublicOperationsProjection } | null = null;

export function readPublicProjectionCache(nowMs = Date.now(), ttlMs = DEFAULT_TTL_MS): PublicOperationsProjection | null {
  if (!cached) return null;
  if (nowMs - cached.at > ttlMs) return null;
  return cached.projection;
}

export function writePublicProjectionCache(projection: PublicOperationsProjection, nowMs = Date.now()): void {
  cached = { at: nowMs, projection };
}

export function resetPublicProjectionCache(): void {
  cached = null;
}

export const PUBLIC_PROJECTION_CACHE_TTL_MS = DEFAULT_TTL_MS;
