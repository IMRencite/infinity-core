import { createHash } from "node:crypto";
import {
  PRODUCTION_ARTIFACT_EXCLUDED_EXACT,
  PRODUCTION_ARTIFACT_EXCLUDED_PATH_PREFIXES,
} from "./constants";

export type ProductionFileManifestEntry = {
  relative_path: string;
  content_hash: string;
  byte_size: number;
  file_mode: string;
};

export type ProductionArtifactRecord = {
  artifactId: string;
  organizationId: string;
  missionId: string;
  ventureAssemblyId: string | null;
  ventureAssemblyVersion: number | null;
  buildJobId: string | null;
  buildSnapshotId: string;
  buildId: string;
  artifactVersion: number;
  artifactType: string;
  framework: string;
  rootDirectory: string;
  fileManifest: ProductionFileManifestEntry[];
  fileCount: number;
  totalBytes: number;
  contentHash: string;
};

export type ProductionArtifactFile = {
  relativePath: string;
  contentHash: string;
  byteSize: number;
  fileMode: string;
  contentText: string;
};

export function normalizeRelativePath(relativePath: string): string {
  const norm = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (norm.includes("..")) throw new Error("path_traversal");
  return norm;
}

export function isProhibitedProductionPath(relativePath: string): boolean {
  const norm = normalizeRelativePath(relativePath);
  const base = norm.split("/").pop() ?? norm;
  if (PRODUCTION_ARTIFACT_EXCLUDED_EXACT.includes(base as (typeof PRODUCTION_ARTIFACT_EXCLUDED_EXACT)[number])) {
    return true;
  }
  for (const prefix of PRODUCTION_ARTIFACT_EXCLUDED_PATH_PREFIXES) {
    if (norm === prefix.replace(/\/$/, "") || norm.startsWith(prefix)) return true;
  }
  if (/\.(log|pem|key|p12|pfx)$/i.test(norm)) return true;
  return false;
}

export function hashFileContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function computeProductionContentHash(
  files: ProductionFileManifestEntry[],
): string {
  const sorted = [...files].sort((a, b) => a.relative_path.localeCompare(b.relative_path));
  const payload = sorted.map((f) => ({
    p: f.relative_path,
    h: f.content_hash,
    s: f.byte_size,
    m: f.file_mode,
  }));
  return createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
}

export function assertNoSecretsInContent(content: string, relativePath: string): void {
  if (/ghp_[a-zA-Z0-9]{20,}/.test(content)) {
    throw new Error(`secret_pattern_in_file:${relativePath}`);
  }
  if (/sk-[a-zA-Z0-9]{20,}/.test(content)) {
    throw new Error(`secret_pattern_in_file:${relativePath}`);
  }
  if (/SUPABASE_SERVICE_ROLE|VERCEL_TOKEN|GITHUB_TOKEN/i.test(content)) {
    throw new Error(`credential_reference_in_file:${relativePath}`);
  }
}
