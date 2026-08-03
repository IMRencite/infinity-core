import { createHash } from "node:crypto";
import path from "node:path";

const WORKSPACE_ROOT_SEGMENT = ".infinity/workspaces";

export function buildWorkspaceRootAbsolute(
  repoRoot: string,
  organizationId: string,
  missionId: string,
  buildId: string,
): string {
  return path.resolve(
    repoRoot,
    WORKSPACE_ROOT_SEGMENT,
    organizationId,
    missionId,
    buildId,
  );
}

export function buildWorkspaceReference(
  organizationId: string,
  missionId: string,
  buildId: string,
): string {
  return `${WORKSPACE_ROOT_SEGMENT}/${organizationId}/${missionId}/${buildId}`;
}

export function parseWorkspaceReference(reference: string): {
  organizationId: string;
  missionId: string;
  buildId: string;
} | null {
  const parts = reference.split("/").filter(Boolean);
  const idx = parts.indexOf("workspaces");
  if (idx === -1 || parts.length < idx + 4) {
    return null;
  }
  return {
    organizationId: parts[idx + 1]!,
    missionId: parts[idx + 2]!,
    buildId: parts[idx + 3]!,
  };
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

export function hashText(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function resolveRepoRoot(): string {
  return process.cwd();
}
