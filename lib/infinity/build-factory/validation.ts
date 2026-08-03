import type { BuildManifest, PersistedBuild } from "./types";
import { getBuildTemplate } from "./template-registry";

export function validateManifestAgainstWorkspace(input: {
  manifest: BuildManifest;
  files: { path: string; hash: string; bytes: number }[];
}): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const template = getBuildTemplate(input.manifest.templateKey, input.manifest.templateVersion);
  const paths = new Set(input.files.map((f) => f.path));

  for (const required of template.requiredFiles) {
    if (!paths.has(required)) {
      issues.push(`Missing required file: ${required}`);
    }
  }

  for (const file of input.files) {
    if (file.bytes > input.manifest.maximumIndividualFileSize) {
      issues.push(`File exceeds size limit: ${file.path}`);
    }
    for (const denied of input.manifest.deniedPaths) {
      if (file.path.includes(denied)) {
        issues.push(`Denied path present: ${file.path}`);
      }
    }
  }

  if (input.files.length > input.manifest.maximumFileCount) {
    issues.push("File count exceeds manifest limit");
  }

  const total = input.files.reduce((s, f) => s + f.bytes, 0);
  if (total > input.manifest.maximumTotalOutputSize) {
    issues.push("Total workspace size exceeds manifest limit");
  }

  return { valid: issues.length === 0, issues };
}

export function validateBuildInternallyComplete(build: PersistedBuild): boolean {
  return build.status === "internally_complete" && build.reviewStatus === "passed";
}
