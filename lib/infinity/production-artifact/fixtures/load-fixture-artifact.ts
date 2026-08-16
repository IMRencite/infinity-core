import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ProductionArtifactFile } from "../types";
import { hashFileContent } from "../types";

export function loadFixtureProductionArtifact(relativeFixtureRoot: string): ProductionArtifactFile[] {
  const root = join(__dirname, relativeFixtureRoot);
  const files: ProductionArtifactFile[] = [];

  function walk(dir: string, prefix: string) {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".next") continue;
      const full = join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (statSync(full).isDirectory()) {
        walk(full, rel);
        continue;
      }
      if (name.startsWith(".")) continue;
      const contentText = readFileSync(full, "utf8");
      files.push({
        relativePath: rel.replace(/\\/g, "/"),
        contentHash: hashFileContent(contentText),
        byteSize: Buffer.byteLength(contentText, "utf8"),
        fileMode: "100644",
        contentText,
      });
    }
  }

  walk(root, "");
  return files;
}

export function fixtureRecord(input: {
  artifactId: string;
  files: ProductionArtifactFile[];
  contentHash: string;
}) {
  return {
    artifactId: input.artifactId,
    organizationId: "00000000-0000-0000-0000-000000000001",
    missionId: "00000000-0000-0000-0000-000000000002",
    ventureAssemblyId: null,
    ventureAssemblyVersion: null,
    buildJobId: null,
    buildSnapshotId: "00000000-0000-0000-0000-000000000003",
    buildId: "00000000-0000-0000-0000-000000000004",
    artifactVersion: 1,
    artifactType: "website_application",
    framework: "nextjs",
    rootDirectory: ".",
    fileManifest: input.files.map((f) => ({
      relative_path: f.relativePath,
      content_hash: f.contentHash,
      byte_size: f.byteSize,
      file_mode: f.fileMode,
    })),
    fileCount: input.files.length,
    totalBytes: input.files.reduce((s, f) => s + f.byteSize, 0),
    contentHash: input.contentHash,
  };
}
