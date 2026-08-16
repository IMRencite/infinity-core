import { createHash } from "node:crypto";
import type { ProductionArtifactFile, ProductionArtifactRecord } from "./types";
import { validateFrameworkReadiness } from "./framework-validators";
import {
  validateNextJsPackageJson,
  validateArtifactDependencyIntegrity,
} from "./package-json-validation";
import {
  extractNextVersionFromPackageJson,
  validateNextJsVersionForVercel,
} from "./nextjs-version-policy";
import {
  buildDeploymentManifest,
  validateDeploymentManifest,
  type DeploymentManifestV1,
} from "./deployment-manifest";
import { translateDeploymentManifestToVercel } from "./vercel-translation";
import {
  cleanupCleanRoom,
  type CleanRoomBuildOutcome,
} from "./clean-room-build";
import { VERCEL_TOKEN_ENV, VERCEL_TEAM_ID_ENV } from "@/lib/infinity/launch-gateway/provider-config";

export type DeploymentSourceIdentity = {
  artifactId: string;
  artifactHash: string;
  fileCount: number;
  commitSha: string | null;
  repositoryFullName: string | null;
  sourceFingerprint: string;
};

export function computeDeploymentSourceFingerprint(input: {
  artifactHash: string;
  fileCount: number;
  deploymentMode: string;
  commitSha?: string | null;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        h: input.artifactHash,
        n: input.fileCount,
        m: input.deploymentMode,
        c: input.commitSha ?? null,
      }),
      "utf8",
    )
    .digest("hex");
}

export function buildDeploymentSourceIdentity(input: {
  record: ProductionArtifactRecord;
  commitSha?: string | null;
  repositoryFullName?: string | null;
  deploymentMode: string;
}): DeploymentSourceIdentity {
  return {
    artifactId: input.record.artifactId,
    artifactHash: input.record.contentHash,
    fileCount: input.record.fileCount,
    commitSha: input.commitSha ?? null,
    repositoryFullName: input.repositoryFullName ?? null,
    sourceFingerprint: computeDeploymentSourceFingerprint({
      artifactHash: input.record.contentHash,
      fileCount: input.record.fileCount,
      deploymentMode: input.deploymentMode,
      commitSha: input.commitSha,
    }),
  };
}

export type VercelReadinessEvaluation = {
  ready: boolean;
  blocked: boolean;
  reasons: string[];
  productionArtifactCompleteness: boolean;
  packageJson: boolean;
  dependencyIntegrity: boolean;
  cleanRoomInstall: boolean;
  cleanRoomBuild: boolean;
  deploymentManifest: boolean;
  vercelTranslation: boolean;
  artifactSourceCorrespondence: boolean;
  failureClassification: boolean;
  manifest: DeploymentManifestV1 | null;
  cleanRoom: CleanRoomBuildOutcome | null;
  sourceIdentity: DeploymentSourceIdentity | null;
  credentialsReadReady: boolean;
  payloadDeterministic: boolean;
  nextJsSecurityVersion: boolean;
};

export type EvaluateVercelReadinessOptions = {
  runCleanRoom?: boolean;
  commitSha?: string | null;
  repositoryFullName?: string | null;
  deploymentMode: string;
};

