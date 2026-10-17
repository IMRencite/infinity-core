import { existsSync, readFileSync, unlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CommunicationReleaseIdentity } from "./release-identity";
import { COMMUNICATION_RELEASE_IDENTITY_FILE } from "./release-identity";

export type ReleaseIdentityPrebuildAction = "NONE" | "REGENERATE" | "FAIL_MISMATCH";

export function readReleaseIdentityFile(root: string): CommunicationReleaseIdentity | null {
  const path = join(root, COMMUNICATION_RELEASE_IDENTITY_FILE);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CommunicationReleaseIdentity;
  } catch {
    return null;
  }
}

export function prepareReleaseIdentityFiles(input: {
  destRoot: string;
  sourceCommitSha: string;
  identity: CommunicationReleaseIdentity;
  failOnStaleFile?: boolean;
}): {
  PREBUILD_RELEASE_IDENTITY_EXISTING_SHA: string | null;
  PREBUILD_RELEASE_IDENTITY_SOURCE_SHA: string;
  PREBUILD_RELEASE_IDENTITY_ACTION: ReleaseIdentityPrebuildAction;
  RELEASE_IDENTITY_GENERATED_SHA: string;
  RELEASE_IDENTITY_EXPECTED_SHA: string;
  RELEASE_IDENTITY_FILE_PARITY_QC: "PASS" | "FAIL";
} {
  const existing = readReleaseIdentityFile(input.destRoot);
  const existingSha = existing?.release_sha?.trim() || null;
  const sourceSha = input.sourceCommitSha.trim();
  let action: ReleaseIdentityPrebuildAction = "NONE";
  if (existingSha && existingSha !== sourceSha) {
    action = input.failOnStaleFile ? "FAIL_MISMATCH" : "REGENERATE";
    if (action === "FAIL_MISMATCH") {
      return {
        PREBUILD_RELEASE_IDENTITY_EXISTING_SHA: existingSha,
        PREBUILD_RELEASE_IDENTITY_SOURCE_SHA: sourceSha,
        PREBUILD_RELEASE_IDENTITY_ACTION: action,
        RELEASE_IDENTITY_GENERATED_SHA: existingSha,
        RELEASE_IDENTITY_EXPECTED_SHA: sourceSha,
        RELEASE_IDENTITY_FILE_PARITY_QC: "FAIL",
      };
    }
    for (const rel of [COMMUNICATION_RELEASE_IDENTITY_FILE, join("public", COMMUNICATION_RELEASE_IDENTITY_FILE)]) {
      const p = join(input.destRoot, rel);
      if (existsSync(p)) unlinkSync(p);
    }
  }

  const payload = { ...input.identity, release_sha: sourceSha };
  writeFileSync(join(input.destRoot, COMMUNICATION_RELEASE_IDENTITY_FILE), `${JSON.stringify(payload, null, 2)}\n`);
  mkdirSync(join(input.destRoot, "public"), { recursive: true });
  writeFileSync(join(input.destRoot, "public", COMMUNICATION_RELEASE_IDENTITY_FILE), `${JSON.stringify(payload, null, 2)}\n`);

  const readBack = readReleaseIdentityFile(input.destRoot);
  const generatedSha = readBack?.release_sha?.trim() ?? "";
  const parity = generatedSha === sourceSha && readBack?.deployable_unit === "infinity-runtime" ? "PASS" : "FAIL";

  return {
    PREBUILD_RELEASE_IDENTITY_EXISTING_SHA: existingSha,
    PREBUILD_RELEASE_IDENTITY_SOURCE_SHA: sourceSha,
    PREBUILD_RELEASE_IDENTITY_ACTION: action,
    RELEASE_IDENTITY_GENERATED_SHA: generatedSha,
    RELEASE_IDENTITY_EXPECTED_SHA: sourceSha,
    RELEASE_IDENTITY_FILE_PARITY_QC: parity,
  };
}

export function verifyBuiltArtifactReleaseIdentity(destRoot: string, expectedSha: string): {
  BUILT_ARTIFACT_RELEASE_SHA: string;
  DEPLOY_SOURCE_RELEASE_SHA: string;
  BUILT_ARTIFACT_RELEASE_IDENTITY_QC: "PASS" | "FAIL";
} {
  const baked = readReleaseIdentityFile(destRoot);
  const artifactSha = baked?.release_sha?.trim() ?? "";
  return {
    BUILT_ARTIFACT_RELEASE_SHA: artifactSha,
    DEPLOY_SOURCE_RELEASE_SHA: expectedSha,
    BUILT_ARTIFACT_RELEASE_IDENTITY_QC: artifactSha === expectedSha ? "PASS" : "FAIL",
  };
}
