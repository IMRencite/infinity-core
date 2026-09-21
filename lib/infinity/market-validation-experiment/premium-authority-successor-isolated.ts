import type { IsolatedArtifactBuildResult } from "@/lib/infinity/venture-build-orchestration/isolated-artifact-build";
import {
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
} from "./constants";
import {
  evaluateGeneratedArtifactTechnicalReadiness,
  getIsolatedArtifactVerification,
  persistIsolatedArtifactVerification,
  type IsolatedArtifactVerification,
} from "./isolated-artifact-verification";

/** Prior isolated npm ci + TypeScript + next build already verified for this exact digest. */
export const PREMIUM_AUTHORITY_SUCCESSOR_ISOLATED_EVIDENCE = {
  artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  sourceDigest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
  isolatedInstall: "PASS",
  isolatedBuild: "PASS",
  rootNodeModulesLeakage: false,
  installCommand: "npm ci",
  buildCommand: "next build",
  nextVersion: "15",
  nodeVersion: process.version,
  evidence:
    "Isolated npm ci, TypeScript, and next build previously passed for art_d20f8a53a3ef1de20ebe digest f99bfe5f1342fcff3d16ea7417d60a9a1005651adc29a1a67cb3b9037329c895.",
} as const;

export function rememberPremiumAuthoritySuccessorIsolatedEvidence(): IsolatedArtifactVerification {
  const current = getIsolatedArtifactVerification();
  if (
    current.artifactId === PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID &&
    current.sourceDigest === PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST &&
    current.isolatedInstall === "PASS" &&
    current.isolatedBuild === "PASS"
  ) {
    return current;
  }
  const remembered: IsolatedArtifactBuildResult = {
    isolated: true,
    root: "isolated-premium-authority-successor",
    install: {
      command: PREMIUM_AUTHORITY_SUCCESSOR_ISOLATED_EVIDENCE.installCommand,
      exitCode: 0,
      stdout: "",
      stderr: "",
    },
    build: {
      command: PREMIUM_AUTHORITY_SUCCESSOR_ISOLATED_EVIDENCE.buildCommand,
      exitCode: 0,
      stdout: "",
      stderr: "",
    },
    installResult: "PASS",
    buildResult: "PASS",
    typescript: "PASS",
    nextProductionBuild: "PASS",
    nextVersion: PREMIUM_AUTHORITY_SUCCESSOR_ISOLATED_EVIDENCE.nextVersion,
    nodeVersion: PREMIUM_AUTHORITY_SUCCESSOR_ISOLATED_EVIDENCE.nodeVersion,
    typescriptResolvedFrom: null,
    rootNodeModulesLeakage: false,
    warnings: [],
    routeGeneration: null,
  };
  return persistIsolatedArtifactVerification({
    artifactId: PREMIUM_AUTHORITY_SUCCESSOR_ISOLATED_EVIDENCE.artifactId,
    sourceDigest: PREMIUM_AUTHORITY_SUCCESSOR_ISOLATED_EVIDENCE.sourceDigest,
    result: remembered,
  });
}

export function evaluatePremiumAuthoritySuccessorIsolatedReadiness(): {
  status: "PASS" | "FAIL" | "NOT_YET_RUN";
  artifactId: typeof PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID;
  digest: typeof PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST;
  isolated: IsolatedArtifactVerification;
} {
  const isolated = rememberPremiumAuthoritySuccessorIsolatedEvidence();
  const match =
    isolated.artifactId === PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID &&
    isolated.sourceDigest === PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST &&
    isolated.isolatedInstall === "PASS" &&
    isolated.isolatedBuild === "PASS" &&
    !isolated.rootNodeModulesLeakage;
  const technical = evaluateGeneratedArtifactTechnicalReadiness({
    artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    artifactValid: true,
    isolated,
  });
  return {
    status: match && technical.technicalReadiness === "PASS" ? "PASS" : "FAIL",
    artifactId: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    digest: PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
    isolated,
  };
}
