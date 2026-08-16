import { createHash } from "node:crypto";
import path from "node:path";

const WORKSPACE_ROOT_SEGMENT = ".infinity/vw";

export function buildVentureWorkspaceKey(
  organizationId: string,
  buildPackageId: string,
  buildRunId: string,
): string {
  return createHash("sha256")
    .update(`${organizationId}:${buildPackageId}:${buildRunId}`, "utf8")
    .digest("hex")
    .slice(0, 16);
}

export function buildVentureWorkspaceRootAbsolute(
  repoRoot: string,
  organizationId: string,
  buildPackageId: string,
  buildRunId: string,
): string {
  const key = buildVentureWorkspaceKey(organizationId, buildPackageId, buildRunId);
  return path.resolve(repoRoot, WORKSPACE_ROOT_SEGMENT, key);
}

export function buildVentureWorkspaceReference(
  organizationId: string,
  buildPackageId: string,
  buildRunId: string,
): string {
  const key = buildVentureWorkspaceKey(organizationId, buildPackageId, buildRunId);
  return `${WORKSPACE_ROOT_SEGMENT}/${key}`;
}

export function normalizeRelativePath(relativePath: string): string {
  if (relativePath.includes("..")) {
    throw new Error("Path traversal rejected");
  }
  const normalized = path.posix.normalize(relativePath.replace(/\\/g, "/"));
  if (normalized.startsWith("/") || normalized.startsWith("..")) {
    throw new Error("Path traversal rejected");
  }
  if (normalized.includes("..")) {
    throw new Error("Path traversal rejected");
  }
  return normalized;
}

export function assertPathAllowed(relativePath: string, deniedPaths: string[]): void {
  const norm = normalizeRelativePath(relativePath);
  for (const denied of deniedPaths) {
    if (norm === denied || norm.startsWith(`${denied}/`)) {
      throw new Error(`Path denied: ${relativePath}`);
    }
  }
}

export function resolveRepoRoot(): string {
  return process.cwd();
}

export function isInfinityCorePath(relativePath: string): boolean {
  const norm = normalizeRelativePath(relativePath);
  const corePrefixes = [".infinity/", "lib/infinity/", "supabase/", "scripts/run-", "app/api/infinity/"];
  return corePrefixes.some((p) => norm === p.replace(/\/$/, "") || norm.startsWith(p));
}
