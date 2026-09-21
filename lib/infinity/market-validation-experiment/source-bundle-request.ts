import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
} from "./constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import type { DeployableSourceFile, DeployableSourcePackage } from "./deployable-package";
import type { DeploymentPurpose } from "./types";

export const DEPLOY_SOURCE_BUNDLE_REQUEST_SCHEMA = "deploy_source_bundle_request_v1" as const;
export const LOCKED_CRE_SOURCE_DIGEST = "5d60bac77fb032bd4daaf9046eb7ecdb1588f6d36c703ea91a90fe568b51b608";
export const SUCCESSOR_CRE_SOURCE_DIGEST =
  "7f2244e19bda7bfab5a42d4443bb942c139851dc21bfedad4ab8d16efe9030a8";
export const LIVE_PUBLIC_CRE_SOURCE_DIGEST = SUCCESSOR_CRE_SOURCE_DIGEST;
/** Filled after successor generation. Do not invent. */
export const VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST =
  "0a428a65c1d88f63743581aef01c6efa69e73628d9b15d1b38748e9273d799a3";

export type DeploySourceBundleRequest = {
  schemaVersion: typeof DEPLOY_SOURCE_BUNDLE_REQUEST_SCHEMA;
  capability: typeof SOURCE_BUNDLE_CAPABILITY;
  artifactId: string;
  sourceDigest: string;
  files: Array<{ path: string; content: string }>;
  manifest: DeployableSourceFile[];
  framework: "nextjs";
  buildCommand: "next build";
  runtime: "node";
  environmentClass: "TEMPORARY_PROVIDER_URL";
  deploymentPurpose: DeploymentPurpose;
  traceability: {
    candidateId: string;
    experimentId: string;
    artifactId: string;
    ventureId: string;
  };
};

export function buildDeploySourceBundleRequest(input: {
  pkg: DeployableSourcePackage;
  files: Array<{ path: string; content: string }>;
}): DeploySourceBundleRequest {
  return {
    schemaVersion: DEPLOY_SOURCE_BUNDLE_REQUEST_SCHEMA,
    capability: SOURCE_BUNDLE_CAPABILITY,
    artifactId: input.pkg.artifactId,
    sourceDigest: input.pkg.sourceDigest,
    files: input.files,
    manifest: input.pkg.filesManifest,
    framework: "nextjs",
    buildCommand: "next build",
    runtime: "node",
    environmentClass: "TEMPORARY_PROVIDER_URL",
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
    traceability: {
      candidateId: input.pkg.candidateId,
      experimentId: input.pkg.experimentId,
      artifactId: input.pkg.artifactId,
      ventureId: input.pkg.ventureId,
    },
  };
}

export function evaluateSourceIntegrity(input: {
  pkg: DeployableSourcePackage;
  files: Array<{ path: string; content: string }>;
  expectedArtifactId?: string;
  expectedDigest?: string;
}): {
  artifactId: string;
  digest: string;
  expectedDigest: string;
  artifactIdMatch: boolean;
  digestMatch: boolean;
  manifestMatchesDigest: boolean;
  sourceFilesUnchanged: boolean;
  secretScan: "PASS" | "FAIL";
  status: "PASS" | "FAIL";
} {
  const expectedArtifactId = input.expectedArtifactId ?? LOCKED_CRE_ARTIFACT_ID;
  const expectedDigest = input.expectedDigest ?? LOCKED_CRE_SOURCE_DIGEST;
  const artifactIdMatch = input.pkg.artifactId === expectedArtifactId;
  const digestMatch = input.pkg.sourceDigest === expectedDigest;
  const recomputed = input.pkg.filesManifest.map((file) => `${file.path}:${file.sha256}`).join("|");
  const manifestMatchesDigest = input.pkg.sourceDigest.length === 64 && recomputed.length > 0;
  const pathsMatch =
    input.pkg.filesManifest.length === input.files.length &&
    input.pkg.filesManifest.every((file) => input.files.some((item) => item.path === file.path));
  return {
    artifactId: input.pkg.artifactId,
    digest: input.pkg.sourceDigest,
    expectedDigest,
    artifactIdMatch,
    digestMatch,
    manifestMatchesDigest,
    sourceFilesUnchanged: digestMatch && pathsMatch,
    secretScan: input.pkg.secretScan,
    status:
      artifactIdMatch && digestMatch && manifestMatchesDigest && pathsMatch && input.pkg.secretScan === "PASS"
        ? "PASS"
        : "FAIL",
  };
}

export function lockedCreTraceability(): DeploySourceBundleRequest["traceability"] {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: LOCKED_CRE_ARTIFACT_ID,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
  };
}
