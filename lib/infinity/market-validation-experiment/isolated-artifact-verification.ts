import type { IsolatedArtifactBuildResult } from "@/lib/infinity/venture-build-orchestration/isolated-artifact-build";

export type IsolatedArtifactVerification = {
  artifactId: string | null;
  sourceDigest: string | null;
  isolatedInstall: "PASS" | "FAIL" | "UNKNOWN";
  isolatedBuild: "PASS" | "FAIL" | "UNKNOWN";
  rootNodeModulesLeakage: boolean;
  installCommand: string | null;
  buildCommand: string | null;
  nextVersion: string | null;
  nodeVersion: string | null;
  evidence: string;
};

let record: IsolatedArtifactVerification = emptyIsolatedVerification();

function emptyIsolatedVerification(): IsolatedArtifactVerification {
  return {
    artifactId: null,
    sourceDigest: null,
    isolatedInstall: "UNKNOWN",
    isolatedBuild: "UNKNOWN",
    rootNodeModulesLeakage: false,
    installCommand: null,
    buildCommand: null,
    nextVersion: null,
    nodeVersion: null,
    evidence: "Isolated artifact install/build has not been recorded.",
  };
}

export function resetIsolatedArtifactVerification(): void {
  record = emptyIsolatedVerification();
}

export function getIsolatedArtifactVerification(): IsolatedArtifactVerification {
  return record;
}

export function persistIsolatedArtifactVerification(input: {
  artifactId: string;
  sourceDigest: string;
  result: IsolatedArtifactBuildResult;
}): IsolatedArtifactVerification {
  record = {
    artifactId: input.artifactId,
    sourceDigest: input.sourceDigest,
    isolatedInstall: input.result.installResult,
    isolatedBuild: input.result.buildResult,
    rootNodeModulesLeakage: input.result.rootNodeModulesLeakage,
    installCommand: input.result.install.command,
    buildCommand: input.result.build.command,
    nextVersion: input.result.nextVersion,
    nodeVersion: input.result.nodeVersion,
    evidence:
      input.result.installResult === "PASS" && input.result.buildResult === "PASS" && !input.result.rootNodeModulesLeakage
        ? "Isolated npm ci and next build passed for the exact generated artifact file tree."
        : "Isolated artifact install or build failed, or root node_modules leakage was detected.",
  };
  return record;
}

export function evaluateGeneratedArtifactTechnicalReadiness(input: {
  artifactId: string;
  artifactValid: boolean;
  isolated?: IsolatedArtifactVerification | null;
}): {
  technicalReadiness: "PASS" | "FAIL";
  isolatedInstall: "PASS" | "FAIL" | "UNKNOWN";
  isolatedBuild: "PASS" | "FAIL" | "UNKNOWN";
  authorization: "BLOCKED";
} {
  const isolated = input.isolated ?? getIsolatedArtifactVerification();
  const match = isolated.artifactId === input.artifactId;
  const pass =
    input.artifactValid &&
    match &&
    isolated.isolatedInstall === "PASS" &&
    isolated.isolatedBuild === "PASS" &&
    !isolated.rootNodeModulesLeakage;
  return {
    technicalReadiness: pass ? "PASS" : "FAIL",
    isolatedInstall: match ? isolated.isolatedInstall : "UNKNOWN",
    isolatedBuild: match ? isolated.isolatedBuild : "UNKNOWN",
    authorization: "BLOCKED",
  };
}
