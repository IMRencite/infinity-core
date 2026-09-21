import { describe, expect, it, beforeEach } from "vitest";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { currentCreValidationArtifactId } from "../current-cre-artifact";
import { SUCCESSOR_CRE_ARTIFACT_ID, LOCKED_CRE_ARTIFACT_ID, CRE_CANDIDATE_ID, LOCKED_CRE_EXPERIMENT_ID } from "../constants";
import { evaluateThisRequestFounderAuthorizedDeploy } from "../founder-authorized-deploy";
import {
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_ID,
  currentCreFounderScope,
  evaluateFounderAuthorization,
  evaluateThisRequestFounderAuthorization,
  lockedCreFounderScope,
  persistFounderAuthorization,
  predecessorConsumedFounderAuthorization,
  resetFounderAuthorization,
} from "../founder-authorization";
import { executeMarketValidationExperiment, resetExperimentRuntime } from "../execute";
import { buildDeployableSourcePackage } from "../deployable-package";
import { evaluateSourceIntegrity, LOCKED_CRE_SOURCE_DIGEST, SUCCESSOR_CRE_SOURCE_DIGEST } from "../source-bundle-request";
import { evaluateRuntimeAuthorizationState } from "../runtime-authorization-state";
import { persistEconomicReadVerification, resetEconomicReadVerification, getEconomicReadVerification } from "../economic-read-verification";
import { inspectEagEconomicPolicy } from "../eag-economics";
import { evaluateValidationArtifactDeploymentAuthorization } from "../artifact-authorization";
import { MARKET_VALIDATION_PURPOSE } from "../constants";
import { getSourceBundleVerification } from "../source-bundle-verification";

function persistPro() {
  persistEconomicReadVerification({
    liveReadAttempted: true,
    planStatus: "READ_ONLY_VERIFIED",
    timestamp: new Date().toISOString(),
    snapshot: {
      ...getEconomicReadVerification().snapshot,
      plan: {
        teamId: "team_expected",
        teamSlug: "infinity-test",
        plan: "pro",
        billingPeriod: null,
        source: "GET /v2/teams/{teamId}",
      },
    },
  });
}

describe("SUCCESSOR ARTIFACT FOUNDER AUTHORIZATION + LIVE VALIDATION DEPLOY V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetFounderAuthorization();
    resetEconomicReadVerification();
  });

  it("accepts a new $5/$10 authorization scoped only to the successor artifact", () => {
    const founder = evaluateThisRequestFounderAuthorization();
    expect(founder.recognized).toBe(true);
    expect(founder.authorization?.authorizationId).toBe(FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.authorizationId).not.toBe(CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.authorizationId).not.toBe(CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.deploymentCeilingUsd).toBe(5);
    expect(founder.authorization?.runtimeCeilingUsd).toBe(10);
    expect(founder.authorization?.singleUse).toBe(true);
    expect(founder.authorization?.maximumExecutions).toBe(1);
    expect(founder.authorization?.scope).toEqual(currentCreFounderScope());
    expect(founder.authorization?.scope.artifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(founder.authorization?.scope.artifactDigest).toBe(SUCCESSOR_CRE_SOURCE_DIGEST);
    expect(founder.providerCostClassification).toBe("UNKNOWN");
    expect(founder.founderCeilingTreatedAsProviderCost).toBe(false);
  });

  it("does not reuse the consumed predecessor authorization or transfer its runtime ceiling", () => {
    const consumed = predecessorConsumedFounderAuthorization();
    expect(consumed.authorizationId).toBe(CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(consumed.executionsConsumed).toBe(1);
    const reused = evaluateFounderAuthorization({
      authorization: consumed,
      requestedScope: currentCreFounderScope(),
    });
    expect(reused.recognized).toBe(false);
    expect(reused.consumed).toBe(true);
    expect(reused.reason).toBe("NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED");
    persistFounderAuthorization(consumed);
    const runtime = evaluateRuntimeAuthorizationState();
    expect(runtime.activated).toBe(false);
    expect(runtime.transferredToNewArtifact).toBe(false);
    expect(runtime.boundArtifactId).toBe(LOCKED_CRE_ARTIFACT_ID);
    expect(runtime.boundArtifactDigest).toBe(LOCKED_CRE_SOURCE_DIGEST);
  });

  it("locks the successor digest and keeps UNKNOWN-cost policy unchanged", async () => {
    persistPro();
    expect(currentCreValidationArtifactId()).not.toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const files = result.artifact?.files ?? [];
    const pkg = buildDeployableSourcePackage({
      artifactId: result.artifact!.artifactId,
      ventureId: result.experiment.ventureId,
      experimentId: result.experiment.experimentId,
      candidateId: CRE_CANDIDATE_ID,
      files,
    });
    const integrity = evaluateSourceIntegrity({
      pkg,
      files,
      expectedArtifactId: SUCCESSOR_CRE_ARTIFACT_ID,
      expectedDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
    });
    expect(integrity.status).toBe("FAIL");
    expect(pkg.artifactId).not.toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(pkg.sourceDigest).not.toBe(SUCCESSOR_CRE_SOURCE_DIGEST);
    expect(pkg.artifactId).not.toBe(LOCKED_CRE_ARTIFACT_ID);
    expect(pkg.sourceDigest).not.toBe(LOCKED_CRE_SOURCE_DIGEST);
    const policy = inspectEagEconomicPolicy();
    expect(policy.unknownAllowed).toBe(false);
    expect(policy.policyChanged).toBe(false);
    expect(policy.unknownCostWithExplicitHumanCeiling).toBe(true);
    const founder = persistFounderAuthorization(
      evaluateThisRequestFounderAuthorization().authorization!,
    );
    const auth = evaluateValidationArtifactDeploymentAuthorization({
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
      artifactValid: true,
      validationPassed: true,
      fullProduct: false,
      purpose: MARKET_VALIDATION_PURPOSE,
      artifactFiles: files,
      founderAuthorization: founder,
    });
    expect(auth.eag).not.toBe("APPROVED");
    expect(auth.eagBypassed).toBe(false);
    expect(auth.costClassification).toBe("UNKNOWN");
    const preflight = evaluateThisRequestFounderAuthorizedDeploy();
    expect(preflight.attempted).toBe(false);
    expect(preflight.sourceBundleWrites).toBe(0);
    expect(preflight.unknownCostGlobalPolicyWeakened).toBe(false);
    expect(getSourceBundleVerification().status).not.toBe("LIVE_WRITE_VERIFIED");
    expect(lockedCreFounderScope().artifactId).toBe(LOCKED_CRE_ARTIFACT_ID);
  });
});
