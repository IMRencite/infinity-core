/**
 * Canonical Next.js version for Build Factory deployable artifacts.
 * Must match infinity-core and satisfy Vercel's vulnerability gate.
 */
export const DEPLOYABLE_NEXTJS_VERSION = "16.2.11";

/** Versions Vercel rejects with VULNERABLE_NEXTJS_VERSION. */
export const VERCEL_BLOCKED_NEXTJS_VERSIONS = new Set([
  "15.0.0",
  "15.0.1",
  "15.0.2",
  "15.0.3",
  "15.0.4",
  "15.1.0",
  "15.1.1",
  "15.1.2",
  "15.1.3",
  "15.1.4",
  "15.1.5",
  "15.1.6",
  "15.1.7",
]);

export type NextJsVersionValidation = {
  acceptable: boolean;
  normalizedVersion: string | null;
  issue: string | null;
};

function parsePinnedVersion(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/(\d+\.\d+\.\d+)/);
  return match?.[1] ?? null;
}

export function validateNextJsVersionForVercel(version: unknown): NextJsVersionValidation {
  if (typeof version !== "string" || !version.trim()) {
    return { acceptable: false, normalizedVersion: null, issue: "missing_next_version" };
  }

  const normalized = parsePinnedVersion(version);
  if (!normalized) {
    return { acceptable: false, normalizedVersion: null, issue: "unpinned_next_version" };
  }

  if (VERCEL_BLOCKED_NEXTJS_VERSIONS.has(normalized)) {
    return {
      acceptable: false,
      normalizedVersion: normalized,
      issue: "vulnerable_nextjs_version",
    };
  }

  const [major, minor, patch] = normalized.split(".").map(Number);
  if (major === 15 && (minor < 2 || (minor === 2 && patch < 4))) {
    return {
      acceptable: false,
      normalizedVersion: normalized,
      issue: "nextjs_below_vercel_minimum",
    };
  }

  if (major < 15) {
    return {
      acceptable: false,
      normalizedVersion: normalized,
      issue: "nextjs_too_old_for_vercel",
    };
  }

  return { acceptable: true, normalizedVersion: normalized, issue: null };
}

export function extractNextVersionFromPackageJson(
  parsed: Record<string, unknown> | null,
): unknown {
  if (!parsed) return null;
  const deps = (parsed.dependencies ?? {}) as Record<string, unknown>;
  const devDeps = (parsed.devDependencies ?? {}) as Record<string, unknown>;
  return deps.next ?? devDeps.next ?? null;
}
