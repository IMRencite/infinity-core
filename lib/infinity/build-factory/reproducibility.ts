import type { PersistedBuild } from "./types";
import { openBuildWorkspace } from "./workspace";
import { getBuildTemplate } from "./template-registry";
import type { ReproducibilityReport } from "./types";

export async function verifyBuildReproducibility(
  build: PersistedBuild,
): Promise<ReproducibilityReport> {
  const details: string[] = [];

  if (build.status === "blocked") {
    return { status: "unsupported", details: ["Build is blocked"] };
  }

  const template = getBuildTemplate(build.templateKey, build.templateVersion);
  const workspace = openBuildWorkspace(build);
  const files = await workspace.listWorkspaceFiles();
  const fileMap = new Map(files.map((f) => [f.path, f]));

  for (const required of template.requiredFiles) {
    if (!fileMap.has(required)) {
      details.push(`Missing required file: ${required}`);
    }
  }

  const manifestFiles = build.manifest?.fileManifest ?? [];
  for (const expected of manifestFiles) {
    const actual = fileMap.get(expected.path);
    if (!actual) {
      details.push(`Manifest file missing: ${expected.path}`);
      continue;
    }
    if (expected.hash && expected.hash !== actual.hash) {
      details.push(`Hash mismatch: ${expected.path}`);
    }
  }

  if (details.length === 0 && files.length >= template.requiredFiles.length) {
    return { status: "reproducible", details: [] };
  }

  if (files.length === 0) {
    return { status: "incomplete", details };
  }

  return { status: details.some((d) => d.includes("Hash")) ? "mismatched" : "incomplete", details };
}
