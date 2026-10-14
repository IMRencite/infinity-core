import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assertVercelDeploymentTargetWriteSafe } from "./vercel-deployment-target";

export type VercelUploadableSourceFile = {
  path: string;
  content?: string;
  encoding?: "utf8" | "base64";
  /** Read bytes from disk — avoids base64 string materialization for large static assets. */
  sourceAbs?: string;
};

export const VERCEL_SOURCE_BUNDLE_DEPLOYMENT_MODE = "files" as const;
export const VERCEL_FILES_UPLOAD_PATH = "/v2/files";
export const VERCEL_DEPLOYMENTS_PATH = "/v13/deployments";

export type VercelSourceBundleFile = {
  file: string;
  sha: string;
  size: number;
};

export type VercelSourceBundleDeploymentBody = {
  name: string;
  files: VercelSourceBundleFile[];
  target: "staging";
  projectSettings: {
    framework: "nextjs";
    buildCommand: "next build";
  };
};

export function fileUploadBytes(file: VercelUploadableSourceFile): Buffer {
  if (file.sourceAbs) return readFileSync(file.sourceAbs);
  const content = file.content ?? "";
  return file.encoding === "base64" ? Buffer.from(content, "base64") : Buffer.from(content, "utf8");
}

export function sha1Hex(content: string): string {
  return createHash("sha1").update(content, "utf8").digest("hex");
}

export function translateFilesToVercelSourceBundle(
  files: VercelUploadableSourceFile[],
): VercelSourceBundleFile[] {
  return files
    .map((file) => {
      const bytes = fileUploadBytes(file);
      return {
        file: file.path.replace(/\\/g, "/").replace(/^\/+/, ""),
        sha: createHash("sha1").update(bytes).digest("hex"),
        size: bytes.length,
      };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

export function buildVercelSourceBundleDeploymentBody(input: {
  projectName: string;
  files: VercelUploadableSourceFile[];
}): VercelSourceBundleDeploymentBody {
  return {
    name: input.projectName,
    files: translateFilesToVercelSourceBundle(input.files),
    target: "staging",
    projectSettings: {
      framework: "nextjs",
      buildCommand: "next build",
    },
  };
}

export function evaluateVercelSourceBundleDeploymentBody(body: {
  name?: string;
  files?: unknown;
  target?: string;
  projectSettings?: { framework?: string; buildCommand?: string };
}): { valid: boolean; issues: string[] } {
  const issues = assertVercelDeploymentTargetWriteSafe(body.target);
  if (body.target === "preview" && !issues.includes("VERCEL_TARGET_PREVIEW_FORBIDDEN")) {
    issues.push("VERCEL_TARGET_PREVIEW_FORBIDDEN");
  }
  if (body.target !== "staging") issues.push("VERCEL_SOURCE_BUNDLE_TARGET_MUST_BE_STAGING");
  if (!Array.isArray(body.files) || body.files.length === 0) issues.push("missing_source_files");
  if (body.projectSettings?.framework !== "nextjs") issues.push("invalid_framework");
  if (body.projectSettings?.buildCommand !== "next build") issues.push("invalid_build_command");
  if (!body.name) issues.push("missing_project_name");
  return { valid: issues.length === 0, issues };
}

export function rejectFabricatedGitIdentity(payload: Record<string, unknown>): string[] {
  const issues: string[] = [];
  if (payload.commit_sha) issues.push("fake_git_sha_forbidden");
  if (payload.repository_full_name) issues.push("fake_git_repository_forbidden");
  if (payload.gitSource) issues.push("fake_git_source_forbidden");
  return issues;
}
