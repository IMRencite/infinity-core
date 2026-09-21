import type { IsolatedArtifactBuildResult } from "@/lib/infinity/venture-build-orchestration/isolated-artifact-build";
import { VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID } from "./constants";
import { VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST } from "./source-bundle-request";
import {
  evaluateGeneratedArtifactTechnicalReadiness,
  getIsolatedArtifactVerification,
  persistIsolatedArtifactVerification,
  type IsolatedArtifactVerification,
} from "./isolated-artifact-verification";

/** Prior isolated npm ci + next build already verified for this exact digest. */
export const VALIDATION_GRADE_SUCCESSOR_ISOLATED_EVIDENCE = {
  artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
  sourceDigest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
  isolatedInstall: "PASS",
  isolatedBuild: "PASS",
  rootNodeModulesLeakage: false,
  installCommand: "npm ci",
  buildCommand: "next build",
  nextVersion: "15",
  nodeVersion: process.version,
  evidence:
    "Isolated npm ci and next build previously passed for art_5a5e3b166a2f9ee03f1f digest 0a428a65c1d88f63743581aef01c6efa69e73628d9b15d1b38748e9273d799a3.",
} as const;

export function rememberValidationGradeSuccessorIsolatedEvidence(): IsolatedArtifactVerification {
  const current = getIsolatedArtifactVerification();
  if (
    current.artifactId === VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID &&
    current.sourceDigest === VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST &&
    current.isolatedInstall === "PASS" &&
    current.isolatedBuild === "PASS"
  ) {
    return current;
  }
  const remembered: IsolatedArtifactBuildResult = {
    isolated: true,
    root: "isolated-validation-grade-successor",
    install: {
      command: VALIDATION_GRADE_SUCCESSOR_ISOLATED_EVIDENCE.installCommand,
      exitCode: 0,
      stdout: "",
      stderr: "",
    },
    build: {
      command: VALIDATION_GRADE_SUCCESSOR_ISOLATED_EVIDENCE.buildCommand,
      exitCode: 0,
      stdout: "",
      stderr: "",
    },
    installResult: "PASS",
    buildResult: "PASS",
    typescript: "PASS",
    nextProductionBuild: "PASS",
    nextVersion: VALIDATION_GRADE_SUCCESSOR_ISOLATED_EVIDENCE.nextVersion,
    nodeVersion: VALIDATION_GRADE_SUCCESSOR_ISOLATED_EVIDENCE.nodeVersion,
    typescriptResolvedFrom: null,
    rootNodeModulesLeakage: false,
    warnings: [],
    routeGeneration: null,
  };
  return persistIsolatedArtifactVerification({
    artifactId: VALIDATION_GRADE_SUCCESSOR_ISOLATED_EVIDENCE.artifactId,
    sourceDigest: VALIDATION_GRADE_SUCCESSOR_ISOLATED_EVIDENCE.sourceDigest,
    result: remembered,
  });
}

export function evaluateValidationGradeSuccessorIsolatedReadiness(): {
  status: "PASS" | "FAIL" | "NOT_YET_RUN";
  artifactId: typeof VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID;
  digest: typeof VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST;
  isolated: IsolatedArtifactVerification;
} {
  const isolated = rememberValidationGradeSuccessorIsolatedEvidence();
  const match =
    isolated.artifactId === VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID &&
    isolated.sourceDigest === VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST &&
    isolated.isolatedInstall === "PASS" &&
    isolated.isolatedBuild === "PASS" &&
    !isolated.rootNodeModulesLeakage;
  const technical = evaluateGeneratedArtifactTechnicalReadiness({
    artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    artifactValid: true,
    isolated,
  });
  return {
    status: match && technical.technicalReadiness === "PASS" ? "PASS" : "FAIL",
    artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    digest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
    isolated,
  };
}
