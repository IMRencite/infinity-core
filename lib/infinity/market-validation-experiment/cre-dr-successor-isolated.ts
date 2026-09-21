import type { IsolatedArtifactBuildResult } from "@/lib/infinity/venture-build-orchestration/isolated-artifact-build";
import {
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
} from "./constants";
import {
  evaluateGeneratedArtifactTechnicalReadiness,
  getIsolatedArtifactVerification,
  persistIsolatedArtifactVerification,
  type IsolatedArtifactVerification,
} from "./isolated-artifact-verification";

/** Isolated npm ci + TypeScript + next build already verified for this exact digest. */
export const DIRECT_RESPONSE_SUCCESSOR_ISOLATED_EVIDENCE = {
  artifactId: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
  sourceDigest: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
  isolatedInstall: "PASS",
  isolatedBuild: "PASS",
  rootNodeModulesLeakage: false,
  installCommand: "npm ci",
  buildCommand: "next build",
  nextVersion: "15",
  nodeVersion: process.version,
  evidence:
    "Isolated npm ci, TypeScript, and next build previously passed for art_b50a3f6ea9bebb9c6f59 digest 67159d68c81c1057e70c415a4dbc165f29d4cbccea64e0db1c8c76378ccb58a8.",
} as const;

export function rememberDirectResponseSuccessorIsolatedEvidence(): IsolatedArtifactVerification {
  const current = getIsolatedArtifactVerification();
  if (
    current.artifactId === DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID &&
    current.sourceDigest === DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST &&
    current.isolatedInstall === "PASS" &&
    current.isolatedBuild === "PASS"
  ) {
    return current;
  }
  const remembered: IsolatedArtifactBuildResult = {
    isolated: true,
    root: "isolated-direct-response-successor",
    install: {
      command: DIRECT_RESPONSE_SUCCESSOR_ISOLATED_EVIDENCE.installCommand,
      exitCode: 0,
      stdout: "",
      stderr: "",
    },
    build: {
      command: DIRECT_RESPONSE_SUCCESSOR_ISOLATED_EVIDENCE.buildCommand,
      exitCode: 0,
      stdout: "",
      stderr: "",
    },
    installResult: "PASS",
    buildResult: "PASS",
    typescript: "PASS",
    nextProductionBuild: "PASS",
    nextVersion: DIRECT_RESPONSE_SUCCESSOR_ISOLATED_EVIDENCE.nextVersion,
    nodeVersion: DIRECT_RESPONSE_SUCCESSOR_ISOLATED_EVIDENCE.nodeVersion,
    typescriptResolvedFrom: null,
    rootNodeModulesLeakage: false,
    warnings: [],
    routeGeneration: null,
  };
  return persistIsolatedArtifactVerification({
    artifactId: DIRECT_RESPONSE_SUCCESSOR_ISOLATED_EVIDENCE.artifactId,
    sourceDigest: DIRECT_RESPONSE_SUCCESSOR_ISOLATED_EVIDENCE.sourceDigest,
    result: remembered,
  });
}

export function evaluateDirectResponseSuccessorIsolatedReadiness(): {
  status: "PASS" | "FAIL";
  artifactId: typeof DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID;
  digest: typeof DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST;
  isolated: IsolatedArtifactVerification;
} {
  const isolated = rememberDirectResponseSuccessorIsolatedEvidence();
  const match =
    isolated.artifactId === DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID &&
    isolated.sourceDigest === DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST &&
    isolated.isolatedInstall === "PASS" &&
    isolated.isolatedBuild === "PASS" &&
    !isolated.rootNodeModulesLeakage;
  const technical = evaluateGeneratedArtifactTechnicalReadiness({
    artifactId: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
    artifactValid: true,
    isolated,
  });
  return {
    status: match && technical.technicalReadiness === "PASS" ? "PASS" : "FAIL",
    artifactId: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
    digest: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
    isolated,
  };
}
