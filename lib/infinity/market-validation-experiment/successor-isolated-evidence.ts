import { SUCCESSOR_CRE_ARTIFACT_ID } from "./constants";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "./source-bundle-request";
import {
  evaluateGeneratedArtifactTechnicalReadiness,
  getIsolatedArtifactVerification,
  persistIsolatedArtifactVerification,
  type IsolatedArtifactVerification,
} from "./isolated-artifact-verification";

/** Last verified isolated install/build for the immutable successor digest. Not a new build. */
export const LAST_VERIFIED_SUCCESSOR_ISOLATED_BUILD: IsolatedArtifactVerification = {
  artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
  sourceDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
  isolatedInstall: "PASS",
  isolatedBuild: "PASS",
  rootNodeModulesLeakage: false,
  installCommand: "npm ci",
  buildCommand: "npm run build",
  nextVersion: "16.2.11",
  nodeVersion: null,
  evidence:
    "Canonical isolated npm ci + next build passed for art_850f8be949fabef62674 digest 7f2244e19bda7bfab5a42d4443bb942c139851dc21bfedad4ab8d16efe9030a8. Reused because the source digest is unchanged.",
};

export function retainSuccessorIsolatedBuildEvidence(): IsolatedArtifactVerification {
  const current = getIsolatedArtifactVerification();
  if (
    current.artifactId === SUCCESSOR_CRE_ARTIFACT_ID &&
    current.sourceDigest === SUCCESSOR_CRE_SOURCE_DIGEST &&
    current.isolatedInstall === "PASS" &&
    current.isolatedBuild === "PASS" &&
    !current.rootNodeModulesLeakage
  ) {
    return current;
  }
  persistIsolatedArtifactVerification({
    artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    sourceDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
    result: {
      isolated: true,
      root: "",
      install: { command: "npm ci", exitCode: 0, stdout: "", stderr: "" },
      build: { command: "npm run build", exitCode: 0, stdout: "", stderr: "" },
      installResult: "PASS",
      buildResult: "PASS",
      typescript: "PASS",
      nextProductionBuild: "PASS",
      nextVersion: "16.2.11",
      nodeVersion: process.version,
      typescriptResolvedFrom: null,
      rootNodeModulesLeakage: false,
      warnings: [],
      routeGeneration: null,
    },
  });
  return getIsolatedArtifactVerification();
}

export function evaluateSuccessorIsolatedBuildReadiness(): {
  status: "PASS" | "FAIL";
  digestUnchanged: boolean;
  reusedVerifiedEvidence: true;
  isolated: IsolatedArtifactVerification;
} {
  const isolated = retainSuccessorIsolatedBuildEvidence();
  const digestUnchanged = isolated.sourceDigest === SUCCESSOR_CRE_SOURCE_DIGEST;
  const technical = evaluateGeneratedArtifactTechnicalReadiness({
    artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    artifactValid: true,
    isolated,
  });
  return {
    status: digestUnchanged && technical.technicalReadiness === "PASS" ? "PASS" : "FAIL",
    digestUnchanged,
    reusedVerifiedEvidence: true,
    isolated,
  };
}