export async function evaluateVercelDeploymentReadiness(input: {
  record: ProductionArtifactRecord;
  files: ProductionArtifactFile[];
  options?: EvaluateVercelReadinessOptions;
}): Promise<VercelReadinessEvaluation> {
  const reasons: string[] = [];
  const opts = input.options ?? { deploymentMode: "git_integrated", runCleanRoom: true };

  const frameworkCheck = validateFrameworkReadiness(input.record.framework, input.record.fileManifest);
  const productionArtifactCompleteness = frameworkCheck.valid;
  if (!frameworkCheck.valid) reasons.push(...frameworkCheck.issues.map((i) => `artifact:${i}`));

  const pkgContent =
    input.files.find((f) => f.relativePath === "package.json")?.contentText ?? null;
  const pkgValidation = validateNextJsPackageJson({
    packageJsonContent: pkgContent,
    relativePaths: input.files.map((f) => f.relativePath),
    framework: input.record.framework,
  });
  const packageJson = pkgValidation.valid;
  if (!pkgValidation.valid) reasons.push(...pkgValidation.issues.map((i) => `package_json:${i}`));

  const nextVersion = extractNextVersionFromPackageJson(pkgValidation.parsed);
  const nextSecurity = validateNextJsVersionForVercel(nextVersion);
  const nextJsSecurityVersion = nextSecurity.acceptable;
  if (!nextJsSecurityVersion && nextSecurity.issue) {
    reasons.push(`vercel_vulnerability_gate:${nextSecurity.issue}`);
  }

  const depIntegrity = validateArtifactDependencyIntegrity(input.files);
  const dependencyIntegrity = depIntegrity.valid;
  if (!depIntegrity.valid) {
    reasons.push(...depIntegrity.issues.slice(0, 10).map((i) => `deps:${i}`));
  }

  const manifest = buildDeploymentManifest({
    record: input.record,
    files: input.files,
  });
  const manifestCheck = validateDeploymentManifest(manifest);
  const deploymentManifest = manifestCheck.valid;
  if (!manifestCheck.valid) reasons.push(...manifestCheck.issues.map((i) => `manifest:${i}`));

  const translationCheck = translateDeploymentManifestToVercel(manifest);
  const vercelTranslation = translationCheck.valid;
  if (!translationCheck.valid) {
    reasons.push(...translationCheck.issues.map((i) => `vercel:${i}`));
  }

  let cleanRoom: CleanRoomBuildOutcome | null = null;
  let cleanRoomInstall = false;
  let cleanRoomBuild = false;

  if (opts.runCleanRoom !== false && input.record.framework === "nextjs" && packageJson) {
    const { runCleanRoomInstallAndBuild, cleanupCleanRoom } = await import("./clean-room-build");
    cleanRoom = await runCleanRoomInstallAndBuild({
      files: input.files,
      framework: input.record.framework,
      rootDirectory: input.record.rootDirectory,
    });
    cleanRoomInstall = cleanRoom.install.ok;
    cleanRoomBuild = cleanRoom.build.ok && cleanRoom.frameworkDetection.detected;
    if (!cleanRoomInstall) reasons.push("clean_room_install_failed");
    if (!cleanRoom.build.ok) reasons.push("clean_room_build_failed");
    if (cleanRoom.build.ok && !cleanRoom.frameworkDetection.detected) {
      reasons.push("clean_room_next_output_missing");
    }
    await cleanupCleanRoom(cleanRoom.tempDir);
  } else if (input.record.framework !== "nextjs") {
    reasons.push("framework_not_supported_for_vercel_v1");
  }

  const sourceIdentity = buildDeploymentSourceIdentity({
    record: input.record,
    commitSha: opts.commitSha,
    repositoryFullName: opts.repositoryFullName,
    deploymentMode: opts.deploymentMode,
  });
  const artifactSourceCorrespondence =
    sourceIdentity.artifactHash === input.record.contentHash &&
    sourceIdentity.fileCount === input.record.fileCount;

  const credentialsReadReady = Boolean(process.env[VERCEL_TOKEN_ENV]?.length);
  const teamConfigured = Boolean(process.env[VERCEL_TEAM_ID_ENV]?.length);
  if (!credentialsReadReady) reasons.push("vercel_token_not_configured");
  if (!teamConfigured) reasons.push("vercel_team_id_recommended");

  const payloadDeterministic = Boolean(sourceIdentity.sourceFingerprint);

  const ready =
    productionArtifactCompleteness &&
    packageJson &&
    dependencyIntegrity &&
    deploymentManifest &&
    vercelTranslation &&
    nextJsSecurityVersion &&
    cleanRoomInstall &&
    cleanRoomBuild &&
    artifactSourceCorrespondence &&
    credentialsReadReady;

  if (!teamConfigured) {
    /* advisory only — team id improves project reconciliation */
  }

  return {
    ready,
    blocked: !ready,
    reasons,
    productionArtifactCompleteness,
    packageJson,
    dependencyIntegrity,
    cleanRoomInstall,
    cleanRoomBuild,
    deploymentManifest,
    vercelTranslation,
    nextJsSecurityVersion,
    artifactSourceCorrespondence,
    failureClassification: true,
    manifest,
    cleanRoom,
    sourceIdentity,
    credentialsReadReady,
    payloadDeterministic,
  };
}

export function deploymentPayloadMateriallyChanged(input: {
  previousDeploymentMode?: string | null;
  nextDeploymentMode: string;
  previousArtifactHash?: string | null;
  nextArtifactHash: string;
}): boolean {
  if (input.previousDeploymentMode && input.previousDeploymentMode !== input.nextDeploymentMode) {
    return true;
  }
  if (input.previousArtifactHash && input.previousArtifactHash !== input.nextArtifactHash) {
    return true;
  }
  return false;
}
